import React, { useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  Truck,
  Store,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useJewelryCart } from '../../contexts/JewelryCartContext';
import { useNavigate } from 'react-router-dom';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { Money } from '../Money';
import { pluralizeHebrew } from '../../shared/validation';
import { useJewelryCheckout } from './useJewelryCheckout';

const m = motion as any;
const CART_DRAFT_KEY = 'yuval_jewelry_cart_draft_v1';

export const JewelryCartDrawer: React.FC = () => {
  const {
    cartItems,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalCount,
  } = useJewelryCart();

  const navigate = useNavigate();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const lineItems = useMemo(
    () =>
      cartItems.map(({ item, quantity }) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity,
        image_url: item.image_url,
        category: item.category,
      })),
    [cartItems]
  );

  const checkout = useJewelryCheckout({
    items: lineItems,
    draftStorageKey: CART_DRAFT_KEY,
    isActive: isCartOpen,
    onOrderPersisted: () => clearCart(),
  });

  const handleClose = useCallback(() => {
    checkout.resetOutcome();
    closeCart();
  }, [checkout, closeCart]);

  const dialogRef = useDialogA11y({
    isOpen: isCartOpen,
    onClose: handleClose,
    initialFocusRef: closeButtonRef,
  });

  const { shippingPolicy, pricing, confirmedOrder } = checkout;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-[10005] flex justify-end">
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer Body */}
          <m.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            initial={{ opacity: 0, transform: 'translateX(100%)' }}
            animate={{ opacity: 1, transform: 'translateX(0%)' }}
            exit={{ opacity: 0, transform: 'translateX(100%)' }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 w-full max-w-md h-full bg-brand-surface border-r border-white/10 shadow-2xl flex flex-col overflow-hidden focus:outline-none"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-brand-dark/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="cart-drawer-title" className="text-lg font-serif font-bold text-white leading-tight">
                    שקית הקניות שלך
                  </h2>
                  <p className="text-xs text-slate-400">
                    {pluralizeHebrew(totalCount, 'פריט 1', `${totalCount} פריטים`)}
                  </p>
                </div>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleClose}
                aria-label="סגור שקית קניות"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors duration-150 ease-out active:scale-[0.95] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              {confirmedOrder ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-serif text-white">בקשת ההזמנה נשמרה!</h3>
                  <p className="text-sm text-slate-300">
                    מספר פניה מאומת: <span className="font-bold text-brand-primary font-mono">#{confirmedOrder.order_number}</span>
                  </p>
                  <p className="text-xs text-slate-300">
                    סה&quot;כ לתיאום תשלום: <Money amount={confirmedOrder.total_price} className="text-brand-primary font-bold" />
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    הבקשה נרשמה כממתינה (טרם בוצע חיוב). יובל תיצור איתך קשר לתיאום תשלום והאספקה.
                  </p>

                  {(confirmedOrder.notification_status === 'failed' || confirmedOrder.notification_status === 'partial') && (
                    <div role="status" className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-right flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        ההזמנה נשמרה בשרת בהצלחה, אך שליחת ההתראה לסטודיו התעכבה ({confirmedOrder.notification_error || 'תקלת תקשורת'}). מומלץ לשלוח הודעה מהירה בוואטסאפ עם מספר ההזמנה.
                      </span>
                    </div>
                  )}

                  <div className="pt-3 flex flex-col gap-3">
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
                      className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors duration-150 ease-out"
                    >
                      סגירה והמשך גלישה
                    </button>
                  </div>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-serif text-white">שקית הקניות שלך ריקה</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">
                    עדיין לא הוספת תכשיטים לשקית. מוזמנת להציץ בקטלוג התכשיטים ולבחור את הלוק הבא שלך.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      navigate('/jewelry');
                    }}
                    className="mt-4 px-6 py-2.5 rounded-full bg-brand-primary text-brand-dark text-sm font-medium transition-[background-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97]"
                  >
                    לצפייה בקטלוג התכשיטים ✨
                  </button>
                </div>
              ) : (
                <>
                  {checkout.hasUnsentDraft && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
                      <span>טיוטה שלא נשלחה — פרטי הקשר שלך שוחזרו לנוחותך</span>
                      <button type="button" onClick={checkout.clearSavedDraft} className="underline hover:text-white shrink-0">
                        נקה
                      </button>
                    </div>
                  )}

                  {/* Cart Items List */}
                  <div className="space-y-3">
                    {cartItems.map(({ item, quantity }) => (
                      <div key={item.id} className="p-3 bg-brand-dark/40 border border-white/5 rounded-2xl flex gap-3 items-center group">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-brand-primary uppercase tracking-wider font-medium truncate">{item.category}</p>
                          <h4 className="text-sm font-medium text-white truncate">{item.name}</h4>
                          <Money amount={item.price} className="text-xs font-serif font-bold text-brand-primary mt-0.5 block" />
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                            aria-label={`הפחת כמות עבור ${item.name}`}
                            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.95]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-white" aria-label={`כמות ${quantity}`}>{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                            aria-label={`הוסף כמות עבור ${item.name}`}
                            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.95]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`הסר את ${item.name} מהסל`}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Selection (P1-C Authoritative Policy) */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-xs font-semibold text-slate-300 block">אופן קבלת ההזמנה</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        aria-pressed={checkout.deliveryMethod === 'pickup'}
                        onClick={() => checkout.setDeliveryMethod('pickup')}
                        className={`p-3 rounded-xl border text-right transition-[background-color,border-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97] flex flex-col gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
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
                        className={`p-3 rounded-xl border text-right transition-[background-color,border-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97] flex flex-col gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
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
                    {checkout.deliveryMethod === 'delivery' && !pricing.qualifiesForFreeShipping && pricing.amountRemainingForFreeShippingShekels > 0 && (
                      <p className="text-[11px] text-brand-primary/90">
                        הוסיפי פריטים ב-<Money amount={pricing.amountRemainingForFreeShippingShekels} /> כדי לקבל משלוח חינם!
                      </p>
                    )}
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-3 pt-2 border-t border-white/10">
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
                        placeholder="הערות מיוחדות (אופציונלי)"
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
                </>
              )}
            </div>

            {/* Footer with Totals and Action Buttons */}
            {cartItems.length > 0 && !confirmedOrder && (
              <div className="p-5 border-t border-white/10 bg-brand-dark/60 shrink-0 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>סכום פריטים:</span>
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
                  <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-white/10">
                    <span>סה&quot;כ לתיאום תשלום:</span>
                    <Money amount={pricing.totalShekels} className="text-brand-primary font-serif" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
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
              </div>
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
