import { SERVICES, DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS, DEFAULT_MONTHLY_GOALS, MOCK_APPOINTMENTS } from '../constants';
import { Appointment, Service, StudioSettings } from '../types';
import { supabase } from './supabaseClient';

export interface TimeSlot {
    time: string;
    available: boolean;
}

// --- In-Memory Cache ---
let cachedServices: Service[] | null = null;
let cachedGallery: any[] | null = null;
let cachedSettings: StudioSettings | null = null;

export const api = {
  // --- Settings ---
  getSettings: async (): Promise<StudioSettings> => {
      if (cachedSettings) return cachedSettings;

      const defaultSettings: StudioSettings = { 
        working_hours: DEFAULT_WORKING_HOURS,
        studio_details: DEFAULT_STUDIO_DETAILS,
        monthly_goals: DEFAULT_MONTHLY_GOALS
      };
      
      if (!supabase) {
          cachedSettings = defaultSettings;
          return defaultSettings;
      }

      try {
          // Fetch settings keys
          const { data, error } = await supabase
            .from('settings')
            .select('*')
            .in('key', ['working_hours', 'studio_details', 'monthly_goals']);

          if (error || !data) {
              cachedSettings = defaultSettings;
              return defaultSettings;
          }

          const newSettings = { ...defaultSettings };
          
          data.forEach(row => {
            if (row.key === 'working_hours') {
               // Legacy check
               if (row.value['0'] && row.value['0'].start !== undefined) {
                  // Ignore legacy format
               } else {
                  newSettings.working_hours = row.value;
               }
            } else if (row.key === 'studio_details') {
               newSettings.studio_details = { ...defaultSettings.studio_details, ...row.value };
            } else if (row.key === 'monthly_goals') {
               newSettings.monthly_goals = { ...defaultSettings.monthly_goals, ...row.value };
            }
          });
          
          cachedSettings = newSettings;
          return newSettings;
      } catch (e) {
          console.error(e);
          return defaultSettings;
      }
  },

  updateSettings: async (settings: StudioSettings): Promise<boolean> => {
      if (!supabase) return false;
      
      const updates = [
        { key: 'working_hours', value: settings.working_hours },
        { key: 'studio_details', value: settings.studio_details },
        { key: 'monthly_goals', value: settings.monthly_goals }
      ];

      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'key' });
      
      if (!error) cachedSettings = settings;
      return !error;
  },

  // --- Services ---
  getServices: async (): Promise<Service[]> => {
    if (cachedServices) return cachedServices;

    if (!supabase) return SERVICES;
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;
      
      cachedServices = data || SERVICES;
      return cachedServices;
    } catch (err) {
      console.error('Error fetching services:', err);
      return SERVICES;
    }
  },

  addService: async (service:  Omit<Service, 'id'>): Promise<Service | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('services').insert([service]).select().single();
    if (error) { console.error(error); return null; }
    
    cachedServices = null; // Invalidate cache
    return data;
  },

  updateService: async (id: string, updates: Partial<Service>): Promise<Service | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single();
    if (error) { console.error(error); return null; }
    
    cachedServices = null; // Invalidate cache
    return data;
  },

  deleteService: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('services').update({ is_active: false }).eq('id', id);
    
    if (!error) cachedServices = null; // Invalidate cache
    return !error;
  },

  // --- Appointments ---
  getAvailability: async (date: Date): Promise<TimeSlot[]> => {
    // 1. Fetch Settings (Use cache if available)
    let workingHours = DEFAULT_WORKING_HOURS;
    if (supabase) {
        if (cachedSettings) {
            workingHours = cachedSettings.working_hours;
        } else {
            const { data } = await supabase.from('settings').select('*').eq('key', 'working_hours').single();
            if (data?.value && data.value['0'] && data.value['0'].ranges) { 
                workingHours = data.value;
            }
        }
    }

    // 2. Identify Day Config
    const dayIndex = date.getDay().toString(); // 0 = Sunday
    const dayConfig = workingHours[dayIndex];

    // If day is closed or config missing
    if (!dayConfig || !dayConfig.isOpen || !dayConfig.ranges || dayConfig.ranges.length === 0) {
        return [];
    }

    // 3. Generate All Slots for that specific day (Iterate through all ranges)
    let allSlots: string[] = [];
    
    dayConfig.ranges.forEach(range => {
        for (let hour = range.start; hour < range.end; hour++) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    });
    
    // Sort slots just in case ranges were out of order
    allSlots.sort();

    // Map to object structure
    const slotsWithStatus = allSlots.map(time => ({ time, available: true }));

    if (!supabase) return slotsWithStatus;

    // 4. Check against existing appointments (Range Check)
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch Start AND End time
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .neq('status', 'cancelled'); // Includes 'pending' and 'confirmed'

      if (error) throw error;

      // Convert existing appointments to timestamp ranges
      const busyRanges = existingAppointments?.map(app => ({
          start: new Date(app.start_time).getTime(),
          end: new Date(app.end_time).getTime()
      })) || [];

      // Update availability status
      return slotsWithStatus.map(slot => {
          const [h, m] = slot.time.split(':').map(Number);
          const slotDate = new Date(date);
          slotDate.setHours(h, m, 0, 0);
          const slotTime = slotDate.getTime();

          // A slot is unavailable if its start time is >= existing start time AND < existing end time
          const isBusy = busyRanges.some(range => slotTime >= range.start && slotTime < range.end);
          
          return { ...slot, available: !isBusy };
      });

    } catch (err) {
      console.error('Error fetching availability:', err);
      return slotsWithStatus;
    }
  },

  createAppointment: async (appt: Partial<Appointment>): Promise<Appointment> => {
    if (!supabase) {
        // Mock fallback
        return {
            id: 'mock',
            ...appt
        } as Appointment;
    }

    const payload = {
      service_id: appt.service_id,
      start_time: appt.start_time,
      end_time: new Date(new Date(appt.start_time!).getTime() + 30 * 60000).toISOString(),
      guest_name: appt.client_name,
      guest_email: appt.client_email,
      guest_phone: appt.client_phone,
      notes: appt.notes,
      status: 'pending' // Default to pending
    };

    const { data, error } = await supabase.from('appointments').insert([payload]).select().single();
    if (error) throw error;

    return {
      id: data.id,
      client_name: data.guest_name,
      client_email: data.guest_email,
      client_phone: data.guest_phone,
      service_id: data.service_id,
      start_time: data.start_time,
      status: data.status as Appointment['status'],
      notes: data.notes
    };
  },

  getAppointments: async (): Promise<Appointment[]> => {
    if (!supabase) return MOCK_APPOINTMENTS as Appointment[];
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            services (name, price)
        `)
        .order('start_time', { ascending: false });

      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id,
        client_name: item.guest_name || 'לקוח רשום',
        client_email: item.guest_email,
        client_phone: item.guest_phone,
        service_id: item.service_id,
        service_name: item.services?.name, 
        service_price: item.services?.price,
        start_time: item.start_time,
        status: item.status,
        notes: item.notes
      }));
    } catch (err) {
      console.error(err);
      return MOCK_APPOINTMENTS as Appointment[];
    }
  },

  updateAppointmentStatus: async (id: string, status: string): Promise<boolean> => {
      if (!supabase) return true;
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      return !error;
  },

  updateAppointment: async (id: string, updates: Partial<Appointment>): Promise<boolean> => {
      if (!supabase) return true;
      const { error } = await supabase.from('appointments').update(updates).eq('id', id);
      return !error;
  },

  // --- Stats ---
  getMonthlyStats: async () => {
      if (!supabase) return { revenue: 0, appointments: 0, pending: 0 };
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data } = await supabase
        .from('appointments')
        .select(`status, services(price)`)
        .gte('start_time', startOfMonth)
        .lte('start_time', endOfMonth)
        .neq('status', 'cancelled');
        
      let revenue = 0;
      let pending = 0;
      
      data?.forEach((app: any) => {
          if (app.status !== 'cancelled') {
             revenue += (app.services?.price || 0);
          }
          if (app.status === 'pending') pending++;
      });

      return {
          revenue,
          appointments: data?.length || 0,
          pending
      };
  },

  // --- Gallery ---
  getGallery: async () => {
    if (cachedGallery) return cachedGallery;

    if(!supabase) return [];
    const { data } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
    
    cachedGallery = data || [];
    return cachedGallery;
  },

  addToGallery: async (imageUrl: string) => {
      if(!supabase) return;
      await supabase.from('gallery').insert([{ image_url: imageUrl }]);
      cachedGallery = null; // Invalidate cache
  },

  deleteFromGallery: async (id: string) => {
      if(!supabase) return false;
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      
      if (!error) cachedGallery = null; // Invalidate cache
      return !error;
  },

  // --- Storage ---
  uploadImage: async (file: File, bucket: 'service-images' | 'gallery-images'): Promise<string | null> => {
      if(!supabase) return null;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) {
          console.error(uploadError);
          return null;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data.publicUrl;
  }
};