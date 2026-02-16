
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
      coupons: [],
      enable_ai: true,
      enable_gallery: true
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
        .in('key', ['working_hours', 'studio_details', 'monthly_goals', 'gallery_tags', 'coupons', 'enable_ai', 'enable_gallery']);

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
        } else if (row.key === 'gallery_tags') {
          newSettings.gallery_tags = row.value;
        } else if (row.key === 'coupons') {
          newSettings.coupons = row.value;
        } else if (row.key === 'enable_ai') {
          newSettings.enable_ai = row.value;
        } else if (row.key === 'enable_gallery') {
          newSettings.enable_gallery = row.value;
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
      { key: 'monthly_goals', value: settings.monthly_goals },
      { key: 'gallery_tags', value: settings.gallery_tags },
      { key: 'coupons', value: settings.coupons },
      { key: 'enable_ai', value: settings.enable_ai },
      { key: 'enable_gallery', value: settings.enable_gallery }
    ];

    const { error } = await supabase
      .from('settings')
      .upsert(updates, { onConflict: 'key' });

    if (!error) {
      // Update local cache immediately to prevent desync
      cachedSettings = { ...settings };
    }
    return !error;
  },

  validateCoupon: async (code: string, cartTotal: number): Promise<{ isValid: boolean, error?: string, coupon?: Coupon }> => {
    const settings = await api.getSettings();
    // Case insensitive check
    const coupon = settings.coupons?.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());

    if (!coupon) return { isValid: false, error: 'קופון לא נמצא' };
    if (!coupon.isActive) return { isValid: false, error: 'קופון זה אינו פעיל' };
    if (cartTotal < coupon.minOrderAmount) return { isValid: false, error: `מותנה בהזמנה מעל ₪${coupon.minOrderAmount}` };

    // Check usage limits
    if (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses) {
      return { isValid: false, error: 'קופון זה הגיע למכסת השימוש המקסימלית' };
    }

    return { isValid: true, coupon };
  },

  // --- Helper to ensure profile exists ---
  ensureProfileExists: async (userId: string): Promise<boolean> => {
    // 1. Check if exists
    const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (data) return true;

    console.log("Profile missing for user", userId, " - Attempting to create...");

    // 2. Fetch User Email from Auth
    const { data: { user } } = await supabase.auth.getUser();

    // Safety check: ensure the logged in user matches the target ID
    if (!user || user.id !== userId) {
      console.error("Cannot create profile: Auth user mismatch or not logged in.");
      return false;
    }

    // 3. Insert new profile
    const { error } = await supabase.from('profiles').insert([
      {
        id: userId,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'User',
        role: 'client'
      }
    ]);

    if (error) {
      console.error("Failed to create profile:", error);
      return false;
    }

    console.log("Profile created successfully.");
    return true;
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

  addService: async (service: Omit<Service, 'id'>): Promise<Service | null> => {
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

    const startTime = new Date(appt.start_time!);
    const duration = 30;

    // @ts-ignore
    let endTime = appt.end_time;
    if (!endTime) {
      endTime = new Date(startTime.getTime() + duration * 60000).toISOString();
    }

    // Append coupon info to notes if present
    let finalNotes = appt.notes || '';
    if (appt.coupon_code) {
      finalNotes += `\n\n=== פרטי קופון ===\nקוד: ${appt.coupon_code}\nמחיר סופי לחיוב: ₪${appt.final_price}`;
    }

    // --- Transaction-like Logic for Coupon ---
    // In a real DB we'd use a transaction. Here we optimistically update settings.
    if (appt.coupon_code) {
      const settings = await api.getSettings();
      const updatedCoupons = settings.coupons.map(c => {
        if (c.code === appt.coupon_code) {
          return { ...c, usedCount: (c.usedCount || 0) + 1 };
        }
        return c;
      });
      await api.updateSettings({ ...settings, coupons: updatedCoupons });
    }

    const payload = {
      client_id: appt.client_id,
      service_id: appt.service_id,
      start_time: appt.start_time,
      end_time: endTime,
      guest_name: appt.client_name,
      guest_email: appt.client_email,
      guest_phone: appt.client_phone,
      notes: finalNotes,
      signature: appt.signature,
      status: 'pending', // Default to pending
      price: appt.final_price, // Ensure price is saved
      final_price: appt.final_price,
      ai_recommendation_text: appt.ai_recommendation_text,
      visual_plan: appt.visual_plan
    };

    const { data, error } = await supabase.from('appointments').insert([payload]).select().single();

    if (error) {
      if (error.code === 'PGRST204') {
        console.error("Schema Mismatch: Missing columns in 'appointments' table. Please run migration SQL.");
        throw new Error("שגיאת מערכת: מבנה הנתונים אינו מעודכן. אנא פנה למנהל המערכת.");
      }
      throw error;
    }

    return {
      id: data.id,
      client_id: data.client_id,
      client_name: data.guest_name,
      client_email: data.guest_email,
      client_phone: data.guest_phone,
      service_id: data.service_id,
      start_time: data.start_time,
      status: data.status as Appointment['status'],
      notes: data.notes,
      signature: data.signature,
      created_at: data.created_at,
      coupon_code: appt.coupon_code,
      final_price: appt.final_price
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
        notes: item.notes,
        signature: item.signature,
        created_at: item.created_at,
        final_price: item.final_price, // Ensure we return this from DB
        visual_plan: item.visual_plan,
        ai_recommendation_text: item.ai_recommendation_text
      }));
    } catch (err) {
      console.error(err);
      return MOCK_APPOINTMENTS as Appointment[];
    }
  },

  getAppointmentsForUser: async (userId: string): Promise<Appointment[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            services (name, price)
        `)
        .eq('client_id', userId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        client_name: item.guest_name || 'לקוח רשום',
        client_email: item.guest_email,
        client_phone: item.guest_phone,
        service_id: item.service_id,
        service_name: item.services?.name,
        service_price: item.services?.price,
        start_time: item.start_time,
        status: item.status,
        notes: item.notes,
        signature: item.signature,
        created_at: item.created_at,
        final_price: item.final_price,
        visual_plan: item.visual_plan,
        ai_recommendation_text: item.ai_recommendation_text
      }));
    } catch (err) {
      console.error(err);
      return [];
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

  // --- DELETE ALL FUNCTION ---
  clearAppointments: async (): Promise<boolean> => {
    if (!supabase) return false;
    // We use a filter that matches all rows to satisfy safe delete policies if strict, 
    // or just straight delete.
    // NOTE: RLS Policies must allow DELETE for this to work.
    const { error } = await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
      .select(`status, services(price), final_price`)
      .gte('start_time', startOfMonth)
      .lte('start_time', endOfMonth)
      .neq('status', 'cancelled');

    let revenue = 0;
    let pending = 0;

    data?.forEach((app: any) => {
      if (app.status !== 'cancelled') {
        // Prefer final_price if exists, else service price
        revenue += (app.final_price !== undefined && app.final_price !== null) ? app.final_price : (app.services?.price || 0);
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

    if (!supabase) return [];

    // Fetch gallery images
    const { data: galleryData } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });

    if (!galleryData) return [];

    // Fetch tags from settings
    const settings = await api.getSettings();
    const tags = settings.gallery_tags || {};
    const services = await api.getServices();

    // Map tags to full service objects
    const enrichedGallery = galleryData.map((item: any) => {
      const itemTags = tags[item.id] || [];
      const taggedServices = itemTags.map((tagId: string) => services.find(s => s.id === tagId)).filter(Boolean);
      return {
        ...item,
        taggedServices
      };
    });

    cachedGallery = enrichedGallery;
    return enrichedGallery;
  },

  addToGallery: async (imageUrl: string) => {
    if (!supabase) return;
    await supabase.from('gallery').insert([{ image_url: imageUrl }]);
    cachedGallery = null; // Invalidate cache
  },

  deleteFromGallery: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('gallery').delete().eq('id', id);

    if (!error) cachedGallery = null; // Invalidate cache
    return !error;
  },

  // --- Storage ---
  uploadImage: async (file: File, bucket: 'service-images' | 'gallery-images'): Promise<string | null> => {
    if (!supabase) return null;

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
  },

  // Convert Base64 Data URL to File/Blob and upload
  uploadBase64Image: async (base64Data: string, bucket: 'service-images' | 'gallery-images'): Promise<string | null> => {
    if (!supabase) return null;

    try {
      // 1. Convert Base64 to Blob
      // Assume base64Data is without the "data:image/jpeg;base64," prefix or clean it
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // 2. Generate Path
      const fileName = `ai_upload_${Math.random().toString(36).substring(2)}.jpg`;

      // 3. Upload
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

      if (uploadError) {
        console.error("Supabase Upload Error:", uploadError);
        return null;
      }

      // 4. Get URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return data.publicUrl;

    } catch (e) {
      console.error("Error converting/uploading base64 image:", e);
      return null;
    }
  },
  // --- Wishlist ---
  toggleWishlist: async (userId: string, serviceId: string): Promise<string[]> => {
    if (!supabase) return [];

    // Ensure profile exists before trying to read/write
    await api.ensureProfileExists(userId);

    // 1. Get current profile
    const { data: profile } = await supabase.from('profiles').select('wishlist').eq('id', userId).maybeSingle();
    let currentWishlist: string[] = profile?.wishlist || [];

    // 2. Toggle
    if (currentWishlist.includes(serviceId)) {
      currentWishlist = currentWishlist.filter(id => id !== serviceId);
    } else {
      currentWishlist = [...currentWishlist, serviceId];
    }

    // 3. Update
    const { error } = await supabase.from('profiles').update({ wishlist: currentWishlist }).eq('id', userId);

    if (error) {
      console.error("Failed to update wishlist:", error);
      return [];
    }

    return currentWishlist;
  },

  getWishlist: async (userId: string): Promise<any[]> => {
    if (!supabase) return [];

    console.log("Fetching wishlist for user:", userId);

    // 1. Get IDs from profile
    const { data: profile, error: profileError } = await supabase.from('profiles').select('wishlist').eq('id', userId).maybeSingle();

    if (profileError) {
      console.error("Error fetching profile wishlist:", profileError);
      return [];
    }

    const ids = profile?.wishlist || [];
    console.log("Wishlist IDs found:", ids);

    if (ids.length === 0) return [];

    // 2. Fetch Services (Cached)
    const allServices = await api.getServices();
    const serviceMatches = allServices.filter(s => ids.includes(s.id));

    // 3. Fetch Gallery (Use standard getGallery to ensure same RLS/Logic as Jewelry page)
    const galleryItems = await api.getGallery();
    const galleryMatches = galleryItems.filter((item: any) => ids.includes(item.id));

    console.log("Gallery matches found:", galleryMatches.length);

    // Map gallery items to match Service interface for display
    const mappedGalleryItems = galleryMatches.map((item: any) => ({
      id: item.id,
      name: 'פריט גלריה',
      price: item.taggedServices?.[0]?.price || 0, // Try to inherit price from first tag
      image_url: item.image_url,
      category: 'Jewelry',
      description: 'פריט שנשמר מהגלריה',
      taggedServices: item.taggedServices // Keep tags for future use
    }));

    // Combine results
    const combined = [...serviceMatches, ...mappedGalleryItems];

    // Deduplicate
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

    console.log("Total unique wishlist items:", unique.length);
    return unique;
  },

  // --- Aftercare Persistence ---
  checkInAftercare: async (userId: string): Promise<boolean> => {
    if (!supabase) return false;

    await api.ensureProfileExists(userId);

    const now = new Date().toISOString();

    // Use select() to confirm the update happened
    const { data, error } = await supabase
      .from('profiles')
      .update({ last_aftercare_checkin: now })
      .eq('id', userId)
      .select();

    if (error) {
      console.error("Failed to check in aftercare:", error);
      return false;
    }

    // Check if any row was actually returned (implies update success)
    return data && data.length > 0;
  },

  getLastAftercareCheckin: async (userId: string): Promise<string | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select('last_aftercare_checkin').eq('id', userId).maybeSingle();
    if (error) {
      console.error("Failed to fetch last checkin:", error);
      return null;
    }
    if (!data) return null;

    console.log("Fetched Last Checkin:", data.last_aftercare_checkin);
    return data.last_aftercare_checkin;
  }
};
