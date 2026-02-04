
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Calendar, Settings, Image as ImageIcon, Ticket, 
  Search, Filter, X, Check, Trash2, Edit2, Plus, LogOut, Save,
  ChevronRight, ChevronLeft, Loader2, Clock, Activity, DollarSign,
  Users, Info, ArrowUpDown, Send, FileText, Tag, Lock, CalendarPlus, RefreshCw, AlertCircle, CheckCircle2
} from 'lucide-react';
import { api } from '../services/mockApi';
import { Appointment, Service, StudioSettings, Coupon } from '../types';
import { Button, Card, Input, Modal, ConfirmationModal, SectionHeading } from '../components/ui';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { calendarService } from '../services/calendarService';

const m = motion as any;

// --- Toast Component ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <m.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border ${
                type === 'success' 
                    ? 'bg-emerald-500/90 text-white border-emerald-400/50' 
                    : 'bg-red-500/90 text-white border-red-400/50'
            }`}
        >
            {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors">
                <X className="w-4 h-4" />
            </button>
        </m.div>
    );
};

// --- Helper Functions ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

const sendWhatsapp = (apt: any, type: 'status_update' | 'reminder', studioAddress?: string) => {
    let msg = '';
    const date = new Date(apt.start_time).toLocaleDateString('he-IL');
    const time = new Date(apt.start_time).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
    const address = studioAddress || DEFAULT_STUDIO_DETAILS.address;
    
    if (type === 'reminder') {
            msg = `*תזכורת לתור* ⏰
            
היי ${apt.client_name},
רצינו להזכיר לך לגבי התור שקבעת לסטודיו של יובל:

📅 *מחר בשעה:* ${time}
📍 *כתובת:* ${address}

מחכים לראותך! 🙏`;
    } else {
            switch (apt.status) {
            case 'confirmed':
                    msg = `💎 *אישור תור - הסטודיו של יובל* 💎

היי ${apt.client_name}, שמחים לאשר את התור שלך!

🗓 *תאריך:* ${date}
⌚ *שעה:* ${time}
📍 *כתובת:* ${address}
💫 *טיפול:* ${apt.service_name || 'פירסינג'}

נתראה בקרוב! ✨`;
                    break;
            case 'cancelled':
                const cancelReasonMatch = apt.notes?.match(/סיבת ביטול: (.*?)(\n|$)/);
                const reason = cancelReasonMatch ? cancelReasonMatch[1] : '';

                    msg = `⛔ *עדכון לגבי התור שלך*

היי ${apt.client_name},
לצערנו התור שנקבע לתאריך ${date} בשעה ${time} בוטל.

${reason ? `📝 *סיבת הביטול:* ${reason}\n` : ''}
ניתן לקבוע מחדש דרך האתר בכל עת.`;
                    break;
            default: // pending
                    msg = `⏳ *התור שלך בבדיקה*

היי ${apt.client_name},
קיבלנו את בקשתך לתור בסטודיו של יובל לתאריך ${date}.

נעדכן ברגע שהתור יאושר סופית. 🕊️`;
            }
    }
    
    const phone = apt.client_phone.startsWith('0') ? `972${apt.client_phone.substring(1)}` : apt.client_phone;
    const cleanPhone = phone.replace(/\D/g, '');
    
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
};


// --- SHARED COMPONENTS ---

const AppointmentsList = ({ 
    appointments, 
    onStatusUpdate, 
    onCancelRequest, 
    filterId, 
    onClearFilter, 
    studioAddress, 
    onDownloadPdf, 
    showFilters = true, 
    allServices = [],
    onSyncToCalendar,
    onBulkSync
}: any) => {
    const rowRefs = useRef<{[key: string]: HTMLTableRowElement | null}>({});
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        if (filterId && rowRefs.current[filterId]) {
            setTimeout(() => {
                rowRefs.current[filterId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [filterId]);

    // Filtering
    const filteredAppointments = appointments.filter((apt: any) => {
        if (filterId && apt.id !== filterId) return false;
        if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
        
        if (dateRange.start) {
            if (new Date(apt.start_time) < new Date(dateRange.start)) return false;
        }
        if (dateRange.end) {
            // End of day logic
            const end = new Date(dateRange.end);
            end.setHours(23, 59, 59, 999);
            if (new Date(apt.start_time) > end) return false;
        }
        return true;
    });

    // Sorting
    const sortedAppointments = [...filteredAppointments].sort((a: any, b: any) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        
        let aValue = a[key];
        let bValue = b[key];

        // Handle specific keys
        if (key === 'created_at' || key === 'start_time') {
            aValue = new Date(aValue || 0).getTime();
            bValue = new Date(bValue || 0).getTime();
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown className="w-3 h-3 text-slate-600 ml-1 inline" />;
        return <ArrowUpDown className={`w-3 h-3 ml-1 inline ${sortConfig.direction === 'asc' ? 'text-brand-primary' : 'text-brand-primary rotate-180'}`} />;
    };

    // --- Enhanced Logic to Calculate Full Price including Extras ---
    const getCalculatedData = (apt: any) => {
        const servicesList = [];
        let calculatedBasePrice = 0;

        // 1. Add Primary Service
        servicesList.push({ name: apt.service_name || 'שירות כללי' });
        calculatedBasePrice += (apt.service_price || 0);

        // 2. Parse Notes for Extras (Format from Booking.tsx)
        if (apt.notes && apt.notes.includes('תוספות:')) {
            const match = apt.notes.match(/תוספות: (.*?)(?:\n|$)/);
            if (match && match[1]) {
                const extras = match[1].split(', ').map((s: string) => s.trim());
                extras.forEach((extraName: string) => {
                    servicesList.push({ name: extraName });
                    // Find price in global services list to add to base
                    const serviceObj = allServices.find((s: Service) => s.name === extraName);
                    if (serviceObj) {
                        calculatedBasePrice += serviceObj.price;
                    }
                });
            }
        }

        // 3. Determine Final Price & Coupon
        let finalPrice = undefined;
        let couponCode = undefined;

        // Try to parse from notes first (since schema column might be empty for older records or MVP)
        if (apt.notes && apt.notes.includes('=== פרטי קופון ===')) {
             const priceMatch = apt.notes.match(/מחיר סופי לחיוב: ₪(\d+)/);
             if (priceMatch) finalPrice = parseInt(priceMatch[1], 10);
             
             const codeMatch = apt.notes.match(/קוד: (.*?)(\n|$)/);
             if (codeMatch) couponCode = codeMatch[1].trim();
        }
        
        // Fallback to direct properties if notes didn't have it
        if (finalPrice === undefined) {
            finalPrice = apt.final_price !== undefined ? apt.final_price : calculatedBasePrice;
        }
        if (couponCode === undefined) {
            couponCode = apt.coupon_code;
        }
        
        // Calculate Discount
        const discount = Math.max(0, calculatedBasePrice - finalPrice);

        return { servicesList, calculatedBasePrice, finalPrice, couponCode, discount };
    };

    return (
        <Card className="p-0 overflow-hidden bg-brand-surface/30 border-white/5 h-full">
            {/* Filter Bar */}
            {showFilters && (
                <div className="p-4 bg-brand-primary/5 border-b border-brand-primary/10 flex flex-col sm:flex-row sm:flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs text-slate-400">סטטוס</label>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-brand-dark/50 border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-brand-primary/50 w-full"
                        >
                            <option value="all">הכל</option>
                            <option value="pending">ממתין</option>
                            <option value="confirmed">מאושר</option>
                            <option value="cancelled">בוטל</option>
                        </select>
                    </div>

                    <div className="flex flex-row gap-2 w-full sm:w-auto">
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs text-slate-400">מתאריך</label>
                            <input 
                                type="date" 
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                className="bg-brand-dark/50 border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-brand-primary/50 w-full min-w-0"
                            />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs text-slate-400">עד תאריך</label>
                            <input 
                                type="date" 
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                className="bg-brand-dark/50 border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-brand-primary/50 w-full min-w-0"
                            />
                        </div>
                    </div>
                    
                    {/* Clear Filters */}
                    {(statusFilter !== 'all' || dateRange.start || dateRange.end || filterId) && (
                        <button 
                            onClick={() => {
                                setStatusFilter('all');
                                setDateRange({ start: '', end: '' });
                                onClearFilter();
                            }}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mb-2 mr-auto"
                        >
                            <X className="w-3 h-3" /> נקה סינון
                        </button>
                    )}

                    {/* Google Bulk Sync */}
                    {onBulkSync && (
                        <button
                            onClick={() => onBulkSync(sortedAppointments)}
                            className="ml-auto flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" /> סנכרן הכל לגוגל
                        </button>
                    )}
                </div>
            )}
            
            <div className="overflow-x-auto">
            <table className="w-full text-right text-sm border-collapse">
                <thead className="">
                <tr className="border-b border-white/5 text-slate-500 text-xs bg-brand-dark/50 shadow-sm">
                    <th className="py-4 px-6 font-medium whitespace-nowrap cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('client_name')}>
                        לקוח <SortIcon column="client_name" />
                    </th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('start_time')}>
                        מועד התור <SortIcon column="start_time" />
                    </th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('created_at')}>
                        נוצר ב <SortIcon column="created_at" />
                    </th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap">שירותים</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap text-center">מחיר כולל</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('status')}>
                        סטטוס <SortIcon column="status" />
                    </th>
                    <th className="py-4 px-6 text-left whitespace-nowrap">פעולות</th>
                </tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-white/5">
                {sortedAppointments.length > 0 ? sortedAppointments.map((apt: any) => {
                    const isHighlighted = apt.id === filterId;
                    const { servicesList, calculatedBasePrice, finalPrice, couponCode, discount } = getCalculatedData(apt);

                    return (
                        <tr 
                            key={apt.id} 
                            ref={(el) => { rowRefs.current[apt.id] = el; }}
                            className={`transition-colors duration-300 ${isHighlighted ? 'bg-brand-primary/20 hover:bg-brand-primary/25 shadow-[inset_3px_0_0_0_#d4b585]' : 'hover:bg-white/[0.02]'}`}
                        >
                            <td className="py-4 px-6 align-top">
                                <div className={`font-medium ${isHighlighted ? 'text-brand-primary' : 'text-white'}`}>{apt.client_name}</div>
                                <div className="text-xs text-slate-500">{apt.client_phone}</div>
                            </td>
                            <td className="py-4 px-6 text-slate-400 align-top">
                                <div>{new Date(apt.start_time).toLocaleDateString('he-IL')}</div>
                                <div className="text-xs">{new Date(apt.start_time).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td className="py-4 px-6 text-slate-500 text-xs align-top">
                                {apt.created_at ? new Date(apt.created_at).toLocaleDateString('he-IL') : '-'}
                            </td>
                            <td className="py-4 px-6 align-top">
                                <div className="flex flex-col gap-1.5">
                                    {servicesList.map((svc: any, idx: number) => (
                                        <div key={idx} className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 w-fit">
                                            {svc.name}
                                        </div>
                                    ))}
                                    {apt.notes && !apt.notes.includes('--- חבילת שירותים משולבת ---') && (
                                         <div className="text-[10px] text-slate-500 mt-1 max-w-[150px] truncate" title={apt.notes}>{apt.notes}</div>
                                    )}
                                </div>
                            </td>
                            <td className="py-4 px-6 text-center align-top relative">
                                <div className="group inline-block cursor-help relative">
                                    <div className="flex flex-col items-center">
                                         <span className="font-bold text-emerald-400 text-sm">₪{finalPrice}</span>
                                         {couponCode && (
                                            <span className="text-[10px] text-brand-primary bg-brand-primary/10 px-1.5 rounded mt-1 flex items-center gap-1">
                                                <Ticket className="w-2 h-2" /> {couponCode}
                                            </span>
                                         )}
                                    </div>

                                    {/* Price Breakdown Tooltip */}
                                    <div className="absolute top-full right-1/2 translate-x-1/2 mt-2 w-48 bg-brand-surface border border-white/10 rounded-xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-3 pointer-events-none text-right">
                                        <div className="text-xs space-y-2">
                                            <div className="flex justify-between text-slate-400">
                                                <span>שווי הזמנה כולל:</span>
                                                <span className="line-through">₪{calculatedBasePrice}</span>
                                            </div>
                                            {discount > 0 && (
                                                <div className="flex justify-between text-emerald-400">
                                                    <span>הנחה:</span>
                                                    <span>-₪{discount}</span>
                                                </div>
                                            )}
                                            {couponCode && (
                                                <div className="flex justify-between text-brand-primary text-[10px] border-t border-white/5 pt-1 mt-1">
                                                    <span>קופון:</span>
                                                    <span>{couponCode}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-white/10 pt-2 mt-1 flex justify-between font-bold text-white">
                                                <span>סה"כ לתשלום:</span>
                                                <span>₪{finalPrice}</span>
                                            </div>
                                        </div>
                                        {/* Arrow */}
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-surface border-l border-t border-white/10 rotate-45"></div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-4 px-6 align-top">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                apt.status === 'confirmed' 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : apt.status === 'cancelled'
                                    ? 'bg-red-500/10 text-red-400'
                                    : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                {apt.status === 'confirmed' ? 'מאושר' : apt.status === 'cancelled' ? 'בוטל' : 'ממתין'}
                                </span>
                            </td>
                            <td className="py-4 px-6 align-top">
                                <div className="flex items-center justify-end gap-2">
                                    <div className="flex bg-white/5 rounded-lg mr-2">
                                        <button 
                                            onClick={() => sendWhatsapp(apt, 'status_update', studioAddress)} 
                                            className={`p-2 transition-colors ${
                                                apt.status === 'confirmed' 
                                                    ? 'rounded-r-lg border-l border-white/5 text-emerald-400 hover:bg-emerald-500/20' 
                                                    : 'rounded-lg ' + (apt.status === 'cancelled' ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:bg-white/10')
                                            }`} 
                                            title={apt.status === 'cancelled' ? "שלח הודעת ביטול" : "שלח הודעת סטטוס"}
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                        
                                        {apt.status === 'confirmed' && (
                                            <button 
                                                onClick={() => sendWhatsapp(apt, 'reminder', studioAddress)} 
                                                className="p-2 text-slate-400 hover:bg-white/10 border-l border-white/5 transition-colors" 
                                                title="שלח תזכורת"
                                            >
                                                <Clock className="w-4 h-4" />
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => apt.signature && onDownloadPdf(apt)} 
                                            disabled={!apt.signature}
                                            className={`p-2 transition-colors rounded-l-lg border-l border-white/5 ${
                                                apt.signature 
                                                    ? 'text-slate-400 hover:bg-white/10 hover:text-white' 
                                                    : 'text-slate-700 cursor-not-allowed opacity-50'
                                            }`} 
                                            title={apt.signature ? "הורד הצהרת בריאות (PDF)" : "אין חתימה זמינה להורדה"}
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Google Calendar Sync Button */}
                                    {apt.status !== 'cancelled' && (
                                        <button 
                                            onClick={() => onSyncToCalendar(apt)} 
                                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors mr-1"
                                            title="סנכרן ליומן גוגל"
                                        >
                                            <CalendarPlus className="w-4 h-4" />
                                        </button>
                                    )}

                                    {apt.status === 'pending' && (
                                        <button onClick={() => onStatusUpdate(apt.id, 'confirmed')} className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors" title="אשר תור">
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                    {apt.status !== 'cancelled' && (
                                        <button onClick={() => onCancelRequest(apt)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="בטל תור">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                }) : (
                    <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                            לא נמצאו תורים
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
      </Card>
    );
};

// ... CouponsTab, DashboardTab, CalendarTab, ServicesTab, GalleryTab, SettingsTab ...
// Keeping other tabs components exactly as is since they don't contain alerts directly, except for confirm logic which is in handlers

const CouponsTab = ({ settings, onUpdate }: any) => {
    const [coupons, setCoupons] = useState<Coupon[]>(settings.coupons || []);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => { setCoupons(settings.coupons || []); }, [settings.coupons]);

    const handleSilentSave = (newCoupons: Coupon[]) => {
        onUpdate({ ...settings, coupons: newCoupons }, true);
    };

    const addCoupon = () => {
        const newCoupon: Coupon = {
            id: Math.random().toString(36).substr(2, 9),
            code: '',
            discountType: 'fixed',
            value: 0,
            minOrderAmount: 0,
            isActive: true,
            maxUses: 0,
            usedCount: 0
        };
        const newCoupons = [...coupons, newCoupon];
        setCoupons(newCoupons);
        handleSilentSave(newCoupons);
    };

    const updateLocal = (id: string, field: keyof Coupon, value: any) => {
        setCoupons(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleBlur = () => {
        handleSilentSave(coupons);
    };

    const updateImmediate = (id: string, field: keyof Coupon, value: any) => {
        const newCoupons = coupons.map(c => c.id === id ? { ...c, [field]: value } : c);
        setCoupons(newCoupons);
        handleSilentSave(newCoupons);
    };

    const confirmDelete = () => {
        if(deleteId) {
            const newCoupons = coupons.filter(c => c.id !== deleteId);
            setCoupons(newCoupons);
            handleSilentSave(newCoupons);
            setDeleteId(null);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-serif text-white">ניהול קופונים</h3>
                <Button onClick={addCoupon} className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4"/> הוסף קופון</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon, index) => (
                    <Card key={coupon.id} className="relative group border border-white/5 hover:border-brand-primary/30 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-full">
                                <label className="text-xs text-slate-500 mb-1 block">קוד קופון</label>
                                <input 
                                    type="text" 
                                    className="bg-brand-dark/50 border border-white/10 rounded-lg px-3 py-2 text-white w-full uppercase font-bold tracking-wider focus:border-brand-primary/50 outline-none"
                                    value={coupon.code}
                                    onChange={(e) => updateLocal(coupon.id, 'code', e.target.value)}
                                    onBlur={handleBlur}
                                    placeholder="CODE"
                                />
                            </div>
                            <button onClick={() => setDeleteId(coupon.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors mr-2">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">סוג הנחה</label>
                                <select 
                                    className="bg-brand-dark/50 border border-white/10 rounded-lg px-3 py-2 text-white w-full text-sm outline-none"
                                    value={coupon.discountType}
                                    onChange={(e) => updateImmediate(coupon.id, 'discountType', e.target.value)}
                                >
                                    <option value="fixed">שקלים (₪)</option>
                                    <option value="percentage">אחוזים (%)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">ערך ההנחה</label>
                                <input 
                                    type="number"
                                    className="bg-brand-dark/50 border border-white/10 rounded-lg px-3 py-2 text-white w-full text-sm outline-none"
                                    value={coupon.value}
                                    onChange={(e) => updateLocal(coupon.id, 'value', Number(e.target.value))}
                                    onBlur={handleBlur}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                <label className="text-xs text-slate-500 mb-1 block">מינימום הזמנה (₪)</label>
                                <input 
                                    type="number"
                                    className="bg-brand-dark/50 border border-white/10 rounded-lg px-3 py-2 text-white w-full text-sm outline-none"
                                    value={coupon.minOrderAmount}
                                    onChange={(e) => updateLocal(coupon.id, 'minOrderAmount', Number(e.target.value))}
                                    onBlur={handleBlur}
                                />
                             </div>
                             <div>
                                <label className="text-xs text-slate-500 mb-1 block">הגבלת שימוש</label>
                                <input 
                                    type="number"
                                    className="bg-brand-dark/50 border border-white/10 rounded-lg px-3 py-2 text-white w-full text-sm outline-none"
                                    value={coupon.maxUses || 0}
                                    onChange={(e) => updateLocal(coupon.id, 'maxUses', Number(e.target.value))}
                                    onBlur={handleBlur}
                                    placeholder="0 ללא הגבלה"
                                />
                             </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-white/5 pt-3">
                             <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Users className="w-3 h-3" />
                                <span>נוצל: {coupon.usedCount || 0} פעמים</span>
                             </div>
                             
                             <label className="flex items-center gap-2 cursor-pointer">
                                <span className={`text-xs ${coupon.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>{coupon.isActive ? 'פעיל' : 'לא פעיל'}</span>
                                <div className="relative inline-flex items-center">
                                    <input type="checkbox" className="sr-only peer" checked={coupon.isActive} onChange={() => updateImmediate(coupon.id, 'isActive', !coupon.isActive)} />
                                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </div>
                             </label>
                        </div>
                    </Card>
                ))}
            </div>

            <ConfirmationModal 
                isOpen={!!deleteId} 
                onClose={() => setDeleteId(null)} 
                onConfirm={confirmDelete} 
                title="מחיקת קופון" 
                description="האם אתה בטוח שברצונך למחוק קופון זה? הפעולה אינה הפיכה." 
                confirmText="מחק" 
                variant="danger" 
            />
        </div>
    );
};

const DashboardTab = ({ stats, appointments, onViewAppointment, settings, onUpdateSettings, services, onSyncToCalendar }: any) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 flex items-center gap-4 bg-gradient-to-br from-brand-surface to-brand-surface/50 border-brand-primary/20">
                    <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm text-slate-400">הכנסות החודש</div>
                        <div className="text-2xl font-serif font-bold text-white">₪{stats.revenue.toLocaleString()}</div>
                        <div className="text-xs text-brand-primary/70 mt-1">יעד: ₪{settings.monthly_goals.revenue.toLocaleString()}</div>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm text-slate-400">תורים החודש</div>
                        <div className="text-2xl font-serif font-bold text-white">{stats.appointments}</div>
                        <div className="text-xs text-slate-500 mt-1">יעד: {settings.monthly_goals.appointments}</div>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                     <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm text-slate-400">ממתינים לאישור</div>
                        <div className="text-2xl font-serif font-bold text-white">{stats.pending}</div>
                        <div className="text-xs text-amber-500/70 mt-1">דורש טיפול</div>
                    </div>
                </Card>
            </div>

            <div>
                <h3 className="text-xl font-serif text-white mb-4">תורים אחרונים</h3>
                <AppointmentsList 
                    appointments={appointments.slice(0, 5)} 
                    onStatusUpdate={() => {}} 
                    onCancelRequest={() => {}} 
                    filterId={null} 
                    onClearFilter={() => {}}
                    studioAddress={settings.studio_details.address}
                    onDownloadPdf={() => {}}
                    allServices={services}
                    onSyncToCalendar={onSyncToCalendar}
                />
            </div>
        </div>
    );
};

const CalendarTab = ({ appointments, onStatusUpdate, onCancelRequest, studioAddress, onDownloadPdf, services, onSyncToCalendar }: any) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const appointmentsRef = useRef<HTMLDivElement>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const getDayAppointments = (day: number) => {
        return appointments.filter((apt: any) => {
            const d = new Date(apt.start_time);
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year && apt.status !== 'cancelled';
        });
    };

    const selectedDateAppointments = selectedDate ? appointments.filter((apt: any) => {
        const d = new Date(apt.start_time);
        return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
    }) : [];

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-200px)]">
            <div className="flex-1 flex flex-col h-full bg-brand-surface/30 rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white/5 rounded-full"><ChevronRight/></button>
                    <h2 className="text-xl font-serif text-white">{currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white/5 rounded-full"><ChevronLeft/></button>
                </div>
                
                <div className="grid grid-cols-7 text-center py-2 bg-brand-dark/30 text-xs text-slate-500 border-b border-white/5">
                    <div>א'</div><div>ב'</div><div>ג'</div><div>ד'</div><div>ה'</div><div>ו'</div><div>ש'</div>
                </div>

                <div className="flex-1 grid grid-cols-7 auto-rows-fr min-h-[300px]">
                    {blanks.map((x, i) => <div key={`blank-${i}`} className="border-b border-l border-white/5 bg-brand-dark/20"></div>)}
                    {days.map((day) => {
                        const dayAppts = getDayAppointments(day);
                        const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month;
                        const isTodayDate = isToday(new Date(year, month, day));

                        return (
                            <div 
                                key={day} 
                                onClick={() => {
                                    setSelectedDate(new Date(year, month, day));
                                    if (window.innerWidth < 1024) {
                                        setTimeout(() => {
                                            appointmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, 100);
                                    }
                                }}
                                className={`border-b border-l border-white/5 p-2 cursor-pointer transition-colors relative hover:bg-white/5 ${isSelected ? 'bg-brand-primary/10' : ''}`}
                            >
                                <div className={`text-sm w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isTodayDate ? 'bg-brand-primary text-brand-dark font-bold' : 'text-slate-400'}`}>
                                    {day}
                                </div>
                                <div className="space-y-1">
                                    {dayAppts.slice(0, 3).map((apt: any, i: number) => (
                                        <div key={i} className={`h-1.5 rounded-full ${apt.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    ))}
                                    {dayAppts.length > 3 && <div className="text-[10px] text-slate-600">+{dayAppts.length - 3}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div ref={appointmentsRef} className="w-full lg:w-96 bg-brand-surface rounded-2xl border border-white/5 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-brand-dark/50">
                    <h3 className="text-lg font-medium text-white">{selectedDate?.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                    <p className="text-sm text-slate-400">{selectedDateAppointments.length} תורים רשומים</p>
                </div>
                
                <div className="flex-1 overflow-hidden">
                    <AppointmentsList 
                        appointments={selectedDateAppointments} 
                        onStatusUpdate={onStatusUpdate} 
                        onCancelRequest={onCancelRequest} 
                        filterId={null} 
                        onClearFilter={() => {}}
                        studioAddress={studioAddress}
                        onDownloadPdf={onDownloadPdf}
                        showFilters={false}
                        allServices={services}
                        onSyncToCalendar={onSyncToCalendar}
                    />
                </div>
            </div>
        </div>
    );
};

const ServicesTab = ({ services, onAddService, onUpdateService, onDeleteService }: any) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<Partial<Service>>({ category: 'Ear', pain_level: 1 });

    const openModal = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setFormData(service);
        } else {
            setEditingService(null);
            setFormData({ category: 'Ear', pain_level: 1, duration_minutes: 30, price: 100 });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (editingService) {
            await onUpdateService(editingService.id, formData);
        } else {
            await onAddService(formData);
        }
        setIsModalOpen(false);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-serif text-white">ניהול שירותים</h3>
                <Button onClick={() => openModal()} className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4"/> הוסף שירות</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service: Service) => (
                    <Card key={service.id} className="relative group hover:border-brand-primary/30 transition-all">
                        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(service)} className="p-2 bg-brand-surface rounded-full text-brand-primary hover:bg-brand-primary hover:text-brand-dark"><Edit2 className="w-4 h-4"/></button>
                            <button onClick={() => onDeleteService(service.id)} className="p-2 bg-brand-surface rounded-full text-red-400 hover:bg-red-500 hover:text-white"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        <div className="h-40 bg-brand-dark/50 rounded-lg mb-4 overflow-hidden">
                            <img src={service.image_url} alt={service.name} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"/>
                        </div>
                        <h4 className="text-lg font-medium text-white mb-1">{service.name}</h4>
                        <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
                            <span>{service.category}</span>
                            <span className="text-brand-primary font-bold">₪{service.price}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{service.description}</p>
                    </Card>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingService ? 'עריכת שירות' : 'שירות חדש'}>
                <div className="space-y-4">
                    <Input label="שם השירות" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <Input label="תיאור" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="מחיר (₪)" type="number" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                        <Input label="משך (דקות)" type="number" value={formData.duration_minutes || ''} onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-400 block mb-2">קטגוריה</label>
                            <select 
                                className="w-full bg-brand-dark/50 border border-brand-border text-white px-4 py-3 rounded-xl outline-none"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value as any})}
                            >
                                <option value="Ear">אוזן</option>
                                <option value="Face">פנים</option>
                                <option value="Body">גוף</option>
                                <option value="Jewelry">תכשיט</option>
                            </select>
                        </div>
                        <Input label="תמונה (URL)" value={formData.image_url || ''} onChange={e => setFormData({...formData, image_url: e.target.value})} />
                    </div>
                    <div>
                         <label className="text-sm font-medium text-slate-400 block mb-2">רמת כאב ({formData.pain_level})</label>
                         <input 
                            type="range" min="1" max="10" 
                            className="w-full accent-brand-primary" 
                            value={formData.pain_level} 
                            onChange={e => setFormData({...formData, pain_level: Number(e.target.value)})} 
                        />
                    </div>
                    <Button onClick={handleSubmit} className="w-full mt-4">שמור</Button>
                </div>
            </Modal>
        </div>
    );
};

const GalleryTab = ({ gallery, onUpload, onDelete, services, settings, onUpdateSettings }: any) => {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadUrl, setUploadUrl] = useState('');
    const [taggingImageId, setTaggingImageId] = useState<string | null>(null);
    
    // Tagging state
    const currentTags = taggingImageId && settings.gallery_tags ? (settings.gallery_tags[taggingImageId] || []) : [];

    const handleToggleTag = (serviceId: string) => {
        if (!taggingImageId) return;
        
        const newTags = currentTags.includes(serviceId) 
            ? currentTags.filter((id: string) => id !== serviceId)
            : [...currentTags, serviceId];
            
        const newGalleryTags = { ...settings.gallery_tags, [taggingImageId]: newTags };
        onUpdateSettings({ ...settings, gallery_tags: newGalleryTags });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-serif text-white">גלריה</h3>
                <Button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4"/> הוסף תמונה</Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gallery.map((item: any) => (
                    <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden bg-brand-dark/50 border border-white/5">
                        <img src={item.image_url} alt="Gallery" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                             <button 
                                onClick={() => setTaggingImageId(item.id)}
                                className="px-4 py-2 bg-brand-primary text-brand-dark rounded-full text-xs font-medium hover:bg-white transition-colors flex items-center gap-2"
                            >
                                <Tag className="w-3 h-3" /> תייג מוצרים
                            </button>
                            <button 
                                onClick={() => onDelete(item.id)}
                                className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {item.taggedServices?.length > 0 && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-brand-primary text-brand-dark rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                                {item.taggedServices.length}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="העלאת תמונה">
                <div className="space-y-4">
                    <Input label="כתובת תמונה (URL)" value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} placeholder="https://..." />
                    <Button onClick={() => { onUpload(uploadUrl); setIsUploadOpen(false); setUploadUrl(''); }} className="w-full">העלה</Button>
                </div>
            </Modal>

            <Modal isOpen={!!taggingImageId} onClose={() => setTaggingImageId(null)} title="תיוג מוצרים בתמונה">
                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {services.map((s: Service) => {
                        const isTagged = currentTags.includes(s.id);
                        return (
                            <div 
                                key={s.id} 
                                onClick={() => handleToggleTag(s.id)}
                                className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${isTagged ? 'bg-brand-primary/10 border-brand-primary' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            >
                                <span className={isTagged ? 'text-white' : 'text-slate-400'}>{s.name}</span>
                                {isTagged && <Check className="w-4 h-4 text-brand-primary" />}
                            </div>
                        )
                    })}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 text-center">
                    <Button onClick={() => setTaggingImageId(null)} className="w-full">סיום</Button>
                </div>
            </Modal>
        </div>
    );
};

const SettingsTab = ({ settings, onUpdate }: any) => {
    const [localSettings, setLocalSettings] = useState<StudioSettings>(settings);

    useEffect(() => { setLocalSettings(settings); }, [settings]);

    const handleSilentSave = () => { onUpdate(localSettings, true); };
    
    const updateAndSaveWorkingHours = (newWorkingHours: any) => {
        const newSettings = { ...localSettings, working_hours: newWorkingHours };
        setLocalSettings(newSettings);
        onUpdate(newSettings, true);
    };

    const toggleDay = (dayIndex: string) => {
        const day = localSettings.working_hours[dayIndex] || { isOpen: false, ranges: [] };
        const newState = !day.isOpen;
        
        let newRanges = day.ranges;
        if (newState && (!day.ranges || day.ranges.length === 0)) {
            newRanges = [{ start: 10, end: 18 }];
        }

        const newWorkingHours = {
            ...localSettings.working_hours,
            [dayIndex]: {
                ...day,
                isOpen: newState,
                ranges: newRanges
            }
        };
        updateAndSaveWorkingHours(newWorkingHours);
    };

    const addRange = (dayIndex: string) => {
        const day = localSettings.working_hours[dayIndex];
        const newRanges = [...(day.ranges || []), { start: 10, end: 18 }];
        
        const newWorkingHours = {
            ...localSettings.working_hours,
            [dayIndex]: { ...day, ranges: newRanges }
        };
        updateAndSaveWorkingHours(newWorkingHours);
    };

    const removeRange = (dayIndex: string, rangeIndex: number) => {
        const day = localSettings.working_hours[dayIndex];
        const newRanges = day.ranges.filter((_, i) => i !== rangeIndex);
        
        const newWorkingHours = {
            ...localSettings.working_hours,
            [dayIndex]: { ...day, ranges: newRanges }
        };
        updateAndSaveWorkingHours(newWorkingHours);
    };

    const updateRange = (dayIndex: string, rangeIndex: number, field: 'start' | 'end', value: number) => {
        const day = localSettings.working_hours[dayIndex];
        const newRanges = [...day.ranges];
        newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value };

        const newWorkingHours = {
            ...localSettings.working_hours,
            [dayIndex]: { ...day, ranges: newRanges }
        };
        updateAndSaveWorkingHours(newWorkingHours);
    };

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Card>
                <SectionHeading title="פרטי הסטודיו" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="שם העסק" 
                        value={localSettings.studio_details.name} 
                        onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, name: e.target.value}})} 
                        onBlur={handleSilentSave}
                    />
                    <Input 
                        label="טלפון" 
                        value={localSettings.studio_details.phone} 
                        onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, phone: e.target.value}})} 
                        onBlur={handleSilentSave}
                    />
                    <Input 
                        label="כתובת" 
                        value={localSettings.studio_details.address} 
                        onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, address: e.target.value}})} 
                        onBlur={handleSilentSave}
                    />
                    <Input 
                        label="אימייל" 
                        value={localSettings.studio_details.email} 
                        onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, email: e.target.value}})} 
                        onBlur={handleSilentSave}
                    />
                </div>
            </Card>

            <Card>
                <SectionHeading title="יעדים חודשיים" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="יעד הכנסות (₪)" 
                        type="number" 
                        value={localSettings.monthly_goals.revenue} 
                        onChange={e => setLocalSettings({...localSettings, monthly_goals: {...localSettings.monthly_goals, revenue: Number(e.target.value)}})} 
                        onBlur={handleSilentSave}
                    />
                    <Input 
                        label="יעד תורים" 
                        type="number" 
                        value={localSettings.monthly_goals.appointments} 
                        onChange={e => setLocalSettings({...localSettings, monthly_goals: {...localSettings.monthly_goals, appointments: Number(e.target.value)}})} 
                        onBlur={handleSilentSave}
                    />
                </div>
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-6">
                    <SectionHeading title="שעות פעילות" />
                </div>
                
                <div className="space-y-4">
                    {days.map((dayName, index) => {
                        const dayKey = index.toString();
                        const dayConfig = localSettings.working_hours[dayKey] || { isOpen: false, ranges: [] };
                        
                        return (
                            <div key={dayKey} className={`p-4 rounded-xl border transition-all ${dayConfig.isOpen ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 opacity-60'}`}>
                                <div className="grid grid-cols-[1fr_auto] md:grid-cols-[100px_60px_1fr] gap-x-4 gap-y-4 items-center md:items-start">
                                    <div className="font-medium text-white md:pt-2">{dayName}</div>
                                    
                                    <div className="md:pt-1">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={dayConfig.isOpen} onChange={() => toggleDay(dayKey)} />
                                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                                        </label>
                                    </div>

                                    <div className="col-span-2 md:col-span-1 w-full space-y-3">
                                        {dayConfig.isOpen ? (
                                            <>
                                                {dayConfig.ranges.map((range, rIdx) => (
                                                    <div key={rIdx} className="flex items-center gap-3 w-full">
                                                        <div className="flex-1 flex items-center justify-center gap-2 bg-brand-dark/50 p-2 rounded-lg border border-white/10">
                                                            <select 
                                                                className="bg-transparent text-white text-sm outline-none text-center appearance-none cursor-pointer w-full"
                                                                value={range.start}
                                                                onChange={e => updateRange(dayKey, rIdx, 'start', Number(e.target.value))}
                                                            >
                                                                {Array.from({length: 24}).map((_, i) => (
                                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                                                ))}
                                                            </select>
                                                            <span className="text-slate-500">-</span>
                                                            <select 
                                                                className="bg-transparent text-white text-sm outline-none text-center appearance-none cursor-pointer w-full"
                                                                value={range.end}
                                                                onChange={e => updateRange(dayKey, rIdx, 'end', Number(e.target.value))}
                                                            >
                                                                {Array.from({length: 24}).map((_, i) => (
                                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={() => removeRange(dayKey, rIdx)}
                                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                                            title="מחק טווח"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                
                                                <button 
                                                    onClick={() => addRange(dayKey)}
                                                    className="flex items-center gap-2 text-xs text-brand-primary hover:text-white mt-2 px-3 py-1.5 rounded-lg bg-brand-primary/5 hover:bg-brand-primary/10 border border-brand-primary/10 w-full md:w-fit justify-center transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> הוסף טווח שעות
                                                </button>
                                            </>
                                        ) : (
                                            <div className="text-slate-500 text-sm italic md:pt-2">סגור</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

const ConsentPdfTemplate = ({ data, settings }: { data: Appointment, settings: StudioSettings }) => {
    const extractId = (notes?: string) => {
        const match = notes?.match(/ת\.ז: (\d+)/);
        return match ? match[1] : null;
    };

    const nationalId = extractId(data.notes);

    return (
        <div id="pdf-template" className="bg-white text-black p-12 w-[210mm] min-h-[297mm] mx-auto font-sans direction-rtl relative box-border" style={{ direction: 'rtl' }}>
            <div className="text-center border-b-2 border-black pb-8 mb-8">
                <h1 className="text-4xl font-serif font-bold mb-2">{settings.studio_details.name}</h1>
                <p className="text-sm text-gray-600">{settings.studio_details.address} | {settings.studio_details.phone}</p>
                <h2 className="text-2xl font-bold mt-6 underline">הצהרת בריאות ואישור ביצוע פירסינג</h2>
            </div>

            <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-lg mb-4 border-b border-gray-300 pb-2">פרטי הלקוח/ה</h3>
                <div className="grid grid-cols-2 gap-6 text-sm">
                    <p className="border-b border-gray-200 pb-1"><strong>שם מלא:</strong> {data.client_name}</p>
                    <p className="border-b border-gray-200 pb-1"><strong>תעודת זהות:</strong> {nationalId || '_________________'}</p>
                    <p className="border-b border-gray-200 pb-1"><strong>טלפון:</strong> {data.client_phone}</p>
                    <p className="border-b border-gray-200 pb-1"><strong>תאריך:</strong> {new Date(data.start_time).toLocaleDateString('he-IL')}</p>
                    <p className="col-span-2 border-b border-gray-200 pb-1"><strong>שירות מבוקש:</strong> {data.service_name || 'פירסינג'}</p>
                </div>
            </div>

            <div className="mb-8 text-sm leading-relaxed">
                <h3 className="font-bold text-lg mb-4 underline">הצהרת הלקוח/ה:</h3>
                
                <div className="space-y-3 text-justify">
                    <p>- אני מצהיר/ה כי אני מעל גיל 16, או מלווה ע"י הורה/אפוטרופוס חוקי שחתם על אישור זה.</p>
                    <p>- אני מצהיר/ה כי איני תחת השפעת אלכוהול או סמים.</p>
                    <p>- אני מצהיר/ה כי איני סובל/ת ממחלות המועברות בדם (כגון צהבת, HIV וכו').</p>
                    <p>- אני מצהיר/ה כי איני סובל/ת מבעיות קרישת דם, סוכרת לא מאוזנת, מחלות לב, אפילפסיה או אלרגיות למתכות.</p>
                    <p>- נשים: אני מצהיר/ה כי איני בהריון ואיני מניקה (רלוונטי לפירסינג בפטמה/טבור).</p>
                    <p>- ידוע לי כי ביצוע הפירסינג כרוך בפציעה מבוקרת של העור וכי קיימים סיכונים לזיהום, צלקות, דחייה או אלרגיה.</p>
                    <p>- קיבלתי הסבר מפורט על אופן הטיפול בפירסינג והבנתי את חשיבות השמירה על היגיינה.</p>
                    <p>- אני משחרר/ת את הסטודיו ואת הפירסר/ית מכל אחריות לנזק שיגרם כתוצאה מטיפול לקוי שלי או אי-מילוי הוראות הטיפול.</p>
                </div>
            </div>

            <div className="mt-auto pt-12 pb-4">
                <p className="mb-8 text-sm">בחתימתי אני מאשר/ת כי קראתי את ההצהרה לעיל, הבנתי את תוכנה ואני מסכים/ה לכל האמור בה.</p>
                
                <div className="flex justify-between items-end border-t border-black pt-8">
                    <div className="text-center w-1/3">
                        {data.signature ? (
                            <img src={data.signature} alt="Client Signature" className="h-16 mx-auto mb-2 object-contain" />
                        ) : (
                            <div className="h-16 mb-2"></div>
                        )}
                        <p className="border-t border-black pt-2 font-bold">חתימת הלקוח/ה</p>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="h-16 mb-2 flex items-end justify-center font-script text-2xl">Yuval</div>
                        <p className="border-t border-black pt-2 font-bold">חתימת הפירסר/ית</p>
                    </div>
                </div>
                
                <div className="mt-8 text-center text-[10px] text-gray-500">
                    מסמך זה נוצר דיגיטלית ביום {new Date().toLocaleDateString('he-IL')} בשעה {new Date().toLocaleTimeString('he-IL')}
                </div>
            </div>
        </div>
    );
};

const Admin: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState(''); // New State for Login Error
    const [activeTab, setActiveTab] = useState('dashboard');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [gallery, setGallery] = useState<any[]>([]);
    const [settings, setSettings] = useState<StudioSettings | null>(null);
    const [stats, setStats] = useState({ revenue: 0, appointments: 0, pending: 0 });
    const [isLoading, setIsLoading] = useState(true);
    
    // Toast Notification State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Filters & Modals
    const [filterId, setFilterId] = useState<string | null>(null);
    const [modalData, setModalData] = useState<{ isOpen: boolean, type: 'cancel' | null, item: any | null }>({ isOpen: false, type: null, item: null });
    const [pdfData, setPdfData] = useState<Appointment | null>(null);
    const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        const [appts, srvs, stgs, sts, gall] = await Promise.all([
            api.getAppointments(),
            api.getServices(),
            api.getSettings(),
            api.getMonthlyStats(),
            api.getGallery()
        ]);
        setAppointments(appts);
        setServices(srvs);
        setSettings(stgs);
        setStats(sts);
        setGallery(gall);
        if (!silent) setIsLoading(false);
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
            // Init Google Calendar Client
            calendarService.initClient();
        }
    }, [isAuthenticated, fetchData]);

    const handleSyncToCalendar = async (apt: Appointment) => {
        try {
            // Find service duration
            const service = services.find(s => s.id === apt.service_id);
            const duration = service ? service.duration_minutes : 30;
            
            await calendarService.syncAppointment(apt, duration);
            showNotification(`האירוע עבור ${apt.client_name} סונכרן ליומן בהצלחה!`, 'success');
        } catch (error: any) {
            console.error(error);
            showNotification('שגיאה בסנכרון ליומן: ' + error.message, 'error');
        }
    };

    const handleBulkSync = async (appointmentsToSync: Appointment[]) => {
        if (!confirm(`האם לסנכרן ${appointmentsToSync.length} תורים ליומן גוגל?`)) return;
        
        let successCount = 0;
        let failCount = 0;

        for (const apt of appointmentsToSync) {
            try {
                const service = services.find(s => s.id === apt.service_id);
                const duration = service ? service.duration_minutes : 30;
                await calendarService.syncAppointment(apt, duration);
                successCount++;
            } catch (e) {
                failCount++;
                console.error(e);
            }
        }
        showNotification(`סנכרון הסתיים. הצלחות: ${successCount}, כישלונות: ${failCount}`, failCount > 0 ? 'error' : 'success');
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(''); // Clear previous error
        if (password === '2007') {
            setIsAuthenticated(true);
        } else {
            setLoginError('סיסמה שגויה'); // Set error message
        }
    };

    const handleCancelAppointment = async () => {
        if (modalData.item) {
            await api.updateAppointmentStatus(modalData.item.id, 'cancelled');
            await api.updateAppointment(modalData.item.id, { notes: (modalData.item.notes || '') + '\nסיבת ביטול: בוטל ע"י מנהל' });
            setModalData({ isOpen: false, type: null, item: null });
            fetchData();
        }
    };

    const handleDownloadPdf = async (apt: Appointment) => {
        setPdfData(apt);
        // Wait for render
        setTimeout(async () => {
            const input = document.getElementById('pdf-template');
            if (input) {
                try {
                    const canvas = await html2canvas(input, { 
                        scale: 2, 
                        useCORS: true, 
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    const pdf = new jsPDF({
                        orientation: 'p',
                        unit: 'mm',
                        format: 'a4',
                        compress: true
                    });
                    
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    
                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`Consent_${apt.client_name.replace(/\s+/g, '_')}.pdf`);
                    
                } catch (err) { 
                    console.error("PDF Error:", err);
                    showNotification("שגיאה ביצירת ה-PDF", 'error');
                }
            }
            setPdfData(null);
        }, 500); 
    };

    const handleUpdateSettings = async (newSettings: StudioSettings, silent = false) => { 
        await api.updateSettings(newSettings); 
        fetchData(silent); 
    }
    const handleStatusUpdate = async (id: string, status: string) => { await api.updateAppointmentStatus(id, status); fetchData(); }
    const handleAddService = async (service: any) => { await api.addService(service); fetchData(); }
    const handleUpdateService = async (id: string, updates: any) => { await api.updateService(id, updates); fetchData(); }
    const handleDeleteService = async (id: string) => { if(window.confirm('האם אתה בטוח?')) { await api.deleteService(id); fetchData(); } }
    const handleGalleryUpload = async (url: string) => { await api.addToGallery(url); fetchData(); }
    const handleDeleteGalleryImage = (id: string) => { setImageToDeleteId(id); }
    const handleConfirmDeleteGalleryImage = async () => { if (imageToDeleteId) { await api.deleteFromGallery(imageToDeleteId); setImageToDeleteId(null); fetchData(); } }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
                <Card className="w-full max-w-md p-8 border-brand-primary/20">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-serif text-white">כניסת מנהל</h1>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input 
                            label="סיסמה" 
                            type="password" 
                            value={password} 
                            onChange={(e) => { setPassword(e.target.value); setLoginError(''); }} 
                            autoFocus 
                            className={`text-center tracking-widest text-lg ${loginError ? 'border-red-500/50 focus:border-red-500' : ''}`}
                        />
                        {loginError && (
                            <p className="text-red-400 text-sm text-center -mt-4">{loginError}</p>
                        )}
                        <Button type="submit" className="w-full">התחבר</Button>
                    </form>
                </Card>
            </div>
        );
    }

    if (isLoading || !settings) {
        return <div className="min-h-screen flex items-center justify-center text-brand-primary"><Loader2 className="w-8 h-8 animate-spin"/></div>;
    }

    return (
        <div className="min-h-screen bg-brand-dark pb-20 pt-24 relative">
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>

            <div className="container mx-auto px-4 lg:px-8">
                <div className="flex flex-col gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-serif text-white mb-1">לוח בקרה</h1>
                        <p className="text-slate-400 text-sm">ניהול סטודיו חכם</p>
                    </div>
                    
                    {/* Fixed Tabs Row */}
                    <div className="w-full overflow-x-auto pb-2">
                        <div className="flex flex-row items-center gap-2 p-1 bg-brand-surface/50 rounded-xl min-w-max">
                            {[
                                { id: 'dashboard', icon: Activity, label: 'ראשי' },
                                { id: 'calendar', icon: Calendar, label: 'יומן' },
                                { id: 'appointments', icon: Filter, label: 'ניהול תורים' }, // Restored Tab
                                { id: 'services', icon: Edit2, label: 'שירותים' },
                                { id: 'gallery', icon: ImageIcon, label: 'גלריה' },
                                { id: 'coupons', icon: Ticket, label: 'קופונים' },
                                { id: 'settings', icon: Settings, label: 'הגדרות' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); if(tab.id !== 'appointments') setFilterId(null); }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-primary text-brand-dark shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <m.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        {activeTab === 'dashboard' && <DashboardTab stats={stats} appointments={appointments} onViewAppointment={(id: string) => { setFilterId(id); setActiveTab('appointments'); }} settings={settings} onUpdateSettings={handleUpdateSettings} services={services} onSyncToCalendar={handleSyncToCalendar} />}
                        {activeTab === 'calendar' && <CalendarTab appointments={appointments} onStatusUpdate={handleStatusUpdate} onCancelRequest={(apt: Appointment) => setModalData({ isOpen: true, type: 'cancel', item: apt })} studioAddress={settings.studio_details?.address} onDownloadPdf={handleDownloadPdf} services={services} onSyncToCalendar={handleSyncToCalendar} />}
                        {activeTab === 'appointments' && (
                            <AppointmentsList 
                                appointments={appointments} 
                                onStatusUpdate={handleStatusUpdate} 
                                onCancelRequest={(apt: Appointment) => setModalData({ isOpen: true, type: 'cancel', item: apt })} 
                                filterId={filterId} 
                                onClearFilter={() => setFilterId(null)} 
                                studioAddress={settings.studio_details?.address} 
                                onDownloadPdf={handleDownloadPdf} 
                                allServices={services}
                                onSyncToCalendar={handleSyncToCalendar}
                                onBulkSync={handleBulkSync}
                            />
                        )}
                        {activeTab === 'services' && <ServicesTab services={services} onAddService={handleAddService} onUpdateService={handleUpdateService} onDeleteService={handleDeleteService} />}
                        {activeTab === 'gallery' && <GalleryTab gallery={gallery} onUpload={handleGalleryUpload} onDelete={handleDeleteGalleryImage} services={services} settings={settings} onUpdateSettings={handleUpdateSettings} />}
                        {activeTab === 'coupons' && <CouponsTab settings={settings} onUpdate={handleUpdateSettings} />}
                        {activeTab === 'settings' && <SettingsTab settings={settings} onUpdate={handleUpdateSettings} />}
                    </m.div>
                </AnimatePresence>
            </div>

            <ConfirmationModal isOpen={modalData.isOpen} onClose={() => setModalData({ ...modalData, isOpen: false })} onConfirm={handleCancelAppointment} title="ביטול תור" description="האם אתה בטוח?" confirmText="בטל" variant="danger" />
            <ConfirmationModal isOpen={!!imageToDeleteId} onClose={() => setImageToDeleteId(null)} onConfirm={handleConfirmDeleteGalleryImage} title="מחיקת תמונה" description="האם למחוק תמונה זו?" confirmText="מחק" variant="danger" />

            <div className="fixed top-[200vh] left-0 pointer-events-none opacity-0 z-[-50]">
                {pdfData && <ConsentPdfTemplate data={pdfData} settings={settings} />}
            </div>
        </div>
    );
};

export default Admin;
