import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { formatILS } from '../shared/money';
import { resolveShippingPolicy, type ShippingPolicyConfig } from '../shared/shipping';
import { toWhatsAppPhone972 } from '../shared/validation';
import type { JewelryOrderItem, StudioDetails, StudioSettings } from '../types';

export interface NotificationPayload {
  clientName: string;
  clientPhone: string;
  serviceName?: string;
  startTime: string;
  notes?: string;
}

export interface JewelryOrderNotificationPayload {
  orderNumber: string;
  clientName: string;
  clientPhone: string;
  totalPrice: number;
  deliveryMethod: string;
  items: { name: string; quantity: number; price: number }[];
  address?: string;
  notes?: string;
}

/**
 * Notifications are dispatched server-side during /api/appointments and /api/orders creation.
 * Client-side no-ops remain solely so legacy callers cannot trigger duplicate browser secrets calls.
 */
export const notifyAdmin = async (
  _settings: StudioSettings,
  _payload: NotificationPayload
): Promise<void> => Promise.resolve();

export const notifyJewelryOrder = async (
  _settings: StudioSettings,
  _payload: JewelryOrderNotificationPayload
): Promise<void> => Promise.resolve();

export function buildWhatsAppContactUrl(rawPhone?: string, text?: string): string {
  const normalized = toWhatsAppPhone972(rawPhone || DEFAULT_STUDIO_DETAILS.phone);
  const target = normalized || toWhatsAppPhone972(DEFAULT_STUDIO_DETAILS.phone);
  return text
    ? `https://wa.me/${target}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${target}`;
}

export function buildOrderWhatsAppMessage(params: {
  orderNumber?: string;
  isDraftOnly?: boolean;
  clientName: string;
  clientPhone: string;
  deliveryMethod: 'pickup' | 'delivery';
  shippingAddress?: string;
  items: Pick<JewelryOrderItem, 'name' | 'quantity' | 'price'>[];
  goodsSubtotal: number;
  shippingFee: number;
  total: number;
  notes?: string;
  shippingPolicy?: ShippingPolicyConfig;
}): string {
  const policy = params.shippingPolicy || resolveShippingPolicy();
  const header = params.orderNumber
    ? `היי יובל! שלחתי באתר בקשת הזמנה לתכשיטים (מספר פניה: #${params.orderNumber}) 💎`
    : 'היי יובל! אשמח לתאם הזמנת תכשיטים מהאתר 💎';

  const itemsText = params.items
    .map(i => `• ${i.name} ×${i.quantity} (${formatILS(i.price * i.quantity)})`)
    .join('\n');

  const deliveryLine =
    params.deliveryMethod === 'pickup'
      ? `איסוף עצמי מהסטודיו (${policy.pickupTime})`
      : `משלוח עד הבית: ${params.shippingAddress || ''} (${params.shippingFee === 0 ? 'משלוח חינם!' : formatILS(params.shippingFee)} • ${policy.estimatedDeliveryTime})`;

  return [
    header,
    '',
    'פירוט פריטים:',
    itemsText,
    '',
    `סיכום ביניים: ${formatILS(params.goodsSubtotal)}`,
    `אספקה: ${deliveryLine}`,
    `סה"כ לתיאום תשלום: ${formatILS(params.total)}`,
    '',
    `שם: ${params.clientName}`,
    `טלפון: ${params.clientPhone}`,
    params.notes ? `הערות: ${params.notes}` : '',
    params.isDraftOnly ? '(טיוטת פנייה בוואטסאפ — טרם נרשמה כהזמנה באתר)' : 'אשמח לתאם את סגירת ההזמנה והתשלום!',
  ]
    .filter(line => line !== '')
    .join('\n');
}

export function buildWaitlistWhatsAppMessage(params: {
  serviceNames?: string;
  preferredDate?: string;
  clientName?: string;
  clientPhone?: string;
}): string {
  return [
    'היי יובל! ראיתי שאין כרגע זמינות פנויה אונליין ורציתי לבדוק תור / להיכנס לרשימת המתנה 🙏',
    params.serviceNames ? `שירות מבוקש: ${params.serviceNames}` : '',
    params.preferredDate ? `תאריך מועדף: ${params.preferredDate}` : '',
    params.clientName ? `שם: ${params.clientName}` : '',
    params.clientPhone ? `טלפון: ${params.clientPhone}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function getStudioWhatsAppPhone(
  studioOrPhone?: Partial<StudioDetails> | string | null
): string {
  const raw =
    typeof studioOrPhone === 'string'
      ? studioOrPhone
      : studioOrPhone?.phone || DEFAULT_STUDIO_DETAILS.phone;
  return toWhatsAppPhone972(raw || DEFAULT_STUDIO_DETAILS.phone);
}
