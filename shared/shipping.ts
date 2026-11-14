import { agorotToShekels, parsePriceToAgorot } from './money.js';

export interface ShippingPolicyConfig {
  deliveryFeeAgorot: number;
  deliveryFeeShekels: number;
  freeShippingThresholdAgorot: number;
  freeShippingThresholdShekels: number;
  thresholdInclusive: boolean;
  thresholdBasis: 'goods_subtotal';
  estimatedDeliveryTime: string;
  pickupFeeAgorot: number;
  pickupTime: string;
  deliveryRegionsNote: string;
}

/**
 * Authoritative owner-confirmed shipping policy (QA Round 1, A1):
 * - Standard courier delivery: ₪35
 * - Free shipping threshold: ₪250 and above (inclusive, goods subtotal)
 * - Studio pickup: free (₪0) by prior arrangement
 */
export const AUTHORITATIVE_SHIPPING_POLICY: ShippingPolicyConfig = {
  deliveryFeeAgorot: 3500,
  deliveryFeeShekels: 35,
  freeShippingThresholdAgorot: 25000,
  freeShippingThresholdShekels: 250,
  thresholdInclusive: true,
  thresholdBasis: 'goods_subtotal',
  estimatedDeliveryTime: '3–7 ימי עסקים',
  pickupFeeAgorot: 0,
  pickupTime: 'בתיאום מראש מול הסטודיו (ללא עלות)',
  deliveryRegionsNote:
    'בכל רחבי הארץ באמצעות שליח עד הבית או נקודת איסוף (יישובים מרוחקים כגון אילת והערבה בכפוף ללוחות זמני חברת השליחויות).',
};

export function resolveShippingPolicy(studioDetails?: {
  shipping_fee?: unknown;
  free_shipping_threshold?: unknown;
  shipping_eta?: string;
} | null): ShippingPolicyConfig {
  const customFeeAgorot = parsePriceToAgorot(
    studioDetails?.shipping_fee,
    AUTHORITATIVE_SHIPPING_POLICY.deliveryFeeAgorot
  );
  const customThresholdAgorot = parsePriceToAgorot(
    studioDetails?.free_shipping_threshold,
    AUTHORITATIVE_SHIPPING_POLICY.freeShippingThresholdAgorot
  );

  // Never silently override owner-approved authoritative rate unless valid positive config exists
  const deliveryFeeAgorot =
    customFeeAgorot > 0 ? customFeeAgorot : AUTHORITATIVE_SHIPPING_POLICY.deliveryFeeAgorot;
  const freeShippingThresholdAgorot =
    customThresholdAgorot > 0
      ? customThresholdAgorot
      : AUTHORITATIVE_SHIPPING_POLICY.freeShippingThresholdAgorot;

  return {
    ...AUTHORITATIVE_SHIPPING_POLICY,
    deliveryFeeAgorot,
    deliveryFeeShekels: agorotToShekels(deliveryFeeAgorot),
    freeShippingThresholdAgorot,
    freeShippingThresholdShekels: agorotToShekels(freeShippingThresholdAgorot),
    estimatedDeliveryTime:
      studioDetails?.shipping_eta?.trim() || AUTHORITATIVE_SHIPPING_POLICY.estimatedDeliveryTime,
  };
}

export interface JewelryOrderPricingResult {
  goodsSubtotalAgorot: number;
  shippingFeeAgorot: number;
  totalAgorot: number;
  goodsSubtotalShekels: number;
  shippingFeeShekels: number;
  totalShekels: number;
  qualifiesForFreeShipping: boolean;
  amountRemainingForFreeShippingAgorot: number;
  amountRemainingForFreeShippingShekels: number;
  policy: ShippingPolicyConfig;
}

export function calculateJewelryOrderPricing(options: {
  goodsSubtotalAgorot: number;
  deliveryMethod: 'pickup' | 'delivery';
  policy?: ShippingPolicyConfig;
}): JewelryOrderPricingResult {
  const policy = options.policy || AUTHORITATIVE_SHIPPING_POLICY;
  const goodsSubtotalAgorot = Math.max(0, Math.round(options.goodsSubtotalAgorot || 0));

  const qualifiesForFreeShipping = policy.thresholdInclusive
    ? goodsSubtotalAgorot >= policy.freeShippingThresholdAgorot
    : goodsSubtotalAgorot > policy.freeShippingThresholdAgorot;

  const shippingFeeAgorot =
    options.deliveryMethod === 'delivery' && !qualifiesForFreeShipping
      ? policy.deliveryFeeAgorot
      : 0;

  const totalAgorot = goodsSubtotalAgorot + shippingFeeAgorot;
  const amountRemainingForFreeShippingAgorot = Math.max(
    0,
    policy.freeShippingThresholdAgorot - goodsSubtotalAgorot
  );

  return {
    goodsSubtotalAgorot,
    shippingFeeAgorot,
    totalAgorot,
    goodsSubtotalShekels: agorotToShekels(goodsSubtotalAgorot),
    shippingFeeShekels: agorotToShekels(shippingFeeAgorot),
    totalShekels: agorotToShekels(totalAgorot),
    qualifiesForFreeShipping,
    amountRemainingForFreeShippingAgorot,
    amountRemainingForFreeShippingShekels: agorotToShekels(amountRemainingForFreeShippingAgorot),
    policy,
  };
}
