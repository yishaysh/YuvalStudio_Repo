
import React, { useEffect, useState, useRef } from 'react';
import { api, JewelryLibraryItem } from '../services/mockApi';
import { Card, Button, Input, ConfirmationModal, Modal, SectionHeading } from '../components/ui';
import { Appointment, Service, StudioSettings, Coupon } from '../types';
import { DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS, DEFAULT_MONTHLY_GOALS } from '../constants';
import { 
  Activity, Calendar as CalendarIcon, DollarSign, 
  Lock, Check, X, Clock, Plus, 
  Trash2, Image as ImageIcon, Settings as SettingsIcon, Edit2, Send, Save, Filter, MapPin, ChevronRight, ChevronLeft, Loader2, FileText, Tag, Ticket, ToggleLeft, ToggleRight, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';

const m = motion as any;

// Helper: Get days in month
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const AppointmentsList = ({ appointments, onStatusUpdate, onCancelRequest, filterId, onClearFilter, studioAddress, onDownloadPdf }: any) => {
    return (
        <Card className="p-0 overflow-hidden bg-brand-surface/30 border-white/5">
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
                                {apt.status === 'pending' && <button onClick={() => onStatusUpdate(apt.id, 'confirmed')} className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg"><Check className="w-4 h-4"/></button>}
                                <button onClick={() => onCancelRequest(apt)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><X className="w-4 h-4"/></button>
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

const Admin: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState({ revenue: 0, appointments: 0, pending: 0 });
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [settings, setSettings] = useState<StudioSettings | null>(null);

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
                    <m.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        {activeTab === 'appointments' && <AppointmentsList appointments={appointments} onStatusUpdate={() => loadData()} onCancelRequest={() => {}} />}
                        {activeTab === 'stacker' && <StackerJewelryTab />}
                        {activeTab === 'dashboard' && <div className="text-white">ברוך הבא למערכת הניהול.</div>}
                    </m.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
export default Admin;
