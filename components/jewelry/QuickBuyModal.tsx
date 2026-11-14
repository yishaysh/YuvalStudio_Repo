import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  Store,
  Truck,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useJewelryCart } from '../../contexts/JewelryCartContext';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { Money } from '../Money';
import { useJewelryCheckout } from './useJewelryCheckout';

const m = motion as any;
const QUICKBUY_DRAFT_KEY = 'yuval_quickbuy_draft_v1';

export const QuickBuyModal: React.FC = () => {
  const { quickBuyItem, closeQuickBuy } = useJewelryCart();
  const [quantity, setQuantity] = useState(1);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (quickBuyItem) {
      setQuantity(1);
    }
  }, [quickBuyItem]);

  const lineItems = useMemo(
    () =>
      quickBuyItem
        ? [
            {
              id: quickBuyItem.id,
              name: quickBuyItem.name,
              price: quickBuyItem.price,
              quantity,
              image_url: quickBuyItem.image_url,
              category: quickBuyItem.category,
            },
          ]
        : [],
    [quickBuyItem, quantity]
  );

  const checkout = useJewelryCheckout({
    items: lineItems,
    draftStorageKey: QUICKBUY_DRAFT_KEY,
    isActive: Boolean(quickBuyItem),
  });

  const handleClose = useCallback(() => {
    checkout.resetOutcome();
    closeQuickBuy();
  }, [checkout, closeQuickBuy]);

  const dialogRef = useDialogA11y({
    isOpen: Boolean(quickBuyItem),
    onClose: handleClose,
    initialFocusRef: closeButtonRef,
  });

  if (!quickBuyItem) return null;

  const { shippingPolicy, pricing, confirmedOrder } = checkout;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10006] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-brand-dark/85 backdrop-blur-md"
          aria-hidden="true"
        />

        {/* Modal Window */}
        <m.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-buy-title"
          initial={{ opacity: 0, transform: 'scale(0.95) translateY(16px)' }}
          animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
          exit={{ opacity: 0, transform: 'scale(0.95) translateY(16px)' }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 w-full max-w-lg bg-brand-surface border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] flex flex-col focus:outline-none"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6 shrink-0">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>רכישה מהירה מהמלאי</span>
              </div>
              <h3 id="quick-buy-title" className="text-xl sm:text-2xl font-serif text-white">הזמנת תכשיט</h3>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              aria-label="סגור חלון"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors active:scale-[0.95] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1">
            {confirmedOrder ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-serif text-white">בקשת ההזמנה נשמרה בהצלחה!</h4>
                <p className="text-sm text-slate-300">
                  מספר פניה מאומת: <span className="font-bold text-brand-primary font-mono">#{confirmedOrder.order_number}</span>
                </p>
                <p className="text-xs text-slate-300">
                  סה&quot;כ לתיאום תשלום: <Money amount={confirmedOrder.total_price} className="text-brand-primary font-bold" />
                </p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  הבקשה נרשמה כממתינה (לא בוצע חיוב אוטומטי). יובל תיצור איתך קשר לתיאום התשלום והאספקה.
                </p>

                {(confirmedOrder.notification_status === 'failed' || confirmedOrder.notification_status === 'partial') && (
                  <div role="status" className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-right flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      ההזמנה נשמרה בשרת בהצלחה, אך ההתראה לסטודיו התעכבה ({confirmedOrder.notification_error || 'תקלת רשת'}). מומלץ לשלוח וואטסאפ מהיר מטה.
                    </span>
                  </div>
                )}

                <div className="pt-3 flex flex-col gap-2.5">
                  <a
                    href={checkout.buildWhatsAppUrl(confirmedOrder)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium text-sm flex items-center justify-center gap-2 transition-[background-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>שליחת פרטי הזמנה #{confirmedOrder.order_number} בוואטסאפ</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition-colors"
                  >
                    סגירה
                  </button>
                </div>
              </div>
            ) : (
              <>
                {checkout.hasUnsentDraft && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
                    <span>טיוטה שלא נשלחה — פרטים מהניסיון הקודם שוחזרו</span>
                    <button type="button" onClick={checkout.clearSavedDraft} className="underline hover:text-white shrink-0">
                      נקה
                    </button>
                  </div>
                )}

                {/* Product Summary Card */}
                <div className="p-4 bg-brand-dark/50 border border-white/5 rounded-2xl flex gap-4 items-center">
                  <img
                    src={quickBuyItem.image_url}
                    alt={quickBuyItem.name}
                    className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-brand-primary font-medium tracking-wider uppercase block">{quickBuyItem.category}</span>
                    <h4 className="text-base font-medium text-white truncate">{quickBuyItem.name}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{quickBuyItem.description}</p>
                    <Money amount={quickBuyItem.price} className="text-sm font-serif font-bold text-brand-primary mt-1 block" />
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="הפחת כמות"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.95] disabled:opacity-40"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-white" aria-label={`כמות ${quantity}`}>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(20, quantity + 1))}
                      aria-label="הוסף כמות"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.95]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Delivery Option (Authoritative P1-C) */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">אופן קבלת התכשיט</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-pressed={checkout.deliveryMethod === 'pickup'}
                      onClick={() => checkout.setDeliveryMethod('pickup')}
                      className={`p-3 rounded-xl border text-right transition-[background-color,border-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97] flex flex-col gap-1 ${
                        checkout.deliveryMethod === 'pickup'
                          ? 'bg-brand-primary/10 border-brand-primary text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
                        <Store className="w-3.5 h-3.5" />
                        <span>איסוף עצמי</span>
                      </div>
                      <span className="text-[11px] text-slate-300">מהסטודיו (חינם)</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={checkout.deliveryMethod === 'delivery'}
                      onClick={() => checkout.setDeliveryMethod('delivery')}
                      className={`p-3 rounded-xl border text-right transition-[background-color,border-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97] flex flex-col gap-1 ${
                        checkout.deliveryMethod === 'delivery'
                          ? 'bg-brand-primary/10 border-brand-primary text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
                        <Truck className="w-3.5 h-3.5" />
                        <span>משלוח עד הבית</span>
                      </div>
                      <span className="text-[11px] text-slate-300">
                        {pricing.qualifiesForFreeShipping ? (
                          <span className="text-emerald-400 font-medium">חינם (מעל <Money amount={shippingPolicy.freeShippingThresholdShekels} />)</span>
                        ) : (
                          <>+<Money amount={shippingPolicy.deliveryFeeShekels} /> • חינם מ-<Money amount={shippingPolicy.freeShippingThresholdShekels} /></>
                        )}
                      </span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {checkout.deliveryMethod === 'delivery'
                      ? `זמן אספקה משוער: ${shippingPolicy.estimatedDeliveryTime}`
                      : `זמן איסוף: ${shippingPolicy.pickupTime}`}
                  </p>
                </div>

                {/* Details Form */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-300 block">פרטי הלקוחה</span>

                  <div>
                    <input
                      type="text"
                      aria-label="שם מלא"
                      aria-invalid={Boolean(checkout.fieldErrors.clientName)}
                      placeholder="שם מלא *"
                      value={checkout.clientName}
                      onChange={e => {
                        checkout.setClientName(e.target.value);
                        if (checkout.fieldErrors.clientName) {
                          checkout.setFieldErrors(prev => ({ ...prev, clientName: undefined }));
                        }
                      }}
                      className="w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500"
                    />
                    {checkout.fieldErrors.clientName && (
                      <p role="alert" className="text-[11px] text-red-400 mt-1">{checkout.fieldErrors.clientName}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="tel"
                      aria-label="מספר טלפון ישראלי"
                      aria-invalid={Boolean(checkout.fieldErrors.clientPhone)}
                      dir="ltr"
                      placeholder="מספר טלפון / וואטסאפ (למשל 054-1234567) *"
                      value={checkout.clientPhone}
                      onChange={e => {
                        checkout.setClientPhone(e.target.value);
                        if (checkout.fieldErrors.clientPhone) {
                          checkout.setFieldErrors(prev => ({ ...prev, clientPhone: undefined }));
                        }
                      }}
                      className="w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 text-right"
                    />
                    {checkout.fieldErrors.clientPhone && (
                      <p role="alert" className="text-[11px] text-red-400 mt-1">{checkout.fieldErrors.clientPhone}</p>
                    )}
                  </div>

                  {checkout.deliveryMethod === 'delivery' && (
                    <div>
                      <input
                        type="text"
                        aria-label="כתובת מלאה למשלוח"
                        aria-invalid={Boolean(checkout.fieldErrors.shippingAddress)}
                        placeholder="כתובת מלאה למשלוח (עיר, רחוב, מספר בית) *"
                        value={checkout.shippingAddress}
                        onChange={e => {
                          checkout.setShippingAddress(e.target.value);
                          if (checkout.fieldErrors.shippingAddress) {
                            checkout.setFieldErrors(prev => ({ ...prev, shippingAddress: undefined }));
                          }
                        }}
                        className="w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500"
                      />
                      {checkout.fieldErrors.shippingAddress && (
                        <p role="alert" className="text-[11px] text-red-400 mt-1">{checkout.fieldErrors.shippingAddress}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      aria-label="הערות להזמנה"
                      placeholder="הערות או שאלות ליובל (אופציונלי)"
                      value={checkout.notes}
                      onChange={e => checkout.setNotes(e.target.value)}
                      className="w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500"
                    />
                  </div>

                  {checkout.errorMsg && (
                    <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-medium">
                      {checkout.errorMsg}
                    </div>
                  )}
                </div>

                {/* Pricing Summary */}
                <div className="p-3.5 bg-brand-dark/40 rounded-xl border border-white/5 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>סה&quot;כ תכשיטים ({quantity} יח&apos;):</span>
                    <Money amount={pricing.goodsSubtotalShekels} />
                  </div>
                  <div className="flex justify-between">
                    <span>משלוח:</span>
                    <span>
                      {pricing.shippingFeeShekels === 0
                        ? checkout.deliveryMethod === 'pickup'
                          ? 'חינם (איסוף עצמי)'
                          : 'חינם (הזמנה מעל המינימום)'
                        : <Money amount={pricing.shippingFeeShekels} />}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-white/10">
                    <span>סה&quot;כ לתיאום תשלום:</span>
                    <Money amount={pricing.totalShekels} className="text-brand-primary font-serif" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!confirmedOrder && (
            <div className="pt-4 mt-4 border-t border-white/10 shrink-0 flex flex-col gap-2">
              <button
                type="button"
                onClick={checkout.submitWebsiteOrder}
                disabled={checkout.isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-brand-dark font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-[background-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97] disabled:opacity-50"
              >
                {checkout.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>שליחת בקשת הזמנה באתר</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={checkout.submitAndOpenWhatsApp}
                disabled={checkout.isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors duration-150 ease-out active:scale-[0.98] disabled:opacity-50"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>שמור הזמנה באתר ופתח בוואטסאפ</span>
              </button>

              <button
                type="button"
                onClick={checkout.openWhatsAppDraftOnly}
                disabled={checkout.isSubmitting}
                className="w-full py-2 px-3 rounded-lg text-slate-400 hover:text-white text-[11px] underline underline-offset-4 transition-colors"
              >
                התייעצות בוואטסאפ ללא שליחת הזמנה באתר
              </button>
            </div>
          )}
        </m.div>
      </div>
    </AnimatePresence>
  );
};
