import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Search, Filter, Phone, MessageSquare, Truck, 
  Store, CheckCircle2, Clock, XCircle, Trash2, RefreshCw, 
  ExternalLink, Calendar, AlertCircle, ChevronDown, PackageCheck
} from 'lucide-react';
import { JewelryOrder } from '../../types';
import { api } from '../../services/mockApi';
import { DEFAULT_STUDIO_DETAILS } from '../../constants';

const m = motion as any;

export const JewelryOrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<JewelryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'delivered' | 'cancelled'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getJewelryOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch jewelry orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: JewelryOrder['status']) => {
    try {
      setUpdatingId(orderId);
      const success = await api.updateJewelryOrderStatus(orderId, newStatus);
      if (success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      const success = await api.deleteJewelryOrder(orderId);
      if (success) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setDeleteConfirmId(null);
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  const sendWhatsAppUpdate = (order: JewelryOrder) => {
    const cleanPhone = order.client_phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? `972${cleanPhone.slice(1)}` : cleanPhone;
    
    let statusText = '';
    if (order.status === 'confirmed') {
      statusText = order.delivery_method === 'pickup'
        ? 'ההזמנה שלך אושרה ומחכה לך בסטודיו לאיסוף! 🏪'
        : 'ההזמנה שלך אושרה ונמצאת בהכנה למשלוח מהיר עד הבית! 🚚';
    } else if (order.status === 'delivered') {
      statusText = 'ההזמנה שלך נמסרה בהצלחה! תתחדשי ומקווים שאת אוהבת את התכשיטים ✨';
    } else {
      statusText = 'קיבלנו את ההזמנה שלך ואנחנו מעבדים אותה ברגעים אלו! 💎';
    }

    const itemsSummary = order.items.map(item => `• ${item.name} (כמות: ${item.quantity}) - ₪${item.price * item.quantity}`).join('\n');

    const msg = `היי ${order.client_name}! כאן יובל מ-Yuval Studio 💎
לגבי הזמנת התכשיטים שלך (מספר הזמנה #${order.order_number}):

${statusText}

פירוט הפריטים:
${itemsSummary}

סה"כ לתשלום: ₪${order.total_price} ${order.delivery_method === 'delivery' ? '(כולל משלוח ₪30)' : '(איסוף עצמי)'}

לכל שאלה או התייעצות, אני כאן בשבילך! ✨`;

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        order.client_name.toLowerCase().includes(q) ||
        order.client_phone.includes(q) ||
        order.order_number.toLowerCase().includes(q) ||
        order.items.some(item => item.name.toLowerCase().includes(q));
      
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const totalRevenue = orders
      .filter(o => o.status === 'delivered' || o.status === 'confirmed')
      .reduce((sum, o) => sum + (o.total_price || 0), 0);

    return { totalOrders, pendingOrders, confirmedOrders, deliveredOrders, totalRevenue };
  }, [orders]);

  const getStatusBadge = (status: JewelryOrder['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            ממתין לטיפול
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            אושר / בהכנה
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <PackageCheck className="w-3.5 h-3.5" />
            נמסר / הושלם
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            בוטל
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-primary" />
            ניהול הזמנות תכשיטים
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            מעקב אחר בקשות רכישה, יצירת קשר ישיר בוואטסאפ ועדכון סטטוס הזמנה
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-sm border border-white/10 transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          רענן נתונים
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-surface/70 border border-white/5 rounded-2xl p-4">
          <p className="text-xs text-slate-400">סה"כ הזמנות</p>
          <p className="text-2xl font-bold font-serif text-white mt-1">{stats.totalOrders}</p>
        </div>

        <div className="bg-brand-surface/70 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-xs text-amber-400">ממתינות לטיפול</p>
          <p className="text-2xl font-bold font-serif text-amber-400 mt-1">{stats.pendingOrders}</p>
        </div>

        <div className="bg-brand-surface/70 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-xs text-blue-400">בהכנה / אושרו</p>
          <p className="text-2xl font-bold font-serif text-blue-400 mt-1">{stats.confirmedOrders}</p>
        </div>

        <div className="bg-brand-surface/70 border border-brand-primary/20 rounded-2xl p-4">
          <p className="text-xs text-brand-primary">הכנסות מאושרות</p>
          <p className="text-2xl font-bold font-serif text-brand-primary mt-1">₪{stats.totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-brand-surface/50 p-3 rounded-2xl border border-white/5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'הכל' },
            { id: 'pending', label: `ממתינות (${stats.pendingOrders})` },
            { id: 'confirmed', label: 'בהכנה' },
            { id: 'delivered', label: 'נמסרו' },
            { id: 'cancelled', label: 'בוטלו' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 ease-out active:scale-[0.98] ${
                statusFilter === tab.id
                  ? 'bg-brand-primary text-brand-dark shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי לקוח, טלפון או פריט..."
            className="w-full bg-brand-dark/60 border border-white/10 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-20 bg-brand-surface/30 rounded-2xl border border-white/5">
          <RefreshCw className="w-8 h-8 text-brand-primary animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">טוען הזמנות תכשיטים...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-brand-surface/30 rounded-2xl border border-white/5">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">לא נמצאו הזמנות תכשיטים</p>
          <p className="text-slate-500 text-xs mt-1">
            {searchQuery ? 'נסה לשנות את מונח החיפוש' : 'הזמנות שיבוצעו דרך האתר יופיעו כאן באופן מיידי'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const dateStr = new Date(order.created_at).toLocaleDateString('he-IL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            const timeStr = new Date(order.created_at).toLocaleTimeString('he-IL', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={order.id}
                className="bg-brand-surface/60 border border-white/5 hover:border-brand-primary/30 rounded-2xl p-5 transition-colors duration-150"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-white/5 text-brand-primary font-semibold border border-white/5">
                      #{order.order_number}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {dateStr} בשעה {timeStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}

                    {order.delivery_method === 'pickup' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                        <Store className="w-3.5 h-3.5 text-brand-primary" />
                        איסוף עצמי
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                        <Truck className="w-3.5 h-3.5 text-blue-400" />
                        משלוח (₪30)
                      </span>
                    )}
                  </div>
                </div>

                {/* Customer Details & Contact Actions */}
                <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-medium text-base">{order.client_name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <a 
                        href={`tel:${order.client_phone}`}
                        className="hover:text-brand-primary transition-colors flex items-center gap-1 font-mono"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {order.client_phone}
                      </a>

                      {order.client_email && (
                        <span>• {order.client_email}</span>
                      )}

                      {order.delivery_method === 'delivery' && order.shipping_address && (
                        <span className="text-slate-300">
                          • כתובת: <strong className="text-white">{order.shipping_address}</strong>
                        </span>
                      )}
                    </div>

                    {order.notes && (
                      <p className="text-xs text-amber-300/80 mt-2 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 max-w-xl">
                        💬 הערה: {order.notes}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp & Call Quick Actions */}
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                      onClick={() => sendWhatsAppUpdate(order)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]"
                      title="שלח עדכון או הודעה בוואטסאפ"
                    >
                      <MessageSquare className="w-4 h-4" />
                      הודעת וואטסאפ
                    </button>

                    <a
                      href={`tel:${order.client_phone}`}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]"
                      title="חייג ללקוח"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-brand-dark/40 rounded-xl p-3 border border-white/5 space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-9 h-9 object-cover rounded-lg border border-white/10"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center text-slate-500">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{item.name}</p>
                          <p className="text-slate-500 text-[10px]">
                            {item.category || 'עגיל'} • כמות: <span className="text-brand-primary font-semibold">{item.quantity}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-left font-serif text-white font-medium">
                        ₪{item.price * item.quantity}
                      </div>
                    </div>
                  ))}

                  {/* Summary Cost Line */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      סה"כ כולל {order.delivery_method === 'delivery' ? 'משלוח (₪30)' : 'איסוף'}:
                    </span>
                    <span className="text-brand-primary font-serif font-bold text-sm">
                      ₪{order.total_price}
                    </span>
                  </div>
                </div>

                {/* Status Changer & Delete */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">שנה סטטוס:</span>
                    <div className="flex items-center gap-1.5">
                      {(['pending', 'confirmed', 'delivered', 'cancelled'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(order.id, st)}
                          disabled={updatingId === order.id || order.status === st}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                            order.status === st
                              ? 'bg-white/20 text-white font-semibold cursor-default'
                              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st === 'pending' && 'ממתין'}
                          {st === 'confirmed' && 'אושר'}
                          {st === 'delivered' && 'נמסר'}
                          {st === 'cancelled' && 'בוטל'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div>
                    {deleteConfirmId === order.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400">בטוח למחוק?</span>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors"
                        >
                          כן, מחק
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1 bg-white/10 text-slate-300 rounded-lg text-xs hover:bg-white/20 transition-colors"
                        >
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(order.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        title="מחק הזמנה"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

