import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Calendar, Settings, Image as ImageIcon, Ticket,
    Search, Filter, X, Check, Trash2, Edit2, Plus, LogOut, Save,
    ChevronRight, ChevronLeft, Loader2, Clock, Activity, DollarSign,
    Users, Info, ArrowUpDown, Send, FileText, Tag, Lock, CalendarPlus, RefreshCw, AlertCircle, CheckCircle2, Wand2, Sparkles, Box, AlertTriangle, Upload, TrendingUp, BrainCircuit
} from 'lucide-react';
import { api } from '../services/mockApi';
import { Appointment, Service, StudioSettings, Coupon } from '../types';
import { Button, Card, Input, Modal, ConfirmationModal, SectionHeading } from '../components/ui';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
import { DEFAULT_STUDIO_DETAILS, JEWELRY_CATALOG, DEFAULT_WORKING_HOURS } from '../constants';
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
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border ${type === 'success'
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



// --- Services Tab ---
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
                <Button onClick={() => openModal()} className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> הוסף שירות</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service: Service) => (
                    <Card key={service.id} className="relative group hover:border-brand-primary/30 transition-all">
                        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={() => openModal(service)} className="p-2 bg-brand-surface rounded-full text-brand-primary hover:bg-brand-primary hover:text-brand-dark"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => onDeleteService(service.id)} className="p-2 bg-brand-surface rounded-full text-red-400 hover:bg-red-500 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="h-40 bg-brand-dark/50 rounded-lg mb-4 overflow-hidden">
                            <img src={service.image_url} alt={service.name} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" />
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
                    <Input label="שם השירות" value={formData.name || ''} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} />
                    <Input label="תיאור" value={formData.description || ''} onChange={(e: any) => setFormData({ ...formData, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="מחיר (₪)" type="number" value={formData.price || ''} onChange={(e: any) => setFormData({ ...formData, price: Number(e.target.value) })} />
                        <Input label="משך (דקות)" type="number" value={formData.duration_minutes || ''} onChange={(e: any) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-400 block mb-2">קטגוריה</label>
                            <select
                                className="w-full bg-brand-dark/50 border border-brand-border text-white px-4 py-3 rounded-xl outline-none"
                                value={formData.category}
                                onChange={(e: any) => setFormData({ ...formData, category: e.target.value as any })}
                            >
                                <option value="Ear">אוזן</option>
                                <option value="Face">פנים</option>
                                <option value="Body">גוף</option>
                                <option value="Jewelry">תכשיט</option>
                            </select>
                        </div>
                        <Input label="תמונה (URL)" value={formData.image_url || ''} onChange={(e: any) => setFormData({ ...formData, image_url: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-400 block mb-2">רמת כאב ({formData.pain_level})</label>
                        <input
                            type="range" min="1" max="10"
                            className="w-full accent-brand-primary"
                            value={formData.pain_level}
                            onChange={e => setFormData({ ...formData, pain_level: Number(e.target.value) })}
                        />
                    </div>
                    <Button onClick={handleSubmit} className="w-full mt-4">שמור</Button>
                </div>
            </Modal>
        </div>
    );
};

// --- Settings Tab ---
const SettingsTab = ({ settings, onUpdate }: any) => {
    const [localSettings, setLocalSettings] = useState<StudioSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { setLocalSettings(settings); }, [settings]);

    const updateField = (field: keyof StudioSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
    };

    const updateNestedField = (parent: keyof StudioSettings, field: string, value: any) => {
        setLocalSettings((prev: any) => ({
            ...prev,
            [parent]: { ...prev[parent], [field]: value }
        }));
    };

    const saveChanges = async () => {
        setIsSaving(true);
        await onUpdate('all', localSettings);
        setIsSaving(false);
    };

    if (!localSettings) return <div>Loading settings...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-brand-primary" />
                    הגדרות כלליות
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="שם העסק" value={localSettings.studio_details.name} onChange={(e: any) => updateNestedField('studio_details', 'name', e.target.value)} />
                    <Input label="טלפון" value={localSettings.studio_details.phone} onChange={(e: any) => updateNestedField('studio_details', 'phone', e.target.value)} />
                    <Input label="כתובת" value={localSettings.studio_details.address} onChange={(e: any) => updateNestedField('studio_details', 'address', e.target.value)} />
                    <Input label="אימייל" value={localSettings.studio_details.email} onChange={(e: any) => updateNestedField('studio_details', 'email', e.target.value)} />
                </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-primary" />
                    יעדים חודשיים
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="יעד הכנסות (₪)" type="number" value={localSettings.monthly_goals.revenue} onChange={(e: any) => updateNestedField('monthly_goals', 'revenue', Number(e.target.value))} />
                    <Input label="יעד תורים" type="number" value={localSettings.monthly_goals.appointments} onChange={(e: any) => updateNestedField('monthly_goals', 'appointments', Number(e.target.value))} />
                </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-brand-primary" />
                    תוויות גלריה (תגיות)
                </h2>
                {/* Placeholder for Gallery Tags management - simplified for now */}
                <p className="text-sm text-slate-400">ניהול תגיות מתבצע בעמוד העלאת התמונות.</p>
            </div>

            {/* AI Settings Block */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-primary" />
                    הגדרות AI וטכנולוגיה
                </h2>

                <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold">AI Stylist</h3>
                            <p className="text-xs text-slate-400">אפשר למשתמשים לקבל המלצות AI מותאמות אישית</p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={localSettings?.enable_ai ?? true}
                            onChange={(e) => updateField('enable_ai', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[calc(100%-2px)] after:translate-x-full peer-checked:after:translate-x-0 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                {/* Gallery Settings */}
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 mt-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold">Story Gallery</h3>
                            <p className="text-xs text-slate-400">הצג גלריית השראה בסגנון סטורי ללקוחות</p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={localSettings?.enable_gallery ?? true}
                            onChange={(e) => updateField('enable_gallery', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[calc(100%-2px)] after:translate-x-full peer-checked:after:translate-x-0 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                </div>
            </div>

            <Button onClick={saveChanges} disabled={isSaving} className="w-full md:w-auto">
                {isSaving ? 'שומר...' : 'שמור שינויים'}
            </Button>
        </div>
    );
};

// --- AI Stylist Tab ---
const AiStylistTab = () => {
    return (
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center py-20">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
                <BrainCircuit className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">AI Stylist Dashboard</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
                ניתוח ביצועי ה-AI, סטטיסטיקות שימוש והמלצות לשיפור.
                פיצ'ר זה נמצא בפיתוח.
            </p>
            <Button className="bg-white/10 hover:bg-white/20">צפה בדמו</Button>
        </div>
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
    const time = new Date(apt.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
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
    const rowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});
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
        const servicesList: any[] = [];
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
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="bg-brand-dark/50 border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-brand-primary/50 w-full min-w-0"
                            />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs text-slate-400">עד תאריך</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
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
                                } catch (e) { }
                            } else if (apt.ai_recommendation_text) {
                                try {
                                    const vp = typeof apt.ai_recommendation_text === 'string' ? JSON.parse(apt.ai_recommendation_text) : apt.ai_recommendation_text;
                                    if (vp.original_image) imageUrl = vp.original_image;
                                } catch (e) { }
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
                                        <div className="text-xs">{new Date(apt.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
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
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${apt.status === 'confirmed'
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
                                                    className={`p-2 transition-colors ${!hasVisualPlan ? 'rounded-r-lg' : ''} border-l border-white/5 ${apt.status === 'confirmed'
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
                                                    className={`p-2 transition-colors rounded-l-lg border-l border-white/5 ${apt.signature
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
        if (settings.inventory_items && Array.isArray(settings.inventory_items)) {
            setItems(settings.inventory_items);
        } else {
            // Initialize with default catalog if empty
            const initialCatalog = JEWELRY_CATALOG.map(item => ({ ...item, in_stock: true }));
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
                <Button onClick={() => openModal()} className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> פריט חדש</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item) => {
                    const inStock = item.in_stock !== false;
                    return (
                        <div key={item.id} className={`relative group p-4 rounded-xl border transition-all flex items-center gap-4 ${inStock ? 'bg-brand-surface/30 border-white/5' : 'bg-red-500/5 border-red-500/20 opacity-75'}`}>

                            {/* Action Buttons Overlay */}
                            <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={() => openModal(item)} className="p-1.5 bg-brand-surface rounded-full text-brand-primary hover:bg-brand-primary hover:text-brand-dark border border-white/10"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-brand-surface rounded-full text-red-400 hover:bg-red-500 hover:text-white border border-white/10"><Trash2 className="w-3 h-3" /></button>
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

                                    <label className="relative inline-flex items-center cursor-pointer">
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
                        </div >
                    );
                })}
            </div >

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'עריכת פריט' : 'פריט חדש'}>
                <div className="space-y-4">
                    <Input label="שם הפריט" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="מחיר (₪)" type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                        <div>
                            <label className="text-sm font-medium text-slate-400 block mb-2">קטגוריה</label>
                            <select
                                className="w-full bg-brand-dark/50 border border-brand-border text-white px-4 py-3 rounded-xl outline-none"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="Ear">Ear</option>
                                <option value="Face">Face</option>
                                <option value="Body">Body</option>
                            </select>
                        </div>
                    </div>
                    <Input label="תמונה (URL)" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />

                    <div className="flex items-center gap-3 pt-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={formData.in_stock}
                                onChange={() => setFormData({ ...formData, in_stock: !formData.in_stock })}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                        <span className="text-sm text-slate-400">זמין במלאי</span>
                    </div>

                    <Button onClick={handleSaveItem} className="w-full mt-4">שמור</Button>
                </div>
            </Modal>
        </div >
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
        if (deleteId) {
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
                <Button onClick={addCoupon} className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> הוסף קופון</Button>
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

const DashboardTab = ({ stats, appointments, onViewAppointment, settings, onUpdateSettings, services, onSyncToCalendar, onViewVisualPlan }: any) => {
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
                    onStatusUpdate={() => { }}
                    onCancelRequest={() => { }}
                    filterId={null}
                    onClearFilter={() => { }}
                    studioAddress={settings.studio_details.address}
                    onDownloadPdf={() => { }}
                    allServices={services}
                    onSyncToCalendar={onSyncToCalendar}
                    onViewVisualPlan={onViewVisualPlan}
                />
            </div>
        </div>
    );
};

const CalendarTab = ({ appointments, onStatusUpdate, onCancelRequest, studioAddress, onDownloadPdf, services, onSyncToCalendar, onViewVisualPlan }: any) => {
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
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white/5 rounded-full"><ChevronRight /></button>
                    <h2 className="text-xl font-serif text-white">{currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white/5 rounded-full"><ChevronLeft /></button>
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
                        onClearFilter={() => { }}
                        studioAddress={studioAddress}
                        onDownloadPdf={onDownloadPdf}
                        showFilters={false}
                        allServices={services}
                        onSyncToCalendar={onSyncToCalendar}
                        onViewVisualPlan={onViewVisualPlan}
                    />
                </div>
            </div>
        </div>
    );
};


const Admin = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [settings, setSettings] = useState<StudioSettings>({
        studio_details: DEFAULT_STUDIO_DETAILS,
        working_hours: DEFAULT_WORKING_HOURS,
        monthly_goals: { revenue: 50000, appointments: 150 },
        enable_ai: true,
        enable_gallery: true,
        inventory_items: [],
        coupons: []
    });
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewVisualPlan, setViewVisualPlan] = useState<any>(null);

    // Mock initial data load
    useEffect(() => {
        const loadData = async () => {
            try {
                // In a real app, these would come from an API
                const fetchedServices = await api.getServices();
                const fetchedAppointments = await api.getAppointments();
                setServices(fetchedServices);
                setAppointments(fetchedAppointments);

                // Load settings if available (mock)
            } catch (error) {
                console.error("Failed to load admin data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Computed Stats
    const stats = useMemo(() => {
        const revenue = appointments
            .filter(a => a.status === 'confirmed')
            .reduce((sum, a) => sum + (a.final_price || a.price || 0), 0);

        const count = appointments.filter(a => new Date(a.start_time).getMonth() === new Date().getMonth()).length;
        const pending = appointments.filter(a => a.status === 'pending').length;

        return { revenue, appointments: count, pending };
    }, [appointments]);

    // Handlers
    const handleUpdateSettings = (key: string | 'all', value: any) => {
        if (key === 'all') {
            setSettings(value);
        } else {
            setSettings(prev => ({ ...prev, [key]: value }));
        }
        // Save to backend logic here...
    };

    const handleServiceAdd = async (service: Partial<Service>) => {
        const newService = { ...service, id: Math.random().toString(36).substr(2, 9) } as Service;
        setServices([...services, newService]);
        // API call...
    };

    const handleServiceUpdate = async (id: string, updates: Partial<Service>) => {
        setServices(services.map(s => s.id === id ? { ...s, ...updates } : s));
        // API call...
    };

    const handleServiceDelete = async (id: string) => {
        if (window.confirm('Are you sure?')) {
            setServices(services.filter(s => s.id !== id));
            // API call...
        }
    };

    const handleStatusUpdate = (id: string, status: 'confirmed' | 'cancelled' | 'pending') => {
        setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
        // API call...
    };

    const handleCancelRequest = (apt: Appointment) => {
        if (window.confirm('Cancel appointment?')) {
            handleStatusUpdate(apt.id, 'cancelled');
        }
    };

    const handleSyncCalendar = async (apt: Appointment) => {
        try {
            await calendarService.syncAppointment(apt);
            alert('Synced to calendar!');
        } catch (e) {
            console.error(e);
            alert('Failed to sync');
        }
    };

    const handleDownloadPdf = (apt: Appointment) => {
        // PDF generation logic
        alert('Downloading PDF...');
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-brand-dark text-brand-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;

    const tabs = [
        { id: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
        { id: 'calendar', label: 'יומן', icon: Calendar },
        { id: 'services', label: 'שירותי� ', icon: Tag },
        { id: 'inventory', label: 'מל� י', icon: Box },
        { id: 'coupons', label: 'קופוני� ', icon: Ticket },
        { id: 'settings', label: 'הגדרות', icon: Settings },
        { id: 'ai-stylist', label: 'AI Stylist', icon: Sparkles },
    ];

    return (
        <div className="min-h-screen bg-brand-dark text-slate-200 font-sans selection:bg-brand-primary/30 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-brand-surface border-r border-white/5 flex flex-col hidden lg:flex">
                <div className="p-6">
                    <h1 className="text-2xl font-serif font-bold text-white">Yuval<span className="text-brand-primary">Studio</span></h1>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Admin Portal</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-brand-primary text-brand-dark font-bold shadow-lg shadow-brand-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                        <LogOut className="w-5 h-5" />
                        התנתק
                    </button>
                </div>
            </aside>

            {/* Mobile Nav Overlay */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand-surface border-t border-white/10 z-50 px-4 py-2 flex justify-between overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg ${activeTab === tab.id ? 'text-brand-primary' : 'text-slate-500'}`}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span className="text-[10px]">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-screen p-4 lg:p-8 pb-24 lg:pb-8">
                <header className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white">{tabs.find(t => t.id === activeTab)?.label}</h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-white">Admin User</div>
                            <div className="text-xs text-slate-500">Master Access</div>
                        </div>
                        <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-brand-dark font-bold">A</div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto">
                    {activeTab === 'dashboard' && (
                        <DashboardTab
                            stats={stats}
                            appointments={appointments}
                            settings={settings}
                            services={services}
                            onViewAppointment={() => { }}
                            onUpdateSettings={handleUpdateSettings}
                            onSyncToCalendar={handleSyncCalendar}
                            onViewVisualPlan={setViewVisualPlan}
                        />
                    )}
                    {activeTab === 'calendar' && (
                        <CalendarTab
                            appointments={appointments}
                            onStatusUpdate={handleStatusUpdate}
                            onCancelRequest={handleCancelRequest}
                            studioAddress={settings.studio_details.address}
                            onDownloadPdf={handleDownloadPdf}
                            services={services}
                            onSyncToCalendar={handleSyncCalendar}
                            onViewVisualPlan={setViewVisualPlan}
                        />
                    )}
                    {activeTab === 'services' && (
                        <ServicesTab
                            services={services}
                            onAddService={handleServiceAdd}
                            onUpdateService={handleServiceUpdate}
                            onDeleteService={handleServiceDelete}
                        />
                    )}
                    {activeTab === 'inventory' && (
                        <InventoryTab
                            settings={settings}
                            onUpdate={handleUpdateSettings}
                        />
                    )}
                    {activeTab === 'coupons' && (
                        <CouponsTab
                            settings={settings}
                            onUpdate={handleUpdateSettings}
                        />
                    )}
                    {activeTab === 'settings' && (
                        <SettingsTab
                            settings={settings}
                            onUpdate={handleUpdateSettings}
                        />
                    )}
                    {activeTab === 'ai-stylist' && <AiStylistTab />}
                </div>
            </main>

            {/* Visual Plan Modal */}
            <Modal isOpen={!!viewVisualPlan} onClose={() => setViewVisualPlan(null)} title="AI Visual Plan">
                {viewVisualPlan && (
                    <div className="space-y-4">
                        {/* Content for visual plan viewer */}
                        <p>Visual plan details for {viewVisualPlan.client_name}</p>
                        <pre className="bg-black/30 p-4 rounded text-xs overflow-auto">{JSON.stringify(viewVisualPlan, null, 2)}</pre>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Admin;
