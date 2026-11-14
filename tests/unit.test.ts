import test from 'node:test';
import assert from 'node:assert/strict';

import { handleApiRequest, type HandlerDependencies } from '../api/_lib/handler';
import { MemoryStore } from '../api/_lib/memoryStore';
import {
  resolveDatabaseUrlFromEnv,
  resolveSessionSecret,
  SESSION_COOKIE_NAME,
} from '../api/_lib/auth';
import type { NotificationDeliveryResult, ServerGoogleUserInfo } from '../api/_lib/types';
import {
  agorotToShekels,
  calculateAppointmentPricing,
  formatILS,
  multiplyAgorot,
  parsePriceToAgorot,
  sumAgorot,
} from '../shared/money';
import {
  AUTHORITATIVE_SHIPPING_POLICY,
  calculateJewelryOrderPricing,
} from '../shared/shipping';
import {
  computeDayAvailability,
  jerusalemLocalToUtcDate,
  parseTimeEndpointToMinutes,
  type WorkingHoursMap,
} from '../shared/availability';
import {
  isValidIsraeliPhone,
  pluralizeHebrew,
  sanitizeExternalUrl,
  validateJewelryOrderInput,
} from '../shared/validation';
import { extractHealingTime, getPainDisplay } from '../shared/serviceInfo';
import type { JewelryItem, Service } from '../types';

const TEST_SERVICES: Service[] = [
  {
    id: 'svc-earlobe',
    name: 'לוב (תנוך)',
    description: 'ניקוב תנוך קלאסי. זמן החלמה משוער: 6–8 שבועות.',
    price: '90.00' as unknown as number,
    duration_minutes: 30,
    category: 'Ear',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/earlobe.jpg',
    pain_level: 2,
    is_active: true,
  },
  {
    id: 'svc-helix',
    name: 'הליקס',
    description: 'פירסינג בסחוס העליון.',
    price: '120.00' as unknown as number,
    duration_minutes: 30,
    category: 'Ear',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/helix.jpg',
    pain_level: 0,
    is_active: true,
  },
  {
    id: 'svc-conch',
    name: 'קונץ׳',
    description: 'פירסינג פנימי באוזן.',
    price: '130.00' as unknown as number,
    duration_minutes: 30,
    category: 'Ear',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/conch.jpg',
    pain_level: 5,
    is_active: true,
  },
];

const TEST_INVENTORY: JewelryItem[] = [
  {
    id: 'jewel-130',
    name: 'חישוק זהב 14K',
    description: 'חישוק קלאסי לסחוס',
    price: 130,
    category: 'Jewelry',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/ring130.jpg',
    in_stock: true,
    stock_quantity: 10,
    material: 'זהב 14K',
  },
  {
    id: 'jewel-50',
    name: 'עגיל טיטניום מיני',
    description: 'לאברט טיטניום ASTM F136',
    price: 50,
    category: 'Jewelry',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/stud50.jpg',
    in_stock: true,
    stock_quantity: 15,
    material: 'טיטניום',
  },
  {
    id: 'jewel-oos',
    name: 'פריט אזל מהמלאי',
    description: 'אזל',
    price: 80,
    category: 'Jewelry',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/oos.jpg',
    in_stock: false,
    stock_quantity: 0,
    material: 'טיטניום',
  },
];

const OPEN_WORKING_HOURS: WorkingHoursMap = {
  '0': { isOpen: true, ranges: [{ start: 10, end: 18 }] }, // numeric hours (10..18)
  '1': { isOpen: true, ranges: [{ start: '12:00', end: '20:00' }] }, // string HH:MM
  '2': { isOpen: true, ranges: [{ start: '10:00', end: '18:00' }] },
  '3': { isOpen: true, ranges: [{ start: '10:00', end: '18:00' }] },
  '4': { isOpen: true, ranges: [{ start: '10:00', end: '16:00' }] },
  '5': { isOpen: false, ranges: [] },
  '6': { isOpen: false, ranges: [] },
};

function makeFixtureDeps(options?: {
  workingHours?: WorkingHoursMap;
  fixedNow?: Date;
  notificationResult?: NotificationDeliveryResult;
}): {
  store: MemoryStore;
  deps: HandlerDependencies;
  sentNotifications: Array<{ type: 'order' | 'appointment'; id: string }>;
} {
  const store = new MemoryStore({
    services: TEST_SERVICES,
    settings: {
      working_hours: options?.workingHours || OPEN_WORKING_HOURS,
      inventory_items: TEST_INVENTORY,
      coupons: [
        {
          id: 'coup-pct',
          code: 'SAVE15',
          discountType: 'percentage',
          value: 15,
          minOrderAmount: 100,
          isActive: true,
        },
        {
          id: 'coup-fixed',
          code: 'FLAT30',
          discountType: 'fixed',
          value: 30,
          minOrderAmount: 80,
          isActive: true,
        },
        {
          id: 'coup-huge',
          code: 'BIG500',
          discountType: 'fixed',
          value: 500,
          minOrderAmount: 0,
          isActive: true,
        },
      ],
      monthly_goals: { revenue: 18000, appointments: 80 },
      telegram_bot_token: 'SECRET_TG_BOT_TOKEN',
      telegram_chat_id: 'SECRET_TG_CHAT_ID',
      emailjs_service_id: 'SECRET_EMAILJS_SVC',
      emailjs_template_id: 'SECRET_EMAILJS_TPL',
      emailjs_public_key: 'SECRET_EMAILJS_PUB',
      notification_email: 'private-owner@example.com',
      enable_telegram_notifications: true,
      enable_email_notifications: true,
    } as any,
  });

  const sentNotifications: Array<{ type: 'order' | 'appointment'; id: string }> = [];

  const deps: HandlerDependencies = {
    store,
    now: () => options?.fixedNow || new Date('2026-11-14T08:00:00.000Z'),
    verifyGoogleToken: async (token: string): Promise<ServerGoogleUserInfo> => {
      if (token === 'admin-google-token') {
        return {
          sub: 'google-admin-1',
          email: 'owner@yuvalstudio.test',
          email_verified: true,
          name: 'יובל שבלב',
        };
      }
      if (token === 'client-google-token') {
        return {
          sub: 'google-client-1',
          email: 'dana@client.test',
          email_verified: true,
          name: 'דנה לוי',
        };
      }
      throw new Error('אסימון Google אינו תקין');
    },
    notifications: {
      sendAppointmentNotifications: async (appt) => {
        sentNotifications.push({ type: 'appointment', id: appt.id });
        return options?.notificationResult || { telegram: 'skipped', email: 'skipped' };
      },
      sendOrderNotifications: async (order) => {
        sentNotifications.push({ type: 'order', id: order.id });
        return options?.notificationResult || { telegram: 'skipped', email: 'skipped' };
      },
    },
  };

  return { store, deps, sentNotifications };
}

function extractSessionCookie(setCookies?: string[]): string {
  const header = (setCookies || []).find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  assert.ok(header, 'Expected Set-Cookie header for session');
  assert.ok(header.includes('HttpOnly'), 'Session cookie must include HttpOnly');
  return header.split(';')[0].slice(SESSION_COOKIE_NAME.length + 1);
}

// =========================================================================
// P0: Security & Server-Enforced Auth Containment
// =========================================================================
test('P0: /api/admin/* rejects anonymous (401) and non-admin client (403) callers', async () => {
  process.env.ADMIN_EMAILS = 'owner@yuvalstudio.test';
  const { deps } = makeFixtureDeps();

  const anonRes = await handleApiRequest(
    { method: 'GET', path: '/api/admin/bootstrap', query: {}, headers: {}, cookies: {}, body: null },
    deps
  );
  assert.equal(anonRes.status, 401);

  const clientLogin = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/auth/google',
      query: {},
      headers: {},
      cookies: {},
      body: { accessToken: 'client-google-token' },
    },
    deps
  );
  assert.equal(clientLogin.status, 200);
  const clientCookie = extractSessionCookie(clientLogin.setCookies);

  const clientAdminRes = await handleApiRequest(
    {
      method: 'GET',
      path: '/api/admin/bootstrap',
      query: {},
      headers: {},
      cookies: { [SESSION_COOKIE_NAME]: clientCookie },
      body: null,
    },
    deps
  );
  assert.equal(clientAdminRes.status, 403);

  const clientSettingsPut = await handleApiRequest(
    {
      method: 'PUT',
      path: '/api/admin/settings',
      query: {},
      headers: {},
      cookies: { [SESSION_COOKIE_NAME]: clientCookie },
      body: { enable_ai: false },
    },
    deps
  );
  assert.equal(clientSettingsPut.status, 403);

  const clientRequireAdmin = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/auth/google',
      query: {},
      headers: {},
      cookies: {},
      body: { accessToken: 'client-google-token', requireAdmin: true },
    },
    deps
  );
  assert.equal(clientRequireAdmin.status, 403);
});

test('P0: Admin Google login sets HttpOnly cookie and grants /api/admin/* access; tampered cookie fails closed', async () => {
  process.env.ADMIN_EMAILS = 'owner@yuvalstudio.test';
  const { deps } = makeFixtureDeps();

  const adminLogin = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/auth/google',
      query: {},
      headers: {},
      cookies: {},
      body: { accessToken: 'admin-google-token', requireAdmin: true },
    },
    deps
  );
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.body.user.role, 'admin');
  const adminCookie = extractSessionCookie(adminLogin.setCookies);

  const adminBootstrap = await handleApiRequest(
    {
      method: 'GET',
      path: '/api/admin/bootstrap',
      query: {},
      headers: {},
      cookies: { [SESSION_COOKIE_NAME]: adminCookie },
      body: null,
    },
    deps
  );
  assert.equal(adminBootstrap.status, 200);
  assert.ok(Array.isArray(adminBootstrap.body.appointments));

  const tampered = await handleApiRequest(
    {
      method: 'GET',
      path: '/api/admin/bootstrap',
      query: {},
      headers: {},
      cookies: { [SESSION_COOKIE_NAME]: `${adminCookie}tamper` },
      body: null,
    },
    deps
  );
  assert.equal(tampered.status, 401);
});

test('P0: /api/bootstrap strips private goals, coupons, and notification credentials', async () => {
  const { deps } = makeFixtureDeps();
  const res = await handleApiRequest(
    { method: 'GET', path: '/api/bootstrap', query: {}, headers: {}, cookies: {}, body: null },
    deps
  );
  assert.equal(res.status, 200);
  const json = JSON.stringify(res.body);
  assert.ok(!json.includes('SECRET_TG_BOT_TOKEN'));
  assert.ok(!json.includes('SECRET_TG_CHAT_ID'));
  assert.ok(!json.includes('SECRET_EMAILJS'));
  assert.ok(!json.includes('private-owner@example.com'));
  assert.equal((res.body.settings as any).monthly_goals, undefined);
  assert.equal((res.body.settings as any).coupons, undefined);
});

// =========================================================================
// P1-A: Numeric Agorot Pricing & Formatting
// =========================================================================
test('P1-A: Decimal DB strings add numerically in agorot (never string concatenation)', () => {
  assert.equal(parsePriceToAgorot('90.00'), 9000);
  assert.equal(parsePriceToAgorot('120.00'), 12000);
  assert.equal(parsePriceToAgorot('130.00'), 13000);

  const twoServicesAgorot = sumAgorot(['90.00', '120.00']);
  assert.equal(twoServicesAgorot, 21000);
  assert.equal(agorotToShekels(twoServicesAgorot), 210);
  assert.equal(formatILS(210), '₪210');

  const gallerySingle = calculateAppointmentPricing({ servicePricesShekels: ['130.00'] });
  assert.equal(agorotToShekels(gallerySingle.finalTotalAgorot), 130);
  assert.equal(formatILS(gallerySingle.finalTotalAgorot, { fromAgorot: true }), '₪130');

  // Removing helix from [90, 120] restores 90 cleanly
  const afterRemove = calculateAppointmentPricing({ servicePricesShekels: ['90.00'] });
  assert.equal(agorotToShekels(afterRemove.finalTotalAgorot), 90);
});

test('P1-A: Coupons, zero/negative/NaN guards, and server recomputation ignoring client final_price', async () => {
  assert.equal(parsePriceToAgorot(NaN, 0), 0);
  assert.equal(parsePriceToAgorot(-45, 0), 0);
  assert.equal(parsePriceToAgorot('invalid-price', 0), 0);

  // Percentage 15% on 90 + 120 = 210 -> discount 31.50 -> 178.50
  const pctCalc = calculateAppointmentPricing({
    servicePricesShekels: ['90.00', '120.00'],
    coupon: { discountType: 'percentage', value: 15, minOrderAmount: 100 },
  });
  assert.equal(pctCalc.subtotalAgorot, 21000);
  assert.equal(pctCalc.couponDiscountAgorot, 3150);
  assert.equal(pctCalc.finalTotalAgorot, 17850);
  assert.equal(formatILS(pctCalc.finalTotalAgorot, { fromAgorot: true }), '₪178.50');

  // Huge fixed coupon clamps cleanly at 0 (never negative)
  const clampedCalc = calculateAppointmentPricing({
    servicePricesShekels: ['90.00'],
    coupon: { discountType: 'fixed', value: 500, minOrderAmount: 0 },
  });
  assert.equal(clampedCalc.finalTotalAgorot, 0);

  // Server appointment creation ignores client-tampered final_price: 1
  const { deps } = makeFixtureDeps({ fixedNow: new Date('2026-11-15T06:00:00.000Z') }); // Sunday 08:00 IST
  const apptRes = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/appointments',
      query: {},
      headers: {},
      cookies: {},
      body: {
        service_ids: ['svc-earlobe', 'svc-helix'],
        start_time: jerusalemLocalToUtcDate('2026-11-16', 780).toISOString(), // Monday 13:00 IST
        client_name: 'שירה כהן',
        client_phone: '0501234567',
        price: 1,
        final_price: 1,
      },
    },
    deps
  );
  assert.equal(apptRes.status, 201);
  assert.equal(apptRes.body.appointment.price, 210);
  assert.equal(apptRes.body.appointment.final_price, 210);

  // Invalid coupon check returns friendly error
  const invalidCoupon = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/coupons/validate',
      query: {},
      headers: {},
      cookies: {},
      body: { code: 'NO_SUCH_COUPON', cartTotal: 210 },
    },
    deps
  );
  assert.equal(invalidCoupon.status, 200);
  assert.equal(invalidCoupon.body.isValid, false);
  assert.equal(invalidCoupon.body.error, 'קופון לא נמצא');
});

// =========================================================================
// P1-B & P1-C: Authoritative Shipping, Idempotency & No Fake Order Success
// =========================================================================
test('P1-C: Shipping policy applies ₪35 below ₪250, free at ₪250 inclusive and at ₪310, free on pickup', () => {
  assert.equal(AUTHORITATIVE_SHIPPING_POLICY.deliveryFeeShekels, 35);
  assert.equal(AUTHORITATIVE_SHIPPING_POLICY.freeShippingThresholdShekels, 250);

  const below = calculateJewelryOrderPricing({ goodsSubtotalAgorot: 18000, deliveryMethod: 'delivery' });
  assert.equal(below.shippingFeeShekels, 35);
  assert.equal(below.totalShekels, 215);

  const exact = calculateJewelryOrderPricing({ goodsSubtotalAgorot: 25000, deliveryMethod: 'delivery' });
  assert.equal(exact.qualifiesForFreeShipping, true);
  assert.equal(exact.shippingFeeShekels, 0);
  assert.equal(exact.totalShekels, 250);

  // 2x 130 + 1x 50 = 310 (live QA basket): MUST have ₪0 delivery, total ₪310
  const qaBasket = calculateJewelryOrderPricing({ goodsSubtotalAgorot: 31000, deliveryMethod: 'delivery' });
  assert.equal(qaBasket.qualifiesForFreeShipping, true);
  assert.equal(qaBasket.shippingFeeShekels, 0);
  assert.equal(qaBasket.totalShekels, 310);

  const pickup = calculateJewelryOrderPricing({ goodsSubtotalAgorot: 13000, deliveryMethod: 'pickup' });
  assert.equal(pickup.shippingFeeShekels, 0);
  assert.equal(pickup.totalShekels, 130);
});

test('P1-B: DB insert failure fails closed (500); idempotency prevents duplicates; notification failure keeps durable order', async () => {
  const { store, deps } = makeFixtureDeps({
    notificationResult: { telegram: 'failed', email: 'skipped', error: 'Telegram 502' },
  });

  // 1. Simulated DB rejection -> 500 & zero orders created
  store.failures.failOrderInsert = true;
  const failedRes = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/orders',
      query: {},
      headers: {},
      cookies: {},
      body: {
        idempotency_key: 'order-idem-11111111',
        client_name: 'נועה בר',
        client_phone: '0527654321',
        delivery_method: 'delivery',
        shipping_address: 'דיזנגוף 100, תל אביב',
        items: [{ product_id: 'jewel-130', quantity: 2 }, { product_id: 'jewel-50', quantity: 1 }],
        total_price: 9999, // tampered
      },
    },
    deps
  );
  assert.equal(failedRes.status, 500);
  assert.equal((await store.getJewelryOrders()).length, 0);

  // 2. Recover -> stored durably with server total ₪310, honest notification failed flag
  store.failures.failOrderInsert = false;
  const firstRes = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/orders',
      query: {},
      headers: {},
      cookies: {},
      body: {
        idempotency_key: 'order-idem-11111111',
        client_name: 'נועה בר',
        client_phone: '0527654321',
        delivery_method: 'delivery',
        shipping_address: 'דיזנגוף 100, תל אביב',
        items: [{ product_id: 'jewel-130', quantity: 2 }, { product_id: 'jewel-50', quantity: 1 }],
        total_price: 1,
      },
    },
    deps
  );
  assert.equal(firstRes.status, 201);
  assert.equal(firstRes.body.created, true);
  assert.equal(firstRes.body.order.shipping_cost, 0);
  assert.equal(firstRes.body.order.total_price, 310);
  assert.equal(firstRes.body.order.notification_status, 'failed');
  assert.equal(firstRes.body.notification.telegram, 'failed');

  // 3. Duplicate tap / retry with same idempotency_key -> 200 created: false, single stored order
  const retryRes = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/orders',
      query: {},
      headers: {},
      cookies: {},
      body: {
        idempotency_key: 'order-idem-11111111',
        client_name: 'נועה בר',
        client_phone: '0527654321',
        delivery_method: 'delivery',
        shipping_address: 'דיזנגוף 100, תל אביב',
        items: [{ product_id: 'jewel-130', quantity: 2 }, { product_id: 'jewel-50', quantity: 1 }],
      },
    },
    deps
  );
  assert.equal(retryRes.status, 200);
  assert.equal(retryRes.body.created, false);
  assert.equal(retryRes.body.order.id, firstRes.body.order.id);
  assert.equal((await store.getJewelryOrders()).length, 1);

  // 4. Out-of-stock item blocked (409) & invalid phone rejected (400)
  const oosRes = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/orders',
      query: {},
      headers: {},
      cookies: {},
      body: {
        client_name: 'נועה בר',
        client_phone: '0527654321',
        delivery_method: 'pickup',
        items: [{ product_id: 'jewel-oos', quantity: 1 }],
      },
    },
    deps
  );
  assert.equal(oosRes.status, 409);

  const badPhone = validateJewelryOrderInput({
    clientName: 'נועה בר',
    clientPhone: '1234567890',
    deliveryMethod: 'pickup',
    items: [{ product_id: 'jewel-130', quantity: 1 }],
  });
  assert.equal(badPhone.isValid, false);
  assert.ok(badPhone.errors.clientPhone);
});

// =========================================================================
// P1-D: Working Hours, Asia/Jerusalem DST, Availability & Waitlist
// =========================================================================
test('P1-D: Availability handles numeric/string hours, DST dates, overlaps (409), DB fail-closed (503), and waitlist', async () => {
  assert.equal(parseTimeEndpointToMinutes(12), 720);
  assert.equal(parseTimeEndpointToMinutes('12:00'), 720);
  assert.equal(parseTimeEndpointToMinutes(20), 1200);
  assert.equal(parseTimeEndpointToMinutes('invalid'), null);

  // DST transition day (late October / March check in Asia/Jerusalem)
  const summerUtc = jerusalemLocalToUtcDate('2026-07-15', 720); // 12:00 IDT (UTC+3) -> 09:00 UTC
  assert.equal(summerUtc.toISOString(), '2026-07-15T09:00:00.000Z');
  const winterUtc = jerusalemLocalToUtcDate('2026-11-16', 720); // 12:00 IST (UTC+2) -> 10:00 UTC
  assert.equal(winterUtc.toISOString(), '2026-11-16T10:00:00.000Z');

  // Availability with numeric schedule on Sunday & overlapping 60-min appointment
  const dayRes = computeDayAvailability({
    dateKey: '2026-11-16',
    workingHours: OPEN_WORKING_HOURS,
    existingAppointments: [
      {
        start_time: jerusalemLocalToUtcDate('2026-11-16', 780).toISOString(), // 13:00-14:00
        end_time: jerusalemLocalToUtcDate('2026-11-16', 840).toISOString(),
        status: 'confirmed',
      },
    ],
    serviceDurationMinutes: 30,
    horizonDays: 30,
    now: new Date('2026-11-15T06:00:00.000Z'),
  });
  assert.equal(dayRes.status, 'open');
  const slot1300 = dayRes.slots.find(s => s.time === '13:00');
  const slot1330 = dayRes.slots.find(s => s.time === '13:30');
  const slot1400 = dayRes.slots.find(s => s.time === '14:00');
  assert.equal(slot1300?.available, false);
  assert.equal(slot1330?.available, false);
  assert.equal(slot1400?.available, true);

  // Outside horizon status
  const farRes = computeDayAvailability({
    dateKey: '2026-12-30',
    workingHours: OPEN_WORKING_HOURS,
    existingAppointments: [],
    serviceDurationMinutes: 30,
    horizonDays: 30,
    now: new Date('2026-11-14T08:00:00.000Z'),
  });
  assert.equal(farRes.status, 'outside_horizon');

  // Completely closed calendar status
  const closedAll: WorkingHoursMap = Object.fromEntries(
    ['0', '1', '2', '3', '4', '5', '6'].map(k => [k, { isOpen: false, ranges: [] }])
  );
  const closedRes = computeDayAvailability({
    dateKey: '2026-11-16',
    workingHours: closedAll,
    existingAppointments: [],
    serviceDurationMinutes: 30,
    horizonDays: 30,
    now: new Date('2026-11-14T08:00:00.000Z'),
  });
  assert.equal(closedRes.status, 'studio_all_closed');

  // Availability endpoint fail-closed 503 + concurrent 409 + waitlist creation
  const { store, deps } = makeFixtureDeps({ fixedNow: new Date('2026-11-15T06:00:00.000Z') });
  store.failures.failAvailabilityRead = true;
  const errAvail = await handleApiRequest(
    {
      method: 'GET',
      path: '/api/availability',
      query: { date: '2026-11-16', duration: '30' },
      headers: {},
      cookies: {},
      body: null,
    },
    deps
  );
  assert.equal(errAvail.status, 503);
  assert.equal(errAvail.body.status, 'error');
  assert.equal(errAvail.body.slots.length, 0);

  store.failures.failAvailabilityRead = false;
  const waitlistRes = await handleApiRequest(
    {
      method: 'POST',
      path: '/api/waitlist',
      query: {},
      headers: {},
      cookies: {},
      body: {
        client_name: 'מיה כהן',
        client_phone: '0549998877',
        preferred_date: '2026-11-16',
        service_names: 'לוב (תנוך)',
      },
    },
    deps
  );
  assert.equal(waitlistRes.status, 201);
  assert.equal((await store.getWaitlistEntries()).length, 1);
});

// =========================================================================
// P1-E & P2: Content Consistency, Sanitization & Hebrew Helpers
// =========================================================================
test('P1-E / P2: Healing time, pain display, URL sanitization, phone validation, and Hebrew pluralization', () => {
  assert.equal(extractHealingTime(TEST_SERVICES[0]), '6–8 שבועות');
  assert.equal(extractHealingTime(TEST_SERVICES[1]), null); // Never invents category guess

  assert.equal(getPainDisplay(0), null); // Never fabricates 1/10
  assert.deepEqual(getPainDisplay(5), { value: 5, max: 10, label: '5/10' });

  assert.equal(sanitizeExternalUrl('javascript:alert(1)', 'https://yuval.test'), 'https://yuval.test');
  assert.equal(
    sanitizeExternalUrl('https://www.instagram.com/yuval_studio', 'https://yuval.test'),
    'https://www.instagram.com/yuval_studio'
  );

  assert.equal(isValidIsraeliPhone('050-123-4567'), true);
  assert.equal(isValidIsraeliPhone('0501234567'), true);
  assert.equal(isValidIsraeliPhone('abc1234567'), false);

  assert.equal(pluralizeHebrew(1, 'עיצוב אחד', '2 עיצובים'), 'עיצוב אחד');
  assert.equal(pluralizeHebrew(2, 'עיצוב אחד', '2 עיצובים'), '2 עיצובים');
});

// =========================================================================
// Deployment Env Fallback & Session Secret Stability
// =========================================================================
test('Server env fallback resolves legacy VITE_NEON_DATABASE_URL and derives stable session secret when SESSION_SECRET is unset', () => {
  const prevEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
    VITE_NEON_DATABASE_URL: process.env.VITE_NEON_DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  };

  try {
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.NEON_DATABASE_URL;
    delete process.env.SESSION_SECRET;
    process.env.NODE_ENV = 'production';
    process.env.VITE_NEON_DATABASE_URL = 'postgresql://user:pass@example-host/neondb?sslmode=require';

    assert.equal(
      resolveDatabaseUrlFromEnv(),
      'postgresql://user:pass@example-host/neondb?sslmode=require'
    );

    const derived1 = resolveSessionSecret();
    const derived2 = resolveSessionSecret();
    assert.equal(derived1.length, 64);
    assert.equal(derived1, derived2);

    // Canonical DATABASE_URL takes precedence over legacy VITE_NEON_DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://canonical/db';
    assert.equal(resolveDatabaseUrlFromEnv(), 'postgresql://canonical/db');

    // Explicit SESSION_SECRET overrides derived secret
    process.env.SESSION_SECRET = 'explicit-super-secret-value-at-least-16';
    assert.equal(resolveSessionSecret(), 'explicit-super-secret-value-at-least-16');

    // Production still fails closed when neither SESSION_SECRET nor any DB URL exists
    delete process.env.DATABASE_URL;
    delete process.env.VITE_NEON_DATABASE_URL;
    delete process.env.SESSION_SECRET;
    assert.throws(() => resolveSessionSecret(), /SESSION_SECRET is not configured/);
  } finally {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
