import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Minus, Store, Truck, MessageCircle, 
  Sparkles, CheckCircle2, Loader2, ShieldCheck 
} from 'lucide-react';
import { useJewelryCart } from '../../contexts/JewelryCartContext';
import { api } from '../../services/mockApi';
import { notifyJewelryOrder } from '../../services/notifications';
import { DEFAULT_STUDIO_DETAILS } from '../../constants';

const m = motion as any;

export const QuickBuyModal: React.FC = () => {
  const { quickBuyItem, closeQuickBuy } = useJewelryCart();

  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (quickBuyItem) {
      setQuantity(1);
      setDeliveryMethod('pickup');
      setErrorMsg('');
      setOrderSuccess(null);
    }
  }, [quickBuyItem]);

  if (!quickBuyItem) return null;

  const itemPrice = quickBuyItem.price || 0;
  const itemsTotal = itemPrice * quantity;
  const shippingCost = deliveryMethod === 'delivery' ? 30 : 0;
  const finalTotal = itemsTotal + shippingCost;

  const validate = () => {
    if (!clientName.trim()) {
      setErrorMsg('יש להזין שם מלא');
      return false;
    }
    if (!clientPhone.trim() || clientPhone.trim().length < 9) {
      setErrorMsg('יש להזין מספר טלפון תקין');
      return false;
    }
    if (deliveryMethod === 'delivery' && !shippingAddress.trim()) {
      setErrorMsg('יש להזין כתובת מלאה למשלוח');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const createOrder = async () => {
    const payload = {
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      items: [{
        id: quickBuyItem.id,
        name: quickBuyItem.name,
        price: quickBuyItem.price,
        quantity,
        image_url: quickBuyItem.image_url,
        category: quickBuyItem.category
      }],
      total_price: finalTotal,
      delivery_method: deliveryMethod,
      shipping_address: deliveryMethod === 'delivery' ? shippingAddress.trim() : undefined,
      shipping_cost: shippingCost,
      notes: notes.trim() || undefined
    };

    const saved = await api.createJewelryOrder(payload);

    try {
      const settings = await api.getSettings();
      await notifyJewelryOrder(settings, {
        orderNumber: saved.order_number,
        clientName: saved.client_name,
        clientPhone: saved.client_phone,
        totalPrice: saved.total_price,
        deliveryMethod: deliveryMethod === 'delivery' ? 'משלוח עד הבית' : 'איסוף עצמי מהסטודיו',
        address: saved.shipping_address,
        items: [{ name: quickBuyItem.name, quantity, price: quickBuyItem.price }],
        notes: saved.notes
      });
    } catch (e) {
      console.warn('Failed notification:', e);
    }

    return saved;
  };

  const handleWhatsAppBuy = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const order = await createOrder();
      const phoneClean = DEFAULT_STUDIO_DETAILS.phone.replace(/\D/g, '').replace(/^0/, '972');
      const deliveryText = deliveryMethod === 'delivery'
        ? `📦 *משלוח עד הבית* (+₪30)\n📍 *כתובת:* ${shippingAddress.trim()}`
        : `🛍️ *איסוף עצמי מהסטודיו* (ללא עלות)`;

      const text = `היי יובל! ✨\nאני מעוניינת ברכישה מהירה של תכשיט מהאתר (#${order.order_number}):\n\n💎 *${quickBuyItem.name}*\nכמות: ${quantity} | מחיר יחידה: ₪${itemPrice}\n\n${deliveryText}\n💰 *סה"כ לתשלום: ₪${finalTotal}*\n\n👤 *פרטי לקוחה:*\nשם: ${clientName.trim()}\nטלפון: ${clientPhone.trim()}\n${notes.trim() ? `הערות: ${notes.trim()}\n` : ''}\nאשמח לתאם תשלום ואספקה 💕`;

      window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`, '_blank');
      setOrderSuccess(order);
    } catch (err: any) {
      setErrorMsg(err?.message || 'שגיאה בביצוע ההזמנה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectBuy = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const order = await createOrder();
      setOrderSuccess(order);
    } catch (err: any) {
      setErrorMsg(err?.message || 'שגיאה בביצוע ההזמנה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrorMsg('');
    setOrderSuccess(null);
    closeQuickBuy();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10006] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="quick-buy-title">
        {/* Backdrop */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-brand-dark/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <m.div
          initial={{ opacity: 0, transform: 'scale(0.95) translateY(16px)' }}
          animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
          exit={{ opacity: 0, transform: 'scale(0.95) translateY(16px)' }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 w-full max-w-lg bg-brand-surface border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] flex flex-col"
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
              onClick={handleClose}
              aria-label="סגור חלון"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors active:scale-[0.95]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1">
            {orderSuccess ? (
              /* Success View */
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-serif text-white">ההזמנה התקבלה בהצלחה!</h4>
                <p className="text-sm text-slate-300">
                  מספר הזמנה: <span className="font-bold text-brand-primary">#{orderSuccess.order_number}</span>
                </p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  התכשיט משוריין עבורך. יובל תיצור איתך קשר בהקדם להשלמת התשלום והתיאום.
                </p>

                <div className="pt-4 flex flex-col gap-2.5">
                  <a
                    href={`https://wa.me/${DEFAULT_STUDIO_DETAILS.phone.replace(/\D/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(`היי יובל! ביצעתי עכשיו הזמנה לתכשיט ${quickBuyItem.name} (#${orderSuccess.order_number}) 💕`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium text-sm flex items-center justify-center gap-2 transition-[background-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>שליחת הודעת וואטסאפ ליובל</span>
                  </a>

                  <button
                    onClick={handleClose}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition-colors"
                  >
                    סגירה
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                    <p className="text-sm font-serif font-bold text-brand-primary mt-1">₪{quickBuyItem.price}</p>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1.5 shrink-0">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      aria-label="הפחת כמות"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.95]"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-white">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      aria-label="הוסף כמות"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.95]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Delivery Option */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">אופן קבלת התכשיט</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={`p-3 rounded-xl border text-right transition-[background-color,border-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97] flex flex-col gap-1 ${
                        deliveryMethod === 'pickup'
                          ? 'bg-brand-primary/10 border-brand-primary text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
                        <Store className="w-3.5 h-3.5" />
                        <span>איסוף עצמי</span>
                      </div>
                      <span className="text-[11px] text-slate-400">מהסטודיו (חינם)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('delivery')}
                      className={`p-3 rounded-xl border text-right transition-[background-color,border-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97] flex flex-col gap-1 ${
                        deliveryMethod === 'delivery'
                          ? 'bg-brand-primary/10 border-brand-primary text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
                        <Truck className="w-3.5 h-3.5" />
                        <span>משלוח מהיר</span>
                      </div>
                      <span className="text-[11px] text-slate-400">עד הבית (+₪30)</span>
                    </button>
                  </div>
                </div>

                {/* Details Form */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300 block">פרטי הלקוחה</label>

                  <div>
                    <input
                      type="text"
                      placeholder="שם מלא *"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <input
                      type="tel"
                      dir="ltr"
                      placeholder="מספר טלפון / וואטסאפ *"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      className="w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-600 text-right"
                    />
                  </div>

                  {deliveryMethod === 'delivery' && (
                    <div>
                      <input
                        type="text"
                        placeholder="כתובת מלאה למשלוח (עיר, רחוב, מספר בית) *"
                        value={shippingAddress}
                        onChange={e => setShippingAddress(e.target.value)}
                        className="w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-600"
                      />
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      placeholder="הערות או שאלות ליובל (אופציונלי)"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-600"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
                  )}
                </div>

                {/* Pricing Summary */}
                <div className="p-3.5 bg-brand-dark/40 rounded-xl border border-white/5 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>סה"כ תכשיטים ({quantity} יח'):</span>
                    <span>₪{itemsTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>משלוח:</span>
                    <span>{shippingCost === 0 ? 'חינם (איסוף עצמי)' : `₪${shippingCost}`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-white/10">
                    <span>סה"כ לתשלום:</span>
                    <span className="text-brand-primary font-serif">₪{finalTotal}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!orderSuccess && (
            <div className="pt-4 mt-4 border-t border-white/10 shrink-0 flex flex-col gap-2">
              <button
                onClick={handleWhatsAppBuy}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-brand-dark font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-[background-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>הזמנה ישירה בוואטסאפ 💬</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDirectBuy}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors duration-150 ease-out active:scale-[0.98] disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                <span>שליחת בקשה באתר (ללא וואטסאפ)</span>
              </button>
            </div>
          )}
        </m.div>
      </div>
    </AnimatePresence>
  );
};

