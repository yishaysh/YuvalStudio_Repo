export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: 'Ear' | 'Face' | 'Body' | 'Jewelry';
  image_url: string;
  pain_level: number; // 1-10
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'client' | 'admin';
  created_at?: string;
  wishlist?: string[]; // Array of Service IDs
  last_aftercare_checkin?: string; // ISO Date string
}

export interface GalleryItem {
  id: string;
  image_url: string;
  created_at: string;
  taggedServices?: Service[];
}

export interface Appointment {
  id: string;
  client_id?: string; // Foreign Key to Profile
  client_name: string;
  client_email: string;
  client_phone: string;
  service_id: string;
  service_name?: string;
  service_price?: number;
  start_time: string;
  end_time?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  signature?: string;
  created_at?: string;
  coupon_code?: string;

  // --- שדות מעודכנים/חדשים ---
  final_price?: number;
  price?: number;            // הוספנו כדי לתמוך בשליחה הישירה מה-Booking
  visual_plan?: string;      // השדה החדש שבו נשמר ה-JSON של ה-AI
  ai_recommendation_text?: string;
}

// שאר ה-Interfaces נשארים ללא שינוי, אבל הוספתי תמיכה ב-in_stock לתכשיטים במידה ותצטרך
export interface JewelryItem extends Service {
  in_stock?: boolean;
}

export interface DayAvailability {
  date: Date;
  isAvailable: boolean;
  slots: string[];
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface DaySchedule {
  isOpen: boolean;
  ranges: TimeRange[];
}

export interface StudioDetails {
  name: string;
  phone: string;
  address: string;
  email: string;
  instagram_url?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface MonthlyGoals {
  revenue: number;
  appointments: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'fixed' | 'percentage';
  value: number;
  minOrderAmount: number;
  isActive: boolean;
  maxUses?: number;
  usedCount?: number;
}

export interface StudioSettings {
  working_hours: {
    [key: string]: DaySchedule;
  };
  studio_details: StudioDetails;
  monthly_goals: MonthlyGoals;
  gallery_tags?: Record<string, string[]>;
  coupons: Coupon[];
  enable_ai?: boolean;
  enable_gallery?: boolean;

}

export enum BookingStep {
  SELECT_SERVICE = 1,
  AI_STYLIST = 2,
  SELECT_DATE = 3,
  DETAILS = 4,
  CONSENT = 5,
  CONFIRMATION = 6,
  SUCCESS = 7 // הוספתי Success למקרה שהשתמשנו בו ב-HandleBook
}