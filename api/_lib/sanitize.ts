import crypto from 'node:crypto';
import { DEFAULT_MONTHLY_GOALS, DEFAULT_STUDIO_DETAILS, DEFAULT_WORKING_HOURS } from '../../constants.js';
import { DEFAULT_BOOKING_HORIZON_DAYS, normalizeHorizonDays, normalizeWorkingHoursRangeEndpoint, WorkingHoursMap } from '../../shared/availability.js';
import { parsePriceToShekels } from '../../shared/money.js';
import type { Coupon, JewelryItem, Profile, Service, StudioDetails, StudioSettings } from '../../types.js';
import type { PublicStudioSettingsDto } from './types.js';

export function normalizeCouponRow(raw: any): Coupon {
  const isActive = raw?.isActive !== undefined ? Boolean(raw.isActive) : raw?.is_active !== false;
  const minOrderAmount = Number(raw?.minOrderAmount ?? raw?.min_spend ?? 0) || 0;
  const maxUsesRaw = raw?.maxUses ?? raw?.max_uses;
  const maxUses = maxUsesRaw !== undefined && maxUsesRaw !== null && Number(maxUsesRaw) > 0 ? Number(maxUsesRaw) : undefined;
  const usedCount = Number(raw?.usedCount ?? raw?.current_uses ?? 0) || 0;

  return {
    id: String(raw?.id || ''),
    code: String(raw?.code || '').trim(),
    discountType: raw?.discountType === 'fixed' ? 'fixed' : 'percentage',
    value: Number(raw?.value) || 0,
    minOrderAmount,
    isActive,
    maxUses,
    usedCount,
    expiry_date: typeof raw?.expiry_date === 'string' && raw.expiry_date ? raw.expiry_date : undefined,
  };
}

export function evaluateCouponAgainstTotal(
  coupons: Coupon[],
  code: string,
  cartTotalShekels: number
): { isValid: boolean; error?: string; coupon?: Coupon } {
  const normalizedList = (coupons || []).map(normalizeCouponRow);
  const coupon = normalizedList.find(c => c.code.toLowerCase() === code.trim().toLowerCase());
  if (!coupon) return { isValid: false, error: 'קופון לא נמצא' };
  if (!coupon.isActive) return { isValid: false, error: 'הקופון אינו פעיל יותר' };
  if (coupon.expiry_date && new Date(coupon.expiry_date).getTime() < Date.now()) {
    return { isValid: false, error: 'תוקף הקופון פג' };
  }
  if (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses) {
    return { isValid: false, error: 'הקופון הגיע למגבלת השימושים' };
  }
  if (coupon.minOrderAmount > 0 && cartTotalShekels < coupon.minOrderAmount) {
    return { isValid: false, error: `קופון זה תקף בקנייה מעל ₪${coupon.minOrderAmount}` };
  }
  return { isValid: true, coupon };
}

export function incrementCouponUsageList(coupons: Coupon[], code: string): Coupon[] {
  const target = code.trim().toLowerCase();
  return (coupons || []).map(raw => {
    const norm = normalizeCouponRow(raw);
    if (norm.code.toLowerCase() !== target) return norm;
    return {
      ...norm,
      usedCount: (norm.usedCount || 0) + 1,
    };
  });
}

export function normalizeServiceRow(row: any): Service {
  const price = parsePriceToShekels(row?.price, 0);
  const rawDuration = Number(row?.duration_minutes);
  const duration_minutes = Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration) : 30;
  const rawPain = Number(row?.pain_level);
  const pain_level = Number.isFinite(rawPain) && rawPain > 0 ? Math.min(10, Math.round(rawPain)) : 0;

  return {
    id: String(row?.id || ''),
    name: String(row?.name || '').trim(),
    description: typeof row?.description === 'string' ? row.description.trim() : '',
    healing_time: typeof row?.healing_time === 'string' ? row.healing_time.trim() : undefined,
    price,
    duration_minutes,
    category: row?.category || 'Ear',
    image_url: typeof row?.image_url === 'string' ? row.image_url : '',
    pain_level,
    cost_price: row?.cost_price !== undefined && row?.cost_price !== null ? parsePriceToShekels(row.cost_price, 0) : undefined,
    stock_quantity: row?.stock_quantity !== undefined && row?.stock_quantity !== null ? Number(row.stock_quantity) : undefined,
    is_active: row?.is_active !== false,
  };
}

export function toPublicService(service: Service): Omit<Service, 'cost_price'> {
  const normalized = normalizeServiceRow(service);
  const { cost_price: _omitted, ...publicPart } = normalized;
  return publicPart;
}

export function normalizeInventoryItem(raw: any): JewelryItem {
  const price = parsePriceToShekels(raw?.price, 0);
  const costPrice = parsePriceToShekels(raw?.cost_price, 0);
  const stockQty =
    raw?.stock_quantity !== undefined && raw?.stock_quantity !== null && Number.isFinite(Number(raw.stock_quantity))
      ? Math.max(0, Math.floor(Number(raw.stock_quantity)))
      : undefined;

  return {
    id: String(raw?.id || ''),
    name: String(raw?.name || '').trim(),
    description: typeof raw?.description === 'string' ? raw.description : '',
    price,
    duration_minutes: Number(raw?.duration_minutes) || 0,
    category: raw?.category || 'Jewelry',
    image_url: typeof raw?.image_url === 'string' ? raw.image_url : '',
    pain_level: Number(raw?.pain_level) || 0,
    cost_price: costPrice,
    stock_quantity: stockQty,
    in_stock: raw?.in_stock !== false && (stockQty === undefined || stockQty > 0),
    is_active: raw?.is_active !== false,
    material: typeof raw?.material === 'string' ? raw.material : undefined,
    gauge: typeof raw?.gauge === 'string' ? raw.gauge : undefined,
    diameter: typeof raw?.diameter === 'string' ? raw.diameter : undefined,
    allowed_locations: Array.isArray(raw?.allowed_locations) ? raw.allowed_locations : undefined,
  };
}

export function toPublicInventoryItem(raw: any): Omit<JewelryItem, 'cost_price'> {
  const norm = normalizeInventoryItem(raw);
  const { cost_price: _omitted, ...publicItem } = norm;
  return publicItem;
}

export function normalizeWorkingHoursMap(raw: any): WorkingHoursMap {
  const base: WorkingHoursMap = {};
  for (let d = 0; d < 7; d++) {
    const key = d.toString();
    const fallbackDay = DEFAULT_WORKING_HOURS[key] || { isOpen: false, ranges: [] };
    const candidate = raw && typeof raw === 'object' ? raw[key] : undefined;
    const isOpen = Boolean(candidate?.isOpen);
    const rawRanges = Array.isArray(candidate?.ranges) ? candidate.ranges : fallbackDay.ranges;
    const ranges = rawRanges
      .filter((r: any) => r && r.start !== undefined && r.end !== undefined)
      .map((r: any) => ({
        start: normalizeWorkingHoursRangeEndpoint(r.start),
        end: normalizeWorkingHoursRangeEndpoint(r.end),
      }));
    base[key] = { isOpen, ranges };
  }
  return base;
}

export function stripSecretStudioFields(details: Partial<StudioDetails> | null | undefined): StudioDetails {
  const d: Record<string, any> = { ...DEFAULT_STUDIO_DETAILS, ...(details || {}) };
  const {
    telegram_bot_token: _tgTok,
    telegram_chat_id: _tgChat,
    emailjs_service_id: _ejSvc,
    emailjs_template_id: _ejTpl,
    emailjs_public_key: _ejKey,
    notification_email: _notifEmail,
    enable_telegram_notifications: _enTg,
    enable_email_notifications: _enEm,
    enable_calendar_sync: _enCal,
    ...publicDetails
  } = d;
  return publicDetails as StudioDetails;
}

export function toPublicSettingsDto(settings: StudioSettings, activeServiceIds?: Set<string>): PublicStudioSettingsDto {
  const cleanedTags: Record<string, string[]> = {};
  if (settings.gallery_tags && typeof settings.gallery_tags === 'object') {
    for (const [imgId, svcIds] of Object.entries(settings.gallery_tags)) {
      if (!Array.isArray(svcIds)) continue;
      const validIds = activeServiceIds
        ? svcIds.filter(id => typeof id === 'string' && activeServiceIds.has(id))
        : svcIds.filter(id => typeof id === 'string');
      if (validIds.length > 0) {
        cleanedTags[imgId] = validIds;
      }
    }
  }

  return {
    working_hours: normalizeWorkingHoursMap(settings.working_hours),
    studio_details: stripSecretStudioFields(settings.studio_details),
    gallery_tags: cleanedTags,
    enable_ai: settings.enable_ai !== false,
    enable_gallery: settings.enable_gallery !== false,
    enable_style_matcher: settings.enable_style_matcher !== false,
    show_pain_level: settings.show_pain_level !== false,
    enable_ar: settings.enable_ar !== false,
    booking_horizon_days: normalizeHorizonDays(
      settings.booking_horizon_days ?? settings.studio_details?.booking_horizon_days ?? DEFAULT_BOOKING_HORIZON_DAYS
    ),
    shipping_fee: settings.shipping_fee ?? settings.studio_details?.shipping_fee,
    free_shipping_threshold: settings.free_shipping_threshold ?? settings.studio_details?.free_shipping_threshold,
    shipping_eta: settings.shipping_eta ?? settings.studio_details?.shipping_eta,
  };
}

export function buildDefaultRawSettings(): StudioSettings {
  return {
    working_hours: normalizeWorkingHoursMap(DEFAULT_WORKING_HOURS),
    studio_details: { ...DEFAULT_STUDIO_DETAILS },
    monthly_goals: { ...DEFAULT_MONTHLY_GOALS },
    coupons: [],
    gallery_tags: {},
    enable_ai: true,
    enable_gallery: true,
    enable_style_matcher: true,
    show_pain_level: true,
    enable_ar: true,
    inventory_items: [],
  };
}

export function sanitizeProfile(row: any): Profile {
  return {
    id: String(row.id),
    email: String(row.email || ''),
    full_name: row.full_name || '',
    phone: row.phone || '',
    role: row.role === 'admin' ? 'admin' : 'client',
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    referral_code: row.referral_code || undefined,
    referred_by: row.referred_by || undefined,
    credit_balance: parsePriceToShekels(row.credit_balance, 0),
    auth_provider: row.auth_provider || 'google',
    avatar_url: row.avatar_url || undefined,
    wishlist: Array.isArray(row.wishlist) ? row.wishlist : [],
    last_aftercare_checkin: row.last_aftercare_checkin || undefined,
  };
}

export function deterministicUuidFromKey(prefix: string, idempotencyKey: string): string {
  const hash = crypto.createHash('sha256').update(`${prefix}:${idempotencyKey}`).digest('hex');
  // Format first 32 hex chars as valid UUID v4-compatible identifier
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function generateUniqueOrderNumber(now = new Date()): string {
  const y = now.getUTCFullYear().toString();
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = now.getUTCDate().toString().padStart(2, '0');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `YV-${y}${m}${d}-${suffix}`;
}
