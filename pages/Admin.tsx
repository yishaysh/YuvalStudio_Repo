
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Calendar, Settings, Image as ImageIcon, Ticket, 
  Search, Filter, X, Check, Trash2, Edit2, Plus, LogOut, Save,
  ChevronRight, ChevronLeft, Loader2, Clock, Activity, DollarSign,
  Users, Info, ArrowUpDown, Send, FileText, Tag, Lock, CalendarPlus, RefreshCw, AlertCircle, CheckCircle2, Wand2, Sparkles, Box, AlertTriangle
} from 'lucide-react';
import { api } from '../services/mockApi';
import { Appointment, Service, StudioSettings, Coupon } from '../types';
import { Button, Card, Input, Modal, ConfirmationModal, SectionHeading } from '../components/ui';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
import { DEFAULT_STUDIO_DETAILS, JEWELRY_CATALOG } from '../constants';
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
    onBulkSync,
    onViewVisualPlan
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
        let jewelryPrice = 0;

        // 1. Add Primary Service
        servicesList.push({ name: apt.service_name || 'שירות כללי', type: 'service' });
        calculatedBasePrice += (apt.service_price || 0);

        // 2. Parse Visual Jewelry Items (from ai_recommendation_text JSON)
        if (apt.ai_recommendation_text) {
            try {
                const visualPlan = JSON.parse(apt.ai_recommendation_text);
                if (visualPlan.selected_items && Array.isArray(visualPlan.selected_items)) {
                    // Map IDs to names from JEWELRY_CATALOG
                    visualPlan.selected_items.forEach((id: string) => {
                        const item = JEWELRY_CATALOG.find(j => j.id === id);
                        if (item) {
                            servicesList.push({ name: item.name, type: 'jewelry' });
                            jewelryPrice += item.price;
                        }
                    });
                }
            } catch (e) {
                // Ignore parse error
            }
        }
        
        calculatedBasePrice += jewelryPrice;

        // 3. Fallback: Parse Notes for Extras if not in visual plan
        if (apt.notes && apt.notes.includes('תוספות:')) {
            const match = apt.notes.match(/תוספות: (.*?)(?:\n|$)/);
            if (match && match[1]) {
                const extras = match[1].split(', ').map((s: string) => s.trim());
                extras.forEach((extraName: string) => {
                    // Avoid duplicates if already added via visual plan
                    if (!servicesList.find(s => s.name === extraName)) {
                        servicesList.push({ name: extraName, type: 'extra' });
                        // Try to find price
                        const serviceObj = allServices.find((s: Service) => s.name === extraName);
                        if (serviceObj) calculatedBasePrice += serviceObj.price;
                    }
                });
            }
        }
        
        // 4. Determine Final Price & Coupon
        let finalPrice = undefined;
        let couponCode = undefined;

        if (apt.notes && apt.notes.includes('=== פרטי קופון ===')) {
             const priceMatch = apt.notes.match(/מחיר סופי לחיוב: ₪(\d+)/);
             if (priceMatch) finalPrice = parseInt(priceMatch[1], 10);
             
             const codeMatch = apt.notes.match(/קוד: (.*?)(\n|$)/);
             if (codeMatch) couponCode = codeMatch[1].trim();
        }
        
        if (finalPrice === undefined) {
            // Explicitly prefer database final_price if present
            finalPrice = (apt.final_price !== undefined && apt.final_price !== null) ? apt.final_price : calculatedBasePrice;
        }
        if (couponCode === undefined) {
            couponCode = apt.coupon_code;
        }
        
        const discount = Math.max(0, calculatedBasePrice - finalPrice);

        return { servicesList, calculatedBasePrice, finalPrice, couponCode, discount, jewelryPrice };
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
                    const { servicesList, calculatedBasePrice, finalPrice, couponCode, discount, jewelryPrice } = getCalculatedData(apt);
                    const hasVisualPlan = !!(apt.visual_plan || apt.ai_recommendation_text);

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
                                        <div key={idx} className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs border w-fit gap-1 ${svc.type === 'jewelry' ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                                            {svc.type === 'jewelry' && <Sparkles className="w-2.5 h-2.5" />}
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
                                            <div className="flex justify-between text-slate-400 border-b border-white/5 pb-1">
                                                <span>טיפולים:</span>
                                                <span>₪{calculatedBasePrice - jewelryPrice}</span>
                                            </div>
                                            {jewelryPrice > 0 && (
                                                <div className="flex justify-between text-brand-primary/80 border-b border-white/5 pb-1">
                                                    <span>תכשיטים:</span>
                                                    <span>₪{jewelryPrice}</span>
                                                </div>
                                            )}
                                            {discount > 0 && (
                                                <div className="flex justify-between text-emerald-400">
                                                    <span>הנחה:</span>
                                                    <span>-₪{discount}</span>
                                                </div>
                                            )}
                                            {couponCode && (
                                                <div className="flex justify-between text-brand-primary text-[10px] pt-1">
                                                    <span>קופון:</span>
                                                    <span>{couponCode}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-white/10 pt-2 mt-1 flex justify-between font-bold text-white">
                                                <span>סה"כ:</span>
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
                                        {/* AI Visual Plan Button */}
                                        {hasVisualPlan && (
											<button 
												onClick={() => onViewVisualPlan(apt)} 
												className="p-2 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 rounded-r-lg border-l border-white/5 transition-colors"
												title="צפה בתוכנית AI ותמונה"
											>
												<Wand2 className="w-4 h-4" />
											</button>
										)}

                                        <button 
                                            onClick={() => sendWhatsapp(apt, 'status_update', studioAddress)} 
                                            className={`p-2 transition-colors ${
                                                !hasVisualPlan ? 'rounded-r-lg' : ''
                                            } border-l border-white/5 ${
                                                apt.status === 'confirmed' 
                                                    ? 'text-emerald-400 hover:bg-emerald-500/20' 
                                                    : (apt.status === 'cancelled' ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:bg-white/10')
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

// --- TAB COMPONENTS ---

const DashboardTab = ({ stats }: { stats: any }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
                <DollarSign className="w-6 h-6" />
            </div>
            <div>
                <div className="text-sm text-slate-400">הכנסות החודש</div>
                <div className="text-2xl font-serif text-white">₪{stats?.revenue || 0}</div>
            </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                <Calendar className="w-6 h-6" />
            </div>
            <div>
                <div className="text-sm text-slate-400">תורים החודש</div>
                <div className="text-2xl font-serif text-white">{stats?.appointments || 0}</div>
            </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-400">
                <Clock className="w-6 h-6" />
            </div>
            <div>
                <div className="text-sm text-slate-400">ממתינים לאישור</div>
                <div className="text-2xl font-serif text-white">{stats?.pending || 0}</div>
            </div>
        </Card>
    </div>
);

const InventoryTab = ({ services, onRefresh }: { services: Service[], onRefresh: () => void }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-serif text-white">שירותים ותכשיטים</h3>
            <Button onClick={() => alert('Add Service Modal would open here')}>
                <Plus className="w-4 h-4 ml-2" /> הוסף חדש
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(s => (
                <Card key={s.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <h4 className="font-medium text-white">{s.name}</h4>
                        <span className="text-brand-primary">₪{s.price}</span>
                    </div>
                    <p className="text-xs text-slate-400">{s.description}</p>
                </Card>
            ))}
        </div>
    </div>
);

const CouponsTab = ({ settings }: { settings: StudioSettings | null }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-serif text-white">ניהול קופונים</h3>
            <Button onClick={() => alert('Add Coupon Modal would open here')}>
                <Plus className="w-4 h-4 ml-2" /> צור קופון
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settings?.coupons?.map((c, i) => (
                <Card key={i} className="p-4 flex flex-col gap-2 border-dashed">
                    <div className="flex justify-between items-center">
                        <span className="font-mono text-brand-primary text-lg">{c.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {c.isActive ? 'פעיל' : 'לא פעיל'}
                        </span>
                    </div>
                    <div className="text-sm text-slate-400">
                        {c.discountType === 'percentage' ? `${c.value}% הנחה` : `₪${c.value} הנחה`}
                        <br/>
                        מינימום הזמנה: ₪{c.minOrderAmount}
                    </div>
                </Card>
            ))}
        </div>
    </div>
);

const SettingsTab = ({ settings }: { settings: StudioSettings | null }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-serif text-white">הגדרות סטודיו</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="p-4">
                 <h4 className="text-white mb-2">פרטי התקשרות</h4>
                 <div className="space-y-2 text-sm text-slate-400">
                     <p>טלפון: {settings?.studio_details.phone}</p>
                     <p>כתובת: {settings?.studio_details.address}</p>
                     <p>אימייל: {settings?.studio_details.email}</p>
                 </div>
             </Card>
             <Card className="p-4">
                 <h4 className="text-white mb-2">שעות פעילות</h4>
                 <div className="text-sm text-slate-400">
                     (ממשק ניהול שעות פעילות)
                 </div>
             </Card>
        </div>
    </div>
);

const Admin: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [settings, setSettings] = useState<StudioSettings | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [visualPlanData, setVisualPlanData] = useState<any>(null); // Fixed missing state
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    // Initial Fetch
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedServices, fetchedSettings, fetchedAppointments, fetchedStats] = await Promise.all([
                api.getServices(),
                api.getSettings(),
                api.getAppointments(),
                api.getMonthlyStats()
            ]);
            setServices(fetchedServices);
            setSettings(fetchedSettings);
            setAppointments(fetchedAppointments);
            setStats(fetchedStats);
        } catch (e) {
            console.error(e);
            setToast({ message: "שגיאה בטעינת נתונים", type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchData();
    }, [isAuthenticated, fetchData]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === '1234') { // Simple mock password
            setIsAuthenticated(true);
        } else {
            setToast({ message: "סיסמה שגויה", type: 'error' });
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        const success = await api.updateAppointmentStatus(id, status);
        if (success) {
            setToast({ message: "סטטוס עודכן בהצלחה", type: 'success' });
            fetchData();
        }
    };

    const handleCancelRequest = async (apt: Appointment) => {
         // Simplified cancel logic
         const success = await api.updateAppointmentStatus(apt.id, 'cancelled');
         if (success) {
             setToast({ message: "התור בוטל", type: 'success' });
             fetchData();
         }
    };
    
    const handleDownloadPdf = (apt: Appointment) => {
        // Implementation for downloading PDF using jsPDF and the signature data
        if (!apt.signature) return;
        
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Health Declaration", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.text(`Name: ${apt.client_name}`, 20, 40);
        doc.text(`Date: ${new Date(apt.start_time).toLocaleDateString()}`, 20, 50);
        
        doc.text("Signature:", 20, 70);
        doc.addImage(apt.signature, 'PNG', 20, 80, 100, 50);
        
        doc.save(`health_declaration_${apt.client_name}.pdf`);
    };

    const handleViewVisualPlan = (apt: Appointment) => {
        let data = null;
        if (apt.visual_plan) {
            try {
                data = JSON.parse(apt.visual_plan);
            } catch(e) { console.error("Error parsing visual_plan", e); }
        } else if (apt.ai_recommendation_text) {
             // Fallback to legacy field
             try {
                data = JSON.parse(apt.ai_recommendation_text);
            } catch(e) { console.error("Error parsing ai_recommendation_text", e); }
        }
        
        if (data) {
            setVisualPlanData(data);
        } else {
            setToast({ message: "לא נמצאה תוכנית הדמיה", type: 'error' });
        }
    };
    
    const handleSyncToCalendar = async (apt: Appointment) => {
        try {
            await calendarService.syncAppointment(apt);
            setToast({ message: "סונכרן ליומן גוגל בהצלחה", type: 'success' });
        } catch (e) {
            console.error(e);
            setToast({ message: "שגיאה בסנכרון ליומן", type: 'error' });
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
                <Card className="w-full max-w-md p-8 text-center border-brand-primary/20">
                    <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-serif text-white mb-6">כניסת מנהל</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input 
                            label="סיסמה" 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="text-center tracking-widest"
                            placeholder="••••"
                            autoFocus
                        />
                        <Button type="submit" className="w-full">התחבר</Button>
                    </form>
                </Card>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark pb-20 pt-24">
             {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
             
             <div className="container mx-auto px-4 lg:px-8">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                     <SectionHeading title="ניהול סטודיו" />
                     <div className="flex gap-3">
                         <Button variant="outline" onClick={fetchData} disabled={isLoading}>
                             <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                         </Button>
                         <Button variant="ghost" onClick={() => setIsAuthenticated(false)}>
                             <LogOut className="w-4 h-4 ml-2" /> יציאה
                         </Button>
                     </div>
                 </div>

                 {/* Navigation Tabs */}
                 <div className="flex overflow-x-auto gap-2 mb-8 pb-2 border-b border-white/5">
                     {[
                         { id: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
                         { id: 'appointments', label: 'יומן תורים', icon: Calendar },
                         { id: 'inventory', label: 'שירותים', icon: Box },
                         { id: 'coupons', label: 'קופונים', icon: Ticket },
                         { id: 'settings', label: 'הגדרות', icon: Settings },
                     ].map((tab) => (
                         <button
                             key={tab.id}
                             onClick={() => setActiveTab(tab.id)}
                             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                 activeTab === tab.id 
                                     ? 'bg-brand-primary text-brand-dark' 
                                     : 'text-slate-400 hover:text-white hover:bg-white/5'
                             }`}
                         >
                             <tab.icon className="w-4 h-4" />
                             {tab.label}
                         </button>
                     ))}
                 </div>

                 {/* Tab Content */}
                 <AnimatePresence mode="wait">
                     <m.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                     >
                         {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
                         
                         {activeTab === 'appointments' && (
                             <AppointmentsList 
                                 appointments={appointments} 
                                 onStatusUpdate={handleStatusUpdate}
                                 onCancelRequest={handleCancelRequest}
                                 onDownloadPdf={handleDownloadPdf}
                                 onViewVisualPlan={handleViewVisualPlan}
                                 onSyncToCalendar={handleSyncToCalendar}
                                 studioAddress={settings?.studio_details.address}
                                 allServices={services}
                             />
                         )}

                         {activeTab === 'inventory' && (
                             <InventoryTab services={services} onRefresh={fetchData} />
                         )}

                         {activeTab === 'coupons' && (
                             <CouponsTab settings={settings} />
                         )}

                         {activeTab === 'settings' && (
                             <SettingsTab settings={settings} />
                         )}
                     </m.div>
                 </AnimatePresence>
             </div>

            {/* AI Visual Plan Modal */}
            <Modal isOpen={!!visualPlanData} onClose={() => setVisualPlanData(null)} title="תוכנית עיצוב AI">
                {visualPlanData && (
                    <div className="space-y-4">
                        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black border border-white/10">
                            <img 
								src={visualPlanData.userImage || visualPlanData.original_image} 
								alt="AI Plan" 
								className="w-full h-auto rounded-lg shadow-2xl"
								onError={(e) => {
									(e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Image+Not+Found';
								}}
							/>
                            {/* Render Recommendations with Actual Jewelry Images */}
                            {visualPlanData.recommendations?.map((rec: any, idx: number) => {
                                const jewelry = JEWELRY_CATALOG.find(j => j.id === rec.jewelry_id);
                                return (
                                     <div
                                        key={`rec-${idx}`}
                                        style={{ left: `${rec.x}%`, top: `${rec.y}%` }}
                                        className="absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2"
                                        title={rec.location}
                                     >
                                        <div className="w-full h-full rounded-full border-2 border-brand-primary bg-white overflow-hidden shadow-lg">
                                            {jewelry ? (
                                                <img src={jewelry.image_url} alt={jewelry.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-brand-primary/50 animate-pulse" />
                                            )}
                                        </div>
                                     </div>
                                );
                            })}
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl text-right">
                            <h4 className="text-white font-medium mb-2">מיקומי פירסינג מומלצים</h4>
                            <ul className="space-y-2">
                                 {visualPlanData.recommendations?.map((rec: any, i: number) => (
                                     <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                         <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0"></span>
                                         <span>
                                             <strong className="text-white">{rec.location}:</strong> {rec.description}
                                         </span>
                                     </li>
                                 ))}
                            </ul>
                        </div>
                        {/* Selected Items List in Modal */}
                        {visualPlanData.selected_items && visualPlanData.selected_items.length > 0 && (
                            <div className="bg-white/5 p-4 rounded-xl text-right mt-2">
                                <h4 className="text-white font-medium mb-2">פריטים שנבחרו</h4>
                                <div className="flex flex-wrap gap-2">
                                    {visualPlanData.selected_items.map((itemId: string) => {
                                        const item = JEWELRY_CATALOG.find(j => j.id === itemId);
                                        return item ? (
                                            <span key={itemId} className="text-xs bg-brand-primary/10 text-brand-primary px-2 py-1 rounded border border-brand-primary/20 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" />
                                                {item.name}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Admin;
