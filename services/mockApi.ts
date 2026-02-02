import { SERVICES, DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS, DEFAULT_MONTHLY_GOALS, MOCK_APPOINTMENTS } from '../constants';
import { Appointment, Service, StudioSettings, Coupon } from '../types';
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
        monthly_goals: DEFAULT_MONTHLY_GOALS,
        gallery_tags: {},
        features: { enable_ear_stacker: true, enable_roulette: true }
      };
      
      if (!supabase) return defaultSettings;

      try {
          const { data, error } = await supabase
            .from('settings')
            .select('*')
            .in('key', ['working_hours', 'studio_details', 'monthly_goals', 'gallery_tags', 'features']);

          if (error || !data) return defaultSettings;

          const newSettings = { ...defaultSettings };
          data.forEach(row => {
            if (row.key === 'working_hours') newSettings.working_hours = row.value;
            else if (row.key === 'studio_details') newSettings.studio_details = { ...defaultSettings.studio_details, ...row.value };
            else if (row.key === 'monthly_goals') newSettings.monthly_goals = { ...defaultSettings.monthly_goals, ...row.value };
            else if (row.key === 'gallery_tags') newSettings.gallery_tags = row.value;
            else if (row.key === 'features') newSettings.features = { ...defaultSettings.features, ...row.value };
          });
          
          cachedSettings = newSettings;
          return newSettings;
      } catch (e) {
          return defaultSettings;
      }
  },

  updateSettings: async (settings: StudioSettings): Promise<boolean> => {
      if (!supabase) return false;
      const updates = [
        { key: 'working_hours', value: settings.working_hours },
        { key: 'studio_details', value: settings.studio_details },
        { key: 'monthly_goals', value: settings.monthly_goals },
        { key: 'gallery_tags', value: settings.gallery_tags },
        { key: 'features', value: settings.features }
      ];
      const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'key' });
      if (!error) cachedSettings = settings;
      return !error;
  },

  // --- Services ---
  getServices: async (): Promise<Service[]> => {
    if (cachedServices) return cachedServices;
    if (!supabase) return SERVICES;
    const { data, error } = await supabase.from('services').select('*').eq('is_active', true).order('price', { ascending: true });
    cachedServices = data || SERVICES;
    return cachedServices;
  },

  addService: async (service:  Omit<Service, 'id'>) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('services').insert([service]).select().single();
    cachedServices = null;
    return data;
  },

  updateService: async (id: string, updates: Partial<Service>) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single();
    cachedServices = null;
    return data;
  },

  deleteService: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('services').update({ is_active: false }).eq('id', id);
    cachedServices = null;
    return !error;
  },

  // --- Coupons (Updated to use DB table) ---
  getCoupons: async (): Promise<Coupon[]> => {
      if (!supabase) return [];
      const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      return data || [];
  },

  saveCoupons: async (coupons: Coupon[]) => {
      if (!supabase) return false;
      // Note: This logic is for Admin mass saving if needed, but we usually upsert individually
      const { error } = await supabase.from('coupons').upsert(coupons);
      return !error;
  },

  createCoupon: async (coupon: Omit<Coupon, 'id' | 'usage_count'>): Promise<Coupon | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase.from('coupons').insert([coupon]).select().single();
      return data;
  },

  validateCoupon: async (code: string): Promise<Coupon | null> => {
      if (!supabase) return null;
      const { data } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).single();
      return data || null;
  },

  deleteCoupon: async (id: string) => {
      if (!supabase) return false;
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      return !error;
  },

  // --- Appointments ---
  getAvailability: async (date: Date): Promise<TimeSlot[]> => {
    const settings = await api.getSettings();
    const workingHours = settings.working_hours;
    const dayIndex = date.getDay().toString();
    const dayConfig = workingHours[dayIndex];
    if (!dayConfig || !dayConfig.isOpen) return [];
    let allSlots: string[] = [];
    dayConfig.ranges.forEach(range => {
        for (let hour = range.start; hour < range.end; hour++) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    });
    const slotsWithStatus = allSlots.map(time => ({ time, available: true }));
    if (!supabase) return slotsWithStatus;
    const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);
    const { data: existing } = await supabase.from('appointments').select('start_time, end_time').gte('start_time', startOfDay.toISOString()).lte('start_time', endOfDay.toISOString()).neq('status', 'cancelled');
    const busyRanges = existing?.map(app => ({ start: new Date(app.start_time).getTime(), end: new Date(app.end_time).getTime() })) || [];
    return slotsWithStatus.map(slot => {
        const [h, m] = slot.time.split(':').map(Number);
        const slotDate = new Date(date); slotDate.setHours(h, m, 0, 0);
        const isBusy = busyRanges.some(range => slotDate.getTime() >= range.start && slotDate.getTime() < range.end);
        return { ...slot, available: !isBusy };
    });
  },

  createAppointment: async (appt: Partial<Appointment>) => {
    if (!supabase) return { id: 'mock', ...appt } as Appointment;
    const payload = {
      service_id: appt.service_id,
      start_time: appt.start_time,
      end_time: appt.final_price ? new Date(new Date(appt.start_time!).getTime() + 30 * 60000).toISOString() : new Date(new Date(appt.start_time!).getTime() + 30 * 60000).toISOString(),
      guest_name: appt.client_name,
      guest_email: appt.client_email,
      guest_phone: appt.client_phone,
      notes: appt.notes,
      signature: appt.signature,
      status: 'pending'
    };
    const { data, error } = await supabase.from('appointments').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  getAppointments: async (): Promise<Appointment[]> => {
    if (!supabase) return MOCK_APPOINTMENTS as Appointment[];
    const { data } = await supabase.from('appointments').select(`*, services (name, price)`).order('start_time', { ascending: false });
    return data?.map((item: any) => ({
      id: item.id,
      client_name: item.guest_name,
      client_email: item.guest_email,
      client_phone: item.guest_phone,
      service_id: item.service_id,
      service_name: item.services?.name, 
      service_price: item.services?.price,
      start_time: item.start_time,
      status: item.status,
      notes: item.notes,
      signature: item.signature
    })) || [];
  },

  updateAppointmentStatus: async (id: string, status: string) => {
      if (!supabase) return true;
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      return !error;
  },

  updateAppointment: async (id: string, updates: Partial<Appointment>) => {
      if (!supabase) return true;
      const { error } = await supabase.from('appointments').update(updates).eq('id', id);
      return !error;
  },

  getMonthlyStats: async () => {
      if (!supabase) return { revenue: 0, appointments: 0, pending: 0 };
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase.from('appointments').select(`status, services(price)`).gte('start_time', startOfMonth).neq('status', 'cancelled');
      let revenue = 0; let pending = 0;
      data?.forEach((app: any) => {
          revenue += (app.services?.price || 0);
          if (app.status === 'pending') pending++;
      });
      return { revenue, appointments: data?.length || 0, pending };
  },

  getGallery: async () => {
    if (cachedGallery) return cachedGallery;
    if(!supabase) return [];
    const { data: galleryData } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
    if (!galleryData) return [];
    const settings = await api.getSettings();
    const tags = settings.gallery_tags || {};
    const services = await api.getServices();
    const enrichedGallery = galleryData.map((item: any) => {
        const itemTags = tags[item.id] || [];
        const taggedServices = itemTags.map((tagId: string) => services.find(s => s.id === tagId)).filter(Boolean);
        return { ...item, taggedServices };
    });
    cachedGallery = enrichedGallery;
    return enrichedGallery;
  },

  addToGallery: async (imageUrl: string) => {
      if(!supabase) return;
      await supabase.from('gallery').insert([{ image_url: imageUrl }]);
      cachedGallery = null;
  },

  deleteFromGallery: async (id: string) => {
      if(!supabase) return false;
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      cachedGallery = null;
      return !error;
  },

  uploadImage: async (file: File, bucket: string): Promise<string | null> => {
      if(!supabase) return null;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
      if (uploadError) return null;
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return data.publicUrl;
  }
};