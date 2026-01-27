
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: 'Ear' | 'Face' | 'Body' | 'Jewelry';
  image_url: string;
}

export interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service_id: string;
  service_name?: string; // Extended
  service_price?: number; // Extended
  start_time: string; // ISO String
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  signature?: string; // Base64 string of the signature
}

export interface DayAvailability {
  date: Date;
  isAvailable: boolean;
  slots: string[]; // "10:00", "11:00" etc.
}

export interface TimeRange {
  start: number; // 0-24
  end: number;   // 0-24
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
}

export interface MonthlyGoals {
  revenue: number;
  appointments: number;
}

export interface StudioSettings {
  // Key is "0" for Sunday, "1" for Monday, etc.
  working_hours: {
    [key: string]: DaySchedule; 
  };
  studio_details: StudioDetails;
  monthly_goals: MonthlyGoals;
}

export enum BookingStep {
  SELECT_SERVICE = 1,
  SELECT_DATE = 2,
  DETAILS = 3,
  CONSENT = 4,
  CONFIRMATION = 5
}
