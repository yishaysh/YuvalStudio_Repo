
import React, { useEffect, useState, useRef } from 'react';
import { api, JewelryLibraryItem } from '../services/mockApi';
import { Card, Button, Input, ConfirmationModal, Modal, SectionHeading } from '../components/ui';
import { Appointment, Service, StudioSettings, Coupon } from '../types';
import { DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS, DEFAULT_MONTHLY_GOALS } from '../constants';
import { 
  Activity, Calendar as CalendarIcon, DollarSign, 
  Lock, Check, X, Clock, Plus, 
  Trash2, Image as ImageIcon, Settings as SettingsIcon, Edit2, Send, Save, Filter, MapPin, ChevronRight, ChevronLeft, Loader2, FileText, Tag, Ticket, ToggleLeft, ToggleRight, Sparkles, Download, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';

const m = motion as any;

// --- Sub-Components ---

const DashboardStats = ({ stats }: { stats: any }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="flex items-center gap-4 border-l-4 border-l-emerald-500">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
                <DollarSign className="w-8 h-8" />
            </div>
            <div>
                <p className="text-slate-400 text-sm">הכנסות החודש</p>
                <p className="text-2xl font-serif text-white">₪{stats.revenue.toLocaleString()}</p>
            </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-l-brand-primary">
            <div className="p-3 bg-brand-primary/10 rounded-full text-brand-primary">
                <CalendarIcon className="w-8 h-8" />
            </div>
            <div>
                <p className="text-slate-400 text-sm">תורים החודש</p>
                <p className="text-2xl font-serif text-white">{stats.appointments}</p>
            </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-l-amber-500">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-400">
                <Clock className="w-8 h-8" />
            </div>
            <div>
                <p className="text-slate-400 text-sm">ממתינים לאישור</p>
                <p className="text-2xl font-serif text-white">{stats.pending}</p>
            </div>
        </Card>
    </div>
);

const AppointmentsList = ({ appointments, onStatusUpdate, onCancelRequest, onDownloadPdf }: any) => {
    return (
        <Card className="p-0 overflow-hidden bg-brand-surface/30 border-white/5">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-brand-dark/50">
                <h3 className="text-white font-medium flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-brand-primary" /> ניהול תורים
                </h3>
                <Button variant="outline" size="sm" onClick={onDownloadPdf}>
                    <Download className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">ייצוא דוח PDF</span>
                </Button>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-right text-sm border-collapse">
                <thead className="">
                <tr className="border-b border-white/5 text-slate-500 text-xs bg-brand-dark/50 shadow-sm">
                    <th className="py-4 px-6 font-medium whitespace-nowrap">לקוח</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap">תאריך ושעה</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap">שירות</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap">סטטוס</th>
                    <th className="py-4 px-6 text-left whitespace-nowrap">פעולות</th>
                </tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-white/5">
                {appointments.map((apt: any) => (
                    <tr key={apt.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-6">
                            <div className="font-medium text-white">{apt.client_name}</div>
                            <div className="text-xs text-slate-500">{apt.client_phone}</div>
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                            <div>{new Date(apt.start_time).toLocaleDateString('he-IL')}</div>
                            <div className="text-xs">{new Date(apt.start_time).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</div>
                        </td>
                        <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-white/5 border border-white/10 whitespace-nowrap">
                            {apt.service_name || 'שירות כללי'}
                            </span>
                        </td>
                        <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            apt.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : apt.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                            {apt.status === 'confirmed' ? 'מאושר' : apt.status === 'cancelled' ? 'בוטל' : 'ממתין'}
                            </span>
                        </td>
                        <td className="py-4 px-6">
                            <div className="flex items-center justify-end gap-2">
                                <a 
                                    href={`https://wa.me/972${apt.client_phone.replace(/-/g, '').substring(1)}?text=${encodeURIComponent(`היי ${apt.client_name}, מדברים מסטודיו יובל בקשר לתור שלך.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                                    title="שלח הודעה"
                                >
                                    <MessageCircle className="w-4 h-4"/>
                                </a>
                                {apt.status === 'pending' && (
                                    <button onClick={() => onStatusUpdate(apt.id, 'confirmed')} className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg" title="אשר תור">
                                        <Check className="w-4 h-4"/>
                                    </button>
                                )}
                                <button onClick={() => onCancelRequest(apt)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg" title="בטל תור">
                                    <X className="w-4 h-4"/>
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
      </Card>
    );
};

const ServicesManager = ({ services, onRefresh }: { services: Service[], onRefresh: () => void }) => {
    const [isEditing, setIsEditing] = useState<Service | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<Partial<Service>>({});

    const handleSave = async () => {
        if (isEditing && isEditing.id) {
            await api.updateService(isEditing.id, formData);
        } else {
            await api.addService({
                name: formData.name || '',
                description: formData.description || '',
                price: Number(formData.price) || 0,
                duration_minutes: Number(formData.duration_minutes) || 30,
                category: (formData.category as any) || 'Ear',
                image_url: formData.image_url || 'https://picsum.photos/400/400',
                pain_level: Number(formData.pain_level) || 1
            });
        }
        setIsAdding(false);
        setIsEditing(null);
        setFormData({});
        onRefresh();
    };

    const handleDelete = async (id: string) => {
        if(window.confirm('למחוק שירות זה?')) {
            await api.deleteService(id);
            onRefresh();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h3 className="text-xl font-medium text-white">ניהול שירותים</h3>
                 <Button onClick={() => { setFormData({}); setIsAdding(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> הוסף שירות
                 </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                    <Card key={service.id} className="group relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-white font-medium">{service.name}</h4>
                                <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">{service.category}</span>
                            </div>
                            <span className="text-brand-primary font-serif">₪{service.price}</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{service.description}</p>
                        <div className="flex gap-2 mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="outline" onClick={() => { setFormData(service); setIsEditing(service); }} className="flex-1">ערוך</Button>
                            <Button size="sm" variant="danger" onClick={() => handleDelete(service.id)}><Trash2 className="w-4 h-4"/></Button>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal isOpen={isAdding || !!isEditing} onClose={() => { setIsAdding(false); setIsEditing(null); }} title={isAdding ? 'הוספת שירות' : 'עריכת שירות'}>
                <div className="space-y-4 text-right">
                    <Input label="שם השירות" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <Input label="מחיר (₪)" type="number" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                    <Input label="משך זמן (דקות)" type="number" value={formData.duration_minutes || ''} onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})} />
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-400">קטגוריה</label>
                        <select 
                            className="bg-brand-dark/50 border border-brand-border text-white px-5 py-3 rounded-xl outline-none"
                            value={formData.category || 'Ear'}
                            onChange={e => setFormData({...formData, category: e.target.value as any})}
                        >
                            <option value="Ear">אוזניים</option>
                            <option value="Face">פנים</option>
                            <option value="Body">גוף</option>
                            <option value="Jewelry">תכשיטים</option>
                        </select>
                    </div>
                    <Input label="תיאור" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                    <Button onClick={handleSave} className="w-full mt-4">שמור שינויים</Button>
                </div>
            </Modal>
        </div>
    );
};

const CouponsManager = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [newCoupon, setNewCoupon] = useState({ code: '', value: 10, type: 'percent' });

    useEffect(() => { loadCoupons(); }, []);
    const loadCoupons = async () => setCoupons(await api.getCoupons());

    const handleCreate = async () => {
        await api.createCoupon({
            code: newCoupon.code.toUpperCase(),
            value: Number(newCoupon.value),
            type: newCoupon.type as 'percent' | 'fixed',
            is_active: true
        });
        setNewCoupon({ code: '', value: 10, type: 'percent' });
        loadCoupons();
    };

    const handleDelete = async (id: string) => {
        await api.deleteCoupon(id);
        loadCoupons();
    };

    return (
        <div className="space-y-8">
             <Card>
                <h3 className="text-white font-medium mb-4">יצירת קופון חדש</h3>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full"><Input label="קוד קופון" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} /></div>
                    <div className="w-32"><Input label="ערך" type="number" value={newCoupon.value} onChange={e => setNewCoupon({...newCoupon, value: Number(e.target.value)})} /></div>
                    <div className="w-32">
                         <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-400">סוג</label>
                            <select className="bg-brand-dark/50 border border-brand-border text-white px-4 py-3 rounded-xl" value={newCoupon.type} onChange={e => setNewCoupon({...newCoupon, type: e.target.value})}>
                                <option value="percent">% אחוז</option>
                                <option value="fixed">₪ שקלים</option>
                            </select>
                        </div>
                    </div>
                    <Button onClick={handleCreate}>צור קופון</Button>
                </div>
             </Card>

             <div className="grid gap-4">
                 {coupons.map(coupon => (
                     <div key={coupon.id} className="flex justify-between items-center p-4 bg-brand-surface/30 border border-white/5 rounded-xl">
                         <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                 <Ticket className="w-5 h-5"/>
                             </div>
                             <div>
                                 <p className="text-white font-mono font-bold tracking-wider">{coupon.code}</p>
                                 <p className="text-xs text-slate-500">{coupon.type === 'percent' ? `${coupon.value}% הנחה` : `₪${coupon.value} הנחה`}</p>
                             </div>
                         </div>
                         <div className="flex items-center gap-4">
                             <span className={`px-2 py-1 rounded text-xs ${coupon.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                 {coupon.is_active ? 'פעיל' : 'לא פעיל'}
                             </span>
                             <button onClick={() => handleDelete(coupon.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};

const SettingsManager = ({ settings, onUpdate }: { settings: StudioSettings | null, onUpdate: () => void }) => {
    const [localSettings, setLocalSettings] = useState<StudioSettings | null>(null);
    
    useEffect(() => { if (settings) setLocalSettings(JSON.parse(JSON.stringify(settings))); }, [settings]);

    const handleSave = async () => {
        if (!localSettings) return;
        await api.updateSettings(localSettings);
        onUpdate();
    };

    if (!localSettings) return null;

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="text-white font-medium mb-4 flex items-center gap-2"><MapPin className="w-4 h-4"/> פרטי הסטודיו</h3>
                <div className="space-y-4">
                    <Input label="שם העסק" value={localSettings.studio_details.name} onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, name: e.target.value}})} />
                    <Input label="כתובת" value={localSettings.studio_details.address} onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, address: e.target.value}})} />
                    <Input label="טלפון" value={localSettings.studio_details.phone} onChange={e => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, phone: e.target.value}})} />
                </div>
            </Card>
            
            <Card>
                 <h3 className="text-white font-medium mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4"/> פיצ'רים מיוחדים</h3>
                 <div className="space-y-4">
                     <label className="flex items-center justify-between p-3 border border-white/5 rounded-lg">
                         <span className="text-slate-300">Ear Architect (עיצוב אוזן)</span>
                         <input type="checkbox" checked={localSettings.features?.enable_ear_stacker} onChange={e => setLocalSettings({...localSettings, features: {...localSettings.features, enable_ear_stacker: e.target.checked}})} className="accent-brand-primary w-5 h-5"/>
                     </label>
                     <label className="flex items-center justify-between p-3 border border-white/5 rounded-lg">
                         <span className="text-slate-300">Piercing Roulette (גלגל המזל)</span>
                         <input type="checkbox" checked={localSettings.features?.enable_roulette} onChange={e => setLocalSettings({...localSettings, features: {...localSettings.features, enable_roulette: e.target.checked}})} className="accent-brand-primary w-5 h-5"/>
                     </label>
                 </div>
            </Card>

            <Button onClick={handleSave} className="w-full">שמור הגדרות</Button>
        </div>
    );
};

const StackerJewelryTab = () => {
    const [items, setItems] = useState<JewelryLibraryItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const load = async () => setItems(await api.getJewelryLibrary());
    useEffect(() => { load(); }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setIsUploading(true);
            const file = e.target.files[0];
            const url = await api.uploadImage(file, 'jewelry-library');
            if (url) {
                await api.addJewelryToLibrary({ name: file.name, image_url: url });
                load();
            }
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('למחוק תכשיט זה מהארכיטקט?')) {
            await api.deleteJewelryFromLibrary(id);
            load();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h3 className="text-xl font-medium text-white">תכשיטים לארכיטקט</h3>
                 <div className="relative">
                    <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} accept="image/png" />
                    <Button className="text-sm" isLoading={isUploading}>
                        <Plus className="w-4 h-4" /> העלאת תכשיט (PNG שקוף)
                    </Button>
                 </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                 {items.map(item => (
                     <Card key={item.id} className="p-2 relative group flex flex-col items-center">
                         <div className="aspect-square w-full bg-brand-dark rounded-lg flex items-center justify-center p-4">
                             <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain" />
                         </div>
                         <button onClick={() => handleDelete(item.id)} className="absolute top-2 left-2 p-1.5 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                             <Trash2 className="w-3 h-3"/>
                         </button>
                     </Card>
                 ))}
             </div>
        </div>
    );
};

// --- Main Admin Component ---

const Admin: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState({ revenue: 0, appointments: 0, pending: 0 });
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [settings, setSettings] = useState<StudioSettings | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
       const [appts, servs, st, sett] = await Promise.all([
           api.getAppointments(), api.getServices(), api.getMonthlyStats(), api.getSettings()
       ]);
       setAppointments(appts); setServices(servs); setStats(st); setSettings(sett);
    };

    useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === '2007') setIsAuthenticated(true);
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`studio-report-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("PDF generation failed", err);
        }
    };

    if (!isAuthenticated) return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-brand-dark">
            <Card className="max-w-md w-full p-8 text-center border-brand-primary/20">
                <Lock className="w-12 h-12 text-brand-primary mx-auto mb-6" />
                <h2 className="text-2xl font-serif text-white mb-6">כניסת מנהל</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <Input label="סיסמה" type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
                    <Button type="submit" className="w-full">כניסה</Button>
                </form>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-dark pt-24 pb-12">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <h1 className="text-3xl font-serif text-white">לוח בקרה</h1>
                    <div className="flex gap-2 bg-brand-surface/50 p-1 rounded-xl overflow-x-auto max-w-full">
                        {[
                            { id: 'dashboard', label: 'ראשי', icon: Activity },
                            { id: 'appointments', label: 'תורים', icon: CalendarIcon },
                            { id: 'services', label: 'שירותים', icon: Edit2 },
                            { id: 'stacker', label: 'ארכיטקט', icon: Sparkles },
                            { id: 'coupons', label: 'קופונים', icon: Ticket },
                            { id: 'settings', label: 'הגדרות', icon: SettingsIcon }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-primary text-brand-dark' : 'text-slate-400 hover:text-white'}`}>
                                <tab.icon className="w-4 h-4"/> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                <AnimatePresence mode="wait">
                    <m.div 
                        key={activeTab} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {/* Hidden div for PDF generation */}
                        <div ref={reportRef} className="fixed left-[-9999px]">
                             <div className="bg-brand-dark p-8 w-[800px] text-white">
                                 <h1 className="text-2xl mb-4">דוח סטודיו</h1>
                                 <AppointmentsList appointments={appointments} />
                             </div>
                        </div>

                        {activeTab === 'dashboard' && <DashboardStats stats={stats} />}
                        
                        {activeTab === 'appointments' && (
                            <AppointmentsList 
                                appointments={appointments} 
                                onStatusUpdate={async (id: string, status: string) => { await api.updateAppointmentStatus(id, status); loadData(); }} 
                                onCancelRequest={async (apt: any) => { if(window.confirm('לבטל תור זה?')) { await api.updateAppointmentStatus(apt.id, 'cancelled'); loadData(); }}} 
                                onDownloadPdf={handleDownloadPDF}
                            />
                        )}

                        {activeTab === 'services' && <ServicesManager services={services} onRefresh={loadData} />}
                        
                        {activeTab === 'stacker' && <StackerJewelryTab />}
                        
                        {activeTab === 'coupons' && <CouponsManager />}
                        
                        {activeTab === 'settings' && <SettingsManager settings={settings} onUpdate={loadData} />}
                    </m.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
export default Admin;
