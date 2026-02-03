import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/mockApi';
import { Card, Button, Input, ConfirmationModal, Modal, SectionHeading } from '../components/ui';
import { Appointment, Service, StudioSettings, TimeRange } from '../types';
import { DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS, DEFAULT_MONTHLY_GOALS } from '../constants';
import { 
  Activity, Calendar as CalendarIcon, DollarSign, 
  Lock, Check, X, Clock, Plus, 
  Trash2, Image as ImageIcon, Settings as SettingsIcon, Edit2, Send, Save, AlertCircle, Filter, MapPin, ChevronRight, ChevronLeft, Loader2, FileText, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';

const m = motion as any;

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

const AppointmentsList = ({ appointments, onStatusUpdate, onCancelRequest, filterId, onClearFilter, studioAddress, onDownloadPdf }: any) => {
    const rowRefs = useRef<{[key: string]: HTMLTableRowElement | null}>({});

    useEffect(() => {
        if (filterId && rowRefs.current[filterId]) {
            setTimeout(() => {
                rowRefs.current[filterId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [filterId]);

    return (
        <Card className="p-0 overflow-hidden bg-brand-surface/30 border-white/5">
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
                {appointments.length > 0 ? appointments.map((apt: any) => {
                    const isHighlighted = apt.id === filterId;
                    return (
                        <tr 
                            key={apt.id} 
                            ref={(el) => { rowRefs.current[apt.id] = el; }}
                            className={`transition-colors duration-300 ${isHighlighted ? 'bg-brand-primary/20 hover:bg-brand-primary/25 shadow-[inset_3px_0_0_0_#d4b585]' : 'hover:bg-white/[0.02]'}`}
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
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-white/5 border border-white/10 whitespace-nowrap">
                                {apt.service_name || 'שירות כללי'}
                                </span>
                                {apt.notes && <div className="text-xs text-brand-primary mt-1 max-w-[150px] truncate" title={apt.notes}>{apt.notes}</div>}
                            </td>
                            <td className="py-4 px-6">
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
                            <td className="py-4 px-6">
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
    );
};

const DashboardTab = ({ stats, appointments, onViewAppointment, settings, onUpdateSettings }: any) => {
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
              <CalendarIcon className="w-6 h-6" />
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
                              <m.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${revenuePercent}%` }}
                              className="h-full bg-brand-primary"
                              ></m.div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-400">יעד תורים ({appointmentGoal})</span>
                              <span className="text-brand-primary">{Math.round(apptPercent)}%</span>
                          </div>
                          <div className="h-2 bg-brand-dark rounded-full overflow-hidden">
                              <m.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${apptPercent}%` }}
                              className="h-full bg-brand-secondary"
                              ></m.div>
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
};

const CalendarTab = ({ appointments, onStatusUpdate, onCancelRequest, studioAddress, onDownloadPdf }: any) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
    const listRef = useRef<HTMLDivElement>(null);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    const appointmentsByDay = appointments.reduce((acc: any, apt: any) => {
        const date = new Date(apt.start_time);
        if (date.getMonth() === month && date.getFullYear() === year) {
            const day = date.getDate();
            if (!acc[day]) acc[day] = [];
            acc[day].push(apt);
        }
        return acc;
    }, {});

    const nextMonth = () => { setCurrentMonth(new Date(year, month + 1)); setSelectedDay(null); };
    const prevMonth = () => { setCurrentMonth(new Date(year, month - 1)); setSelectedDay(null); };

    const selectedAppointments = selectedDay ? (appointmentsByDay[selectedDay] || []).sort((a: any, b: any) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ) : [];

    const handleDayClick = (day: number) => {
        setSelectedDay(day);
        setTimeout(() => {
            listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    return (
        <div className="flex flex-col gap-8">
            <Card className="p-0 overflow-hidden bg-brand-surface/40 backdrop-blur-xl border-white/5">
                {/* Header */}
                <div className="p-4 flex items-center justify-between bg-white/[0.02] border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-serif text-white leading-none">
                                {currentMonth.toLocaleDateString('he-IL', { month: 'long' })}
                            </h3>
                            <p className="text-slate-500 text--[10px] mt-1 uppercase tracking-widest">{year}</p>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all active:scale-95">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all active:scale-95">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 bg-white/[0.01] border-b border-white/5">
                    {weekDays.map(day => (
                        <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-500">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Grid */}
                <div className="grid grid-cols-7 gap-px bg-white/5">
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-brand-dark/30 min-h-[80px]" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const date = new Date(year, month, day);
                        const dayAppointments = appointmentsByDay[day] || [];
                        const count = dayAppointments.length;
                        const isCurrent = isToday(date);
                        const isActive = selectedDay === day;

                        return (
                            <div 
                                key={day} 
                                onClick={() => handleDayClick(day)}
                                className={`min-h-[80px] sm:min-h-[120px] p-2 cursor-pointer transition-all relative border-white/5 bg-brand-dark/50 flex flex-col justify-between hover:bg-white/5 ${isActive ? 'bg-white/5 ring-1 ring-inset ring-brand-primary/50 z-10' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isCurrent ? 'bg-brand-primary text-brand-dark' : (isActive ? 'text-brand-primary' : 'text-slate-400')}`}>
                                        {day}
                                    </span>
                                </div>
                                
                                <div className="flex flex-wrap gap-1 content-end">
                                    {dayAppointments.slice(0, 4).map((apt: any, idx: number) => (
                                        <div 
                                            key={idx} 
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                apt.status === 'confirmed' ? 'bg-emerald-500' : (apt.status === 'cancelled' ? 'bg-red-500' : 'bg-amber-500')
                                            }`} 
                                        />
                                    ))}
                                    {count > 4 && <span className="text-[8px] text-slate-600">+</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Selected Day List */}
            <div ref={listRef} className="scroll-mt-24">
                <AnimatePresence mode="wait">
                    {selectedDay && (
                        <m.div
                            key={selectedDay}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                             <div className="flex items-center justify-between mb-4 px-1">
                                <h4 className="text-xl font-medium text-white">
                                    תורים ליום {selectedDay} ב{currentMonth.toLocaleDateString('he-IL', { month: 'long' })}
                                </h4>
                                <span className="text-sm text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                    {selectedAppointments.length} תורים
                                </span>
                            </div>

                            <AppointmentsList 
                                appointments={selectedAppointments}
                                onStatusUpdate={onStatusUpdate}
                                onCancelRequest={onCancelRequest}
                                studioAddress={studioAddress}
                                onDownloadPdf={onDownloadPdf}
                            />
                        </m.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const ServicesTab = ({ services, onAddService, onUpdateService, onDeleteService }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentService, setCurrentService] = useState<Partial<Service>>({ category: 'Ear', pain_level: 1 });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-save effect for existing services
    useEffect(() => {
        if (currentService.id && isEditing) {
            setSaving(true);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            
            debounceRef.current = setTimeout(async () => {
                await onUpdateService(currentService.id, currentService);
                setSaving(false);
            }, 1000);
        }
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [currentService]);

    const handleCreate = async () => {
        if (!currentService.name || !currentService.price) return;
        
        let imageUrl = currentService.image_url;
        if (fileInputRef.current?.files?.[0]) {
            setUploading(true);
            const url = await api.uploadImage(fileInputRef.current.files[0], 'service-images');
            if (url) imageUrl = url;
            setUploading(false);
        }

        const serviceData = { ...currentService, image_url: imageUrl };
        await onAddService(serviceData);
        setIsEditing(false);
        setCurrentService({ category: 'Ear', pain_level: 1 });
    };
    
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setUploading(true);
            const url = await api.uploadImage(e.target.files[0], 'service-images');
            setUploading(false);
            if (url) {
                setCurrentService(prev => ({ ...prev, image_url: url }));
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between mb-6">
                <h3 className="text-xl font-medium text-white">רשימת טיפולים</h3>
                <Button onClick={() => { setCurrentService({ category: 'Ear', pain_level: 1 }); setIsEditing(true); }} className="text-sm py-2 px-4">
                    <Plus className="w-4 h-4" /> הוסף חדש
                </Button>
            </div>

            {isEditing && (
                <Card className="mb-8 border-brand-primary/50 bg-brand-surface/80">
                    <div className="flex justify-between items-center mb-4">
                         <h4 className="text-white">{currentService.id ? 'עריכת שירות' : 'שירות חדש'}</h4>
                         {currentService.id && (
                             <div className="flex items-center gap-2">
                                {saving ? (
                                    <span className="text-xs text-brand-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> שומר...</span>
                                ) : (
                                    <span className="text-xs text-slate-500 flex items-center gap-1"><Check className="w-3 h-3"/> נשמר</span>
                                )}
                             </div>
                         )}
                    </div>
                    
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
                         <label className="text-sm font-medium text-slate-400 ms-1 mb-2 block">
                             רמת כאב: {currentService.pain_level || 1}
                         </label>
                         <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={currentService.pain_level || 1} 
                            onChange={e => setCurrentService({...currentService, pain_level: parseInt(e.target.value)})}
                            className="w-full accent-brand-primary h-2 bg-brand-dark/50 rounded-lg appearance-none cursor-pointer"
                         />
                         <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
                             <span>קל</span>
                             <span>בינוני</span>
                             <span>כואב</span>
                         </div>
                    </div>

                    <div className="mb-4">
                         <label className="text-sm font-medium text-slate-400 ms-1 mb-2 block">תמונה</label>
                         <input type="file" ref={fileInputRef} onChange={handleImageChange} className="text-slate-400 text-sm" accept="image/*" />
                         {uploading && <div className="text-xs text-brand-primary mt-1">מעלה תמונה...</div>}
                         {currentService.image_url && <img src={currentService.image_url} alt="preview" className="h-20 w-20 object-cover mt-2 rounded-lg border border-white/10" />}
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setIsEditing(false)}>סגור</Button>
                        {!currentService.id && (
                            <Button onClick={handleCreate} isLoading={uploading}>צור שירות</Button>
                        )}
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
                                <div className="text-xs text-slate-500 flex gap-2">
                                    <span>{service.duration_minutes} דק'</span>
                                    <span>•</span>
                                    <span>כאב: {service.pain_level || 1}/10</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}

const GalleryTab = ({ gallery, onUpload, onDelete, services, settings, onUpdateSettings }: any) => {
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<any>(null);
    const [isTagging, setIsTagging] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files?.[0]) {
            setUploading(true);
            const url = await api.uploadImage(e.target.files[0], 'gallery-images');
            if(url) await onUpload(url);
            setUploading(false);
        }
    }

    const toggleTag = async (serviceId: string) => {
        if (!selectedImage) return;

        const currentTags = settings.gallery_tags?.[selectedImage.id] || [];
        const isTagged = currentTags.includes(serviceId);
        
        let newTags;
        if (isTagged) {
            newTags = currentTags.filter((id: string) => id !== serviceId);
        } else {
            newTags = [...currentTags, serviceId];
        }

        const newSettings = {
            ...settings,
            gallery_tags: {
                ...settings.gallery_tags,
                [selectedImage.id]: newTags
            }
        };

        await onUpdateSettings(newSettings);
        // Optimistic UI update or wait for reload logic from parent
    }

    const currentImageTags = selectedImage ? (settings.gallery_tags?.[selectedImage.id] || []) : [];

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
                 {gallery.map((item: any) => (
                     <div key={item.id} className="aspect-square rounded-xl overflow-hidden border border-white/5 relative group">
                         <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                             <button onClick={() => { setSelectedImage(item); setIsTagging(true); }} className="px-4 py-2 bg-brand-primary text-brand-dark rounded-full hover:bg-white transition-colors flex items-center gap-2 font-medium text-xs shadow-lg">
                                 <Tag className="w-3 h-3" /> תייג מוצרים
                             </button>
                             <button onClick={() => onDelete(item.id)} className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-colors" title="מחק תמונה">
                                 <Trash2 className="w-4 h-4" />
                             </button>
                         </div>
                         {/* Tag Indicator */}
                         {(settings.gallery_tags?.[item.id]?.length > 0) && (
                             <div className="absolute bottom-2 left-2 bg-brand-dark/80 backdrop-blur-sm p-1 rounded-md border border-white/10">
                                 <Tag className="w-3 h-3 text-brand-primary" />
                             </div>
                         )}
                     </div>
                 ))}
             </div>

             <Modal
                isOpen={isTagging && selectedImage}
                onClose={() => { setIsTagging(false); setSelectedImage(null); }}
                title="תיוג מוצרים לתמונה"
             >
                 <div className="text-right">
                     <p className="text-sm text-slate-400 mb-4">בחר את השירותים המופיעים בתמונה זו כדי לאפשר ללקוחות להזמין אותם ישירות.</p>
                     
                     <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                         {services.map((service: any) => {
                             const isSelected = currentImageTags.includes(service.id);
                             return (
                                 <div 
                                    key={service.id}
                                    onClick={() => toggleTag(service.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-brand-primary/20 border-brand-primary' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                 >
                                     <div className="flex items-center gap-3">
                                         <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-brand-primary border-brand-primary' : 'border-slate-500'}`}>
                                             {isSelected && <Check className="w-3 h-3 text-brand-dark" />}
                                         </div>
                                         <span className={isSelected ? 'text-white font-medium' : 'text-slate-300'}>{service.name}</span>
                                     </div>
                                     <span className="text-xs text-slate-500">₪{service.price}</span>
                                 </div>
                             )
                         })}
                     </div>
                     
                     <div className="mt-6 flex justify-end">
                         <Button onClick={() => { setIsTagging(false); setSelectedImage(null); }}>סיים</Button>
                     </div>
                 </div>
             </Modal>
        </div>
    )
}

const SettingsTab = ({ settings, onUpdate }: any) => {
    const [localSettings, setLocalSettings] = useState<StudioSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onUpdate(localSettings);
        setIsSaving(false);
    };

    const toggleDay = (dayIndex: string) => {
        const currentDay = localSettings.working_hours[dayIndex] || { isOpen: false, ranges: [] };
        const newDay = { ...currentDay, isOpen: !currentDay.isOpen };
        // If opening and no ranges, add default
        if (newDay.isOpen && (!newDay.ranges || newDay.ranges.length === 0)) {
            newDay.ranges = [{ start: 10, end: 18 }];
        }
        
        setLocalSettings({
            ...localSettings,
            working_hours: {
                ...localSettings.working_hours,
                [dayIndex]: newDay
            }
        });
    };

    const updateTime = (dayIndex: string, type: 'start' | 'end', value: number) => {
        const currentDay = localSettings.working_hours[dayIndex];
        if (!currentDay || !currentDay.ranges[0]) return;
        
        const newRanges = [...currentDay.ranges];
        newRanges[0] = { ...newRanges[0], [type]: value };
        
        setLocalSettings({
            ...localSettings,
            working_hours: {
                ...localSettings.working_hours,
                [dayIndex]: { ...currentDay, ranges: newRanges }
            }
        });
    };

    const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    return (
        <div className="space-y-8">
            <Card>
                <SectionHeading title="פרטי העסק" subtitle="מידע כללי" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="שם הסטודיו" 
                        value={localSettings.studio_details.name} 
                        onChange={(e) => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, name: e.target.value}})}
                    />
                    <Input 
                        label="טלפון" 
                        value={localSettings.studio_details.phone} 
                        onChange={(e) => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, phone: e.target.value}})}
                    />
                    <Input 
                        label="כתובת" 
                        value={localSettings.studio_details.address} 
                        onChange={(e) => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, address: e.target.value}})}
                    />
                    <Input 
                        label="אימייל" 
                        value={localSettings.studio_details.email} 
                        onChange={(e) => setLocalSettings({...localSettings, studio_details: {...localSettings.studio_details, email: e.target.value}})}
                    />
                </div>
            </Card>

            <Card>
                <SectionHeading title="שעות פעילות" subtitle="ניהול ימים ושעות" />
                <div className="space-y-4">
                    {weekDays.map((dayName, idx) => {
                        const dayIndex = idx.toString();
                        const config = localSettings.working_hours[dayIndex] || { isOpen: false, ranges: [] };
                        const range = config.ranges[0] || { start: 10, end: 18 };

                        return (
                            <div key={dayIndex} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${config.isOpen ? 'bg-brand-primary' : 'bg-slate-600'}`} onClick={() => toggleDay(dayIndex)}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${config.isOpen ? 'translate-x-0' : '-translate-x-4'}`}></div>
                                    </div>
                                    <span className={`font-medium ${config.isOpen ? 'text-white' : 'text-slate-500'}`}>{dayName}</span>
                                </div>
                                
                                {config.isOpen ? (
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={range.start} 
                                            onChange={(e) => updateTime(dayIndex, 'start', parseInt(e.target.value))}
                                            className="bg-brand-dark border border-white/10 rounded-lg px-2 py-1 text-sm outline-none"
                                        >
                                            {Array.from({length: 24}).map((_, i) => (
                                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                            ))}
                                        </select>
                                        <span className="text-slate-400">-</span>
                                        <select 
                                            value={range.end} 
                                            onChange={(e) => updateTime(dayIndex, 'end', parseInt(e.target.value))}
                                            className="bg-brand-dark border border-white/10 rounded-lg px-2 py-1 text-sm outline-none"
                                        >
                                            {Array.from({length: 24}).map((_, i) => (
                                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-500">סגור</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} isLoading={isSaving} className="min-w-[150px]">
                    <Save className="w-4 h-4" /> שמור שינויים
                </Button>
            </div>
        </div>
    );
};

const ConsentPdfTemplate = ({ data, settings }: { data: Appointment, settings: StudioSettings }) => {
    return (
        <div id="pdf-template" className="bg-white text-black p-12 max-w-[800px] mx-auto font-sans direction-rtl" style={{ direction: 'rtl' }}>
            <div className="text-center border-b-2 border-black pb-8 mb-8">
                <h1 className="text-4xl font-serif font-bold mb-2">{settings.studio_details.name}</h1>
                <p className="text-sm text-gray-600">{settings.studio_details.address} | {settings.studio_details.phone}</p>
                <h2 className="text-2xl font-bold mt-6 underline">הצהרת בריאות ואישור ביצוע פירסינג</h2>
            </div>

            <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-lg mb-4 border-b border-gray-300 pb-2">פרטי הלקוח/ה</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><strong>שם מלא:</strong> {data.client_name}</p>
                    <p><strong>תעודת זהות:</strong> _________________</p>
                    <p><strong>טלפון:</strong> {data.client_phone}</p>
                    <p><strong>תאריך:</strong> {new Date(data.start_time).toLocaleDateString('he-IL')}</p>
                    <p><strong>שירות מבוקש:</strong> {data.service_name || 'פירסינג'}</p>
                </div>
            </div>

            <div className="mb-8 text-sm leading-relaxed">
                <h3 className="font-bold text-lg mb-4">הצהרת הלקוח/ה:</h3>
                <ul className="list-disc list-inside space-y-2">
                    <li>אני מצהיר/ה כי אני מעל גיל 16, או מלווה ע"י הורה/אפוטרופוס חוקי שחתם על אישור זה.</li>
                    <li>אני מצהיר/ה כי איני תחת השפעת אלכוהול או סמים.</li>
                    <li>אני מצהיר/ה כי איני סובל/ת ממחלות המועברות בדם (כגון צהבת, HIV וכו').</li>
                    <li>אני מצהיר/ה כי איני סובל/ת מבעיות קרישת דם, סוכרת לא מאוזנת, מחלות לב, אפילפסיה או אלרגיות למתכות (כגון ניקל).</li>
                    <li>נשים: אני מצהיר/ה כי איני בהריון ואיני מניקה (רלוונטי לפירסינג בפטמה/טבור).</li>
                    <li>ידוע לי כי ביצוע הפירסינג כרוך בפציעה מבוקרת של העור וכי קיימים סיכונים לזיהום, צלקות, דחייה של התכשיט או תגובה אלרגית.</li>
                    <li>קיבלתי הסבר מפורט על אופן הטיפול בפירסינג והבנתי את חשיבות השמירה על היגיינה.</li>
                    <li>אני משחרר/ת את הסטודיו ואת הפירסר/ית מכל אחריות לנזק שיגרם כתוצאה מטיפול לקוי שלי או אי-מילוי הוראות הטיפול.</li>
                </ul>
            </div>

            <div className="flex justify-between items-end mt-12 pt-8 border-t border-black">
                <div className="text-center">
                    {data.signature ? (
                        <img src={data.signature} alt="Client Signature" className="h-16 mx-auto mb-2" />
                    ) : (
                        <div className="h-16 mb-2"></div>
                    )}
                    <p className="border-t border-black px-8 pt-2">חתימת הלקוח/ה</p>
                </div>
                <div className="text-center">
                    <div className="h-16 mb-2 flex items-end justify-center font-script text-2xl">Yuval</div>
                    <p className="border-t border-black px-8 pt-2">חתימת הפירסר/ית</p>
                </div>
            </div>
            
            <div className="mt-12 text-center text-xs text-gray-500">
                נערך ביום {new Date().toLocaleDateString('he-IL')} | {new Date().toLocaleTimeString('he-IL')}
            </div>
        </div>
    );
};

const Admin: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    
    const [stats, setStats] = useState({ revenue: 0, appointments: 0, pending: 0 });
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [gallery, setGallery] = useState<any[]>([]);
    const [settings, setSettings] = useState<StudioSettings>({ working_hours: DEFAULT_WORKING_HOURS, studio_details: DEFAULT_STUDIO_DETAILS, monthly_goals: DEFAULT_MONTHLY_GOALS, gallery_tags: {} });
  
    const [filteredAppointmentId, setFilteredAppointmentId] = useState<string | null>(null);
    const [apptToCancel, setApptToCancel] = useState<Appointment | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [pdfData, setPdfData] = useState<Appointment | null>(null);
    const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);
  
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
        loadData();
    };
  
    const handleConfirmCancel = async () => {
        if (!apptToCancel) return;
        const currentNotes = apptToCancel.notes || '';
        const notesWithReason = cancelReason.trim() ? `סיבת ביטול: ${cancelReason}\n${currentNotes}` : currentNotes;
        await api.updateAppointment(apptToCancel.id, { status: 'cancelled', notes: notesWithReason });
        setApptToCancel(null);
        setCancelReason('');
        loadData();
    };
  
    const handleAddService = async (service: any) => { await api.addService(service); loadData(); }
    const handleUpdateService = async (id: string, updates: any) => { await api.updateService(id, updates); loadData(); }
    const handleDeleteService = async (id: string) => { if(window.confirm('האם אתה בטוח?')) { await api.deleteService(id); loadData(); } }
    const handleGalleryUpload = async (url: string) => { await api.addToGallery(url); loadData(); }
    
    // Updated delete logic
    const handleDeleteGalleryImage = (id: string) => { setImageToDeleteId(id); }
    const handleConfirmDeleteGalleryImage = async () => {
        if (imageToDeleteId) {
            await api.deleteFromGallery(imageToDeleteId);
            setImageToDeleteId(null);
            loadData();
        }
    }

    const handleUpdateSettings = async (newSettings: StudioSettings) => { await api.updateSettings(newSettings); loadData(); }
    const handleViewAppointment = (id: string) => { setFilteredAppointmentId(id); setActiveTab('appointments'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    const handleClearFilter = () => { setFilteredAppointmentId(null); }
    
    // PDF Logic
    const handleDownloadPdf = async (apt: Appointment) => {
        setPdfData(apt);
        setTimeout(async () => {
            const input = document.getElementById('pdf-template');
            if (input) {
                try {
                    const canvas = await html2canvas(input, { scale: 2, useCORS: true, logging: false });
                    const imgData = canvas.toDataURL('image/jpeg', 0.75);
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
                    pdf.save(`Consent_${apt.client_name}.pdf`);
                } catch (err) { alert("שגיאה ביצירת ה-PDF"); }
            }
            setPdfData(null);
        }, 100);
    };
  
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 pt-20">
          <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-serif text-white mb-2">גישה למנהלים בלבד</h2>
              <p className="text-slate-400 text-sm mb-8">אנא הזן סיסמת גישה למערכת</p>
              <form onSubmit={handleLogin} className="space-y-6">
                <Input label="סיסמה" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="הכנס סיסמה" className="text-center text-lg" autoFocus />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" className="w-full">כניסה</Button>
              </form>
            </Card>
          </m.div>
        </div>
      );
    }
  
    return (
      <div className="min-h-screen bg-brand-dark pt-24 pb-12">
          <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                  <div>
                     <h1 className="text-3xl font-serif text-white mb-1">לוח בקרה</h1>
                     <p className="text-slate-400 text-sm">ניהול סטודיו חכם</p>
                  </div>
                  <div className="flex gap-2 p-1 bg-brand-surface/50 rounded-xl overflow-x-auto max-w-full">
                      {[
                          { id: 'dashboard', icon: Activity, label: 'ראשי' },
                          { id: 'calendar', icon: CalendarIcon, label: 'יומן' },
                          { id: 'appointments', icon: Filter, label: 'כל התורים' },
                          { id: 'services', icon: Edit2, label: 'שירותים' },
                          { id: 'gallery', icon: ImageIcon, label: 'גלריה' },
                          { id: 'settings', icon: SettingsIcon, label: 'הגדרות' }
                      ].map(tab => (
                          <button
                              key={tab.id}
                              onClick={() => { setActiveTab(tab.id); if(tab.id !== 'appointments') handleClearFilter(); }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-primary text-brand-dark shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                          >
                              <tab.icon className="w-4 h-4" />
                              <span className="hidden md:inline">{tab.label}</span>
                          </button>
                      ))}
                  </div>
              </div>
  
              <AnimatePresence mode="wait">
                  <m.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                      {activeTab === 'dashboard' && <DashboardTab stats={stats} appointments={appointments} onViewAppointment={handleViewAppointment} settings={settings} onUpdateSettings={handleUpdateSettings} />}
                      {activeTab === 'calendar' && <CalendarTab appointments={appointments} onStatusUpdate={handleStatusUpdate} onCancelRequest={(apt: Appointment) => { setApptToCancel(apt); setCancelReason(''); }} studioAddress={settings.studio_details?.address} onDownloadPdf={handleDownloadPdf} />}
                      {activeTab === 'appointments' && <AppointmentsList appointments={appointments} onStatusUpdate={handleStatusUpdate} onCancelRequest={(apt: Appointment) => { setApptToCancel(apt); setCancelReason(''); }} filterId={filteredAppointmentId} onClearFilter={handleClearFilter} studioAddress={settings.studio_details?.address} onDownloadPdf={handleDownloadPdf} />}
                      {activeTab === 'services' && <ServicesTab services={services} onAddService={handleAddService} onUpdateService={handleUpdateService} onDeleteService={handleDeleteService} />}
                      {activeTab === 'gallery' && <GalleryTab gallery={gallery} onUpload={handleGalleryUpload} onDelete={handleDeleteGalleryImage} services={services} settings={settings} onUpdateSettings={handleUpdateSettings} />}
                      {activeTab === 'settings' && <SettingsTab settings={settings} onUpdate={handleUpdateSettings} />}
                  </m.div>
              </AnimatePresence>
              
              <ConfirmationModal
                  isOpen={!!apptToCancel}
                  onClose={() => setApptToCancel(null)}
                  onConfirm={handleConfirmCancel}
                  title="ביטול תור"
                  description={`האם את/ה בטוח/ה שברצונך לבטל את התור של ${apptToCancel?.client_name} לתאריך ${apptToCancel?.start_time ? new Date(apptToCancel.start_time).toLocaleDateString('he-IL') : ''}?`}
                  confirmText="כן, בטל תור"
                  cancelText="חזור"
                  variant="danger"
              >
                  <div className="text-right">
                      <label className="text-sm text-slate-400 mb-2 block">סיבת ביטול (אופציונלי):</label>
                      <textarea className="w-full bg-brand-dark/50 border border-brand-border text-white px-4 py-3 rounded-xl outline-none text-sm placeholder:text-slate-600 focus:border-red-500/50 min-h-[80px]" placeholder="למשל: לא חש בטוב / בקשת הלקוח..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                      <p className="text-xs text-slate-500 mt-2">הסיבה תופיע בהודעת הוואטסאפ שתישלח ללקוח</p>
                  </div>
              </ConfirmationModal>

              <ConfirmationModal
                  isOpen={!!imageToDeleteId}
                  onClose={() => setImageToDeleteId(null)}
                  onConfirm={handleConfirmDeleteGalleryImage}
                  title="מחיקת תמונה"
                  description="האם אתה בטוח שברצונך למחוק את התמונה מהגלריה? פעולה זו אינה הפיכה."
                  confirmText="מחק תמונה"
                  cancelText="ביטול"
                  variant="danger"
              />
  
              <div className="fixed top-0 left-0 -z-50 overflow-hidden h-0 w-0">
                  {pdfData && <ConsentPdfTemplate data={pdfData} settings={settings} />}
              </div>
          </div>
      </div>
    );
  };
  
export default Admin;