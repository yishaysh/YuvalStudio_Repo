import crypto from 'node:crypto';
import type {
  Appointment,
  Coupon,
  Expense,
  GalleryItem,
  JewelryOrder,
  Profile,
  Service,
  StudioSettings,
} from '../../types.js';
import {
  buildDefaultRawSettings,
  deterministicUuidFromKey,
  evaluateCouponAgainstTotal,
  generateUniqueOrderNumber,
  incrementCouponUsageList,
  normalizeInventoryItem,
  normalizeServiceRow,
  sanitizeProfile,
  toPublicSettingsDto,
} from './sanitize.js';
import type { PublicStudioSettingsDto, ServerGoogleUserInfo, StoreAdapter, WaitlistEntry } from './types.js';

export interface MemoryStoreFailureSimulation {
  failOrderInsert?: boolean;
  failAppointmentInsert?: boolean;
  failAvailabilityRead?: boolean;
  failNotification?: boolean;
}

export interface MemoryStoreSeed {
  settings?: Partial<StudioSettings>;
  services?: Service[];
  gallery?: GalleryItem[];
  appointments?: Appointment[];
  profiles?: Profile[];
  expenses?: Expense[];
  orders?: JewelryOrder[];
  waitlist?: WaitlistEntry[];
}

export class MemoryStore implements StoreAdapter {
  private settings: StudioSettings;
  private services: Service[];
  private gallery: GalleryItem[];
  private appointments: Appointment[];
  private profiles: Profile[];
  private expenses: Expense[];
  private orders: JewelryOrder[];
  private waitlist: WaitlistEntry[];
  public failures: MemoryStoreFailureSimulation = {};

  constructor(seed: MemoryStoreSeed = {}) {
    const def = buildDefaultRawSettings();
    this.settings = {
      ...def,
      ...seed.settings,
      studio_details: {
        ...def.studio_details,
        ...(seed.settings?.studio_details || {}),
      },
      working_hours: seed.settings?.working_hours || def.working_hours,
    };
    this.services = (seed.services || []).map(normalizeServiceRow);
    this.gallery = [...(seed.gallery || [])];
    this.appointments = [...(seed.appointments || [])];
    this.profiles = (seed.profiles || []).map(sanitizeProfile);
    this.expenses = [...(seed.expenses || [])];
    this.orders = [...(seed.orders || [])];
    this.waitlist = [...(seed.waitlist || [])];
  }

  async getRawSettings(): Promise<StudioSettings> {
    return structuredClone(this.settings);
  }

  async getPublicSettings(): Promise<PublicStudioSettingsDto> {
    const activeIds = new Set(this.services.filter(s => s.is_active !== false).map(s => s.id));
    return toPublicSettingsDto(this.settings, activeIds);
  }

  async updateSettings(updates: Partial<StudioSettings>): Promise<StudioSettings> {
    this.settings = {
      ...this.settings,
      ...updates,
      studio_details: updates.studio_details
        ? { ...this.settings.studio_details, ...updates.studio_details }
        : this.settings.studio_details,
      monthly_goals: updates.monthly_goals
        ? { ...this.settings.monthly_goals, ...updates.monthly_goals }
        : this.settings.monthly_goals,
      inventory_items: updates.inventory_items
        ? updates.inventory_items.map(normalizeInventoryItem)
        : this.settings.inventory_items,
    };
    return structuredClone(this.settings);
  }

  async getServices(includeInactive = false): Promise<Service[]> {
    const list = includeInactive ? this.services : this.services.filter(s => s.is_active !== false);
    return list.map(normalizeServiceRow).sort((a, b) => a.price - b.price);
  }

  async addService(service: Omit<Service, 'id'>): Promise<Service> {
    const created = normalizeServiceRow({
      ...service,
      id: crypto.randomUUID(),
      is_active: true,
    });
    this.services.push(created);
    return structuredClone(created);
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
    const idx = this.services.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.services[idx] = normalizeServiceRow({ ...this.services[idx], ...updates, id });
    return structuredClone(this.services[idx]);
  }

  async deleteService(id: string): Promise<boolean> {
    const idx = this.services.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.services[idx] = { ...this.services[idx], is_active: false };
    return true;
  }

  async validateCoupon(code: string, cartTotalShekels: number): Promise<{ isValid: boolean; error?: string; coupon?: Coupon }> {
    return evaluateCouponAgainstTotal(this.settings.coupons || [], code, cartTotalShekels);
  }

  async getAppointmentBusyIntervals(fromIso: string, toIso: string) {
    if (this.failures.failAvailabilityRead) {
      throw new Error('Simulated DB failure reading availability');
    }
    const fromMs = new Date(fromIso).getTime();
    const toMs = new Date(toIso).getTime();
    return this.appointments
      .filter(a => a.status !== 'cancelled')
      .map(a => ({
        id: a.id,
        start_time: a.start_time,
        end_time: a.end_time || new Date(new Date(a.start_time).getTime() + 30 * 60000).toISOString(),
        status: a.status,
      }))
      .filter(a => {
        const s = new Date(a.start_time).getTime();
        const e = new Date(a.end_time).getTime();
        return s < toMs && e > fromMs;
      });
  }

  async createAppointmentAtomic(payload: Parameters<StoreAdapter['createAppointmentAtomic']>[0]) {
    if (this.failures.failAppointmentInsert) {
      throw new Error('Simulated DB error creating appointment');
    }

    const rowId = payload.idempotencyKey
      ? deterministicUuidFromKey('appt', payload.idempotencyKey)
      : crypto.randomUUID();

    if (payload.idempotencyKey) {
      const existing = this.appointments.find(a => a.id === rowId);
      if (existing) {
        return { appointment: structuredClone(existing), created: false };
      }
    }

    if (!payload.bypassOverlapCheck) {
      const reqStart = new Date(payload.start_time).getTime();
      const reqEnd = new Date(payload.end_time).getTime();
      const conflict = this.appointments.some(a => {
        if (a.status === 'cancelled') return false;
        const s = new Date(a.start_time).getTime();
        const e = a.end_time ? new Date(a.end_time).getTime() : s + 30 * 60000;
        return reqStart < e && reqEnd > s;
      });
      if (conflict) {
        const err: any = new Error('המועד שנבחר נתפס זה עתה. אנא בחרי מועד פנוי אחר.');
        err.code = 'SLOT_CONFLICT';
        throw err;
      }
    }

    if (payload.coupon_code && this.settings.coupons) {
      this.settings.coupons = incrementCouponUsageList(this.settings.coupons, payload.coupon_code);
    }

    if (payload.referralCodeUsed) {
      const refIdx = this.profiles.findIndex(
        p => p.referral_code && p.referral_code.toUpperCase() === payload.referralCodeUsed!.trim().toUpperCase()
      );
      if (refIdx !== -1 && this.profiles[refIdx].id !== payload.client_id) {
        this.profiles[refIdx] = {
          ...this.profiles[refIdx],
          credit_balance: Number(this.profiles[refIdx].credit_balance || 0) + 30,
        };
      }
    }

    const created: Appointment = {
      id: rowId,
      client_id: payload.client_id || undefined,
      client_name: payload.guest_name,
      client_phone: payload.guest_phone,
      client_email: payload.guest_email,
      service_id: payload.service_id || '',
      service_name: payload.service_name,
      start_time: payload.start_time,
      end_time: payload.end_time,
      price: payload.price,
      final_price: payload.final_price,
      status: payload.status,
      notes: payload.notes,
      signature: payload.signature,
      total_cost: payload.total_cost,
      total_profit: payload.total_profit,
      cart_items: payload.cart_items,
      visual_plan: payload.visual_plan,
      ai_recommendation_text: payload.ai_recommendation_text,
      anatomy_image_url: payload.anatomy_image_url,
      anatomy_status: payload.anatomy_status as any,
      is_under_16: payload.is_under_16,
      parent_name: payload.parent_name,
      parent_id: payload.parent_id,
      parent_phone: payload.parent_phone,
      coupon_code: payload.coupon_code,
      created_at: new Date().toISOString(),
    };
    this.appointments.push(created);
    return { appointment: structuredClone(created), created: true };
  }

  async getAdminAppointments(): Promise<Appointment[]> {
    return structuredClone(this.appointments).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  async getAppointmentsForUser(userId: string): Promise<Appointment[]> {
    return structuredClone(this.appointments.filter(a => a.client_id === userId)).sort((a, b) =>
      b.start_time.localeCompare(a.start_time)
    );
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const idx = this.appointments.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.appointments[idx] = { ...this.appointments[idx], ...updates, id };
    return structuredClone(this.appointments[idx]);
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const before = this.appointments.length;
    this.appointments = this.appointments.filter(a => a.id !== id);
    return this.appointments.length < before;
  }

  async clearAppointments(): Promise<boolean> {
    this.appointments = [];
    return true;
  }

  async getMonthlyStats() {
    const now = new Date();
    const m = now.getUTCMonth();
    const y = now.getUTCFullYear();
    const inMonth = this.appointments.filter(a => {
      const dt = new Date(a.start_time);
      return dt.getUTCMonth() === m && dt.getUTCFullYear() === y;
    });
    let revenue = 0;
    let profit = 0;
    let pending = 0;
    for (const a of inMonth) {
      if (a.status !== 'cancelled') {
        revenue += Number(a.final_price ?? a.price ?? 0);
        profit +=
          a.total_profit !== undefined && a.total_profit !== null
            ? Number(a.total_profit)
            : Number(a.final_price ?? a.price ?? 0) - Number(a.total_cost || 0);
      }
      if (a.status === 'pending') pending++;
    }
    return { revenue, profit, appointments: inMonth.filter(a => a.status !== 'cancelled').length, pending };
  }

  async getExpenses(month?: number, year?: number): Promise<Expense[]> {
    const filtered = this.expenses.filter(e => {
      if (month === undefined || year === undefined) return true;
      const d = new Date(e.expense_date);
      return d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });
    return structuredClone(filtered);
  }

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const created: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.expenses.unshift(created);
    return structuredClone(created);
  }

  async deleteExpense(id: string): Promise<boolean> {
    const before = this.expenses.length;
    this.expenses = this.expenses.filter(e => e.id !== id);
    return this.expenses.length < before;
  }

  async getGallery(page = 1, limit = 12): Promise<{ items: any[]; total: number }> {
    const activeServices = await this.getServices(false);
    const activeMap = new Map(activeServices.map(s => [s.id, s]));
    const tags = this.settings.gallery_tags || {};
    const offset = Math.max(0, (page - 1) * limit);
    const slice = this.gallery.slice(offset, offset + limit).map(g => {
      const taggedIds: string[] = Array.isArray(tags[g.id]) ? tags[g.id] : [];
      const taggedServices = taggedIds.map(id => activeMap.get(id)).filter(Boolean);
      return { ...g, taggedServices };
    });
    return { items: slice, total: this.gallery.length };
  }

  async addToGallery(imageUrl: string): Promise<GalleryItem> {
    const created: GalleryItem = {
      id: crypto.randomUUID(),
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };
    this.gallery.unshift(created);
    return structuredClone(created);
  }

  async deleteFromGallery(id: string): Promise<boolean> {
    const before = this.gallery.length;
    this.gallery = this.gallery.filter(g => g.id !== id);
    return this.gallery.length < before;
  }

  async upsertGoogleProfile(info: ServerGoogleUserInfo, adminEmails: string[]): Promise<Profile> {
    const normalizedEmail = info.email.trim().toLowerCase();
    const isAdminEnv = adminEmails.includes(normalizedEmail);
    const existingIdx = this.profiles.findIndex(p => p.email.toLowerCase() === normalizedEmail);
    if (existingIdx !== -1) {
      const existing = this.profiles[existingIdx];
      const role = existing.role === 'admin' || isAdminEnv ? 'admin' : 'client';
      this.profiles[existingIdx] = {
        ...existing,
        full_name: info.name || existing.full_name,
        avatar_url: info.picture || existing.avatar_url,
        role,
      };
      return sanitizeProfile(this.profiles[existingIdx]);
    }
    const created = sanitizeProfile({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      full_name: info.name || normalizedEmail.split('@')[0],
      role: isAdminEnv ? 'admin' : 'client',
      auth_provider: 'google',
      avatar_url: info.picture,
      referral_code: `YUVAL-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      credit_balance: 0,
      wishlist: [],
      created_at: new Date().toISOString(),
    });
    this.profiles.push(created);
    return sanitizeProfile(created);
  }

  async getProfileById(id: string): Promise<Profile | null> {
    const p = this.profiles.find(x => x.id === id);
    return p ? sanitizeProfile(p) : null;
  }

  async updateProfileSafe(
    id: string,
    updates: { full_name?: string; phone?: string; avatar_url?: string }
  ): Promise<Profile | null> {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.profiles[idx] = {
      ...this.profiles[idx],
      ...(updates.full_name !== undefined ? { full_name: updates.full_name } : {}),
      ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
      ...(updates.avatar_url !== undefined ? { avatar_url: updates.avatar_url } : {}),
    };
    return sanitizeProfile(this.profiles[idx]);
  }

  async toggleWishlist(userId: string, itemId: string): Promise<string[]> {
    const idx = this.profiles.findIndex(p => p.id === userId);
    if (idx === -1) return [];
    const current = Array.isArray(this.profiles[idx].wishlist) ? [...this.profiles[idx].wishlist!] : [];
    const pos = current.indexOf(itemId);
    if (pos !== -1) current.splice(pos, 1);
    else current.push(itemId);
    this.profiles[idx] = { ...this.profiles[idx], wishlist: current };
    return current;
  }

  async getWishlist(userId: string): Promise<any[]> {
    const profile = await this.getProfileById(userId);
    const ids = profile?.wishlist || [];
    if (ids.length === 0) return [];
    const svcs = await this.getServices(false);
    const inv = (this.settings.inventory_items || []).map(normalizeInventoryItem);
    const gall = await this.getGallery(1, 50);
    const out: any[] = [];
    for (const id of ids) {
      const s = svcs.find(x => x.id === id);
      if (s) { out.push(s); continue; }
      const i = inv.find(x => x.id === id);
      if (i) { out.push(i); continue; }
      const g = gall.items.find((x: any) => x.id === id);
      if (g) out.push(g);
    }
    return out;
  }

  async checkInAftercare(userId: string): Promise<string | null> {
    const idx = this.profiles.findIndex(p => p.id === userId);
    if (idx === -1) return null;
    const nowIso = new Date().toISOString();
    this.profiles[idx] = { ...this.profiles[idx], last_aftercare_checkin: nowIso };
    return nowIso;
  }

  async getLastAftercareCheckin(userId: string): Promise<string | null> {
    const profile = await this.getProfileById(userId);
    return profile?.last_aftercare_checkin || null;
  }

  async createJewelryOrderIdempotent(payload: Parameters<StoreAdapter['createJewelryOrderIdempotent']>[0]) {
    if (this.failures.failOrderInsert) {
      throw new Error('Simulated database rejection on jewelry_orders insert');
    }

    const rowId = payload.idempotencyKey
      ? deterministicUuidFromKey('order', payload.idempotencyKey)
      : crypto.randomUUID();

    if (payload.idempotencyKey) {
      const existing = this.orders.find(o => o.id === rowId);
      if (existing) {
        return { order: structuredClone(existing), created: false };
      }
    }

    const order: JewelryOrder = {
      id: rowId,
      order_number: generateUniqueOrderNumber(),
      client_name: payload.client_name,
      client_phone: payload.client_phone,
      client_email: payload.client_email,
      items: payload.items,
      total_price: payload.total_price,
      delivery_method: payload.delivery_method,
      shipping_address: payload.shipping_address,
      shipping_cost: payload.shipping_cost,
      status: 'pending',
      notes: payload.notes,
      notification_status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.orders.unshift(order);
    return { order: structuredClone(order), created: true };
  }

  async updateJewelryOrderNotificationState(
    orderId: string,
    status: 'sent' | 'failed' | 'skipped',
    error?: string
  ): Promise<void> {
    const idx = this.orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      this.orders[idx] = {
        ...this.orders[idx],
        notification_status: status,
        notification_error: error,
      };
    }
  }

  async getJewelryOrders(): Promise<JewelryOrder[]> {
    return structuredClone(this.orders);
  }

  async updateJewelryOrderStatus(orderId: string, status: JewelryOrder['status']): Promise<boolean> {
    const idx = this.orders.findIndex(o => o.id === orderId);
    if (idx === -1) return false;
    this.orders[idx] = { ...this.orders[idx], status };
    return true;
  }

  async deleteJewelryOrder(orderId: string): Promise<boolean> {
    const before = this.orders.length;
    this.orders = this.orders.filter(o => o.id !== orderId);
    return this.orders.length < before;
  }

  async addWaitlistEntry(entry: Omit<WaitlistEntry, 'id' | 'created_at'>): Promise<WaitlistEntry> {
    const created: WaitlistEntry = {
      ...entry,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.waitlist.unshift(created);
    return structuredClone(created);
  }

  async getWaitlistEntries(): Promise<WaitlistEntry[]> {
    return structuredClone(this.waitlist);
  }
}
