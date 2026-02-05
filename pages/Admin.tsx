
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
            finalPrice = apt.final_price !== undefined ? apt.final_price : calculatedBasePrice;
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
                                         <span className="font-bold text-emerald-400 text-sm">₪{finalPrice || apt.price || 0}</span>
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

const InventoryTab = ({ settings, onUpdate }: any) => {
    // Local state for items list, initialized from settings
    const [items, setItems] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', category: 'Ear', price: 0, image_url: '', in_stock: true });

    useEffect(() => {
        // Hydrate from settings or fallback to constant
        // @ts-ignore
        if (settings.inventory_items && Array.isArray(settings.inventory_items)) {
            // @ts-ignore
            setItems(settings.inventory_items);
        } else {
            // Initialize with default catalog if empty
            const initialCatalog = JEWELRY_CATALOG.map(item => ({...item, in_stock: true}));
            setItems(initialCatalog);
            // Save immediately to persist initial state
            onUpdate({ ...settings, inventory_items: initialCatalog }, true);
        }
    }, [settings]);

    const handleSaveItem = () => {
        let newItems;
        if (editingItem) {
            newItems = items.map(i => i.id === editingItem.id ? { ...i, ...formData } : i);
        } else {
            const newItem = {
                id: `custom_${Math.random().toString(36).substr(2, 9)}`,
                ...formData
            };
            newItems = [...items, newItem];
        }
        
        setItems(newItems);
        // Persist to settings
        onUpdate({ ...settings, inventory_items: newItems }, true);
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ name: '', category: 'Ear', price: 0, image_url: '', in_stock: true });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('האם למחוק פריט זה?')) {
            const newItems = items.filter(i => i.id !== id);
            setItems(newItems);
            onUpdate({ ...settings, inventory_items: newItems }, true);
        }
    };

    const toggleStock = (id: string) => {
        const newItems = items.map(i => i.id === id ? { ...i, in_stock: !i.in_stock } : i);
        setItems(newItems);
        onUpdate({ ...settings, inventory_items: newItems }, true);
    };

    const openModal = (item?: any) => {
        if (item) {
            setEditingItem(item);
            setFormData(item);
        } else {
            setEditingItem(null);
            setFormData({ name: '', category: 'Ear', price: 0, image_url: '', in_stock: true });
        }
        setIsModalOpen(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-serif text-white">ניהול מלאי תכשיטים</h3>
                    <p className="text-sm text-slate-400">פריטים שאינם במלאי לא יוצגו בהמלצות ה-AI ובגלריה</p>
                </div>
                <Button onClick={() => openModal()} className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4"/> פריט חדש</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item) => {
                    const inStock = item.in_stock !== false; 
                    return (
                        <div key={item.id} className={`relative group p-4 rounded-xl border transition-all flex items-center gap-4 ${inStock ? 'bg-brand-surface/30 border-white/5' : 'bg-red-500/5 border-red-500/20 opacity-75'}`}>
                            
                            {/* Action Buttons Overlay */}
                            <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={() => openModal(item)} className="p-1.5 bg-brand-surface rounded-full text-brand-primary hover:bg-brand-primary hover:text-brand-dark border border-white/10"><Edit2 className="w-3 h-3"/></button>
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-brand-surface rounded-full text-red-400 hover:bg-red-500 hover:text-white border border-white/10"><Trash2 className="w-3 h-3"/></button>
                            </div>

                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-black shrink-0 relative">
                                <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover ${!inStock ? 'grayscale' : ''}`} />
                                {!inStock && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                        <X className="w-6 h-6 text-red-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-white truncate">{item.name}</h4>
                                <p className="text-xs text-slate-500 mb-2">{item.category}</p>
                                <div className="flex items-center justify-between mt-2">
								<div className="flex items-center gap-2">
									<span className="text-brand-primary text-xs font-bold">₪{item.price}</span>
									<div className="flex gap-1 ml-2 border-l border-white/10 pl-2">
										<button 
											onClick={() => openModal(item)}
											className="p-1 text-slate-400 hover:text-white transition-colors"
											title="ערוך תכשיט"
										>
											<Edit2 className="w-3.5 h-3.5" />
										</button>
										<button 
											onClick={() => handleDelete(item.id)}
											className="p-1 text-slate-400 hover:text-red-400 transition-colors"
											title="מחק תכשיט"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
								
								<label className="relative inline-flex items-center cursor-pointer" title="In Stock Toggle">
									<input 
										type="checkbox" 
										className="sr-only peer" 
										checked={inStock} 
										onChange={() => toggleStock(item.id)} 
									/>
									<div className={`w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${inStock ? 'peer-checked:bg-emerald-500' : 'peer-checked:bg-slate-700'}`}></div>
								</label>
							</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'עריכת פריט' : 'פריט חדש'}>
                <div className="space-y-4">
                    <Input label="שם הפריט" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="מחיר (₪)" type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                        <div>
                            <label className="text-sm font-medium text-slate-400 block mb-2">קטגוריה</label>
                            <select 
                                className="w-full bg-brand-dark/50 border border-brand-border text-white px-4 py-3 rounded-xl outline-none"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                <option value="Ear">Ear</option>
                                <option value="Face">Face</option>
                                <option value="Body">Body</option>
                            </select>
                        </div>
                    </div>
                    <Input label="תמונה (URL)" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." />
                    
                    <div className="flex items-center gap-3 pt-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={formData.in_stock} 
                                onChange={() => setFormData({...formData, in_stock: !formData.in_stock})} 
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                        <span className="text-sm text-slate-400">זמין במלאי</span>
                    </div>

                    <Button onClick={handleSaveItem} className="w-full mt-4">שמור</Button>
                </div>
            </Modal>
        </div>
    );
};

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

const SettingsTab = ({ settings, onUpdate }: any) => {
    const [localSettings, setLocalSettings] = useState<StudioSettings>(settings);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

    const handleClearAppointments = async () => {
        try {
            await api.clearAppointments();
            alert('כל הפגישות נמחקו בהצלחה');
            window.location.reload(); // Refresh to update view
        } catch (error) {
            console.error(error);
            alert('אירעה שגיאה במחיקת הפגישות');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Card>
                <SectionHeading title="הגדרות מערכת" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                            <Wand2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-white font-medium">AI Ear Stylist</h4>
                            <p className="text-sm text-slate-400">אפשר ללקוחות להשתמש בסטייליסט הווירטואלי בעת קביעת תור</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={localSettings.enable_ai !== false} // Default to true if undefined
                            onChange={() => {
                                const newValue = !(localSettings.enable_ai !== false);
                                const newSettings = {...localSettings, enable_ai: newValue};
                                setLocalSettings(newSettings);
                                onUpdate(newSettings, true);
                            }} 
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                </div>
            </Card>

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

            <Card className="border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <h3 className="text-lg font-medium text-red-400">אזור מסוכן</h3>
                </div>
                <p className="text-sm text-slate-400 mb-6">פעולות אלו הן בלתי הפיכות. אנא היזהר.</p>
                <Button 
                    variant="danger" 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full sm:w-auto"
                >
                    מחק את כל הפגישות
                </Button>
            </Card>

            <ConfirmationModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                onConfirm={handleClearAppointments}
                title="מחיקת כל הפגישות"
                description="האם אתה בטוח שברצונך למחוק את כל הפגישות מהמערכת? פעולה זו אינה הפיכה."
                confirmText="כן, מחק הכל"
                variant="danger"
            />
        </div>
    );
};

// --- MAIN ADMIN COMPONENT ---
const Admin: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState('appointments');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [settings, setSettings] = useState<StudioSettings | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
    const [selectedAptId, setSelectedAptId] = useState<string | null>(null); // For highlighting/scrolling

    // State for Visual Plan Modal
    const [visualPlanModal, setVisualPlanModal] = useState<{ isOpen: boolean, apt: Appointment | null }>({ isOpen: false, apt: null });
    const [parsedVisualPlan, setParsedVisualPlan] = useState<any>(null);

    useEffect(() => {
        const storedAuth = sessionStorage.getItem('admin_auth');
        if (storedAuth === 'true') {
            setIsAuthenticated(true);
            loadData();
        }
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [apts, sets, svcs] = await Promise.all([
                api.getAppointments(),
                api.getSettings(),
                api.getServices()
            ]);
            setAppointments(apts);
            setSettings(sets);
            setServices(svcs);
        } catch (e) {
            console.error(e);
            showToast('שגיאה בטעינת נתונים', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === '123456') {
            setIsAuthenticated(true);
            sessionStorage.setItem('admin_auth', 'true');
            loadData();
        } else {
            showToast('סיסמה שגויה', 'error');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_auth');
        setAppointments([]);
        setSettings(null);
    };

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    const handleStatusUpdate = async (id: string, newStatus: 'confirmed' | 'cancelled') => {
        const success = await api.updateAppointmentStatus(id, newStatus);
        if (success) {
            setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status: newStatus } : apt));
            showToast('סטטוס עודכן בהצלחה');
        } else {
            showToast('שגיאה בעדכון סטטוס', 'error');
        }
    };

    const handleCancelRequest = async (apt: Appointment) => {
        const reason = window.prompt('סיבת ביטול (אופציונלי):');
        if (reason !== null) {
            const updatedNotes = (apt.notes || '') + `\nסיבת ביטול: ${reason}`;
            const successUpdate = await api.updateAppointment(apt.id, { notes: updatedNotes });
            if(successUpdate) {
                await handleStatusUpdate(apt.id, 'cancelled');
            }
        }
    };

    const handleSettingsUpdate = async (newSettings: StudioSettings, silent = false) => {
        const success = await api.updateSettings(newSettings);
        if (success) {
            setSettings(newSettings);
            if (!silent) showToast('הגדרות נשמרו בהצלחה');
        } else {
            if (!silent) showToast('שגיאה בשמירת הגדרות', 'error');
        }
    };

    const downloadHealthDeclaration = async (apt: Appointment) => {
        if (!apt.signature) return;
        
        try {
            // Create a temporary container for PDF generation
            const element = document.createElement('div');
            element.style.padding = '40px';
            element.style.background = 'white';
            element.style.color = 'black';
            element.style.width = '595px'; // A4 width at 72dpi roughly
            element.style.fontFamily = 'Arial, sans-serif';
            element.dir = 'rtl';
            
            element.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="font-size: 24px; margin-bottom: 10px;">הצהרת בריאות - Yuval Studio</h1>
                    <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
                </div>
                
                <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
                    <h3 style="font-size: 18px; margin-bottom: 10px;">פרטי הלקוח</h3>
                    <p><strong>שם מלא:</strong> ${apt.client_name}</p>
                    <p><strong>ת.ז:</strong> ${apt.notes?.match(/ת.ז: (\d+)/)?.[1] || '---'}</p>
                    <p><strong>טלפון:</strong> ${apt.client_phone}</p>
                    <p><strong>טיפול:</strong> ${apt.service_name}</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 18px; margin-bottom: 10px;">הצהרה רפואית</h3>
                    <ul style="line-height: 1.6;">
                        <li>אני מצהיר/ה כי אני מעל גיל 16 או מלווה באישור הורה.</li>
                        <li>איני סובל/ת ממחלות דם, סוכרת לא מאוזנת או מחלות זיהומיות.</li>
                        <li>איני נוטל/ת תרופות מדללות דם.</li>
                        <li>איני בהריון או מניקה (רלוונטי לפירסינג בטבור/פטמה).</li>
                        <li>ידוע לי כי טיפול בפירסינג דורש החלמה והיגיינה קפדנית.</li>
                    </ul>
                </div>

                <div style="margin-top: 40px;">
                    <p><strong>חתימת הלקוח:</strong></p>
                    <img src="${apt.signature}" style="max-width: 200px; border-bottom: 1px solid black;" />
                </div>
            `;
            
            document.body.appendChild(element);
            
            const canvas = await html2canvas(element);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297); // A4 dimensions
            pdf.save(`health-declaration-${apt.client_name.replace(/\s+/g, '-')}.pdf`);
            
            document.body.removeChild(element);
            showToast('הקובץ הורד בהצלחה');
        } catch (e) {
            console.error(e);
            showToast('שגיאה ביצירת PDF', 'error');
        }
    };

    const handleSyncToCalendar = async (apt: Appointment) => {
        try {
            await calendarService.syncAppointment(apt);
            showToast('סונכרן ליומן בהצלחה');
        } catch (error: any) {
            showToast(`שגיאה בסנכרון: ${error.message}`, 'error');
        }
    };

    const handleBulkSync = async (apts: Appointment[]) => {
        let successCount = 0;
        let failCount = 0;
        
        showToast('מתחיל סנכרון המוני...', 'success');
        
        for (const apt of apts) {
            // Only sync confirmed and future appointments
            if (apt.status === 'confirmed' && new Date(apt.start_time) > new Date()) {
                try {
                    await calendarService.syncAppointment(apt);
                    successCount++;
                } catch (e) {
                    failCount++;
                }
            }
        }
        showToast(`סנכרון הסתיים: ${successCount} הצליחו, ${failCount} נכשלו`, successCount > 0 ? 'success' : 'error');
    };

    // --- Visual Plan Handlers ---
    const handleViewVisualPlan = (apt: Appointment) => {
        if (!apt.ai_recommendation_text && !apt.visual_plan) {
            showToast("לא קיימת תוכנית ויזואלית לתור זה", 'error');
            return;
        }

        try {
            const rawJson = apt.visual_plan || apt.ai_recommendation_text;
            const plan = JSON.parse(rawJson!);
            setParsedVisualPlan(plan);
            setVisualPlanModal({ isOpen: true, apt });
        } catch (e) {
            console.error("Failed to parse visual plan JSON", e);
            showToast("שגיאה בטעינת התוכנית הויזואלית", 'error');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-brand-dark">
                <m.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <Card className="p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-serif text-white mb-2">כניסת מנהל</h1>
                            <p className="text-slate-400">אנא הזן סיסמה להמשך</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <Input 
                                label="סיסמה" 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                autoFocus
                            />
                            <Button type="submit" className="w-full">התחבר</Button>
                        </form>
                    </Card>
                </m.div>
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark pb-20 pt-20">
            <div className="container mx-auto px-4 md:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-serif text-white">לוח בקרה</h1>
                        <p className="text-slate-400">ניהול תורים, מלאי והגדרות סטודיו</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-surface border border-white/10 px-4 py-2 rounded-lg text-sm text-slate-300">
                             סה"כ תורים החודש: <span className="text-brand-primary font-bold">{appointments.filter(a => new Date(a.start_time).getMonth() === new Date().getMonth()).length}</span>
                        </div>
                        <Button variant="ghost" onClick={handleLogout} className="gap-2">
                            <LogOut className="w-4 h-4" /> יציאה
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/5">
                    {[
                        { id: 'appointments', label: 'יומן תורים', icon: Calendar },
                        { id: 'inventory', label: 'מלאי תכשיטים', icon: Box },
                        { id: 'coupons', label: 'קופונים', icon: Ticket },
                        { id: 'settings', label: 'הגדרות', icon: Settings },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                    ? 'bg-brand-primary text-brand-dark font-medium shadow-lg shadow-brand-primary/20' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="min-h-[500px]">
                    {isLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <m.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'appointments' && (
                                    <AppointmentsList 
                                        appointments={appointments} 
                                        onStatusUpdate={handleStatusUpdate}
                                        onCancelRequest={handleCancelRequest}
                                        filterId={selectedAptId}
                                        onClearFilter={() => setSelectedAptId(null)}
                                        studioAddress={settings?.studio_details.address}
                                        onDownloadPdf={downloadHealthDeclaration}
                                        allServices={services}
                                        onSyncToCalendar={handleSyncToCalendar}
                                        onBulkSync={handleBulkSync}
                                        onViewVisualPlan={handleViewVisualPlan}
                                    />
                                )}
                                {activeTab === 'inventory' && settings && (
                                    <InventoryTab settings={settings} onUpdate={handleSettingsUpdate} />
                                )}
                                {activeTab === 'coupons' && settings && (
                                    <CouponsTab settings={settings} onUpdate={handleSettingsUpdate} />
                                )}
                                {activeTab === 'settings' && settings && (
                                    <SettingsTab settings={settings} onUpdate={handleSettingsUpdate} />
                                )}
                            </m.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>
            
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>

            {/* Visual Plan Modal */}
            <Modal
                isOpen={visualPlanModal.isOpen}
                onClose={() => setVisualPlanModal({ isOpen: false, apt: null })}
                title={`תוכנית ויזואלית - ${visualPlanModal.apt?.client_name}`}
            >
                {parsedVisualPlan && (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black border border-white/10 mx-auto max-w-sm">
                            <img 
                                src={parsedVisualPlan.original_image} 
                                alt="Original Ear" 
                                className="w-full h-full object-cover opacity-80" 
                            />
                            {/* Overlay Recommendations */}
                            {parsedVisualPlan.recommendations?.map((rec: any, idx: number) => {
                                // Find jewelry image from catalog
                                const jewelry = JEWELRY_CATALOG.find(j => j.id === rec.jewelry_id);
                                return (
                                    <div 
                                        key={idx}
                                        style={{ left: `${rec.x}%`, top: `${rec.y}%` }}
                                        className="absolute w-0 h-0 flex items-center justify-center"
                                    >
                                        <div className="w-8 h-8 rounded-full border-2 border-brand-primary bg-black/50 overflow-hidden -translate-x-1/2 -translate-y-1/2 shadow-lg">
                                            {jewelry ? (
                                                <img src={jewelry.image_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-brand-primary" />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        <div className="bg-brand-dark/50 p-4 rounded-xl border border-white/10">
                            <h4 className="text-brand-primary font-bold mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> פירוט המלצות
                            </h4>
                            <ul className="space-y-2 text-sm text-slate-300">
                                {parsedVisualPlan.recommendations?.map((rec: any, i: number) => {
                                    const jewelry = JEWELRY_CATALOG.find(j => j.id === rec.jewelry_id);
                                    return (
                                        <li key={i} className="flex justify-between border-b border-white/5 pb-1 last:border-0">
                                            <span>{jewelry?.name || rec.jewelry_id} ({rec.location})</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="bg-brand-dark/50 p-4 rounded-xl border border-white/10">
                             <h4 className="text-white font-bold mb-2 text-sm">פריטים שנבחרו ע"י הלקוח</h4>
                             <div className="flex flex-wrap gap-2">
                                 {parsedVisualPlan.selected_items?.length > 0 ? (
                                     parsedVisualPlan.selected_items.map((id: string, i: number) => {
                                         const j = JEWELRY_CATALOG.find(item => item.id === id);
                                         return (
                                             <span key={i} className="px-2 py-1 bg-brand-primary/10 text-brand-primary rounded border border-brand-primary/20 text-xs">
                                                 {j?.name || id}
                                             </span>
                                         );
                                     })
                                 ) : (
                                     <span className="text-slate-500 text-xs">לא נבחרו פריטים</span>
                                 )}
                             </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Admin;
