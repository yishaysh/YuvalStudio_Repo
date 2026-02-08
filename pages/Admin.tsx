
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Calendar, Settings, Image as ImageIcon, Ticket, 
  Search, Filter, X, Check, Trash2, Edit2, Plus, LogOut, Save,
  ChevronRight, ChevronLeft, Loader2, Clock, Activity, DollarSign,
  Users, Info, ArrowUpDown, Send, FileText, Tag, Lock, CalendarPlus, RefreshCw, AlertCircle, CheckCircle2, Wand2, Sparkles, Box, AlertTriangle, Upload
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
        let finalPrice = apt.final_price;
        let couponCode = undefined;

        if (apt.notes && apt.notes.includes('=== פרטי קופון ===')) {
             const codeMatch = apt.notes.match(/קוד: (.*?)(\n|$)/);
             if (codeMatch) couponCode = codeMatch[1].trim();
        }
        
        if (finalPrice === undefined || finalPrice === null) {
            finalPrice = apt.price !== undefined ? apt.price : calculatedBasePrice;
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
                    const isAiInfluenced = hasVisualPlan || jewelryPrice > 0;
                    
                    let imageUrl = null;
                    
                    // 1. Try parsing visual plan for image
                    if (apt.visual_plan) {
                        try {
                            const vp = typeof apt.visual_plan === 'string' ? JSON.parse(apt.visual_plan) : apt.visual_plan;
                            if (vp.original_image) imageUrl = vp.original_image;
                            else if (vp.userImage) imageUrl = vp.userImage;
                        } catch (e) {}
                    } else if (apt.ai_recommendation_text) {
                        try {
                            const vp = typeof apt.ai_recommendation_text === 'string' ? JSON.parse(apt.ai_recommendation_text) : apt.ai_recommendation_text;
                            if (vp.original_image) imageUrl = vp.original_image;
                        } catch (e) {}
                    }

                    // 2. Fallback to notes regex if not found in visual plan
                    if (!imageUrl && apt.notes) {
                         const imageMatch = apt.notes.match(/\[.*?\]\((https?:\/\/[^\)]+)\)/) || apt.notes.match(/(https?:\/\/[^\s]+)/);
                         if (imageMatch) imageUrl = imageMatch[1] || imageMatch[0];
                    }

                    return (
                        <tr 
                            key={apt.id} 
                            ref={(el) => { rowRefs.current[apt.id] = el; }}
                            className={`transition-colors duration-300 ${isHighlighted ? 'bg-brand-primary/20 hover:bg-brand-primary/25 shadow-[inset_3px_0_0_0_#d4b585]' : 'hover:bg-white/[0.02]'}`}
                        >
                            <td className="py-4 px-6 align-top">
                                <div className="flex items-center gap-2">
                                    <div>
                                        <div className={`font-medium ${isHighlighted ? 'text-brand-primary' : 'text-white'}`}>{apt.client_name}</div>
                                        <div className="text-xs text-slate-500">{apt.client_phone}</div>
                                    </div>
                                    {imageUrl && (
                                        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-primary transition-colors p-1" title="צפה בתמונת לקוח">
                                            <ImageIcon className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
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
                                         <div className="flex items-center gap-1">
                                            <span className="font-bold text-emerald-400 text-sm">₪{finalPrice}</span>
                                            {isAiInfluenced && <Sparkles className="w-3 h-3 text-brand-primary" />}
                                         </div>
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

const DashboardTab = ({ stats, appointments, onViewAppointment, settings, onUpdateSettings }: any) => {
    const today = new Date();
    // Only confirmed appointments count for revenue
    const todaysAppointments = appointments.filter((apt: any) => isToday(new Date(apt.start_time)) && apt.status === 'confirmed');
    
    // Calculate daily revenue using final_price
    const dailyRevenue = todaysAppointments.reduce((sum: number, apt: any) => {
        const price = (apt.final_price !== undefined && apt.final_price !== null) 
            ? Number(apt.final_price) 
            : (Number(apt.price) || 0);
        return sum + price;
    }, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-brand-primary/10 border-brand-primary/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">הכנסות החודש</p>
                            <h3 className="text-3xl font-serif text-brand-primary">₪{stats.revenue.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-brand-primary/20 rounded-full text-brand-primary"><DollarSign className="w-6 h-6" /></div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                        יעד: ₪{settings?.monthly_goals?.revenue?.toLocaleString() || 0} ({Math.round((stats.revenue / (settings?.monthly_goals?.revenue || 1)) * 100)}%)
                    </div>
                </Card>
                
                <Card className="bg-blue-500/10 border-blue-500/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">תורים החודש</p>
                            <h3 className="text-3xl font-serif text-blue-400">{stats.appointments}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-full text-blue-400"><Calendar className="w-6 h-6" /></div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                        יעד: {settings?.monthly_goals?.appointments || 0} ({Math.round((stats.appointments / (settings?.monthly_goals?.appointments || 1)) * 100)}%)
                    </div>
                </Card>

                <Card className="bg-amber-500/10 border-amber-500/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">בקשות ממתינות</p>
                            <h3 className="text-3xl font-serif text-amber-400">{stats.pending}</h3>
                        </div>
                        <div className="p-3 bg-amber-500/20 rounded-full text-amber-400"><Clock className="w-6 h-6" /></div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                        דורש טיפול מיידי
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif text-lg text-white">היום בסטודיו</h3>
                        <span className="text-xs text-slate-400">{today.toLocaleDateString('he-IL')}</span>
                    </div>
                    {todaysAppointments.length > 0 ? (
                        <div className="space-y-4">
                            {todaysAppointments.map((apt: any) => (
                                <div key={apt.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="text-center bg-brand-dark rounded-lg p-2 min-w-[50px]">
                                            <div className="text-brand-primary font-bold">{new Date(apt.start_time).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</div>
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{apt.client_name}</div>
                                            <div className="text-xs text-slate-500">{apt.service_name}</div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="text-xs" onClick={() => onViewAppointment(apt.id)}>פרטים</Button>
                                </div>
                            ))}
                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-sm">
                                <span className="text-slate-400">סה"כ צפוי להיום:</span>
                                <span className="text-white font-bold">₪{dailyRevenue}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-500">אין תורים מאושרים להיום</div>
                    )}
                </Card>

                <Card>
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif text-lg text-white">פעולות מהירות</h3>
                    </div>
                    <div className="space-y-3">
                        <Button className="w-full justify-start gap-3" variant="outline" onClick={() => onViewAppointment(null)}>
                            <Filter className="w-4 h-4" /> ניהול תורים מלא
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

const SettingsView = ({ settings, onUpdate }: { settings: StudioSettings | null, onUpdate: (s: StudioSettings) => Promise<void> }) => {
    const [localSettings, setLocalSettings] = useState<StudioSettings | null>(settings);
    
    useEffect(() => setLocalSettings(settings), [settings]);

    if (!localSettings) return <div>Loading...</div>;

    const handleSave = () => onUpdate(localSettings);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <SectionHeading title="פרטי סטודיו" />
                <div className="space-y-4">
                    <Input label="שם העסק" value={localSettings.studio_details.name} onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, name: e.target.value}})} />
                    <Input label="טלפון" value={localSettings.studio_details.phone} onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, phone: e.target.value}})} />
                    <Input label="כתובת" value={localSettings.studio_details.address} onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, address: e.target.value}})} />
                    <Input label="אימייל" value={localSettings.studio_details.email} onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, email: e.target.value}})} />
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 mt-4">
                        <span className="text-sm font-medium text-white">Enable AI Stylist</span>
                        <input 
                            type="checkbox" 
                            checked={localSettings.enable_ai ?? true} 
                            onChange={e => setLocalSettings({...localSettings, enable_ai: e.target.checked})} 
                            className="w-5 h-5 accent-brand-primary"
                        />
                    </div>
                </div>
                <Button className="w-full mt-6" onClick={handleSave}>שמור שינויים</Button>
            </Card>

            <Card>
                <SectionHeading title="שעות פעילות" />
                <div className="space-y-3">
                    {[0,1,2,3,4,5,6].map(day => {
                        const dayConfig = localSettings.working_hours[day.toString()];
                        const isOpen = dayConfig?.isOpen;
                        const range = dayConfig?.ranges[0] || { start: 10, end: 18 };
                        
                        return (
                            <div key={day} className="flex items-center gap-3 p-2 border-b border-white/5 last:border-0">
                                <div className="w-20 text-sm text-slate-400">
                                    {new Date(0, 0, day + 1).toLocaleDateString('he-IL', { weekday: 'long' })}
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={isOpen}
                                    onChange={e => {
                                        const newHours = {...localSettings.working_hours};
                                        newHours[day.toString()].isOpen = e.target.checked;
                                        setLocalSettings({...localSettings, working_hours: newHours});
                                    }}
                                    className="accent-brand-primary"
                                />
                                {isOpen ? (
                                    <div className="flex gap-2 items-center text-sm">
                                        <input 
                                            type="number" 
                                            value={range.start} 
                                            className="w-12 bg-transparent border-b border-white/20 text-center text-white"
                                            onChange={e => {
                                                const newHours = {...localSettings.working_hours};
                                                newHours[day.toString()].ranges[0].start = parseInt(e.target.value);
                                                setLocalSettings({...localSettings, working_hours: newHours});
                                            }}
                                        />
                                        <span>-</span>
                                        <input 
                                            type="number" 
                                            value={range.end} 
                                            className="w-12 bg-transparent border-b border-white/20 text-center text-white"
                                            onChange={e => {
                                                const newHours = {...localSettings.working_hours};
                                                newHours[day.toString()].ranges[0].end = parseInt(e.target.value);
                                                setLocalSettings({...localSettings, working_hours: newHours});
                                            }}
                                        />
                                    </div>
                                ) : <span className="text-xs text-slate-600">סגור</span>}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

const GalleryView = ({ gallery, onDelete, onUpload }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        setIsUploading(true);
        try {
            const url = await api.uploadImage(file, 'gallery-images');
            if(url) await onUpload(url);
        } catch(e) { console.error(e); }
        finally { setIsUploading(false); }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <SectionHeading title="ניהול גלריה" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} isLoading={isUploading}>
                    <Upload className="w-4 h-4 mr-2" /> העלאת תמונה
                </Button>
                <input type="file" hidden ref={fileInputRef} onChange={handleFile} accept="image/*" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gallery.map((item: any) => (
                    <div key={item.id} className="relative aspect-square group rounded-lg overflow-hidden border border-white/10">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => onDelete(item.id)} className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const CouponsView = ({ coupons, onUpdate }: { coupons: Coupon[], onUpdate: (c: Coupon[]) => Promise<void> }) => {
    const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({ code: '', value: 0, discountType: 'fixed', minOrderAmount: 0, isActive: true });

    const handleAdd = async () => {
        if (!newCoupon.code || !newCoupon.value) return;
        const coupon: Coupon = {
            id: Math.random().toString(36).substr(2, 9),
            code: newCoupon.code.toUpperCase(),
            value: Number(newCoupon.value),
            discountType: newCoupon.discountType as 'fixed' | 'percentage',
            minOrderAmount: Number(newCoupon.minOrderAmount) || 0,
            isActive: true,
            ...newCoupon
        } as Coupon;
        
        await onUpdate([...coupons, coupon]);
        setNewCoupon({ code: '', value: 0, discountType: 'fixed', minOrderAmount: 0, isActive: true });
    };

    const handleDelete = (id: string) => {
        onUpdate(coupons.filter(c => c.id !== id));
    };

    return (
        <div className="space-y-6">
             <Card>
                <h3 className="text-lg font-medium text-white mb-4">הוספת קופון חדש</h3>
                <div className="flex flex-wrap gap-4 items-end">
                    <Input label="קוד קופון" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} className="uppercase" />
                    <Input label="ערך הנחה" type="number" value={newCoupon.value} onChange={e => setNewCoupon({...newCoupon, value: Number(e.target.value)})} />
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-400">סוג</label>
                        <select 
                            value={newCoupon.discountType}
                            onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value as any})}
                            className="bg-brand-dark/50 border border-brand-border text-white px-4 py-3 rounded-xl outline-none"
                        >
                            <option value="fixed">שקלים (₪)</option>
                            <option value="percentage">אחוזים (%)</option>
                        </select>
                    </div>
                    <Input label="מינימום הזמנה" type="number" value={newCoupon.minOrderAmount} onChange={e => setNewCoupon({...newCoupon, minOrderAmount: Number(e.target.value)})} />
                    <Button onClick={handleAdd} className="mb-1"><Plus className="w-4 h-4 mr-2"/> הוסף</Button>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="bg-white/5 text-slate-400">
                        <tr>
                            <th className="p-4">קוד</th>
                            <th className="p-4">הנחה</th>
                            <th className="p-4">מינימום</th>
                            <th className="p-4">שימושים</th>
                            <th className="p-4">סטטוס</th>
                            <th className="p-4">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {coupons.map(coupon => (
                            <tr key={coupon.id} className="hover:bg-white/5">
                                <td className="p-4 font-mono font-bold text-brand-primary">{coupon.code}</td>
                                <td className="p-4">{coupon.value}{coupon.discountType === 'percentage' ? '%' : '₪'}</td>
                                <td className="p-4">₪{coupon.minOrderAmount}</td>
                                <td className="p-4">{coupon.usedCount || 0}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs ${coupon.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {coupon.isActive ? 'פעיל' : 'לא פעיל'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button onClick={() => handleDelete(coupon.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [stats, setStats] = useState({ revenue: 0, appointments: 0, pending: 0 });
  const [gallery, setGallery] = useState<any[]>([]);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  
  // Initialize
  useEffect(() => {
    const isLogged = localStorage.getItem('yuval_admin_auth') === 'true';
    if (isLogged) {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [appts, stngs, mStats, gall] = await Promise.all([
        api.getAppointments(),
        api.getSettings(),
        api.getMonthlyStats(),
        api.getGallery()
      ]);
      setAppointments(appts);
      setSettings(stngs);
      setStats(mStats);
      setGallery(gall);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1234' || password === 'admin') {
      localStorage.setItem('yuval_admin_auth', 'true');
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert('סיסמה שגויה');
    }
  };
  
  const handleLogout = () => {
      localStorage.removeItem('yuval_admin_auth');
      setIsAuthenticated(false);
  };

  const generatePdf = async (appt: Appointment) => {
     if(!appt.signature) return;
     
     const doc = new jsPDF();
     doc.addFont("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf", "Roboto", "normal");
     doc.setFont("Roboto");
     doc.setFontSize(20);
     doc.text(`Health Declaration - ${appt.client_name}`, 10, 20);
     doc.setFontSize(12);
     doc.text(`Date: ${new Date(appt.start_time).toLocaleDateString()}`, 10, 30);
     doc.text(`ID: ${appt.id}`, 10, 40);
     doc.text(`Service: ${appt.service_name}`, 10, 50);
     
     if (appt.signature) {
         doc.text('Signature:', 10, 70);
         doc.addImage(appt.signature, 'PNG', 10, 80, 50, 25);
     }
     
     doc.save(`declaration_${appt.client_name}.pdf`);
  };

  if (!isAuthenticated) {
     return (
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
             <Card className="w-full max-w-md p-8 bg-brand-surface border-white/10">
                 <div className="text-center mb-8">
                     <h1 className="text-3xl font-serif text-white mb-2">כניסת מנהל</h1>
                     <p className="text-slate-400">הזן סיסמה להמשך</p>
                 </div>
                 <form onSubmit={handleLogin} className="space-y-4">
                     <Input 
                        label="סיסמה" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        autoFocus
                     />
                     <Button type="submit" className="w-full">התחבר</Button>
                 </form>
             </Card>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-brand-dark pb-20">
       <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
             <h1 className="text-3xl font-serif text-white">לוח בקרה</h1>
             <Button variant="ghost" onClick={handleLogout} className="text-red-400 hover:text-red-300 gap-2">
                <LogOut className="w-4 h-4" /> התנתק
             </Button>
          </div>
          
          {/* Tabs Navigation (Horizontal on PC) */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/10">
             {[
                { id: 'dashboard', label: 'סקירה', icon: LayoutDashboard },
                { id: 'appointments', label: 'יומן תורים', icon: Calendar },
                { id: 'settings', label: 'הגדרות', icon: Settings },
                { id: 'gallery', label: 'גלריה', icon: ImageIcon },
                { id: 'coupons', label: 'קופונים', icon: Ticket },
             ].map(tab => (
                <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                      activeTab === tab.id 
                         ? 'bg-brand-primary text-brand-dark font-medium shadow-lg shadow-brand-primary/20' 
                         : 'text-slate-400 hover:bg-white/5 hover:text-white'
                   }`}
                >
                   <tab.icon className="w-4 h-4" />
                   {tab.label}
                </button>
             ))}
          </div>

          {/* Content Area */}
          <div className="min-h-[500px]">
              {isLoading ? (
                 <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
              ) : (
                 <>
                    {activeTab === 'dashboard' && (
                        <DashboardTab 
                           stats={stats} 
                           appointments={appointments} 
                           onViewAppointment={(id: string) => {
                               setActiveTab('appointments');
                               setFilterId(id);
                           }}
                           settings={settings}
                        />
                    )}
                    
                    {activeTab === 'appointments' && (
                        <AppointmentsList 
                            appointments={appointments}
                            onStatusUpdate={async (id: string, status: string) => {
                                await api.updateAppointmentStatus(id, status);
                                fetchData();
                            }}
                            onCancelRequest={async (appt: Appointment) => {
                                if(confirm('האם אתה בטוח שברצונך לבטל את התור?')) {
                                   await api.updateAppointmentStatus(appt.id, 'cancelled');
                                   fetchData();
                                }
                            }}
                            filterId={filterId}
                            onClearFilter={() => setFilterId(null)}
                            studioAddress={settings?.studio_details.address}
                            onDownloadPdf={generatePdf}
                            onSyncToCalendar={(appt: Appointment) => {
                                calendarService.syncAppointment(appt)
                                    .then(() => alert('סונכרן בהצלחה!'))
                                    .catch(e => alert('שגיאה בסנכרון: ' + e.message));
                            }}
                            onBulkSync={async (appts: Appointment[]) => {
                                if(!confirm(`האם לסנכרן ${appts.length} תורים?`)) return;
                                let success = 0;
                                for(const apt of appts) {
                                    try {
                                        await calendarService.syncAppointment(apt);
                                        success++;
                                    } catch(e) {}
                                }
                                alert(`סונכרנו ${success} מתוך ${appts.length} תורים.`);
                            }}
                            onViewVisualPlan={(apt: Appointment) => {
                                alert('צפייה בתוכנית ויזואלית טרם הוטמעה במלואה בממשק זה, אך הנתונים נשמרו.');
                            }}
                        />
                    )}

                    {activeTab === 'settings' && <SettingsView settings={settings} onUpdate={async (s) => { await api.updateSettings(s); fetchData(); }} />}
                    {activeTab === 'gallery' && <GalleryView gallery={gallery} onDelete={async (id: string) => { await api.deleteFromGallery(id); fetchData(); }} onUpload={async (url: string) => { await api.addToGallery(url); fetchData(); }} />}
                    {activeTab === 'coupons' && <CouponsView coupons={settings?.coupons || []} onUpdate={async (c: Coupon[]) => { 
                        if(settings) {
                           await api.updateSettings({ ...settings, coupons: c });
                           fetchData();
                        }
                    }} />}
                 </>
              )}
          </div>
       </div>
    </div>
  );
};

export default Admin;
