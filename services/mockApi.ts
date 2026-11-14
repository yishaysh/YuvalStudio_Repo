import { DEFAULT_MONTHLY_GOALS, DEFAULT_STUDIO_DETAILS, DEFAULT_WORKING_HOURS, JEWELRY_CATALOG } from '../constants';
import type { DayAvailabilityResult } from '../shared/availability';
import { parsePriceToShekels } from '../shared/money';
import { AUTHORITATIVE_SHIPPING_POLICY, type ShippingPolicyConfig } from '../shared/shipping';

export type { DayAvailabilityResult, ShippingPolicyConfig };
import type {
  Appointment,
  Coupon,
  Expense,
  GalleryItem,
  JewelryItem,
  JewelryOrder,
  Profile,
  Service,
  StudioSettings,
  WaitlistRequest,
} from '../types';

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: 'booked' | 'past' | 'insufficient_duration';
  startIso?: string;
}

export interface BootstrapResponse {
  version: string;
  settings: StudioSettings;
  shippingPolicy: ShippingPolicyConfig;
  services: Service[];
  inventoryItems: JewelryItem[];
  gallery: { items: GalleryItem[]; total: number };
}

export interface AdminBootstrapResponse {
  appointments: Appointment[];
  services: Service[];
  settings: StudioSettings;
  stats: { revenue: number; profit: number; appointments: number; pending: number };
  gallery: { items: GalleryItem[]; total: number };
  orders: JewelryOrder[];
  waitlist: WaitlistRequest[];
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status = 500, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function normalizeService(raw: any): Service {
  return {
    id: String(raw?.id || ''),
    name: String(raw?.name || '').trim(),
    description: typeof raw?.description === 'string' ? raw.description : '',
    healing_time: typeof raw?.healing_time === 'string' ? raw.healing_time : undefined,
    price: parsePriceToShekels(raw?.price, 0),
    duration_minutes: Number(raw?.duration_minutes) > 0 ? Math.round(Number(raw.duration_minutes)) : 30,
    category: raw?.category || 'Ear',
    image_url: typeof raw?.image_url === 'string' ? raw.image_url : '',
    pain_level: Number(raw?.pain_level) > 0 ? Math.min(10, Math.round(Number(raw.pain_level))) : 0,
    cost_price: raw?.cost_price !== undefined && raw?.cost_price !== null ? parsePriceToShekels(raw.cost_price, 0) : undefined,
    stock_quantity: raw?.stock_quantity !== undefined && raw?.stock_quantity !== null ? Number(raw.stock_quantity) : undefined,
    is_active: raw?.is_active !== false,
  };
}

export function normalizeInventory(raw: any): JewelryItem {
  const base = normalizeService(raw);
  return {
    ...base,
    category: raw?.category || 'Jewelry',
    in_stock: raw?.in_stock !== false && (base.stock_quantity === undefined || base.stock_quantity > 0),
    material: typeof raw?.material === 'string' ? raw.material : undefined,
    gauge: typeof raw?.gauge === 'string' ? raw.gauge : undefined,
    diameter: typeof raw?.diameter === 'string' ? raw.diameter : undefined,
    allowed_locations: Array.isArray(raw?.allowed_locations) ? raw.allowed_locations : undefined,
  };
}

export function normalizeOrder(raw: any): JewelryOrder {
  return {
    ...raw,
    total_price: parsePriceToShekels(raw?.total_price, 0),
    shipping_cost: parsePriceToShekels(raw?.shipping_cost, 0),
    items: Array.isArray(raw?.items)
      ? raw.items.map((item: any) => ({
          ...item,
          price: parsePriceToShekels(item?.price, 0),
          quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
        }))
      : [],
  };
}

export function normalizeAppointment(raw: any): Appointment {
  return {
    ...raw,
    price: raw?.price !== undefined && raw?.price !== null ? parsePriceToShekels(raw.price, 0) : undefined,
    final_price:
      raw?.final_price !== undefined && raw?.final_price !== null
        ? parsePriceToShekels(raw.final_price, 0)
        : undefined,
    service_price:
      raw?.service_price !== undefined && raw?.service_price !== null
        ? parsePriceToShekels(raw.service_price, 0)
        : undefined,
  };
}

function normalizePublicSettings(raw: any): StudioSettings {
  const base: StudioSettings = {
    working_hours: raw?.working_hours || DEFAULT_WORKING_HOURS,
    studio_details: {
      ...DEFAULT_STUDIO_DETAILS,
      ...(raw?.studio_details || {}),
    },
    monthly_goals: raw?.monthly_goals || DEFAULT_MONTHLY_GOALS,
    gallery_tags: raw?.gallery_tags || {},
    coupons: Array.isArray(raw?.coupons) ? raw.coupons : [],
    enable_ai: raw?.enable_ai !== false,
    enable_gallery: raw?.enable_gallery !== false,
    enable_style_matcher: raw?.enable_style_matcher !== false,
    show_pain_level: raw?.show_pain_level !== false,
    enable_ar: raw?.enable_ar !== false,
    booking_horizon_days: raw?.booking_horizon_days ?? raw?.studio_details?.booking_horizon_days,
    shipping_fee: raw?.shipping_fee ?? raw?.studio_details?.shipping_fee,
    free_shipping_threshold: raw?.free_shipping_threshold ?? raw?.studio_details?.free_shipping_threshold,
    shipping_eta: raw?.shipping_eta ?? raw?.studio_details?.shipping_eta,
    whatsapp_templates: raw?.whatsapp_templates,
    inventory_items: Array.isArray(raw?.inventory_items) ? raw.inventory_items.map(normalizeInventory) : undefined,
    enable_telegram_notifications: raw?.enable_telegram_notifications,
    telegram_bot_token: raw?.telegram_bot_token,
    telegram_chat_id: raw?.telegram_chat_id,
    enable_email_notifications: raw?.enable_email_notifications,
    emailjs_service_id: raw?.emailjs_service_id,
    emailjs_template_id: raw?.emailjs_template_id,
    emailjs_public_key: raw?.emailjs_public_key,
    notification_email: raw?.notification_email,
    enable_calendar_sync: raw?.enable_calendar_sync,
  };
  return base;
}

async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });

  const text = await res.text();
  let json: any = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: text };
    }
  }

  if (!res.ok) {
    throw new ApiError(
      json?.error || `שגיאת שרת (${res.status})`,
      res.status,
      json?.code,
      json?.fieldErrors
    );
  }

  return json as T;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('שגיאה בקריאת קובץ התמונה'));
    reader.readAsDataURL(file);
  });
}

let cachedBootstrap: BootstrapResponse | null = null;
let bootstrapPromise: Promise<BootstrapResponse> | null = null;

export const invalidatePublicCache = () => {
  cachedBootstrap = null;
  bootstrapPromise = null;
};

export const api = {
  // --- Public Bootstrap & Settings ---
  async getBootstrap(forceRefresh = false): Promise<BootstrapResponse> {
    if (!forceRefresh && cachedBootstrap) return cachedBootstrap;
    if (!forceRefresh && bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = (async () => {
      try {
        const data = await apiFetch<any>('/api/bootstrap');
        const normalized: BootstrapResponse = {
          version: data.version || '',
          settings: normalizePublicSettings({
            ...data.settings,
            inventory_items: data.inventoryItems,
          }),
          shippingPolicy: data.shippingPolicy || AUTHORITATIVE_SHIPPING_POLICY,
          services: Array.isArray(data.services) ? data.services.map(normalizeService) : [],
          inventoryItems: Array.isArray(data.inventoryItems)
            ? data.inventoryItems.map(normalizeInventory)
            : JEWELRY_CATALOG.map(normalizeInventory),
          gallery: data.gallery || { items: [], total: 0 },
        };
        cachedBootstrap = normalized;
        return normalized;
      } finally {
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  },

  async getSettings(): Promise<StudioSettings> {
    const boot = await api.getBootstrap();
    return boot.settings;
  },

  async getServices(): Promise<Service[]> {
    const boot = await api.getBootstrap();
    return boot.services;
  },

  async getGallery(page = 1, limit = 12): Promise<{ items: GalleryItem[]; total: number }> {
    const data = await apiFetch<{ items: GalleryItem[]; total: number }>(
      `/api/gallery?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`
    );
    return {
      items: Array.isArray(data.items) ? data.items : [],
      total: Number(data.total) || 0,
    };
  },

  // --- Availability (P1-D) ---
  async getAvailabilityDetail(
    dateStr: string,
    durationMinutes = 30,
    signal?: AbortSignal
  ): Promise<DayAvailabilityResult> {
    return apiFetch<DayAvailabilityResult>(
      `/api/availability?date=${encodeURIComponent(dateStr)}&duration=${encodeURIComponent(String(durationMinutes))}`,
      { signal }
    );
  },

  async getAvailability(
    dateStr: string,
    durationMinutes = 30,
    signal?: AbortSignal
  ): Promise<TimeSlot[]> {
    const detail = await api.getAvailabilityDetail(dateStr, durationMinutes, signal);
    if (detail.status === 'error') {
      throw new ApiError(detail.reasonMessage || 'שגיאה בטעינת הזמינות', 503);
    }
    return detail.slots.map(s => ({
      time: s.time,
      available: s.available,
      reason: s.reason,
      startIso: s.startIso,
    }));
  },

  // --- Coupons & Waitlist ---
  async validateCoupon(
    code: string,
    cartTotal: number
  ): Promise<{ isValid: boolean; error?: string; coupon?: Coupon }> {
    return apiFetch<{ isValid: boolean; error?: string; coupon?: Coupon }>('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, cartTotal }),
    });
  },

  async submitWaitlist(payload: {
    client_name: string;
    client_phone: string;
    preferred_date?: string;
    service_names?: string;
    notes?: string;
  }): Promise<{ entry: WaitlistRequest }> {
    return apiFetch<{ entry: WaitlistRequest }>('/api/waitlist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // --- Appointments & Orders ---
  async createAppointment(
    appt: Partial<Appointment> & {
      service_ids?: string[];
      jewelry_ids?: string[];
      idempotency_key?: string;
      anatomy_image_data_url?: string;
      ai_image_data_url?: string;
    }
  ): Promise<Appointment> {
    const res = await apiFetch<{
      appointment: Appointment;
      created: boolean;
      notification?: { telegram?: string; email?: string; error?: string };
    }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appt),
    });
    const normalized = normalizeAppointment(res.appointment);
    if (res.notification && (res.notification.telegram === 'failed' || res.notification.email === 'failed')) {
      normalized.notification_status = 'failed';
      normalized.notification_error = res.notification.error;
    }
    return normalized;
  },

  async createJewelryOrder(
    order: Partial<JewelryOrder> & {
      items: Array<{ id?: string; product_id?: string; name?: string; quantity: number; price?: number }>;
      idempotency_key?: string;
    }
  ): Promise<JewelryOrder> {
    const payload = {
      idempotency_key: order.idempotency_key,
      client_name: order.client_name,
      client_phone: order.client_phone,
      client_email: order.client_email,
      delivery_method: order.delivery_method === 'pickup' ? 'pickup' : 'delivery',
      shipping_address: order.shipping_address,
      notes: order.notes,
      items: (order.items || []).map(item => ({
        product_id: item.product_id || item.id || '',
        name: item.name,
        quantity: item.quantity,
      })),
    };
    const res = await apiFetch<{
      order: JewelryOrder;
      created: boolean;
      pricing: { goodsSubtotal: number; shippingFee: number; total: number; qualifiesForFreeShipping: boolean };
      notification?: { telegram?: string; email?: string; error?: string };
    }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const normalized = normalizeOrder(res.order);
    if (res.notification?.telegram === 'failed' || res.notification?.email === 'failed') {
      normalized.notification_status = 'failed';
      normalized.notification_error = res.notification.error;
    }
    return normalized;
  },

  // --- Auth & Client Personal Area ---
  async getSession(): Promise<{ user: Profile | null }> {
    return apiFetch<{ user: Profile | null }>('/api/auth/session');
  },

  async signInWithGoogleToken(accessToken: string, requireAdmin = false): Promise<Profile> {
    const res = await apiFetch<{ user: Profile }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ accessToken, requireAdmin }),
    });
    return res.user;
  },

  async logout(): Promise<void> {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  },

  async getAppointmentsForUser(_userId?: string): Promise<Appointment[]> {
    const res = await apiFetch<{ appointments: Appointment[] }>('/api/me/appointments');
    return (res.appointments || []).map(normalizeAppointment);
  },

  async updateMyProfile(updates: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  }): Promise<Profile> {
    const res = await apiFetch<{ user: Profile }>('/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.user;
  },

  async uploadMyAvatar(file: File): Promise<{ url: string; user: Profile }> {
    const dataUrl = await fileToDataUrl(file);
    return apiFetch<{ url: string; user: Profile }>('/api/me/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    });
  },

  async getWishlist(_userId?: string): Promise<any[]> {
    const res = await apiFetch<{ items: any[]; ids: string[] }>('/api/me/wishlist');
    return res.items || [];
  },

  async toggleWishlist(userIdOrItemId: string, maybeItemId?: string): Promise<string[]> {
    const itemId = maybeItemId ?? userIdOrItemId;
    const res = await apiFetch<{ wishlist: string[] }>('/api/me/wishlist', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    });
    return res.wishlist || [];
  },

  async getLastAftercareCheckin(_userId?: string): Promise<string | null> {
    const res = await apiFetch<{ lastCheckin: string | null }>('/api/me/aftercare');
    return res.lastCheckin || null;
  },

  async checkInAftercare(_userId?: string): Promise<boolean> {
    const res = await apiFetch<{ ok: boolean }>('/api/me/aftercare', {
      method: 'POST',
    });
    return Boolean(res.ok);
  },

  // --- Admin Operations (Server-enforced admin cookie required) ---
  async getAdminBootstrap(): Promise<AdminBootstrapResponse> {
    const data = await apiFetch<AdminBootstrapResponse>('/api/admin/bootstrap');
    return {
      ...data,
      appointments: (data.appointments || []).map(normalizeAppointment),
      services: (data.services || []).map(normalizeService),
      settings: normalizePublicSettings(data.settings),
      orders: (data.orders || []).map(normalizeOrder),
      waitlist: data.waitlist || [],
    };
  },

  async getAdminProfile(id: string): Promise<Profile | null> {
    try {
      const res = await apiFetch<{ profile: Profile }>(`/api/admin/profiles/${encodeURIComponent(id)}`);
      return res.profile;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  async updateSettings(settings: StudioSettings): Promise<boolean> {
    await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    invalidatePublicCache();
    return true;
  },

  async addService(service: Omit<Service, 'id'>): Promise<Service | null> {
    const res = await apiFetch<{ service: Service }>('/api/admin/services', {
      method: 'POST',
      body: JSON.stringify(service),
    });
    invalidatePublicCache();
    return normalizeService(res.service);
  },

  async updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
    const res = await apiFetch<{ service: Service }>(`/api/admin/services/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    invalidatePublicCache();
    return normalizeService(res.service);
  },

  async deleteService(id: string): Promise<boolean> {
    const res = await apiFetch<{ ok: boolean }>(`/api/admin/services/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    invalidatePublicCache();
    return Boolean(res.ok);
  },

  async getAppointments(): Promise<Appointment[]> {
    const res = await apiFetch<{ appointments: Appointment[] }>('/api/admin/appointments');
    return (res.appointments || []).map(normalizeAppointment);
  },

  async updateAppointmentStatus(id: string, status: Appointment['status']): Promise<boolean> {
    await apiFetch(`/api/admin/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return true;
  },

  async updateAppointmentTime(id: string, newStartIso: string, durationMinutes = 30): Promise<boolean> {
    const startMs = new Date(newStartIso).getTime();
    const endIso = new Date(startMs + Math.max(15, durationMinutes) * 60000).toISOString();
    await apiFetch(`/api/admin/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ start_time: new Date(startMs).toISOString(), end_time: endIso }),
    });
    return true;
  },

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<boolean> {
    await apiFetch(`/api/admin/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return true;
  },

  async deleteAppointment(id: string): Promise<boolean> {
    const res = await apiFetch<{ ok: boolean }>(`/api/admin/appointments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return Boolean(res.ok);
  },

  async clearAppointments(): Promise<boolean> {
    const res = await apiFetch<{ ok: boolean }>('/api/admin/appointments/clear', {
      method: 'POST',
    });
    return Boolean(res.ok);
  },

  async getMonthlyStats(): Promise<{ revenue: number; profit: number; appointments: number; pending: number }> {
    return apiFetch('/api/admin/stats');
  },

  async getExpenses(month?: number, year?: number): Promise<Expense[]> {
    const qs = new URLSearchParams();
    if (month !== undefined) qs.set('month', String(month));
    if (year !== undefined) qs.set('year', String(year));
    const q = qs.toString();
    const res = await apiFetch<{ expenses: Expense[] }>(`/api/admin/expenses${q ? `?${q}` : ''}`);
    return res.expenses || [];
  },

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense | null> {
    const res = await apiFetch<{ expense: Expense }>('/api/admin/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
    return res.expense;
  },

  async deleteExpense(id: string): Promise<boolean> {
    const res = await apiFetch<{ ok: boolean }>(`/api/admin/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return Boolean(res.ok);
  },

  async addToGallery(imageUrl: string): Promise<GalleryItem> {
    const res = await apiFetch<{ item: GalleryItem }>('/api/admin/gallery', {
      method: 'POST',
      body: JSON.stringify({ image_url: imageUrl }),
    });
    invalidatePublicCache();
    return res.item;
  },

  async deleteFromGallery(id: string): Promise<boolean> {
    const res = await apiFetch<{ ok: boolean }>(`/api/admin/gallery/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    invalidatePublicCache();
    return Boolean(res.ok);
  },

  async uploadImage(file: File, folder: 'gallery-images' | 'service-images' = 'gallery-images'): Promise<string | null> {
    const dataUrl = await fileToDataUrl(file);
    return api.uploadBase64Image(dataUrl, folder);
  },

  async uploadBase64Image(
    dataUrl: string,
    folder: 'gallery-images' | 'service-images' = 'gallery-images'
  ): Promise<string | null> {
    const res = await apiFetch<{ url: string }>('/api/admin/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, folder }),
    });
    return res.url;
  },

  async getJewelryOrders(): Promise<JewelryOrder[]> {
    const res = await apiFetch<{ orders: JewelryOrder[] }>('/api/admin/orders');
    return (res.orders || []).map(normalizeOrder);
  },

  async updateJewelryOrderStatus(orderId: string, status: JewelryOrder['status']): Promise<boolean> {
    const res = await apiFetch<{ ok: boolean }>(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return Boolean(res.ok);
  },

  async deleteJewelryOrder(orderId: string): Promise<boolean> {
    const res = await apiFetch<{ ok: boolean }>(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    });
    return Boolean(res.ok);
  },

  async getWaitlist(): Promise<WaitlistRequest[]> {
    const res = await apiFetch<{ waitlist: WaitlistRequest[] }>('/api/admin/waitlist');
    return res.waitlist || [];
  },
};
