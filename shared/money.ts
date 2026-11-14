/**
 * Decimal-safe money utilities operating in integer agorot (1 ILS = 100 agorot).
 * Never concatenates Postgres decimal strings and never allows NaN or negative totals.
 */

const NUMERIC_PATTERN = /^\d+(?:\.\d+)?$/;

export function tryParsePriceToAgorot(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let rawStr: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    rawStr = value.toFixed(4);
  } else if (typeof value === 'string') {
    rawStr = value.replace(/[₪,\s]/g, '').trim();
    if (!rawStr || !NUMERIC_PATTERN.test(rawStr)) {
      return null;
    }
  } else {
    return null;
  }

  const [wholePart, fracPart = ''] = rawStr.split('.');
  const whole = Number.parseInt(wholePart, 10);
  if (!Number.isSafeInteger(whole) || whole < 0) return null;

  // Convert fractional digits without binary floating-point rounding drift
  const padded = (fracPart + '000').slice(0, 3);
  const firstTwo = Number.parseInt(padded.slice(0, 2), 10);
  const thirdDigit = Number.parseInt(padded[2], 10);
  const agorotFrac = thirdDigit >= 5 ? firstTwo + 1 : firstTwo;

  const total = whole * 100 + agorotFrac;
  return Number.isSafeInteger(total) ? total : null;
}

export function parsePriceToAgorot(value: unknown, fallbackAgorot = 0): number {
  const parsed = tryParsePriceToAgorot(value);
  return parsed === null ? fallbackAgorot : parsed;
}

export function agorotToShekels(agorot: number): number {
  if (!Number.isFinite(agorot) || agorot <= 0) return 0;
  return Math.round(agorot) / 100;
}

export function parsePriceToShekels(value: unknown, fallback = 0): number {
  const agorot = tryParsePriceToAgorot(value);
  if (agorot === null) return fallback;
  return agorotToShekels(agorot);
}

export function sumAgorot(values: Iterable<unknown>): number {
  let total = 0;
  for (const v of values) {
    const parsed = tryParsePriceToAgorot(v);
    if (parsed !== null) {
      total += parsed;
    }
  }
  return total;
}

export function sumShekelsToAgorot(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) {
    const parsed = tryParsePriceToAgorot(v);
    if (parsed !== null) {
      total += parsed;
    }
  }
  return total;
}

export function multiplyAgorot(unitAgorot: number, quantity: number): number {
  if (!Number.isFinite(unitAgorot) || unitAgorot <= 0) return 0;
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.round(unitAgorot * Math.floor(quantity));
}

export function applyPercentageDiscountAgorot(baseAgorot: number, percent: number): {
  discountAgorot: number;
  remainingAgorot: number;
} {
  if (!Number.isFinite(baseAgorot) || baseAgorot <= 0) {
    return { discountAgorot: 0, remainingAgorot: 0 };
  }
  if (!Number.isFinite(percent) || percent <= 0) {
    return { discountAgorot: 0, remainingAgorot: Math.round(baseAgorot) };
  }
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const discountAgorot = Math.min(
    Math.round(baseAgorot),
    Math.round((Math.round(baseAgorot) * clampedPercent) / 100)
  );
  return {
    discountAgorot,
    remainingAgorot: Math.max(0, Math.round(baseAgorot) - discountAgorot),
  };
}

export interface DiscountBreakdown {
  subtotalAgorot: number;
  couponDiscountAgorot: number;
  referralDiscountAgorot: number;
  totalDiscountAgorot: number;
  finalTotalAgorot: number;
}

export interface CouponLike {
  discountType?: 'percentage' | 'fixed';
  discount_type?: 'percentage' | 'fixed';
  value?: unknown;
  discount_value?: unknown;
  minOrderAmount?: unknown;
  min_spend?: unknown;
}

export function calculateAppointmentPricing(options: {
  servicePricesShekels: unknown[];
  jewelryPricesShekels?: unknown[];
  coupon?: CouponLike | null;
  hasReferralDiscount?: boolean;
  referralPercent?: number;
}): DiscountBreakdown {
  const servicesAgorot = sumAgorot(options.servicePricesShekels);
  const jewelryAgorot = sumAgorot(options.jewelryPricesShekels || []);
  const subtotalAgorot = servicesAgorot + jewelryAgorot;

  let couponDiscountAgorot = 0;
  const coupon = options.coupon;
  if (coupon && subtotalAgorot > 0) {
    const minSpendRaw = coupon.minOrderAmount ?? coupon.min_spend ?? 0;
    const minSpendAgorot = parsePriceToAgorot(minSpendRaw, 0);
    const discountType = coupon.discountType ?? coupon.discount_type ?? 'percentage';
    const rawValue = coupon.value ?? coupon.discount_value ?? 0;

    if (subtotalAgorot >= minSpendAgorot) {
      if (discountType === 'percentage') {
        const pct = Number(rawValue);
        if (Number.isFinite(pct) && pct > 0) {
          couponDiscountAgorot = applyPercentageDiscountAgorot(subtotalAgorot, pct).discountAgorot;
        }
      } else {
        const fixedAgorot = parsePriceToAgorot(rawValue, 0);
        couponDiscountAgorot = Math.min(subtotalAgorot, Math.max(0, fixedAgorot));
      }
    }
  }

  const afterCouponAgorot = Math.max(0, subtotalAgorot - couponDiscountAgorot);
  const referralPercent = options.hasReferralDiscount ? (options.referralPercent ?? 10) : 0;
  const referralDiscountAgorot =
    referralPercent > 0
      ? applyPercentageDiscountAgorot(afterCouponAgorot, referralPercent).discountAgorot
      : 0;

  const totalDiscountAgorot = Math.min(subtotalAgorot, couponDiscountAgorot + referralDiscountAgorot);
  const finalTotalAgorot = Math.max(0, subtotalAgorot - totalDiscountAgorot);

  return {
    subtotalAgorot,
    couponDiscountAgorot,
    referralDiscountAgorot,
    totalDiscountAgorot,
    finalTotalAgorot,
  };
}

export function formatILS(
  value: unknown,
  options: { fromAgorot?: boolean; forceDecimals?: boolean } = {}
): string {
  const agorot = options.fromAgorot
    ? (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0)
    : parsePriceToAgorot(value, 0);

  const whole = Math.floor(agorot / 100);
  const cents = agorot % 100;
  const formattedWhole = whole.toLocaleString('en-US');

  if (cents === 0 && !options.forceDecimals) {
    return `₪${formattedWhole}`;
  }

  return `₪${formattedWhole}.${cents.toString().padStart(2, '0')}`;
}
