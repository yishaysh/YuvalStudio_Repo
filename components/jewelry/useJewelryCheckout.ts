import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api, ApiError } from '../../services/mockApi';
import {
  buildOrderWhatsAppMessage,
  buildWhatsAppContactUrl,
  getStudioWhatsAppPhone,
} from '../../services/notifications';
import { AUTHORITATIVE_SHIPPING_POLICY, calculateJewelryOrderPricing, type ShippingPolicyConfig } from '../../shared/shipping';
import { parsePriceToAgorot, multiplyAgorot } from '../../shared/money';
import { validateJewelryOrderInput } from '../../shared/validation';
import type { JewelryOrder, StudioDetails } from '../../types';

export interface CheckoutLineItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  category?: string;
}

export interface UseJewelryCheckoutOptions {
  items: CheckoutLineItem[];
  draftStorageKey: string;
  isActive: boolean;
  onOrderPersisted?: (order: JewelryOrder) => void;
}

function createOrderIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ord_${crypto.randomUUID()}`;
  }
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useJewelryCheckout({
  items,
  draftStorageKey,
  isActive,
  onOrderPersisted,
}: UseJewelryCheckoutOptions) {
  const { user, profile } = useAuth();

  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [shippingPolicy, setShippingPolicy] = useState<ShippingPolicyConfig>(AUTHORITATIVE_SHIPPING_POLICY);
  const [studioDetails, setStudioDetails] = useState<Partial<StudioDetails> | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<JewelryOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    clientName?: string;
    clientPhone?: string;
    shippingAddress?: string;
    items?: string;
  }>({});
  const [hasUnsentDraft, setHasUnsentDraft] = useState(false);

  const idempotencyKeyRef = useRef<string | null>(null);
  const itemsSignature = useMemo(
    () => items.map(i => `${i.id}:${i.quantity}:${i.price}`).join('|'),
    [items]
  );

  // Reset idempotency key when basket or delivery terms change before persistence
  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [itemsSignature, deliveryMethod, clientPhone, shippingAddress]);

  // Load authoritative shipping policy & studio contact details once
  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    api.getBootstrap()
      .then(res => {
        if (cancelled) return;
        if (res.shippingPolicy) setShippingPolicy(res.shippingPolicy);
        if (res.settings?.studio_details) setStudioDetails(res.settings.studio_details);
      })
      .catch(() => {
        // Keep authoritative default policy if offline; submission itself still fails honestly
      });
    return () => {
      cancelled = true;
    };
  }, [isActive]);

  // Pre-fill signed-in profile values if empty
  useEffect(() => {
    if (!isActive) return;
    if (profile || user) {
      setClientName(prev => prev || profile?.full_name || user?.user_metadata?.full_name || '');
      setClientPhone(prev => prev || profile?.phone || '');
    }
  }, [isActive, profile, user]);

  // Restore unsent draft clearly marked as draft only
  useEffect(() => {
    if (!isActive || confirmedOrder) return;
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft && (draft.clientName || draft.clientPhone || draft.shippingAddress || draft.notes)) {
        if (draft.deliveryMethod === 'delivery' || draft.deliveryMethod === 'pickup') {
          setDeliveryMethod(draft.deliveryMethod);
        }
        if (typeof draft.clientName === 'string' && !clientName) setClientName(draft.clientName);
        if (typeof draft.clientPhone === 'string' && !clientPhone) setClientPhone(draft.clientPhone);
        if (typeof draft.shippingAddress === 'string' && !shippingAddress) setShippingAddress(draft.shippingAddress);
        if (typeof draft.notes === 'string' && !notes) setNotes(draft.notes);
        setHasUnsentDraft(true);
      }
    } catch {
      // Ignore malformed draft
    }
    // Intentionally run once on modal/drawer activation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Persist unsent draft on edits so customer never loses typed details on failure
  useEffect(() => {
    if (!isActive || confirmedOrder) return;
    const hasContent = Boolean(clientName.trim() || clientPhone.trim() || shippingAddress.trim() || notes.trim());
    if (!hasContent) return;
    try {
      localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          deliveryMethod,
          clientName,
          clientPhone,
          shippingAddress,
          notes,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [isActive, confirmedOrder, draftStorageKey, deliveryMethod, clientName, clientPhone, shippingAddress, notes]);

  const clearSavedDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // Ignore
    }
    setHasUnsentDraft(false);
  }, [draftStorageKey]);

  const goodsSubtotalAgorot = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + multiplyAgorot(parsePriceToAgorot(item.price, 0), item.quantity),
        0
      ),
    [items]
  );

  const pricing = useMemo(
    () =>
      calculateJewelryOrderPricing({
        goodsSubtotalAgorot,
        deliveryMethod,
        policy: shippingPolicy,
      }),
    [goodsSubtotalAgorot, deliveryMethod, shippingPolicy]
  );

  const validateAndNormalize = useCallback(() => {
    const result = validateJewelryOrderInput({
      clientName,
      clientPhone,
      deliveryMethod,
      shippingAddress,
      notes,
      items: items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity })),
    });
    setFieldErrors(result.errors);
    if (!result.isValid) {
      const firstErr =
        result.errors.items ||
        result.errors.clientName ||
        result.errors.clientPhone ||
        result.errors.shippingAddress ||
        'נא לבדוק את הפרטים שהוזנו';
      setErrorMsg(firstErr);
      return null;
    }
    setErrorMsg('');
    return result.normalized;
  }, [clientName, clientPhone, deliveryMethod, shippingAddress, notes, items]);

  const persistOrder = useCallback(async () => {
    const normalized = validateAndNormalize();
    if (!normalized) return null;

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = createOrderIdempotencyKey();
    }

    const saved = await api.createJewelryOrder({
      idempotency_key: idempotencyKeyRef.current,
      client_name: normalized.clientName,
      client_phone: normalized.clientPhone,
      delivery_method: normalized.deliveryMethod,
      shipping_address: normalized.shippingAddress,
      notes: normalized.notes,
      items: items.map(i => ({
        id: i.id,
        product_id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image_url: i.image_url,
        category: i.category,
      })),
    });

    clearSavedDraft();
    setConfirmedOrder(saved);
    onOrderPersisted?.(saved);
    return saved;
  }, [validateAndNormalize, items, clearSavedDraft, onOrderPersisted]);

  const submitWebsiteOrder = useCallback(async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await persistOrder();
    } catch (err: any) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(prev => ({ ...prev, ...err.fieldErrors }));
      }
      setErrorMsg(
        err?.message || 'ההזמנה לא נשמרה בשרת — הפרטים נשמרו כטיוטה שלא נשלחה. בדקו חיבור ונסו שוב.'
      );
      setHasUnsentDraft(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [persistOrder]);

  const buildWhatsAppUrl = useCallback(
    (order?: JewelryOrder | null) => {
      const studioPhone = getStudioWhatsAppPhone(studioDetails);
      const message = buildOrderWhatsAppMessage({
        orderNumber: order?.order_number,
        isDraftOnly: !order,
        clientName: clientName.trim() || 'לקוחה מהאתר',
        clientPhone: clientPhone.trim() || '-',
        deliveryMethod,
        shippingAddress: shippingAddress.trim(),
        items,
        goodsSubtotal: order ? pricing.goodsSubtotalShekels : pricing.goodsSubtotalShekels,
        shippingFee: order ? order.shipping_cost : pricing.shippingFeeShekels,
        total: order ? order.total_price : pricing.totalShekels,
        notes: notes.trim() || undefined,
        shippingPolicy,
      });
      return buildWhatsAppContactUrl(studioPhone, message);
    },
    [studioDetails, clientName, clientPhone, deliveryMethod, shippingAddress, items, pricing, notes, shippingPolicy]
  );

  const submitAndOpenWhatsApp = useCallback(async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const saved = await persistOrder();
      if (!saved) return;
      window.open(buildWhatsAppUrl(saved), '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(prev => ({ ...prev, ...err.fieldErrors }));
      }
      setErrorMsg(
        err?.message || 'הבקשה לא נשמרה באתר (טיוטה שלא נשלחה) — הוואטסאפ לא נפתח אוטומטית כדי שלא תיווצר הטעיה.'
      );
      setHasUnsentDraft(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [persistOrder, buildWhatsAppUrl]);

  const openWhatsAppDraftOnly = useCallback(() => {
    setErrorMsg('');
    window.open(buildWhatsAppUrl(null), '_blank', 'noopener,noreferrer');
  }, [buildWhatsAppUrl]);

  const resetOutcome = useCallback(() => {
    setErrorMsg('');
    setFieldErrors({});
    setConfirmedOrder(null);
  }, []);

  return {
    deliveryMethod,
    setDeliveryMethod,
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    shippingAddress,
    setShippingAddress,
    notes,
    setNotes,
    shippingPolicy,
    studioDetails,
    pricing,
    isSubmitting,
    confirmedOrder,
    errorMsg,
    fieldErrors,
    setFieldErrors,
    hasUnsentDraft,
    clearSavedDraft,
    submitWebsiteOrder,
    submitAndOpenWhatsApp,
    openWhatsAppDraftOnly,
    buildWhatsAppUrl,
    resetOutcome,
  };
}
