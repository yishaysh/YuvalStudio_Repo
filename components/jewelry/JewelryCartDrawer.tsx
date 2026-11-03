import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, X, Plus, Minus, Trash2, Truck, Store, 
  CheckCircle2, Sparkles, MessageCircle, ArrowLeft, Loader2 
} from 'lucide-react';
import { useJewelryCart } from '../../contexts/JewelryCartContext';
import { api } from '../../services/mockApi';
import { notifyJewelryOrder } from '../../services/notifications';
import { DEFAULT_STUDIO_DETAILS } from '../../constants';
import { useNavigate } from 'react-router-dom';

const m = motion as any;

export const JewelryCartDrawer: React.FC = () => {
  const { 
    cartItems, 
    isCartOpen, 
    closeCart, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    totalAmount, 
    totalCount 
  } = useJewelryCart();

  const navigate = useNavigate();

  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const shippingCost = deliveryMethod === 'delivery' ? 30 : 0;
  const finalTotal = totalAmount + shippingCost;

  const validateForm = () => {
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

  const createOrderRecord = async () => {
    const orderPayload = {
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      items: cartItems.map(c => ({
        id: c.item.id,
        name: c.item.name,
        price: c.item.price,
        quantity: c.quantity,
        image_url: c.item.image_url,
        category: c.item.category
      })),
      total_price: finalTotal,
      delivery_method: deliveryMethod,
      shipping_address: deliveryMethod === 'delivery' ? shippingAddress.trim() : undefined,
      shipping_cost: shippingCost,
      notes: notes.trim() || undefined
    };

    const savedOrder = await api.createJewelryOrder(orderPayload);

    // Trigger studio notifications
    try {
      const settings = await api.getSettings();
      await notifyJewelryOrder(settings, {
        orderNumber: savedOrder.order_number,
        clientName: savedOrder.client_name,
        clientPhone: savedOrder.client_phone,
        totalPrice: savedOrder.total_price,
        deliveryMethod: deliveryMethod === 'delivery' ? 'משלוח עד הבית' : 'איסוף עצמי מהסטודיו',
        address: savedOrder.shipping_address,
        items: savedOrder.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        notes: savedOrder.notes
      });
    } catch (err) {
      console.warn('Failed to dispatch notification for order:', err);
    }

    return savedOrder;
  };

  const handleWhatsAppOrder = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const order = await createOrderRecord();
      
      const phoneClean = DEFAULT_STUDIO_DETAILS.phone.replace(/\D/g, '').replace(/^0/, '972');
      const itemsList = cartItems.map(c => `• *${c.item.name}* (כמות: ${c.quantity}) - ₪${c.item.price * c.quantity}`).join('\n');
      const deliveryText = deliveryMethod === 'delivery'
        ? `📦 *משלוח עד הבית* (+₪30)\n📍 *כתובת:* ${shippingAddress.trim()}`
        : `🛍️ *איסוף עצמי מהסטודיו* (ללא עלות)`;

      const text = `היי יובל! ✨\nאני רוצה להזמין תכשיטים מהמלאי באתר (#${order.order_number}):\n\n${itemsList}\n\n${deliveryText}\n💰 *סה"כ לתשלום: ₪${finalTotal}*\n\n👤 *פרטי לקוחה:*\nשם: ${clientName.trim()}\nטלפון: ${clientPhone.trim()}\n${notes.trim() ? `הערות: ${notes.trim()}\n` : ''}\nאשמח לדעת איך להעביר תשלום (ביט / פייבוקס / העברה) ולאשר את ההזמנה 💕`;

      window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`, '_blank');
      setOrderSuccess(order);
      clearCart();
    } catch (e: any) {
      setErrorMsg(e?.message || 'שגיאה בביצוע ההזמנה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const order = await createOrderRecord();
      setOrderSuccess(order);
      clearCart();
    } catch (e: any) {
      setErrorMsg(e?.message || 'שגיאה בביצוע ההזמנה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrorMsg('');
    setOrderSuccess(null);
    closeCart();
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-[10005] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm"
          />

          {/* Drawer Body */}
          <m.div
            initial={{ opacity: 0, transform: 'translateX(100%)' }}
            animate={{ opacity: 1, transform: 'translateX(0%)' }}
            exit={{ opacity: 0, transform: 'translateX(100%)' }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 w-full max-w-md h-full bg-brand-surface border-r border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-brand-dark/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="cart-drawer-title" className="text-lg font-serif font-bold text-white leading-tight">שקית הקניות שלך</h2>
                  <p className="text-xs text-slate-400">{totalCount} {totalCount === 1 ? 'פריט' : 'פריטים'}</p>
                </div>
              </div>

              <button
                onClick={handleClose}
                aria-label="סגור שקית קניות"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors duration-150 ease-out active:scale-[0.95]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              {orderSuccess ? (
                /* Success Screen */
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-serif text-white">ההזמנה נשלחה בהצלחה!</h3>
                  <p className="text-sm text-slate-300">
                    מספר הזמנה: <span className="font-bold text-brand-primary">#{orderSuccess.order_number}</span>
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    יובל קיבלה את הבקשה שלך ותיצור איתך קשר בהקדם בוואטסאפ או בטלפון להסדרת התשלום והאספקה.
                  </p>

                  <div className="pt-4 flex flex-col gap-3">
                    <a
                      href={`https://wa.me/${DEFAULT_STUDIO_DETAILS.phone.replace(/\D/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(`היי יובל! ביצעתי עכשיו הזמנה באתר שמספרה #${orderSuccess.order_number}. אשמח לאשר אותה 💕`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium text-sm flex items-center justify-center gap-2 transition-[background-color,transform] duration-[160ms] ease-emil-out active:scale-[0.97]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>שליחת הודעת וואטסאפ ליובל</span>
                    </a>

                    <button
                      onClick={handleClose}
                      className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors duration-150 ease-out"
                    >
                      סגירה והמשך גלישה
                    </button>
                  </div>
                </div>
              ) : cartItems.length === 0 ? (
                /* Empty Cart State */
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-serif text-white">שקית הקניות שלך ריקה</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">
                    עדיין לא הוספת תכשיטים לשקית. מוזמנת להציץ בקטלוג התכשיטים שלנו ולבחור את הלוק הבא שלך.
                  </p>
                  <button
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
                /* Cart Items List */
                <>
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
                          <p className="text-xs font-serif font-bold text-brand-primary mt-0.5">₪{item.price}</p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                            aria-label="הפחת כמות"
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.95]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-white">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                            aria-label="הוסף כמות"
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.95]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          aria-label="הסר פריט"
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Selection */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <label className="text-xs font-semibold text-slate-300 block">אופן קבלת ההזמנה</label>
                    <div className="grid grid-cols-2 gap-2">
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

                  {/* Customer Information */}
                  <div className="space-y-3 pt-2 border-t border-white/10">
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
                        placeholder="הערות מיוחדות (אופציונלי)"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-600"
                      />
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer with Totals and Action Buttons */}
            {cartItems.length > 0 && !orderSuccess && (
              <div className="p-5 border-t border-white/10 bg-brand-dark/60 shrink-0 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>סכום פריטים:</span>
                    <span>₪{totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>משלוח:</span>
                    <span>{shippingCost === 0 ? 'חינם (איסוף עצמי)' : `₪${shippingCost}`}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-white/10">
                    <span>סה"כ לתשלום:</span>
                    <span className="text-brand-primary font-serif">₪{finalTotal}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {/* WhatsApp Fast Order */}
                  <button
                    onClick={handleWhatsAppOrder}
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

                  {/* Direct Web Order */}
                  <button
                    onClick={handleDirectSubmit}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors duration-150 ease-out active:scale-[0.98] disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                    <span>שליחת בקשה באתר (ללא וואטסאפ)</span>
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

