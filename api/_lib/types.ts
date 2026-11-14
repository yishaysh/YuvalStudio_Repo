import type {
  Appointment,
  Coupon,
  Expense,
  GalleryItem,
  JewelryItem,
  JewelryOrder,
  MonthlyGoals,
  Profile,
  Service,
  StudioDetails,
  StudioSettings,
} from '../../types';
import type { WorkingHoursMap } from '../../shared/availability';

export interface SessionPayload {
  profileId: string;
  email: string;
  role: 'client' | 'admin';
  name?: string;
  iat: number;
  exp: number;
}

export interface ApiRequestContext {
  method: string;
  path: string;
  query: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  cookies: Record<string, string>;
  body: any;
  isHttps?: boolean;
}

export interface ApiResponseResult {
  status: number;
  headers?: Record<string, string>;
  setCookies?: string[];
  body: any;
}

export interface WaitlistEntry {
  id: string;
  client_name: string;
  client_phone: string;
  preferred_date?: string;
  service_names?: string;
  notes?: string;
  created_at: string;
}

export interface PublicStudioSettingsDto {
  working_hours: WorkingHoursMap;
  studio_details: StudioDetails;
  gallery_tags: Record<string, string[]>;
  enable_ai: boolean;
  enable_gallery: boolean;
  enable_style_matcher: boolean;
  show_pain_level: boolean;
  enable_ar: boolean;
  booking_horizon_days: number;
  shipping_fee?: number;
  free_shipping_threshold?: number;
  shipping_eta?: string;
}

export interface NotificationDeliveryResult {
  telegram: 'sent' | 'skipped' | 'failed';
  email: 'sent' | 'skipped' | 'failed';
  error?: string;
}

export interface ServerGoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export type GoogleTokenVerifier = (accessToken: string) => Promise<ServerGoogleUserInfo>;

export interface OrderCreateInput {
  idempotencyKey?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  deliveryMethod: 'pickup' | 'delivery';
  shippingAddress?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

export interface AppointmentCreateInput {
  idempotencyKey?: string;
  client_id?: string | null;
  service_ids: string[];
  jewelry_ids?: string[];
  start_time: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  notes?: string;
  coupon_code?: string;
  referred_by?: string;
  signature?: string;
  visual_plan?: string;
  ai_recommendation_text?: string;
  anatomy_image_data_url?: string;
  ai_image_data_url?: string;
  anatomy_status?: 'pending' | 'approved' | 'rejected';
  is_under_16?: boolean;
  parent_name?: string;
  parent_id?: string;
  parent_phone?: string;
  is_quick_sale?: boolean;
}

export interface StoreAdapter {
  // Settings & Catalog (public + admin)
  getRawSettings(): Promise<StudioSettings>;
  getPublicSettings(): Promise<PublicStudioSettingsDto>;
  updateSettings(settings: Partial<StudioSettings>): Promise<StudioSettings>;

  // Services
  getServices(includeInactive?: boolean): Promise<Service[]>;
  addService(service: Omit<Service, 'id'>): Promise<Service>;
  updateService(id: string, updates: Partial<Service>): Promise<Service | null>;
  deleteService(id: string): Promise<boolean>;

  // Coupons
  validateCoupon(code: string, cartTotalShekels: number): Promise<{ isValid: boolean; error?: string; coupon?: Coupon }>;

  // Availability & Appointments
  getAppointmentBusyIntervals(fromIso: string, toIso: string): Promise<Array<{ id: string; start_time: string; end_time: string; status: string }>>;
  createAppointmentAtomic(payload: {
    idempotencyKey?: string;
    client_id: string | null;
    service_id: string | null;
    service_name: string;
    start_time: string;
    end_time: string;
    price: number;
    final_price: number;
    status: Appointment['status'];
    notes?: string;
    guest_name: string;
    guest_email?: string;
    guest_phone: string;
    signature?: string;
    total_cost?: number;
    total_profit?: number;
    cart_items?: any[];
    visual_plan?: string;
    ai_recommendation_text?: string;
    anatomy_image_url?: string;
    anatomy_status?: string;
    coupon_code?: string;
    is_under_16?: boolean;
    parent_name?: string;
    parent_id?: string;
    parent_phone?: string;
    referralCodeUsed?: string;
    bypassOverlapCheck?: boolean;
  }): Promise<{ appointment: Appointment; created: boolean }>;
  getAdminAppointments(): Promise<Appointment[]>;
  getAppointmentsForUser(userId: string): Promise<Appointment[]>;
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null>;
  deleteAppointment(id: string): Promise<boolean>;
  clearAppointments(): Promise<boolean>;

  // Monthly stats & Expenses (Admin only)
  getMonthlyStats(): Promise<{ revenue: number; profit: number; appointments: number; pending: number }>;
  getExpenses(month?: number, year?: number): Promise<Expense[]>;
  addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense>;
  deleteExpense(id: string): Promise<boolean>;

  // Gallery
  getGallery(page?: number, limit?: number): Promise<{ items: any[]; total: number }>;
  addToGallery(imageUrl: string): Promise<GalleryItem>;
  deleteFromGallery(id: string): Promise<boolean>;

  // Profiles / User personal area
  upsertGoogleProfile(info: ServerGoogleUserInfo, adminEmails: string[]): Promise<Profile>;
  getProfileById(id: string): Promise<Profile | null>;
  updateProfileSafe(id: string, updates: { full_name?: string; phone?: string; avatar_url?: string }): Promise<Profile | null>;
  toggleWishlist(userId: string, itemId: string): Promise<string[]>;
  getWishlist(userId: string): Promise<any[]>;
  checkInAftercare(userId: string): Promise<string | null>;
  getLastAftercareCheckin(userId: string): Promise<string | null>;

  // Orders (public idempotent submit + admin read/update/delete)
  createJewelryOrderIdempotent(payload: {
    idempotencyKey?: string;
    orderNumberPrefix?: string;
    client_name: string;
    client_phone: string;
    client_email?: string;
    items: any[];
    total_price: number;
    delivery_method: 'pickup' | 'delivery';
    shipping_address?: string;
    shipping_cost: number;
    notes?: string;
  }): Promise<{ order: JewelryOrder; created: boolean }>;
  updateJewelryOrderNotificationState(
    orderId: string,
    status: 'sent' | 'failed' | 'skipped',
    error?: string
  ): Promise<void>;
  getJewelryOrders(): Promise<JewelryOrder[]>;
  updateJewelryOrderStatus(orderId: string, status: JewelryOrder['status']): Promise<boolean>;
  deleteJewelryOrder(orderId: string): Promise<boolean>;

  // Waitlist
  addWaitlistEntry(entry: Omit<WaitlistEntry, 'id' | 'created_at'>): Promise<WaitlistEntry>;
  getWaitlistEntries(): Promise<WaitlistEntry[]>;
}
