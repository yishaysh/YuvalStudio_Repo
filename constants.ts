
import { Service, Appointment, StudioSettings, StudioDetails, MonthlyGoals } from './types';

export const JEWELRY_CATALOG = [
  { 
    id: 'j_helix_gold', 
    name: 'Classic Gold Hoop', 
    price: 180, 
    image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=200&auto=format&fit=crop', 
    category: 'Ear', 
    description: 'חישוק זהב 14K קלאסי, מתאים להליקס.',
    allowed_locations: ['Helix', 'Lobe', 'Cartilage']
  },
  { 
    id: 'j_stud_dia', 
    name: 'Diamond Solitaire', 
    price: 250, 
    image_url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?q=80&w=200&auto=format&fit=crop', 
    category: 'Ear', 
    description: 'נקודת יהלום עדינה בשיבוץ מלא.',
    allowed_locations: ['Lobe', 'Tragus', 'Helix', 'Conch']
  },
  { 
    id: 'j_conch_cuff', 
    name: 'Textured Gold Cuff', 
    price: 220, 
    image_url: 'https://images.unsplash.com/photo-1599643478518-17488fbbcd75?q=80&w=200&auto=format&fit=crop', 
    category: 'Ear', 
    description: 'חישוק עבה בטקסטורה מחוספסת לקונץ\'.',
    allowed_locations: ['Conch', 'Lobe']
  },
  { 
    id: 'j_tragus_gem', 
    name: 'Opal Stud', 
    price: 150, 
    image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=200&auto=format&fit=crop', 
    category: 'Ear', 
    description: 'אבן אופל טבעית עם מסגרת זהב.',
    allowed_locations: ['Tragus', 'Forward Helix', 'Rook']
  },
  { 
    id: 'j_lobe_chain', 
    name: 'Gold Connector Chain', 
    price: 200, 
    image_url: 'https://images.unsplash.com/photo-1630019852942-e5e1237d6d49?q=80&w=200&auto=format&fit=crop', 
    category: 'Ear', 
    description: 'שרשרת חיבור עדינה בין שני חורים.',
    allowed_locations: ['Lobe', 'Helix']
  }
];

export const SERVICES: Service[] = [
  {
    id: '1',
    name: 'עגיל בתנוך (זוג)',
    description: 'ניקוב קלאסי בתנוך עם עגילי טיטניום. זמן החלמה: 6-8 שבועות.',
    price: 60,
    duration_minutes: 30,
    category: 'Ear',
    image_url: 'https://picsum.photos/400/400?grayscale',
    pain_level: 2
  },
  {
    id: '2',
    name: 'הליקס / סחוס',
    description: 'ניקוב בחלק העליון של האוזן. טכניקת מחט מדויקת. זמן החלמה: 3-6 חודשים.',
    price: 45,
    duration_minutes: 30,
    category: 'Ear',
    image_url: 'https://picsum.photos/401/401?grayscale',
    pain_level: 4
  },
  {
    id: '3',
    name: 'נזם',
    description: 'מיקום מדויק עם יהלום או זהב. זמן החלמה: 2-4 חודשים.',
    price: 55,
    duration_minutes: 30,
    category: 'Face',
    image_url: 'https://picsum.photos/402/402?grayscale',
    pain_level: 5
  },
  {
    id: '4',
    name: 'ספטום קליקר',
    description: 'פירסינג ספטום מיושר בצורה מושלמת. אפשרויות שדרוג תכשיט.',
    price: 70,
    duration_minutes: 45,
    category: 'Face',
    image_url: 'https://picsum.photos/403/403?grayscale',
    pain_level: 6
  },
  {
    id: '5',
    name: 'אינדסטריאל',
    description: 'שני חורים בסחוס המחוברים במוט אחד. הצהרה נועזת.',
    price: 85,
    duration_minutes: 60,
    category: 'Ear',
    image_url: 'https://picsum.photos/404/404?grayscale',
    pain_level: 7
  },
  {
    id: '6',
    name: 'עגיל בטבור',
    description: 'פירסינג טבור סטנדרטי עם בננה מטיטניום מלוטש.',
    price: 65,
    duration_minutes: 45,
    category: 'Body',
    image_url: 'https://picsum.photos/405/405?grayscale',
    pain_level: 4
  }
];

// Default configuration: Sunday-Thursday 11-20, Friday 10-15, Saturday Closed
export const DEFAULT_WORKING_HOURS: StudioSettings['working_hours'] = {
  "0": { isOpen: true, ranges: [{ start: 11, end: 20 }] }, // Sunday
  "1": { isOpen: true, ranges: [{ start: 11, end: 20 }] }, // Monday
  "2": { isOpen: true, ranges: [{ start: 11, end: 20 }] }, // Tuesday
  "3": { isOpen: true, ranges: [{ start: 11, end: 20 }] }, // Wednesday
  "4": { isOpen: true, ranges: [{ start: 11, end: 20 }] }, // Thursday
  "5": { isOpen: true, ranges: [{ start: 10, end: 15 }] }, // Friday
  "6": { isOpen: false, ranges: [] }, // Saturday
};

export const DEFAULT_STUDIO_DETAILS: StudioDetails = {
  name: 'Yuval Studio',
  phone: '050-1234567',
  address: 'דיזנגוף 100, תל אביב',
  email: 'info@yuvalstudio.com'
};

export const DEFAULT_MONTHLY_GOALS: MonthlyGoals = {
  revenue: 20000,
  appointments: 100
};

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt_1',
    client_name: 'שרה קונור',
    client_email: 'sarah@example.com',
    client_phone: '050-5550123',
    service_id: '1',
    start_time: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    status: 'confirmed'
  },
  {
    id: 'apt_2',
    client_name: 'ג׳ון וויק',
    client_email: 'john@example.com',
    client_phone: '054-5550999',
    service_id: '4',
    start_time: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
    status: 'pending'
  }
];
