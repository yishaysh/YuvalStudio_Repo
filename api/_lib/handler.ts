import { JEWELRY_CATALOG } from '../../constants';
import {
  computeDayAvailability,
  jerusalemLocalToUtcDate,
  isStudioCompletelyClosed,
  normalizeHorizonDays,
} from '../../shared/availability';
import {
  agorotToShekels,
  calculateAppointmentPricing,
  multiplyAgorot,
  parsePriceToAgorot,
} from '../../shared/money';
import { APP_RELEASE_VERSION } from '../../shared/release';
import { calculateJewelryOrderPricing, resolveShippingPolicy } from '../../shared/shipping';
import { validateBookingCustomerInput, validateJewelryOrderInput } from '../../shared/validation';
import type { Profile, Service, StudioSettings } from '../../types';
import { defaultServerAiAnalyzer, type ServerAiAnalyzer } from './aiStylist';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  getAdminEmailsFromEnv,
  isAdminProfileOrEmail,
  signSessionToken,
  SESSION_COOKIE_NAME,
  verifyGoogleAccessTokenLive,
  verifySessionToken,
} from './auth';
import { defaultServerImageUploader, type ServerImageUploader } from './cloudinary';
import { defaultNotificationDispatcher, type NotificationDispatcher } from './notifications';
import {
  normalizeInventoryItem,
  normalizeServiceRow,
  normalizeWorkingHoursMap,
  sanitizeProfile,
  toPublicInventoryItem,
  toPublicService,
} from './sanitize';
import type {
  ApiRequestContext,
  ApiResponseResult,
  GoogleTokenVerifier,
  SessionPayload,
  StoreAdapter,
} from './types';

export interface HandlerDependencies {
  store: StoreAdapter;
  verifyGoogleToken?: GoogleTokenVerifier;
  notifications?: NotificationDispatcher;
  uploader?: ServerImageUploader;
  aiAnalyzer?: ServerAiAnalyzer;
  now?: () => Date;
}

function jsonResponse(
  status: number,
  body: any,
  setCookies?: string[],
  headers?: Record<string, string>
): ApiResponseResult {
  return {
    status,
    body,
    setCookies,
    headers: {
      'Cache-Control': 'no-store',
      ...(headers || {}),
    },
  };
}

function getNormalizedSubpath(rawPath: string, queryPath?: string): string {
  const fromQuery = (queryPath || '').trim();
  const raw = fromQuery ? `/${fromQuery.replace(/^\/+/, '')}` : rawPath;
  const withoutApi = raw.startsWith('/api') ? raw.slice(4) : raw;
  const cleaned = withoutApi.split('?')[0].replace(/\/+$/, '');
  return cleaned || '/';
}

async function resolveAuthenticatedSession(
  ctx: ApiRequestContext,
  store: StoreAdapter
): Promise<{ session: SessionPayload; profile: Profile } | null> {
  const token = ctx.cookies?.[SESSION_COOKIE_NAME];
  const parsed = verifySessionToken(token);
  if (!parsed) return null;
  const profile = await store.getProfileById(parsed.profileId);
  if (!profile) return null;
  const role: 'admin' | 'client' = isAdminProfileOrEmail(profile, profile.email) ? 'admin' : 'client';
  return {
    session: { ...parsed, role },
    profile: { ...profile, role },
  };
}

export async function handleApiRequest(
  ctx: ApiRequestContext,
  deps: HandlerDependencies
): Promise<ApiResponseResult> {
  const {
    store,
    verifyGoogleToken = verifyGoogleAccessTokenLive,
    notifications = defaultNotificationDispatcher,
    uploader = defaultServerImageUploader,
    aiAnalyzer = defaultServerAiAnalyzer,
    now = () => new Date(),
  } = deps;

  const subpath = getNormalizedSubpath(ctx.path, ctx.query?.path);
  const method = (ctx.method || 'GET').toUpperCase();
  const isHttps = ctx.isHttps ?? true;

  try {
    // ------------------------------------------------------------------
    // PUBLIC HEALTH & BOOTSTRAP
    // ------------------------------------------------------------------
    if (method === 'GET' && subpath === '/health') {
      return jsonResponse(200, {
        ok: true,
        version: APP_RELEASE_VERSION,
        timestamp: now().toISOString(),
      });
    }

    if (method === 'GET' && subpath === '/bootstrap') {
      const [publicSettings, rawSettings, services, gallery] = await Promise.all([
        store.getPublicSettings(),
        store.getRawSettings(),
        store.getServices(false),
        store.getGallery(1, 24),
      ]);

      const rawInventory =
        rawSettings.inventory_items !== undefined
          ? rawSettings.inventory_items
          : JEWELRY_CATALOG.map(i => ({ ...i, in_stock: true }));

      return jsonResponse(200, {
        version: APP_RELEASE_VERSION,
        settings: publicSettings,
        shippingPolicy: resolveShippingPolicy({
          ...publicSettings.studio_details,
          shipping_fee: publicSettings.shipping_fee ?? publicSettings.studio_details?.shipping_fee,
          free_shipping_threshold:
            publicSettings.free_shipping_threshold ?? publicSettings.studio_details?.free_shipping_threshold,
          shipping_eta: publicSettings.shipping_eta ?? publicSettings.studio_details?.shipping_eta,
        }),
        services: services.map(toPublicService),
        inventoryItems: rawInventory.map(toPublicInventoryItem),
        gallery,
      });
    }

    if (method === 'GET' && subpath === '/gallery') {
      const page = Math.max(1, Number.parseInt(ctx.query?.page || '1', 10) || 1);
      const limit = Math.min(50, Math.max(1, Number.parseInt(ctx.query?.limit || '12', 10) || 12));
      const data = await store.getGallery(page, limit);
      return jsonResponse(200, data);
    }

    // ------------------------------------------------------------------
    // AVAILABILITY (Fail-closed, timezone-safe Asia/Jerusalem, zero PII)
    // ------------------------------------------------------------------
    if (method === 'GET' && subpath === '/availability') {
      const dateKey = (ctx.query?.date || '').trim();
      const durationMinutes = Math.max(
        15,
        Math.min(480, Number.parseInt(ctx.query?.duration || '30', 10) || 30)
      );

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return jsonResponse(400, {
          date: dateKey,
          dayOfWeek: 0,
          status: 'error',
          reasonMessage: 'פורמט תאריך לא תקין (נדרש YYYY-MM-DD)',
          slots: [],
          horizonDays: 30,
          maxBookableDate: '',
          serviceDurationMinutes: durationMinutes,
        });
      }

      try {
        const currentNow = now();
        const rawSettings = await store.getRawSettings();
        const horizonDays = normalizeHorizonDays(
          rawSettings.booking_horizon_days ?? rawSettings.studio_details?.booking_horizon_days
        );
        const workingHours = normalizeWorkingHoursMap(rawSettings.working_hours);

        // Fetch wide 48h buffer around target date in UTC to cover full Asia/Jerusalem day + DST
        const dayCenterStart = jerusalemLocalToUtcDate(dateKey, 0);
        const fromIso = new Date(dayCenterStart.getTime() - 12 * 3600 * 1000).toISOString();
        const toIso = new Date(dayCenterStart.getTime() + 36 * 3600 * 1000).toISOString();
        const busy = await store.getAppointmentBusyIntervals(fromIso, toIso);

        const result = computeDayAvailability({
          dateKey,
          workingHours,
          existingAppointments: busy,
          serviceDurationMinutes: durationMinutes,
          horizonDays,
          now: currentNow,
        });

        return jsonResponse(200, result);
      } catch (err) {
        console.error('Availability calculation failed (failing closed):', err);
        return jsonResponse(503, {
          date: dateKey,
          dayOfWeek: 0,
          status: 'error',
          reasonMessage: 'לא ניתן לטעון את הזמינות כרגע. אנא נסי שוב בעוד מספר רגעים או פני לסטודיו בוואטסאפ.',
          slots: [],
          horizonDays: 30,
          maxBookableDate: '',
          serviceDurationMinutes: durationMinutes,
        });
      }
    }

    // ------------------------------------------------------------------
    // COUPON VALIDATION
    // ------------------------------------------------------------------
    if (method === 'POST' && subpath === '/coupons/validate') {
      const code = String(ctx.body?.code || '').trim();
      const cartTotal = agorotToShekels(parsePriceToAgorot(ctx.body?.cartTotal, 0));
      if (!code) {
        return jsonResponse(400, { isValid: false, error: 'נא להזין קוד קופון' });
      }
      const res = await store.validateCoupon(code, cartTotal);
      return jsonResponse(200, res);
    }

    // ------------------------------------------------------------------
    // WAITLIST REQUESTS (when dates are full or closed)
    // ------------------------------------------------------------------
    if (method === 'POST' && subpath === '/waitlist') {
      const clientName = String(ctx.body?.client_name || '').trim();
      const clientPhone = String(ctx.body?.client_phone || '').trim();
      const preferredDate = ctx.body?.preferred_date ? String(ctx.body.preferred_date).trim() : undefined;
      const serviceNames = ctx.body?.service_names ? String(ctx.body.service_names).trim() : undefined;
      const notes = ctx.body?.notes ? String(ctx.body.notes).trim() : undefined;

      const validationErr = validateBookingCustomerInput({
        client_name: clientName,
        client_phone: clientPhone,
      });
      if (validationErr) {
        return jsonResponse(400, { error: validationErr });
      }

      const saved = await store.addWaitlistEntry({
        client_name: clientName,
        client_phone: clientPhone,
        preferred_date: preferredDate,
        service_names: serviceNames,
        notes,
      });

      return jsonResponse(201, { entry: saved });
    }

    // ------------------------------------------------------------------
    // JEWELRY ORDERS (P1-B / P1-C: Server-validated, idempotent, no fake success)
    // ------------------------------------------------------------------
    if (method === 'POST' && subpath === '/orders') {
      const body = ctx.body || {};
      const parsedValidation = validateJewelryOrderInput({
        clientName: body.client_name,
        clientPhone: body.client_phone,
        deliveryMethod: body.delivery_method === 'pickup' ? 'pickup' : 'delivery',
        shippingAddress: body.shipping_address,
        notes: body.notes,
        items: Array.isArray(body.items) ? body.items : [],
      });

      if (!parsedValidation.isValid) {
        const firstErr =
          parsedValidation.errors.items ||
          parsedValidation.errors.clientName ||
          parsedValidation.errors.clientPhone ||
          parsedValidation.errors.shippingAddress ||
          'פרטי ההזמנה אינם תקינים';
        return jsonResponse(400, { error: firstErr, fieldErrors: parsedValidation.errors });
      }

      const rawSettings = await store.getRawSettings();
      const rawInventory =
        rawSettings.inventory_items !== undefined
          ? rawSettings.inventory_items
          : JEWELRY_CATALOG.map(i => ({ ...i, in_stock: true }));
      const inventoryMap = new Map(
        rawInventory.map(normalizeInventoryItem).map(item => [item.id, item])
      );

      let goodsSubtotalAgorot = 0;
      const resolvedItems: Array<{
        product_id: string;
        name: string;
        price: number;
        quantity: number;
        image_url?: string;
      }> = [];

      for (const reqItem of body.items) {
        const productId = String(reqItem?.product_id || reqItem?.id || '').trim();
        const qty = Number(reqItem?.quantity);
        if (!productId || !Number.isInteger(qty) || qty <= 0 || qty > 99) {
          return jsonResponse(400, { error: 'פריט או כמות אינם תקינים בהזמנה' });
        }
        const catalogItem = inventoryMap.get(productId);
        if (!catalogItem || catalogItem.is_active === false || catalogItem.price <= 0) {
          return jsonResponse(400, { error: `המוצר "${reqItem?.name || productId}" אינו זמין לרכישה כרגע` });
        }
        if (catalogItem.in_stock === false || (catalogItem.stock_quantity !== undefined && catalogItem.stock_quantity < qty)) {
          return jsonResponse(409, {
            error: `המוצר "${catalogItem.name}" אזל מהמלאי או שאין כמות מספקת (${catalogItem.stock_quantity ?? 0} זמינים)`,
          });
        }

        const unitAgorot = parsePriceToAgorot(catalogItem.price, 0);
        goodsSubtotalAgorot += multiplyAgorot(unitAgorot, qty);
        resolvedItems.push({
          product_id: catalogItem.id,
          name: catalogItem.name,
          price: agorotToShekels(unitAgorot),
          quantity: qty,
          image_url: catalogItem.image_url,
        });
      }

      const policy = resolveShippingPolicy({
        ...rawSettings.studio_details,
        shipping_fee: rawSettings.shipping_fee ?? rawSettings.studio_details?.shipping_fee,
        free_shipping_threshold:
          rawSettings.free_shipping_threshold ?? rawSettings.studio_details?.free_shipping_threshold,
        shipping_eta: rawSettings.shipping_eta ?? rawSettings.studio_details?.shipping_eta,
      });
      const shippingCalc = calculateJewelryOrderPricing({
        goodsSubtotalAgorot,
        deliveryMethod: parsedValidation.normalized.deliveryMethod,
        policy,
      });

      const idempotencyKey =
        typeof body.idempotency_key === 'string' && body.idempotency_key.trim().length >= 8
          ? body.idempotency_key.trim()
          : undefined;

      const { order, created } = await store.createJewelryOrderIdempotent({
        idempotencyKey,
        client_name: parsedValidation.normalized.clientName,
        client_phone: parsedValidation.normalized.clientPhone,
        client_email: typeof body.client_email === 'string' ? body.client_email.trim() : undefined,
        items: resolvedItems,
        total_price: shippingCalc.totalShekels,
        delivery_method: parsedValidation.normalized.deliveryMethod,
        shipping_address: parsedValidation.normalized.shippingAddress,
        shipping_cost: shippingCalc.shippingFeeShekels,
        notes: parsedValidation.normalized.notes,
      });

      let notificationResult: { telegram: string; email: string; error?: string } = {
        telegram: 'skipped',
        email: 'skipped',
      };

      if (created) {
        notificationResult = await notifications.sendOrderNotifications(order, rawSettings);
        const notifStatus =
          notificationResult.telegram === 'failed' || notificationResult.email === 'failed'
            ? 'failed'
            : notificationResult.telegram === 'sent' || notificationResult.email === 'sent'
              ? 'sent'
              : 'skipped';

        try {
          await store.updateJewelryOrderNotificationState(order.id, notifStatus, notificationResult.error);
          order.notification_status = notifStatus;
          order.notification_error = notificationResult.error;
        } catch (err) {
          console.warn('Could not persist notification_status:', err);
        }
      }

      return jsonResponse(created ? 201 : 200, {
        order,
        created,
        pricing: {
          goodsSubtotal: shippingCalc.goodsSubtotalShekels,
          shippingFee: shippingCalc.shippingFeeShekels,
          total: shippingCalc.totalShekels,
          qualifiesForFreeShipping: shippingCalc.qualifiesForFreeShipping,
        },
        notification: notificationResult,
      });
    }

    // ------------------------------------------------------------------
    // APPOINTMENTS CREATE (Server-validated price, availability, overlap lock)
    // ------------------------------------------------------------------
    if (method === 'POST' && subpath === '/appointments') {
      const body = ctx.body || {};
      const auth = await resolveAuthenticatedSession(ctx, store);
      const isQuickSale = Boolean(body.is_quick_sale);

      if (isQuickSale && auth?.session.role !== 'admin') {
        return jsonResponse(403, { error: 'מכירה מהירה מותרת למנהל מערכת מאומת בלבד' });
      }

      const customerErr = validateBookingCustomerInput({
        client_name: body.client_name,
        client_phone: body.client_phone,
        is_under_16: Boolean(body.is_under_16),
        parent_name: body.parent_name,
        parent_id: body.parent_id,
        parent_phone: body.parent_phone,
        is_quick_sale: isQuickSale,
      });
      if (customerErr) {
        return jsonResponse(400, { error: customerErr });
      }

      const rawSettings = await store.getRawSettings();
      const allServices = await store.getServices(false);
      const serviceMap = new Map(allServices.map(s => [s.id, normalizeServiceRow(s)]));

      const requestedServiceIds: string[] = Array.isArray(body.service_ids)
        ? body.service_ids.map((id: any) => String(id)).filter(Boolean)
        : body.service_id
          ? [String(body.service_id)]
          : [];

      const requestedJewelryIds: string[] = Array.isArray(body.jewelry_ids)
        ? body.jewelry_ids.map((id: any) => String(id)).filter(Boolean)
        : [];

      let resolvedServices: Service[] = [];
      for (const sid of requestedServiceIds) {
        const svc = serviceMap.get(sid);
        if (!svc) {
          return jsonResponse(400, { error: 'אחד השירותים שנבחרו אינו פעיל או לא קיים במערכת' });
        }
        resolvedServices.push(svc);
      }

      const rawInv =
        rawSettings.inventory_items !== undefined
          ? rawSettings.inventory_items
          : JEWELRY_CATALOG.map(i => ({ ...i, in_stock: true }));
      const invMap = new Map(rawInv.map(normalizeInventoryItem).map(i => [i.id, i]));
      const resolvedJewelry = requestedJewelryIds
        .map(id => invMap.get(id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x && x.price > 0));

      if (!isQuickSale && resolvedServices.length === 0 && resolvedJewelry.length === 0) {
        return jsonResponse(400, { error: 'יש לבחור לפחות שירות או תכשיט אחד לזימון' });
      }

      const startDate = new Date(body.start_time);
      if (!Number.isFinite(startDate.getTime())) {
        return jsonResponse(400, { error: 'תאריך ושעת התור אינם תקינים' });
      }

      const totalDuration = isQuickSale
        ? 30
        : Math.max(
            15,
            Math.min(
              480,
              resolvedServices.reduce((acc, s) => acc + (s.duration_minutes || 30), 0) || 30
            )
          );
      const endDate = new Date(startDate.getTime() + totalDuration * 60000);

      // For public bookings: enforce schedule working hours & horizon in Asia/Jerusalem
      if (!isQuickSale) {
        const currentNow = now();
        if (startDate.getTime() < currentNow.getTime() + 10 * 60000) {
          return jsonResponse(400, { error: 'לא ניתן להזמין תור למועד שכבר עבר.' });
        }
        const workingHours = normalizeWorkingHoursMap(rawSettings.working_hours);
        if (isStudioCompletelyClosed(workingHours)) {
          return jsonResponse(409, {
            error: 'יומן התורים אינו פתוח להזמנה אונליין כרגע.',
          });
        }
        const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jerusalem',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const dateKey = dateKeyFormatter.format(startDate);
        const busy = await store.getAppointmentBusyIntervals(
          new Date(startDate.getTime() - 12 * 3600 * 1000).toISOString(),
          new Date(startDate.getTime() + 12 * 3600 * 1000).toISOString()
        );
        const horizonDays = normalizeHorizonDays(
          rawSettings.booking_horizon_days ?? rawSettings.studio_details?.booking_horizon_days
        );
        const availability = computeDayAvailability({
          dateKey,
          workingHours,
          existingAppointments: busy,
          serviceDurationMinutes: totalDuration,
          horizonDays,
          now: currentNow,
        });
        const matchingSlot = availability.slots.find(
          s => s.available && s.startIso && Math.abs(new Date(s.startIso).getTime() - startDate.getTime()) < 60000
        );
        if (availability.status !== 'open' || !matchingSlot) {
          return jsonResponse(409, {
            error: availability.reasonMessage || 'השעה שנבחרה אינה פנויה עוד. אנא בחרי מועד אחר.',
          });
        }
      }

      // Trusted server-side agorot pricing calculation (services + jewelry - coupon - referral)
      const servicePricesShekels = resolvedServices.map(s => s.price);
      const jewelryPricesShekels = resolvedJewelry.map(j => j.price);
      const preliminarySubtotalShekels = agorotToShekels(
        calculateAppointmentPricing({
          servicePricesShekels,
          jewelryPricesShekels,
        }).subtotalAgorot
      );

      let validCoupon: any = null;
      const couponCode = typeof body.coupon_code === 'string' ? body.coupon_code.trim() : '';
      if (couponCode) {
        const couponRes = await store.validateCoupon(couponCode, preliminarySubtotalShekels);
        if (!couponRes.isValid) {
          return jsonResponse(400, { error: couponRes.error || 'הקופון אינו תקף' });
        }
        validCoupon = couponRes.coupon;
      }

      const referralCodeUsed =
        typeof body.referred_by === 'string' && body.referred_by.trim()
          ? body.referred_by.trim()
          : undefined;

      const pricing = calculateAppointmentPricing({
        servicePricesShekels,
        jewelryPricesShekels,
        coupon: validCoupon,
        hasReferralDiscount: Boolean(referralCodeUsed),
      });

      // Quick-sale admin override keeps admin-entered discount/cart values safely
      const priceToSave = isQuickSale
        ? agorotToShekels(parsePriceToAgorot(body.price, pricing.subtotalAgorot))
        : agorotToShekels(pricing.subtotalAgorot);
      const finalPriceToSave = isQuickSale
        ? agorotToShekels(parsePriceToAgorot(body.final_price, pricing.finalTotalAgorot))
        : agorotToShekels(pricing.finalTotalAgorot);

      // Handle server-side anatomy / AI media upload if passed cleanly as data URL
      let anatomyUrl = typeof body.anatomy_image_url === 'string' ? body.anatomy_image_url : undefined;
      if (typeof body.anatomy_image_data_url === 'string' && body.anatomy_image_data_url.startsWith('data:image/')) {
        try {
          anatomyUrl = await uploader({ dataUrl: body.anatomy_image_data_url, folder: 'anatomy-images' });
        } catch (err: any) {
          console.warn('Anatomy image upload failed cleanly, proceeding without broken link:', err?.message);
        }
      }

      let resolvedVisualPlan = typeof body.visual_plan === 'string' ? body.visual_plan : undefined;
      if (typeof body.ai_image_data_url === 'string' && body.ai_image_data_url.startsWith('data:image/')) {
        try {
          const uploadedAiUrl = await uploader({ dataUrl: body.ai_image_data_url, folder: 'gallery-images' });
          if (uploadedAiUrl && resolvedVisualPlan) {
            const parsedPlan = JSON.parse(resolvedVisualPlan);
            parsedPlan.original_image = uploadedAiUrl;
            parsedPlan.userImage = uploadedAiUrl;
            resolvedVisualPlan = JSON.stringify(parsedPlan);
          }
        } catch (err: any) {
          console.warn('AI image upload failed cleanly, keeping inline plan without crashing:', err?.message);
        }
      }

      const primaryService = resolvedServices[0] || null;
      const serviceSummaryName =
        resolvedServices.length > 0
          ? resolvedServices.map(s => s.name).join(' + ')
          : body.service_name || 'תכשיטים / כללי';

      const idempotencyKey =
        typeof body.idempotency_key === 'string' && body.idempotency_key.trim().length >= 8
          ? body.idempotency_key.trim()
          : undefined;

      const { appointment, created } = await store.createAppointmentAtomic({
        idempotencyKey,
        client_id: isQuickSale ? null : auth?.profile.id || null,
        service_id: primaryService?.id || (body.service_id ? String(body.service_id) : null),
        service_name: serviceSummaryName,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        price: priceToSave,
        final_price: finalPriceToSave,
        status: isQuickSale ? 'completed' : 'pending',
        notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : undefined,
        guest_name: String(body.client_name || 'לקוח מזדמן').trim(),
        guest_email: typeof body.client_email === 'string' ? body.client_email.trim() : auth?.profile.email,
        guest_phone: String(body.client_phone || '').trim(),
        signature: typeof body.signature === 'string' ? body.signature : undefined,
        total_cost: isQuickSale ? Number(body.total_cost || 0) : undefined,
        total_profit: isQuickSale ? Number(body.total_profit || 0) : undefined,
        cart_items: Array.isArray(body.cart_items) ? body.cart_items : undefined,
        visual_plan: resolvedVisualPlan,
        ai_recommendation_text:
          typeof body.ai_recommendation_text === 'string' ? body.ai_recommendation_text : undefined,
        anatomy_image_url: anatomyUrl,
        anatomy_status: anatomyUrl ? 'pending' : body.anatomy_status,
        coupon_code: validCoupon?.code,
        is_under_16: Boolean(body.is_under_16),
        parent_name: body.is_under_16 ? String(body.parent_name || '').trim() : undefined,
        parent_id: body.is_under_16 ? String(body.parent_id || '').trim() : undefined,
        parent_phone: body.is_under_16 ? String(body.parent_phone || '').trim() : undefined,
        referralCodeUsed,
        bypassOverlapCheck: isQuickSale,
      });

      let notification = { telegram: 'skipped', email: 'skipped' } as {
        telegram: string;
        email: string;
        error?: string;
      };
      if (created && !isQuickSale) {
        notification = await notifications.sendAppointmentNotifications(appointment, rawSettings);
      }

      return jsonResponse(created ? 201 : 200, {
        appointment,
        created,
        notification,
      });
    }

    // ------------------------------------------------------------------
    // AI STYLIST SERVER PROXY (P0: Keeps GEMINI_API_KEY strictly on server)
    // ------------------------------------------------------------------
    if (method === 'POST' && subpath === '/ai-stylist') {
      const base64Image = String(ctx.body?.imageBase64 || '');
      if (!base64Image || base64Image.length < 32) {
        return jsonResponse(400, { error: 'לא נבחרה תמונה תקינה לניתוח' });
      }
      if (base64Image.length > 6 * 1024 * 1024) {
        return jsonResponse(413, { error: 'התמונה גדולה מדי לניתוח' });
      }
      try {
        const rawSettings = await store.getRawSettings();
        const catalog =
          rawSettings.inventory_items !== undefined
            ? rawSettings.inventory_items.map(normalizeInventoryItem)
            : JEWELRY_CATALOG.map(i => ({ ...i, in_stock: true }));
        const result = await aiAnalyzer(base64Image, catalog);
        return jsonResponse(200, result);
      } catch (err: any) {
        return jsonResponse(503, { error: err?.message || 'שירות ניתוח ה-AI אינו זמין כרגע' });
      }
    }

    // ------------------------------------------------------------------
    // AUTHENTICATION (Google verified on server -> HttpOnly signed cookie)
    // ------------------------------------------------------------------
    if (method === 'POST' && subpath === '/auth/google') {
      const accessToken = String(ctx.body?.accessToken || '').trim();
      const requireAdminLogin = Boolean(ctx.body?.requireAdmin);
      if (!accessToken) {
        return jsonResponse(400, { error: 'חסר אסימון הזדהות של Google' });
      }

      let googleInfo;
      try {
        googleInfo = await verifyGoogleToken(accessToken);
      } catch (err: any) {
        return jsonResponse(401, { error: err?.message || 'אימות מול Google נכשל' });
      }

      const adminEmails = getAdminEmailsFromEnv();
      const profile = await store.upsertGoogleProfile(googleInfo, adminEmails);
      const role: 'admin' | 'client' = isAdminProfileOrEmail(profile, profile.email) ? 'admin' : 'client';

      if (requireAdminLogin && role !== 'admin') {
        return jsonResponse(403, {
          error: 'לחשבון Google זה אין הרשאת מנהל בסטודיו. אנא התחברי עם חשבון המנהלת המאושר.',
        });
      }

      const token = signSessionToken({
        profileId: profile.id,
        email: profile.email,
        role,
        name: profile.full_name,
      });

      return jsonResponse(
        200,
        { user: { ...profile, role } },
        [buildSessionCookie(token, isHttps)]
      );
    }

    if (method === 'GET' && subpath === '/auth/session') {
      const resolved = await resolveAuthenticatedSession(ctx, store);
      if (!resolved) {
        return jsonResponse(200, { user: null });
      }
      return jsonResponse(200, { user: resolved.profile });
    }

    if (method === 'POST' && subpath === '/auth/logout') {
      return jsonResponse(200, { ok: true }, [buildClearSessionCookie(isHttps)]);
    }

    // ------------------------------------------------------------------
    // CLIENT PERSONAL AREA (/api/me/*) - Auth required, strict self-scope
    // ------------------------------------------------------------------
    if (subpath.startsWith('/me/')) {
      const auth = await resolveAuthenticatedSession(ctx, store);
      if (!auth) {
        return jsonResponse(401, { error: 'נדרשת התחברות כדי לבצע פעולה זו' });
      }
      const userId = auth.profile.id;

      if (method === 'GET' && subpath === '/me/appointments') {
        const list = await store.getAppointmentsForUser(userId);
        return jsonResponse(200, { appointments: list });
      }

      if (method === 'PATCH' && subpath === '/me/profile') {
        const updates: { full_name?: string; phone?: string; avatar_url?: string } = {};
        if (typeof ctx.body?.full_name === 'string') {
          updates.full_name = ctx.body.full_name.trim().slice(0, 120);
        }
        if (typeof ctx.body?.phone === 'string') {
          updates.phone = ctx.body.phone.trim().slice(0, 30);
        }
        if (typeof ctx.body?.avatar_url === 'string') {
          updates.avatar_url = ctx.body.avatar_url.trim().slice(0, 500);
        }
        const updated = await store.updateProfileSafe(userId, updates);
        return jsonResponse(200, { user: updated });
      }

      if (method === 'POST' && subpath === '/me/upload') {
        const dataUrl = String(ctx.body?.dataUrl || '');
        const url = await uploader({ dataUrl, folder: 'avatars' });
        const updated = await store.updateProfileSafe(userId, { avatar_url: url });
        return jsonResponse(200, { url, user: updated });
      }

      if (method === 'GET' && subpath === '/me/wishlist') {
        const items = await store.getWishlist(userId);
        return jsonResponse(200, { items, ids: auth.profile.wishlist || [] });
      }

      if (method === 'POST' && subpath === '/me/wishlist') {
        const itemId = String(ctx.body?.itemId || '').trim();
        if (!itemId) return jsonResponse(400, { error: 'חסר מזהה פריט' });
        const wishlist = await store.toggleWishlist(userId, itemId);
        return jsonResponse(200, { wishlist });
      }

      if (method === 'GET' && subpath === '/me/aftercare') {
        const lastCheckin = await store.getLastAftercareCheckin(userId);
        return jsonResponse(200, { lastCheckin });
      }

      if (method === 'POST' && subpath === '/me/aftercare') {
        const lastCheckin = await store.checkInAftercare(userId);
        return jsonResponse(200, { ok: Boolean(lastCheckin), lastCheckin });
      }
    }

    // ------------------------------------------------------------------
    // ADMIN ENDPOINTS (/api/admin/*) - Server-enforced Admin Role ONLY
    // ------------------------------------------------------------------
    if (subpath === '/admin' || subpath.startsWith('/admin/')) {
      const auth = await resolveAuthenticatedSession(ctx, store);
      if (!auth) {
        return jsonResponse(401, { error: 'נדרשת כניסת מנהל מאומתת' });
      }
      if (auth.session.role !== 'admin') {
        return jsonResponse(403, { error: 'אין הרשאת ניהול לחשבון זה' });
      }

      if (method === 'GET' && subpath === '/admin/bootstrap') {
        const [appointments, services, settings, stats, gallery, orders, waitlist] = await Promise.all([
          store.getAdminAppointments(),
          store.getServices(true),
          store.getRawSettings(),
          store.getMonthlyStats(),
          store.getGallery(1, 50),
          store.getJewelryOrders(),
          store.getWaitlistEntries(),
        ]);
        return jsonResponse(200, {
          appointments,
          services,
          settings,
          stats,
          gallery,
          orders,
          waitlist,
        });
      }

      if (method === 'GET' && subpath === '/admin/appointments') {
        return jsonResponse(200, { appointments: await store.getAdminAppointments() });
      }

      const apptMatch = subpath.match(/^\/admin\/appointments\/([^/]+)$/);
      if (apptMatch) {
        const id = apptMatch[1];
        if (method === 'PATCH') {
          const updated = await store.updateAppointment(id, ctx.body || {});
          if (!updated) return jsonResponse(404, { error: 'התור לא נמצא' });
          return jsonResponse(200, { appointment: updated });
        }
        if (method === 'DELETE') {
          const deleted = await store.deleteAppointment(id);
          return jsonResponse(deleted ? 200 : 404, { ok: deleted });
        }
      }

      if (method === 'POST' && subpath === '/admin/appointments/clear') {
        await store.clearAppointments();
        return jsonResponse(200, { ok: true });
      }

      const profMatch = subpath.match(/^\/admin\/profiles\/([^/]+)$/);
      if (profMatch && method === 'GET') {
        const p = await store.getProfileById(profMatch[1]);
        if (!p) return jsonResponse(404, { error: 'פרופיל לא נמצא' });
        return jsonResponse(200, { profile: sanitizeProfile(p) });
      }

      if (method === 'PUT' && subpath === '/admin/settings') {
        const updated = await store.updateSettings((ctx.body || {}) as Partial<StudioSettings>);
        return jsonResponse(200, { settings: updated });
      }

      if (method === 'GET' && subpath === '/admin/services') {
        return jsonResponse(200, { services: await store.getServices(true) });
      }

      if (method === 'POST' && subpath === '/admin/services') {
        const created = await store.addService(ctx.body || {});
        return jsonResponse(201, { service: created });
      }

      const svcMatch = subpath.match(/^\/admin\/services\/([^/]+)$/);
      if (svcMatch) {
        const id = svcMatch[1];
        if (method === 'PATCH') {
          const updated = await store.updateService(id, ctx.body || {});
          if (!updated) return jsonResponse(404, { error: 'השירות לא נמצא' });
          return jsonResponse(200, { service: updated });
        }
        if (method === 'DELETE') {
          const ok = await store.deleteService(id);
          return jsonResponse(ok ? 200 : 404, { ok });
        }
      }

      if (method === 'GET' && subpath === '/admin/stats') {
        return jsonResponse(200, await store.getMonthlyStats());
      }

      if (method === 'GET' && subpath === '/admin/expenses') {
        const month = ctx.query?.month !== undefined ? Number(ctx.query.month) : undefined;
        const year = ctx.query?.year !== undefined ? Number(ctx.query.year) : undefined;
        const list = await store.getExpenses(
          Number.isFinite(month) ? month : undefined,
          Number.isFinite(year) ? year : undefined
        );
        return jsonResponse(200, { expenses: list });
      }

      if (method === 'POST' && subpath === '/admin/expenses') {
        const created = await store.addExpense(ctx.body || {});
        return jsonResponse(201, { expense: created });
      }

      const expMatch = subpath.match(/^\/admin\/expenses\/([^/]+)$/);
      if (expMatch && method === 'DELETE') {
        const ok = await store.deleteExpense(expMatch[1]);
        return jsonResponse(ok ? 200 : 404, { ok });
      }

      if (method === 'POST' && subpath === '/admin/gallery') {
        const imageUrl = String(ctx.body?.image_url || '').trim();
        if (!imageUrl) return jsonResponse(400, { error: 'חסר קישור תמונה' });
        const item = await store.addToGallery(imageUrl);
        return jsonResponse(201, { item });
      }

      const gallMatch = subpath.match(/^\/admin\/gallery\/([^/]+)$/);
      if (gallMatch && method === 'DELETE') {
        const ok = await store.deleteFromGallery(gallMatch[1]);
        return jsonResponse(ok ? 200 : 404, { ok });
      }

      if (method === 'GET' && subpath === '/admin/orders') {
        return jsonResponse(200, { orders: await store.getJewelryOrders() });
      }

      const orderMatch = subpath.match(/^\/admin\/orders\/([^/]+)$/);
      if (orderMatch) {
        const id = orderMatch[1];
        if (method === 'PATCH') {
          const ok = await store.updateJewelryOrderStatus(id, ctx.body?.status);
          return jsonResponse(ok ? 200 : 404, { ok });
        }
        if (method === 'DELETE') {
          const ok = await store.deleteJewelryOrder(id);
          return jsonResponse(ok ? 200 : 404, { ok });
        }
      }

      if (method === 'GET' && subpath === '/admin/waitlist') {
        return jsonResponse(200, { waitlist: await store.getWaitlistEntries() });
      }

      if (method === 'POST' && subpath === '/admin/upload') {
        const folder =
          ctx.body?.folder === 'service-images' ? 'service-images' : 'gallery-images';
        const dataUrl = String(ctx.body?.dataUrl || '');
        const url = await uploader({ dataUrl, folder });
        return jsonResponse(200, { url });
      }
    }

    return jsonResponse(404, { error: `API route not found: ${method} ${subpath}` });
  } catch (err: any) {
    if (err?.code === 'SLOT_CONFLICT') {
      return jsonResponse(409, { error: err.message });
    }
    console.error(`[API ${method} ${subpath}] Unhandled error:`, err);
    return jsonResponse(500, { error: err?.message || 'שגיאת שרת פנימית' });
  }
}
