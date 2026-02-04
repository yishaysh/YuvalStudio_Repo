
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Calendar, Settings, Image as ImageIcon, 
  LogOut, Plus, Search, Filter, X, Check, Save, 
  Trash2, Edit2, Clock, DollarSign, Upload, Loader2,
  Ticket, Tag, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import { api } from '../services/mockApi';
import { Appointment, Service, StudioSettings, Coupon } from '../types';
import { Button, Card, Input, Modal, ConfirmationModal } from '../components/ui';
import { SmartImage } from '../components/SmartImage';

const m = motion as any;

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'services' | 'gallery' | 'settings'>('dashboard');

  // Data State
  const [stats, setStats] = useState({ revenue: 0, appointments: 0, pending: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [gallery, setGallery] = useState<any[]>([]);

  // Filter State (Appointments)
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterId, setFilterId] = useState('');

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  
  // Initialization
  useEffect(() => {
    const checkAuth = sessionStorage.getItem('isAdmin');
    if (checkAuth === 'true') {
      setIsAuthenticated(true);
      loadData();
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedStats, fetchedApps, fetchedServices, fetchedSettings, fetchedGallery] = await Promise.all([
        api.getMonthlyStats(),
        api.getAppointments(),
        api.getServices(),
        api.getSettings(),
        api.getGallery()
      ]);
      setStats(fetchedStats);
      setAppointments(fetchedApps);
      setServices(fetchedServices);
      setSettings(fetchedSettings);
      setGallery(fetchedGallery);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Simple hardcoded password for MVP
      sessionStorage.setItem('isAdmin', 'true');
      setIsAuthenticated(true);
      loadData();
    } else {
      alert('סיסמה שגויה');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAdmin');
    setIsAuthenticated(false);
  };

  const onClearFilter = () => {
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setFilterId('');
  };

  // --- Filter Logic ---
  const filteredAppointments = appointments.filter(app => {
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    
    if (dateRange.start) {
        const start = new Date(dateRange.start);
        const appDate = new Date(app.start_time);
        if (appDate < start) return false;
    }
    
    if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59);
        const appDate = new Date(app.start_time);
        if (appDate > end) return false;
    }

    if (filterId) {
        const search = filterId.toLowerCase();
        return (
            app.client_name.toLowerCase().includes(search) ||
            app.client_phone.includes(search) ||
            (app.id && app.id.toLowerCase().includes(search))
        );
    }

    return true;
  });

  // --- Render Views ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
                <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-serif text-white mb-6">כניסת מנהל</h1>
            <form onSubmit={handleLogin} className="space-y-4">
                <Input 
                    label="סיסמה" 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    dir="ltr"
                    className="text-center"
                />
                <Button type="submit" className="w-full">התחבר</Button>
            </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark pt-20 flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-brand-surface/50 border-r border-white/5 flex-shrink-0">
            <div className="p-6">
                <h2 className="text-xl font-serif text-white mb-1">פאנל ניהול</h2>
                <p className="text-xs text-slate-500">Yuval Studio Admin</p>
            </div>
            <nav className="px-3 space-y-1">
                {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'לוח בקרה' },
                    { id: 'appointments', icon: Calendar, label: 'תורים' },
                    { id: 'services', icon: Settings, label: 'שירותים' },
                    { id: 'gallery', icon: ImageIcon, label: 'גלריה' },
                    { id: 'settings', icon: Settings, label: 'הגדרות' },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${activeTab === item.id ? 'bg-brand-primary text-brand-dark font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                    </button>
                ))}
            </nav>
            <div className="p-4 mt-auto border-t border-white/5">
                <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm w-full px-4 py-2">
                    <LogOut className="w-4 h-4" /> התנתק
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)]">
            <header className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-dark sticky top-0 z-20">
                <h1 className="text-2xl font-serif text-white">
                    {activeTab === 'dashboard' && 'לוח בקרה'}
                    {activeTab === 'appointments' && 'ניהול תורים'}
                    {activeTab === 'services' && 'ניהול שירותים'}
                    {activeTab === 'gallery' && 'ניהול גלריה'}
                    {activeTab === 'settings' && 'הגדרות מערכת'}
                </h1>
                <Button variant="ghost" onClick={loadData} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'רענן נתונים'}
                </Button>
            </header>

            <div className="p-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                        <m.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">הכנסות החודש</p>
                                    <p className="text-2xl font-bold text-white">₪{stats.revenue.toLocaleString()}</p>
                                </div>
                            </Card>
                            <Card className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">סה"כ תורים</p>
                                    <p className="text-2xl font-bold text-white">{stats.appointments}</p>
                                </div>
                            </Card>
                            <Card className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">ממתינים לאישור</p>
                                    <p className="text-2xl font-bold text-white">{stats.pending}</p>
                                </div>
                            </Card>
                        </m.div>
                    )}

                    {activeTab === 'appointments' && (
                        <m.div key="appointments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div className="flex justify-between items-center bg-brand-surface p-2 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 flex-1 max-w-md bg-brand-dark/50 rounded-lg px-3 border border-white/5 focus-within:border-brand-primary/50 transition-colors">
                                    <Search className="w-4 h-4 text-slate-500" />
                                    <input 
                                        type="text" 
                                        placeholder="חיפוש לפי שם, טלפון..." 
                                        className="bg-transparent border-none text-sm w-full py-2 text-white placeholder:text-slate-600 outline-none"
                                        value={filterId}
                                        onChange={e => setFilterId(e.target.value)}
                                    />
                                </div>
                                <Button variant="ghost" onClick={() => setShowFilters(!showFilters)} className={`gap-2 ${showFilters ? 'bg-brand-primary/10 text-brand-primary' : ''}`}>
                                    <Filter className="w-4 h-4" /> סינון
                                </Button>
                            </div>

                            {showFilters && (
                                <div className="p-4 bg-brand-primary/5 border-b border-brand-primary/10 flex flex-col sm:flex-row sm:flex-wrap gap-4 items-end rounded-xl">
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
                                        <div className="flex flex-col gap-1 flex-1 sm:flex-initial">
                                            <label className="text-xs text-slate-400">מתאריך</label>
                                            <input 
                                                type="date" 
                                                value={dateRange.start}
                                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                                className="bg-brand-dark/50 border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-brand-primary/50 w-full"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1 sm:flex-initial">
                                            <label className="text-xs text-slate-400">עד תאריך</label>
                                            <input 
                                                type="date" 
                                                value={dateRange.end}
                                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                                className="bg-brand-dark/50 border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-brand-primary/50 w-full"
                                            />
                                        </div>
                                    </div>
                                    
                                    {(statusFilter !== 'all' || dateRange.start || dateRange.end || filterId) && (
                                        <button 
                                            onClick={onClearFilter}
                                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 h-9 mr-auto"
                                        >
                                            <X className="w-3 h-3" /> נקה סינון
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="bg-brand-surface rounded-xl border border-white/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-right">
                                        <thead className="bg-white/5 text-slate-400">
                                            <tr>
                                                <th className="p-4">לקוח</th>
                                                <th className="p-4">שירות</th>
                                                <th className="p-4">תאריך</th>
                                                <th className="p-4">סטטוס</th>
                                                <th className="p-4">מחיר</th>
                                                <th className="p-4">פעולות</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredAppointments.map(app => (
                                                <tr key={app.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-medium text-white">{app.client_name}</div>
                                                        <div className="text-xs text-slate-500">{app.client_phone}</div>
                                                    </td>
                                                    <td className="p-4 text-slate-300">{app.service_name}</td>
                                                    <td className="p-4 text-slate-300">
                                                        {new Date(app.start_time).toLocaleDateString('he-IL')}
                                                        <br />
                                                        <span className="text-xs text-slate-500">{new Date(app.start_time).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                            app.status === 'confirmed' ? 'bg-green-500/10 text-green-500' :
                                                            app.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                                            'bg-amber-500/10 text-amber-500'
                                                        }`}>
                                                            {app.status === 'confirmed' ? 'מאושר' : app.status === 'cancelled' ? 'מבוטל' : 'ממתין'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-white">
                                                        ₪{app.final_price || app.service_price}
                                                        {app.coupon_code && <span className="block text-[10px] text-brand-primary">קופון: {app.coupon_code}</span>}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            {app.status === 'pending' && (
                                                                <button 
                                                                    onClick={() => {
                                                                        api.updateAppointmentStatus(app.id, 'confirmed').then(() => loadData());
                                                                    }}
                                                                    className="p-1.5 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition-all"
                                                                    title="אשר"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {app.status !== 'cancelled' && (
                                                                <button 
                                                                    onClick={() => {
                                                                        if(confirm('האם לבטל תור זה?')) {
                                                                            api.updateAppointmentStatus(app.id, 'cancelled').then(() => loadData());
                                                                        }
                                                                    }}
                                                                    className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                                                                    title="בטל"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredAppointments.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-500">לא נמצאו תורים</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </m.div>
                    )}

                    {activeTab === 'services' && (
                        <m.div key="services" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="flex justify-end">
                                <Button onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}>
                                    <Plus className="w-4 h-4 ml-2" /> הוסף שירות חדש
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {services.map(service => (
                                    <Card key={service.id} className="relative group hover:border-brand-primary/30">
                                        <div className="aspect-video bg-black/20 rounded-lg mb-4 overflow-hidden relative">
                                            <SmartImage src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <button 
                                                    onClick={() => { setEditingService(service); setIsServiceModalOpen(true); }}
                                                    className="p-2 bg-white rounded-full text-brand-dark hover:bg-brand-primary transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if(confirm('למחוק שירות זה?')) {
                                                            api.deleteService(service.id).then(() => loadData());
                                                        }
                                                    }}
                                                    className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-medium text-white">{service.name}</h3>
                                            <span className="text-brand-primary font-bold">₪{service.price}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 flex gap-3">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.duration_minutes} דק'</span>
                                            <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {service.category}</span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </m.div>
                    )}
                    
                    {/* Gallery & Settings would be implemented similarly, condensed for this file */}
                    {activeTab === 'gallery' && (
                        <div className="text-center py-10 text-slate-500 bg-white/5 rounded-xl border border-white/5">
                            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>ממשק ניהול גלריה בבנייה</p>
                            <Button className="mt-4" onClick={() => setIsGalleryModalOpen(true)}>העלאת תמונה</Button>
                        </div>
                    )}
                    
                    {activeTab === 'settings' && (
                        <div className="text-center py-10 text-slate-500 bg-white/5 rounded-xl border border-white/5">
                             <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                             <p>ממשק הגדרות סטודיו בבנייה</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* Service Modal */}
        <Modal 
            isOpen={isServiceModalOpen} 
            onClose={() => setIsServiceModalOpen(false)} 
            title={editingService ? 'עריכת שירות' : 'שירות חדש'}
        >
            <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const data: any = Object.fromEntries(formData.entries());
                
                // Ensure number conversion
                data.price = Number(data.price);
                data.duration_minutes = Number(data.duration_minutes);
                data.pain_level = Number(data.pain_level);

                if (editingService) {
                    await api.updateService(editingService.id, data);
                } else {
                    await api.addService(data);
                }
                setIsServiceModalOpen(false);
                loadData();
            }} className="space-y-4">
                <Input name="name" label="שם השירות" defaultValue={editingService?.name} required />
                <div className="grid grid-cols-2 gap-4">
                    <Input name="price" label="מחיר (₪)" type="number" defaultValue={editingService?.price} required />
                    <Input name="duration_minutes" label="משך (דקות)" type="number" defaultValue={editingService?.duration_minutes} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-sm font-medium text-slate-400 ms-1">קטגוריה</label>
                        <select name="category" className="w-full bg-brand-dark/50 border border-brand-border text-white px-5 py-3 rounded-xl mt-2" defaultValue={editingService?.category}>
                            <option value="Ear">אוזניים</option>
                            <option value="Face">פנים</option>
                            <option value="Body">גוף</option>
                            <option value="Jewelry">תכשיט בלבד</option>
                        </select>
                     </div>
                     <Input name="pain_level" label="רמת כאב (1-10)" type="number" min="1" max="10" defaultValue={editingService?.pain_level || 1} required />
                </div>
                <Input name="description" label="תיאור" defaultValue={editingService?.description} />
                <Input name="image_url" label="קישור לתמונה" defaultValue={editingService?.image_url} required />
                
                <div className="pt-4 flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)} className="flex-1">ביטול</Button>
                    <Button type="submit" className="flex-1">שמור</Button>
                </div>
            </form>
        </Modal>
    </div>
  );
};

export default Admin;
