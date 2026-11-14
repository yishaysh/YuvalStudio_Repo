/**
 * Shared client + server validation helpers.
 */

export const ISRAELI_PHONE_REGEX = /^(?:(?:\+?972)|0)(?:[23489]|5[0-9]|7[0-9])\d{7}$/;

export function cleanPhoneDigits(raw: string): string {
  return (raw || '').replace(/[\s\-().]/g, '').trim();
}

export function isValidIsraeliPhone(raw: string): boolean {
  const cleaned = cleanPhoneDigits(raw);
  if (!cleaned) return false;
  return ISRAELI_PHONE_REGEX.test(cleaned);
}

export function toWhatsAppPhone972(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return `972${digits}`;
}

export interface JewelryOrderFormInput {
  clientName: string;
  clientPhone: string;
  deliveryMethod: 'pickup' | 'delivery';
  shippingAddress?: string;
  notes?: string;
  items: Array<{ id?: string; product_id?: string; name?: string; quantity: number }>;
}

export interface JewelryOrderValidationResult {
  isValid: boolean;
  errors: {
    clientName?: string;
    clientPhone?: string;
    shippingAddress?: string;
    items?: string;
  };
  normalized: {
    clientName: string;
    clientPhone: string;
    deliveryMethod: 'pickup' | 'delivery';
    shippingAddress?: string;
    notes?: string;
  };
}

export function validateJewelryOrderInput(input: JewelryOrderFormInput): JewelryOrderValidationResult {
  const errors: JewelryOrderValidationResult['errors'] = {};
  const clientName = (input.clientName || '').trim();
  const clientPhone = cleanPhoneDigits(input.clientPhone || '');
  const deliveryMethod = input.deliveryMethod === 'pickup' ? 'pickup' : 'delivery';
  const shippingAddress = (input.shippingAddress || '').trim();
  const notes = (input.notes || '').trim();

  if (clientName.length < 2 || !/[a-zA-Z\u0590-\u05FF]/.test(clientName)) {
    errors.clientName = 'נא להזין שם מלא תקין (לפחות 2 תווים)';
  }

  if (!isValidIsraeliPhone(clientPhone)) {
    errors.clientPhone = 'נא להזין מספר טלפון ישראלי תקין (למשל 050-1234567)';
  }

  if (deliveryMethod === 'delivery') {
    if (shippingAddress.length < 6 || !/[a-zA-Z\u0590-\u05FF]/.test(shippingAddress)) {
      errors.shippingAddress = 'נא להזין כתובת מלאה למשלוח (עיר, רחוב ומספר בית)';
    }
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    errors.items = 'יש לבחור לפחות פריט אחד להזמנה';
  } else {
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 99) {
        errors.items = 'כמות הפריטים בהזמנה אינה תקינה';
        break;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      clientName: clientName.slice(0, 120),
      clientPhone,
      deliveryMethod,
      shippingAddress: deliveryMethod === 'delivery' ? shippingAddress.slice(0, 300) : undefined,
      notes: notes ? notes.slice(0, 500) : undefined,
    },
  };
}

export function validateBookingCustomerInput(input: {
  client_name?: string;
  client_phone?: string;
  is_under_16?: boolean;
  parent_name?: string;
  parent_id?: string;
  parent_phone?: string;
  is_quick_sale?: boolean;
}): string | null {
  const name = (input.client_name || '').trim();
  const phone = cleanPhoneDigits(input.client_phone || '');

  if (!input.is_quick_sale) {
    if (name.length < 2 || !/[a-zA-Z\u0590-\u05FF]/.test(name)) {
      return 'נא להזין שם מלא תקין';
    }
    if (!isValidIsraeliPhone(phone)) {
      return 'נא להזין מספר טלפון ישראלי תקין (למשל 054-1234567)';
    }
  } else if (phone && !isValidIsraeliPhone(phone)) {
    return 'מספר הטלפון שהוזן אינו תקין';
  }

  if (input.is_under_16) {
    const parentName = (input.parent_name || '').trim();
    const parentId = (input.parent_id || '').replace(/\D/g, '').trim();
    const parentPhone = cleanPhoneDigits(input.parent_phone || '');
    if (parentName.length < 2) {
      return 'עבור לקוח מתחת לגיל 16 חובה להזין שם הורה מלא';
    }
    if (parentId.length < 5 || parentId.length > 9) {
      return 'עבור לקוח מתחת לגיל 16 חובה להזין תעודת זהות הורה תקינה';
    }
    if (!isValidIsraeliPhone(parentPhone)) {
      return 'עבור לקוח מתחת לגיל 16 חובה להזין מספר טלפון הורה תקין';
    }
  }

  return null;
}

export function sanitizeExternalUrl(url: string | undefined | null, fallback = ''): string {
  const raw = (url || '').trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // fallback below
  }
  return fallback;
}

export function extractInstagramHandle(url: string | undefined | null): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    const first = segments[0].toLowerCase();
    // Ignore non-profile IG paths such as /stories/highlights/... or /p/... or /reel/...
    if (['stories', 'p', 'reel', 'reels', 'explore', 'accounts', 'tv'].includes(first)) {
      return null;
    }
    return segments[0];
  } catch {
    return null;
  }
}

export function pluralizeHebrew(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
