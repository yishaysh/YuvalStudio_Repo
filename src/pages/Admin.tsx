import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/mockApi';
import { Card, Button, Input, ConfirmationModal } from '../components/ui';
import { Appointment, Service, StudioSettings, DaySchedule, TimeRange } from '../types';
import { DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS, DEFAULT_MONTHLY_GOALS } from '../constants';
import { 
  Activity, Calendar, DollarSign, Users, 
  Lock, Check, X, Clock, Plus, 
  Trash2, Image as ImageIcon, MessageCircle, Settings as SettingsIcon, Edit2, Send, Save, Power, AlertCircle, Filter, MapPin, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Tab Components ---

// 1. DASHBOARD TAB
interface DashboardTabProps {
    stats: any;
    appointments: any[];
    onViewAppointment: (id: string) => void;
    settings: StudioSettings;
    onUpdateSettings: (s: StudioSettings) => Promise<void>;
}

const DashboardTab = ({ stats, appointments, onViewAppointment, settings, onUpdateSettings }: DashboardTabProps) => {
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [tempGoals, setTempGoals] = useState(settings.monthly_goals || DEFAULT_MONTHLY_GOALS);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGoals = async () => {
      setIsSaving(true);
      await onUpdateSettings({
          ...settings,
          monthly_goals: tempGoals
      });
      setIsEditingGoals(false);
      setIsSaving(false);
  };

  const revenueGoal = settings.monthly_goals?.revenue || 20000;
  const appointmentGoal = settings.monthly_goals?.appointments || 100;
  
  const revenuePercent = Math.min((stats.revenue / revenueGoal) * 100, 100);
  const apptPercent = Math.min((stats.appointments / appointmentGoal) * 100, 100);

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 border-l-4 border-l-brand-primary">
          <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">הכנסה חודשית</p>
            <p className="text-3xl font-serif text-white">₪{stats.revenue.toLocaleString()}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-l-brand-secondary">
          <div className="w-12 h-12 rounded-full bg-brand-surface border border-white/5 flex items-center justify-center text-slate-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">תורים החודש</p>
            <p className="text-3xl font-serif text-white">{stats.appointments}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">ממתינים לאישור</p>
            <p className="text-3xl font-serif text-white">{stats.pending}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-white">יעדי החודש</h3>
                {!isEditingGoals ? (
                    <button 
                        onClick={() => { setTempGoals(settings.monthly_goals); setIsEditingGoals(true); }}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                        title="ערוך יעדים"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditingGoals(false)} className="text-slate-500 text-xs hover:text-white">ביטול</button>
                        <button onClick={handleSaveGoals} className="text-brand-primary text-xs hover:text-white font-medium disabled:opacity-50" disabled={isSaving}>
                            {isSaving ? 'שומר...' : 'שמור'}
                        </button>
                    </div>
                )}
            </div>
            
            {isEditingGoals ? (
                <div className="space-y-4 animate-fade-in">
                    <Input 
                        label="יעד הכנסות (₪)" 
                        type="number" 
                        value={tempGoals.revenue} 
                        onChange={(e) => setTempGoals({...tempGoals, revenue: Number(e.target.value)})}
                    />
                    <Input 
                        label="יעד כמות תורים" 
                        type="number" 
                        value={tempGoals.appointments} 
                        onChange={(e) => setTempGoals({...tempGoals, appointments: Number(e.target.value)})}
                    />
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">יעד הכנסות ({revenueGoal.toLocaleString()}₪)</span>
                            <span className="text-brand-primary">{Math.round(revenuePercent)}%</span>
                        </div>
                        <div className="h-2 bg-brand-dark rounded-full overflow-hidden">
                            <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${revenuePercent}%` }}
                            className="h-full bg-brand-primary"
                            ></motion.div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">יעד תורים ({appointmentGoal})</span>
                            <span className="text-brand-primary">{Math.round(apptPercent)}%</span>
                        </div>
                        <div className="h-2 bg-brand-dark rounded-full overflow-hidden">
                            <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${apptPercent}%` }}
                            className="h-full bg-brand-secondary"
                            ></motion.div>
                        </div>
                    </div>
                </div>
            )}
        </Card>

        <Card className="relative overflow-hidden">
             <h3 className="text-lg font-medium text-white mb-4">תורים אחרונים</h3>
             <div className="space-y-4">
                 {appointments.slice(0, 3).map((apt: any) => (
                     <div 
                        key={apt.id} 
                        onClick={() => onViewAppointment(apt.id)}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group"
                        title="לחץ לצפייה ביומן התורים"
                     >
                         <div className="flex items-center gap-3">
                             <div className={`w-2 h-2 rounded-full ${apt.status === 'confirmed' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                             <div>
                                 <div className="text-sm font-medium text-white group-hover:text-brand-primary transition-colors">{apt.client_name}</div>
                                 <div className="text-xs text-slate-500">{new Date(apt.start_time).toLocaleDateString()} | {new Date(apt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                             </div>
                         </div>
                         <div className="text-xs font-serif text-brand-primary">₪{apt.service_price || '-'}</div>
                     </div>
                 ))}
             </div>
        </Card>
      </div>
    </div>
  );
}

// 2. APPOINTMENTS TAB
const AppointmentsTab = ({ appointments, onStatusUpdate, onCancelRequest, filterId, onClearFilter, studioAddress }: any) => {
    const rowRefs = useRef<{[key: string]: HTMLTableRowElement | null}>({});

    useEffect(() => {
        if (filterId && rowRefs.current[filterId]) {
            // Scroll into view with a slight delay to ensure render is complete
            setTimeout(() => {
                rowRefs.current[filterId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [filterId]);

    const sendWhatsapp = (apt: any, type: 'confirm' | 'reminder') => {
        let msg = '';
        const date = new Date(apt.start_time).toLocaleDateString('he-IL');
        const time = new Date(apt.start_time).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
        // Use dynamic studio address from props
        const address = studioAddress || DEFAULT_STUDIO_DETAILS.address;
        
        // Changed to female gender "שמחה"
        if (type === 'confirm') {
            msg = `היי ${apt.client_name}, שמחה לבשר שהתור שלך ל${apt.service_name || 'פירסינג'} בסטודיו של יובל אושר! 🗓️ תאריך: ${date} ⌚ שעה: ${time} 📍 כתובת: ${address}. נתראה!`;
        } else {
            msg = `היי ${apt.client_name}, תזכורת לתור בסטודיו של יובל מחר ב-${time}. אם יש שינוי אנא עדכן בהקדם.`;
        }
        
        const phone = apt.client_phone.startsWith('0') ? `972${apt.client_phone.substring(1)}` : apt.client_phone;
        const cleanPhone = phone.replace(/-/g, '');
        
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    return (
        <Card className="p-0 overflow-hidden bg-brand-surface/30">
            {filterId && (
                <div className="p-4 bg-brand-primary/10 border-b border-brand-primary/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-brand-primary">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">מסומן תור ספציפי</span>
                    </div>
                    <button 
                        onClick={onClearFilter}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> נקה סימון
                    </button>
                </div>
            )}
            
            <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-right text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                <tr className="border-b border-white/5 text-slate-500 text-xs bg-brand-dark shadow-sm">
                    <th className="py-4 px-6 font-medium">לקוח</th>
                    <th className="py-4 px-6 font-medium">תאריך ושעה</th>
                    <th className="py-4 px-6 font-medium">שירות</th>
                    <th className="py-4 px-6 font-medium">סטטוס</th>
                    <th className="py-4 px-6 text-left">פעולות</th>
                </tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-white/5">
                {appointments.length > 0 ? appointments.map((apt: any) => {
                    const isHighlighted = apt.id === filterId;
                    return (
                        <tr 
                            key={apt.id} 
                            ref={(el) => { rowRefs.current[apt.id] = el; }}
                            className={`transition-colors duration-500 ${isHighlighted ? 'bg-brand-primary/20 hover:bg-brand-primary/25 shadow-[inset_3px_0_0_0_#d4b585]' : 'hover:bg-white/[0.02]'}`}
                        >
                            <td className="py-4 px-6">
                                <div className={`font-medium ${isHighlighted ? 'text-brand-primary' : 'text-white'}`}>{apt.client_name}</div>
                                <div className="text-xs text-slate-500">{apt.client_phone}</div>
                            </td>
                            <td className="py-4 px-6 text-slate-400">
                                <div>{new Date(apt.start_time).toLocaleDateString('he-IL')}</div>
                                <div className="text-xs">{new Date(apt.start_time).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td className="py-4 px-6">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-white/5 border border-white/10">
                                {apt.service_name || 'שירות כללי'}
                                </span>
                                {apt.notes && <div className="text-xs text-brand-primary mt-1 max-w-[150px] truncate" title={apt.notes}>{apt.notes}</div>}
                            </td>
                            <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                apt.status === 'confirmed' 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : apt.status === 'cancelled'
                                    ? 'bg-red-500/10 text-red-400'
                                    : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                {apt.status === 'confirmed' ? 'מאושר' : apt.status === 'cancelled' ? 'בוטל' : 'ממתין'}
                                </span>
                            </td>
                            <td className="py-4 px-6">
                                <div className="flex items-center justify-end gap-2">
                                    {/* Whatsapp Actions */}
                                    <div className="flex bg-white/5 rounded-lg mr-2">
                                        <button onClick={() => sendWhatsapp(apt, 'confirm')} className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-r-lg border-l border-white/5 transition-colors" title="שלח אישור הזמנה">
                                            <Send className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => sendWhatsapp(apt, 'reminder')} className="p-2 text-slate-400 hover:bg-white/10 rounded-l-lg transition-colors" title="שלח תזכורת">
                                            <Clock className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Status Actions */}
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
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                            לא נמצאו תורים
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
      </Card>
    )
}

// 3. SERVICES TAB
const ServicesTab = ({ services, onAddService, onUpdateService, onDeleteService }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentService, setCurrentService] = useState<Partial<Service>>({ category: 'Ear' });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        if (!currentService.name || !currentService.price) return;
        
        // Handle Image Upload
        let imageUrl = currentService.image_url;
        if (fileInputRef.current?.files?.[0]) {
            setUploading(true);
            const url = await api.uploadImage(fileInputRef.current.files[0], 'service-images');
            if (url) imageUrl = url;
            setUploading(false);
        }

        const serviceData = { ...currentService, image_url: imageUrl };

        if (serviceData.id) {
            onUpdateService(serviceData.id, serviceData);
        } else {
            onAddService(serviceData);
        }
        setIsEditing(false);
        setCurrentService({ category: 'Ear' });
    };

    return (
        <div>
            <div className="flex justify-between mb-6">
                <h3 className="text-xl font-medium text-white">רשימת טיפולים</h3>
                <Button onClick={() => { setCurrentService({ category: 'Ear' }); setIsEditing(true); }} className="text-sm py-2 px-4">
                    <Plus className="w-4 h-4" /> הוסף חדש
                </Button>
            </div>

            {isEditing && (
                <Card className="mb-8 border-brand-primary/50 bg-brand-surface/80">
                    <h4 className="text-white mb-4">{currentService.id ? 'עריכת שירות' : 'שירות חדש'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Input label="שם השירות" value={currentService.name || ''} onChange={e => setCurrentService({...currentService, name: e.target.value})} />
                        <Input label="מחיר (₪)" type="number" value={currentService.price || ''} onChange={e => setCurrentService({...currentService, price: parseFloat(e.target.value)})} />
                        <Input label="משך זמן (דקות)" type="number" value={currentService.duration_minutes || ''} onChange={e => setCurrentService({...currentService, duration_minutes: parseInt(e.target.value)})} />
                        
                        <div className="flex flex-col gap-2">
                             <label className="text-sm font-medium text-slate-400 ms-1">קטגוריה</label>
                             <select 
                                className="bg-brand-dark/50 border border-brand-border text-white px-5 py-3 rounded-xl outline-none"
                                value={currentService.category}
                                onChange={e => setCurrentService({...currentService, category: e.target.value as any})}
                             >
                                 <option value="Ear">אוזניים</option>
                                 <option value="Face">פנים</option>
                                 <option value="Body">גוף</option>
                                 <option value="Jewelry">תכשיטים</option>
                             </select>
                        </div>
                    </div>
                    <div className="mb-4">
                         <label className="text-sm font-medium text-slate-400 ms-1 mb-2 block">תמונה</label>
                         <input type="file" ref={fileInputRef} className="text-slate-400 text-sm" accept="image/*" />
                         {currentService.image_url && <img src={currentService.image_url} alt="preview" className="h-20 w-20 object-cover mt-2 rounded-lg border border-white/10" />}
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setIsEditing(false)}>ביטול</Button>
                        <Button onClick={handleSave} isLoading={uploading}>שמור שינויים</Button>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service: Service) => (
                    <Card key={service.id} className="relative group hover:border-brand-primary/30">
                        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                             <button onClick={() => { setCurrentService(service); setIsEditing(true); }} className="p-2 bg-brand-dark/80 text-white rounded-full hover:bg-brand-primary hover:text-brand-dark shadow-lg"><Edit2 className="w-4 h-4"/></button>
                             <button onClick={() => onDeleteService(service.id)} className="p-2 bg-brand-dark/80 text-red-400 rounded-full hover:bg-red-500 hover:text-white shadow-lg"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-brand-dark shrink-0">
                                <img src={service.image_url} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div>
                                <h4 className="font-medium text-white">{service.name}</h4>
                                <div className="text-brand-primary font-serif">₪{service.price}</div>
                                <div className="text-xs text-slate-500">{service.duration_minutes} דקות</div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}

// 4. GALLERY TAB
const GalleryTab = ({ gallery, onUpload }: any) => {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files?.[0]) {
            setUploading(true);
            const url = await api.uploadImage(e.target.files[0], 'gallery-images');
            if(url) await onUpload(url);
            setUploading(false);
        }
    }

    return (
        <div>
             <div className="mb-8 p-8 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-brand-primary/50 hover:bg-brand-surface/30 transition-all cursor-pointer relative group">
                 <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={handleUpload}
                    disabled={uploading}
                 />
                 {uploading ? (
                     <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent animate-spin rounded-full"></div>
                        <span className="text-brand-primary text-sm">מעלה תמונה...</span>
                     </div>
                 ) : (
                    <>
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-primary/20 transition-colors">
                            <ImageIcon className="w-6 h-6 opacity-50 group-hover:text-brand-primary group-hover:opacity-100" />
                        </div>
                        <span className="font-medium">לחץ להעלאת תמונה לגלריה</span>
                        <span className="text-xs text-slate-500 mt-1">JPG, PNG עד 5MB</span>
                    </>
                 )}
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {gallery.map((item: any, i: number) => (
                     <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/5 relative group">
                         <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             {/* Future: Delete button */}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    )
}

// 5. SETTINGS TAB
const SettingsTab = ({ settings, onUpdate }: { settings: StudioSettings, onUpdate: (s: StudioSettings) => void }) => {
    const [localSettings, setLocalSettings] = useState<StudioSettings>(settings);
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    const validateSchedule = (s: StudioSettings): string | null => {
        for (let i = 0; i < 7; i++) {
            const dayKey = i.toString();
            // Fallback to default if not in settings yet
            const day = s.working_hours[dayKey] || DEFAULT_WORKING_HOURS[dayKey];
            
            if (!day || !day.isOpen) continue;
            
            // Check ranges
            const ranges = [...(day.ranges || [])].sort((a, b) => a.start - b.start);
            
            if (ranges.length === 0) return `יום ${days[i]} מוגדר כפתוח אך ללא שעות פעילות.`;

            for (let j = 0; j < ranges.length; j++) {
                const range = ranges[j];
                // Check internal logic (Start < End)
                if (range.start >= range.end) {
                    return `יום ${days[i]}: שעת ההתחלה חייבת להיות לפני שעת הסיום (${range.start}:00 - ${range.end}:00).`;
                }

                // Check Overlap with next
                if (j < ranges.length - 1) {
                    const nextRange = ranges[j + 1];
                    if (range.end > nextRange.start) {
                        return `יום ${days[i]}: קיימת חפיפה בשעות הפעילות בין ${range.start}-${range.end} לבין ${nextRange.start}-${nextRange.end}.`;
                    }
                }
            }
        }
        return null;
    };

    const handleSave = async () => {
        const error = validateSchedule(localSettings);
        if (error) {
            setValidationError(error);
            // Clear error after 5 seconds
            setTimeout(() => setValidationError(null), 5000);
            return;
        }

        setSaving(true);
        await onUpdate(localSettings);
        setSaving(false);
    };

    const toggleDayOpen = (dayIndex: string) => {
        const currentDayConfig = localSettings.working_hours[dayIndex] || DEFAULT_WORKING_HOURS[dayIndex];
        const isOpen = !currentDayConfig.isOpen;
        
        // If opening and no ranges, add default
        let newRanges = currentDayConfig.ranges || [];
        if (isOpen && newRanges.length === 0) {
            newRanges = [{ start: 10, end: 18 }];
        }

        setLocalSettings(prev => ({
            ...prev,
            working_hours: {
                ...prev.working_hours,
                [dayIndex]: {
                    ...currentDayConfig,
                    isOpen,
                    ranges: newRanges
                }
            }
        }));
    };

    const updateRange = (dayIndex: string, rangeIndex: number, field: keyof TimeRange, value: number) => {
        const currentDayConfig = localSettings.working_hours[dayIndex] || DEFAULT_WORKING_HOURS[dayIndex];
        const newRanges = [...(currentDayConfig.ranges || [])];
        
        if (newRanges[rangeIndex]) {
            newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value };
        }
        
        setLocalSettings(prev => ({
            ...prev,
            working_hours: {
                ...prev.working_hours,
                [dayIndex]: {
                    ...currentDayConfig,
                    ranges: newRanges
                }
            }
        }));
    };

    const addRange = (dayIndex: string) => {
        const currentDayConfig = localSettings.working_hours[dayIndex] || DEFAULT_WORKING_HOURS[dayIndex];
        const currentRanges = currentDayConfig.ranges || [];
        
        // Intelligently suggest next slot
        const lastEnd = currentRanges.length > 0 ? currentRanges[currentRanges.length - 1].end : 10;
        const newStart = lastEnd < 23 ? lastEnd : 23;
        const newEnd = newStart + 1 <= 24 ? newStart + 1 : 24;

        if (newStart >= 24) return; // Cannot add past midnight

        setLocalSettings(prev => ({
            ...prev,
            working_hours: {
                ...prev.working_hours,
                [dayIndex]: {
                    ...currentDayConfig,
                    ranges: [...currentRanges, { start: newStart, end: newEnd }]
                }
            }
        }));
    };

    const removeRange = (dayIndex: string, rangeIndex: number) => {
        const currentDayConfig = localSettings.working_hours[dayIndex] || DEFAULT_WORKING_HOURS[dayIndex];
        const newRanges = (currentDayConfig.ranges || []).filter((_, i) => i !== rangeIndex);
        
        setLocalSettings(prev => ({
            ...prev,
            working_hours: {
                ...prev.working_hours,
                [dayIndex]: {
                    ...currentDayConfig,
                    ranges: newRanges
                }
            }
        }));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="h-fit">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-brand-primary" /> פרטי סטודיו
                    </h3>
                 </div>
                 
                 <div className="space-y-6">
                    <Input 
                        label="כתובת העסק"
                        value={localSettings.studio_details?.address || ''}
                        onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            studio_details: { ...prev.studio_details, address: e.target.value }
                        }))}
                    />
                    <Input 
                        label="טלפון ליצירת קשר"
                        value={localSettings.studio_details?.phone || ''}
                        onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            studio_details: { ...prev.studio_details, phone: e.target.value }
                        }))}
                        placeholder="050-1234567"
                    />
                    <Input 
                        label="כתובת אימייל"
                        value={localSettings.studio_details?.email || ''}
                        onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            studio_details: { ...prev.studio_details, email: e.target.value }
                        }))}
                        placeholder="info@yuvalstudio.com"
                    />
                 </div>
            </Card>

            <Card>
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-brand-primary" /> שעות פעילות
                    </h3>
                 </div>

                 {validationError && (
                     <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                         <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                         <p className="text-sm">{validationError}</p>
                     </div>
                 )}
                 
                 <div className="space-y-4">
                     {days.map((dayName, i) => {
                         const dayKey = i.toString();
                         // Use existing settings OR fallback to default
                         const dayConfig = localSettings.working_hours[dayKey] || DEFAULT_WORKING_HOURS[dayKey];
                         
                         return (
                             <div key={i} className={`p-4 rounded-xl border transition-all ${dayConfig.isOpen ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent opacity-60'}`}>
                                 <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                                     {/* Day Name & Toggle */}
                                     <div className="w-full sm:w-32 flex items-center justify-between shrink-0">
                                         <span className="text-white font-medium">{dayName}</span>
                                         <button 
                                            onClick={() => toggleDayOpen(dayKey)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${dayConfig.isOpen ? 'bg-brand-primary' : 'bg-slate-700'}`}
                                         >
                                             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dayConfig.isOpen ? 'translate-x-6' : 'translate-x-1'}`} />
                                         </button>
                                     </div>

                                     {/* Ranges */}
                                     <div className="flex-1 flex flex-wrap gap-3 items-center">
                                         {dayConfig.isOpen ? (
                                             <>
                                                 {(dayConfig.ranges || []).map((range, rangeIdx) => (
                                                     <div key={rangeIdx} className="flex items-center gap-2 bg-brand-dark/50 p-1.5 rounded-lg border border-brand-border">
                                                         <select 
                                                             value={range.start}
                                                             onChange={(e) => updateRange(dayKey, rangeIdx, 'start', parseInt(e.target.value))}
                                                             className="bg-transparent text-white text-sm outline-none cursor-pointer"
                                                         >
                                                             {Array.from({length: 25}, (_, h) => h).map(h => (
                                                                 <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                                                             ))}
                                                         </select>
                                                         <span className="text-slate-500">-</span>
                                                         <select 
                                                             value={range.end}
                                                             onChange={(e) => updateRange(dayKey, rangeIdx, 'end', parseInt(e.target.value))}
                                                             className="bg-transparent text-white text-sm outline-none cursor-pointer"
                                                         >
                                                             {Array.from({length: 25}, (_, h) => h).map(h => (
                                                                 <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                                                             ))}
                                                         </select>
                                                         
                                                         {/* Allow deleting if more than 1 range, OR even if 1 to allow clearing */}
                                                         <button 
                                                            onClick={() => removeRange(dayKey, rangeIdx)}
                                                            className="ml-1 p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                         >
                                                             <X className="w-3 h-3" />
                                                         </button>
                                                     </div>
                                                 ))}
                                                 
                                                 <button 
                                                    type="button"
                                                    onClick={() => addRange(dayKey)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-brand-primary/50 hover:bg-brand-primary/10 transition-all"
                                                    title="הוסף משמרת נוספת"
                                                 >
                                                     <Plus className="w-4 h-4" />
                                                 </button>
                                             </>
                                         ) : (
                                             <span className="text-sm text-slate-500 italic px-2 hidden sm:inline">סגור</span>
                                         )}
                                     </div>
                                 </div>
                             </div>
                         );
                     })}
                     
                     <div className="pt-6 mt-4 border-t border-white/5 flex justify-end">
                         <Button onClick={handleSave} isLoading={saving}>
                             <Save className="w-4 h-4" /> שמור שינויים
                         </Button>
                     </div>
                 </div>
            </Card>
        </div>
    );
};


// --- Main Admin Page ---

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data State
  const [stats, setStats] = useState({ revenue: 0, appointments: 0, pending: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [settings, setSettings] = useState<StudioSettings>({ working_hours: DEFAULT_WORKING_HOURS, studio_details: DEFAULT_STUDIO_DETAILS, monthly_goals: DEFAULT_MONTHLY_GOALS });

  // Filter State
  const [filteredAppointmentId, setFilteredAppointmentId] = useState<string | null>(null);

  // Modal State
  const [apptToCancel, setApptToCancel] = useState<Appointment | null>(null);

  const loadData = async () => {
     const [apptsData, servicesData, statsData, galleryData, settingsData] = await Promise.all([
         api.getAppointments(),
         api.getServices(),
         api.getMonthlyStats(),
         api.getGallery(),
         api.getSettings()
     ]);
     setAppointments(apptsData);
     setServices(servicesData);
     setStats(statsData);
     setGallery(galleryData);
     setSettings(settingsData);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '2007') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('סיסמה שגויה');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
      await api.updateAppointmentStatus(id, status);
      loadData(); // Refresh
  };

  const handleConfirmCancel = async () => {
      if (!apptToCancel) return;
      await api.updateAppointmentStatus(apptToCancel.id, 'cancelled');
      setApptToCancel(null);
      loadData();
  };

  const handleAddService = async (service: any) => {
      await api.addService(service);
      loadData();
  }

  const handleUpdateService = async (id: string, updates: any) => {
      await api.updateService(id, updates);
      loadData();
  }

  const handleDeleteService = async (id: string) => {
      if(window.confirm('האם אתה בטוח שברצונך למחוק שירות זה?')) {
          await api.deleteService(id);
          loadData();
      }
  }

  const handleGalleryUpload = async (url: string) => {
      await api.addToGallery(url);
      loadData();
  }
  
  const handleUpdateSettings = async (newSettings: StudioSettings) => {
      await api.updateSettings(newSettings);
      loadData();
  }

  const handleViewAppointment = (id: string) => {
      setFilteredAppointmentId(id);
      setActiveTab('appointments');
  }

  const handleClearFilter = () => {
      setFilteredAppointmentId(null);
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif text-white mb-2">גישה למנהלים בלבד</h2>
            <p className="text-slate-400 text-sm mb-8">אנא הזן סיסמת גישה למערכת</p>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <Input 
                label="סיסמה" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הכנס סיסמה"
                className="text-center text-lg"
                autoFocus
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" className="w-full">
                כניסה
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark pt-24 pb-12">
        <div className="container mx-auto px-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                   <h1 className="text-3xl font-serif text-white mb-1">לוח בקרה</h1>
                   <p className="text-slate-400 text-sm">ניהול סטודיו חכם</p>
                </div>
                <div className="flex gap-2 p-1 bg-brand-surface/50 rounded-xl overflow-x-auto max-w-full">
                    {[
                        { id: 'dashboard', icon: Activity, label: 'ראשי' },
                        { id: 'appointments', icon: Calendar, label: 'יומן תורים' },
                        { id: 'services', icon: Edit2, label: 'שירותים' },
                        { id: 'gallery', icon: ImageIcon, label: 'גלריה' },
                        { id: 'settings', icon: SettingsIcon, label: 'הגדרות' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); if(tab.id !== 'appointments') handleClearFilter(); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-brand-primary text-brand-dark shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'dashboard' && (
                        <DashboardTab 
                            stats={stats} 
                            appointments={appointments} 
                            onViewAppointment={handleViewAppointment}
                            settings={settings}
                            onUpdateSettings={handleUpdateSettings}
                        />
                    )}
                    {activeTab === 'appointments' && (
                        <AppointmentsTab 
                            appointments={appointments} 
                            onStatusUpdate={handleStatusUpdate} 
                            onCancelRequest={(apt: Appointment) => setApptToCancel(apt)}
                            filterId={filteredAppointmentId}
                            onClearFilter={handleClearFilter}
                            studioAddress={settings.studio_details?.address}
                        />
                    )}
                    {activeTab === 'services' && (
                        <ServicesTab 
                            services={services} 
                            onAddService={handleAddService} 
                            onUpdateService={handleUpdateService} 
                            onDeleteService={handleDeleteService} 
                        />
                    )}
                    {activeTab === 'gallery' && <GalleryTab gallery={gallery} onUpload={handleGalleryUpload} />}
                    {activeTab === 'settings' && <SettingsTab settings={settings} onUpdate={handleUpdateSettings} />}
                </motion.div>
            </AnimatePresence>
            
            {/* Cancel Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!apptToCancel}
                onClose={() => setApptToCancel(null)}
                onConfirm={handleConfirmCancel}
                title="ביטול תור"
                description={`האם את/ה בטוח/ה שברצונך לבטל את התור של ${apptToCancel?.client_name} לתאריך ${apptToCancel?.start_time ? new Date(apptToCancel.start_time).toLocaleDateString('he-IL') : ''}? פעולה זו היא סופית.`}
                confirmText="כן, בטל תור"
                cancelText="חזור"
                variant="danger"
            />
        </div>
    </div>
  );
};

export default Admin;