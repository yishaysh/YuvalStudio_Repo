
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../services/mockApi';
import { Card, Button, Input, ConfirmationModal, Modal, SectionHeading } from '../components/ui';
import { Appointment, Service, StudioSettings, TimeRange } from '../types';
import { DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS, DEFAULT_MONTHLY_GOALS } from '../constants';
import { 
  Activity, Calendar as CalendarIcon, DollarSign, 
  Lock, Check, X, Clock, Plus, 
  Trash2, Image as ImageIcon, Settings as SettingsIcon, Edit2, Send, Save, AlertCircle, Filter, MapPin, ChevronRight, ChevronLeft, Loader2, FileText, Tag, Minus
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
                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                        <h4 className="text-lg font-medium text-white">{currentService.id ? 'עריכת טיפול' : 'הוספת טיפול חדש'}</h4>
                        {saving && <span className="text-xs text-brand-primary animate-pulse">שומר...</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                            <Input 
                                label="שם הטיפול" 
                                value={currentService.name || ''} 
                                onChange={e => setCurrentService({...currentService, name: e.target.value})} 
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="מחיר (₪)" 
                                    type="number" 
                                    value={currentService.price || ''} 
                                    onChange={e => setCurrentService({...currentService, price: Number(e.target.value)})} 
                                />
                                <Input 
                                    label="משך זמן (דק')" 
                                    type="number" 
                                    value={currentService.duration_minutes || 30} 
                                    onChange={e => setCurrentService({...currentService, duration_minutes: Number(e.target.value)})} 
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-400 ms-1 block mb-2">קטגוריה</label>
                                <div className="flex gap-2">
                                    {['Ear', 'Face', 'Body'].map(cat => (
                                        <button 
                                            key={cat} 
                                            onClick={() => setCurrentService({...currentService, category: cat as any})}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${currentService.category === cat ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                        >
                                            {cat === 'Ear' ? 'אוזניים' : cat === 'Face' ? 'פנים' : 'גוף'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-400 ms-1">תיאור</label>
                                <textarea 
                                    className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 min-h-[80px]"
                                    value={currentService.description || ''}
                                    onChange={e => setCurrentService({...currentService, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-brand-dark border-2 border-dashed border-white/10 flex items-center justify-center group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                {currentService.image_url ? (
                                    <img src={currentService.image_url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="text-center text-slate-500">
                                        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <span className="text-xs">לחץ להעלאת תמונה</span>
                                    </div>
                                )}
                                {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white"/></div>}
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                            
                            <div>
                                <label className="text-sm font-medium text-slate-400 ms-1 block mb-2">רמת כאב (1-10)</label>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-brand-primary"
                                    value={currentService.pain_level || 1} 
                                    onChange={e => setCurrentService({...currentService, pain_level: Number(e.target.value)})} 
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>קל</span>
                                    <span>{currentService.pain_level}</span>
                                    <span>כואב</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button onClick={() => setIsEditing(false)} variant="ghost" className="text-slate-400">ביטול</Button>
                        <Button onClick={handleCreate} isLoading={uploading || saving} disabled={!currentService.name}>
                            {currentService.id ? 'סיים עריכה' : 'צור טיפול'}
                        </Button>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s: Service) => (
                    <div key={s.id} className="bg-brand-surface/50 border border-white/5 p-4 rounded-xl flex gap-4 group hover:border-brand-primary/30 transition-colors relative overflow-hidden">
                        <div className="w-20 h-20 bg-brand-dark rounded-lg overflow-hidden shrink-0 relative">
                            {s.image_url && <img src={s.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="font-medium text-white truncate">{s.name}</h4>
                                <span className="text-brand-primary font-serif font-bold text-sm">₪{s.price}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description}</p>
                            <div className="mt-3 flex gap-2">
                                <button onClick={() => { setCurrentService(s); setIsEditing(true); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-xs text-white bg-white/10 px-3 py-1.5 rounded-lg hover:bg-brand-primary hover:text-brand-dark transition-colors">ערוך</button>
                                <button onClick={() => onDeleteService(s.id)} className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-colors">מחק</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SettingsTab = ({ settings, onUpdateSettings }: any) => {
    const [workingHours, setWorkingHours] = useState(settings.working_hours || DEFAULT_WORKING_HOURS);
    const [details, setDetails] = useState(settings.studio_details || DEFAULT_STUDIO_DETAILS);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onUpdateSettings({ ...settings, working_hours: workingHours, studio_details: details });
        setIsSaving(false);
    };

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    const updateDay = (dayIndex: string, field: string, value: any) => {
        const day = workingHours[dayIndex] || { isOpen: false, ranges: [] };
        if (field === 'isOpen') {
             setWorkingHours({ ...workingHours, [dayIndex]: { ...day, isOpen: value, ranges: value ? (day.ranges.length ? day.ranges : [{start: 10, end: 18}]) : [] } });
        } else if (field === 'start') {
             const newRanges = [...day.ranges];
             if(newRanges.length > 0) newRanges[0].start = Number(value);
             setWorkingHours({ ...workingHours, [dayIndex]: { ...day, ranges: newRanges } });
        } else if (field === 'end') {
             const newRanges = [...day.ranges];
             if(newRanges.length > 0) newRanges[0].end = Number(value);
             setWorkingHours({ ...workingHours, [dayIndex]: { ...day, ranges: newRanges } });
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <SectionHeading title="פרטי העסק" subtitle="מופיע באתר ובחשבוניות" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="שם הסטודיו" value={details.name} onChange={e => setDetails({...details, name: e.target.value})} />
                    <Input label="טלפון" value={details.phone} onChange={e => setDetails({...details, phone: e.target.value})} />
                    <Input label="כתובת" value={details.address} onChange={e => setDetails({...details, address: e.target.value})} />
                    <Input label="אימייל" value={details.email} onChange={e => setDetails({...details, email: e.target.value})} />
                </div>
            </Card>

            <Card>
                <SectionHeading title="שעות פעילות" subtitle="הגדרת זמני קבלת קהל" />
                <div className="space-y-4">
                    {Object.keys(workingHours).map((dayIndex) => {
                        const day = workingHours[dayIndex];
                        const range = day.ranges && day.ranges[0] ? day.ranges[0] : { start: 10, end: 18 };
                        
                        return (
                            <div key={dayIndex} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="w-20 font-medium text-slate-300">{days[Number(dayIndex)]}</div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={day.isOpen} onChange={(e) => updateDay(dayIndex, 'isOpen', e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                                </label>
                                
                                {day.isOpen ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="flex items-center gap-2 bg-brand-dark rounded-lg px-3 py-1 border border-white/10">
                                            <input 
                                                type="number" 
                                                min="0" max="23" 
                                                className="bg-transparent w-8 text-center outline-none" 
                                                value={range.start} 
                                                onChange={(e) => updateDay(dayIndex, 'start', e.target.value)}
                                            />
                                            <span>:00</span>
                                        </div>
                                        <span className="text-slate-500">-</span>
                                        <div className="flex items-center gap-2 bg-brand-dark rounded-lg px-3 py-1 border border-white/10">
                                            <input 
                                                type="number" 
                                                min="0" max="23" 
                                                className="bg-transparent w-8 text-center outline-none" 
                                                value={range.end} 
                                                onChange={(e) => updateDay(dayIndex, 'end', e.target.value)}
                                            />
                                            <span>:00</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-slate-500 text-sm flex-1">סגור</span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Card>

            <div className="sticky bottom-6 flex justify-end">
                <Button onClick={handleSave} isLoading={isSaving} className="shadow-2xl">
                    <Save className="w-4 h-4" /> שמור שינויים
                </Button>
            </div>
        </div>
    );
};

const Admin = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [settings, setSettings] = useState<StudioSettings | null>(null);
    const [stats, setStats] = useState({ revenue: 0, appointments: 0, pending: 0 });
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters & Modals
    const [filterId, setFilterId] = useState<string | null>(null);
    const [modalData, setModalData] = useState<{ isOpen: boolean, type: 'cancel' | null, item: any | null }>({ isOpen: false, type: null, item: null });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [appts, srvs, stgs, sts] = await Promise.all([
            api.getAppointments(),
            api.getServices(),
            api.getSettings(),
            api.getMonthlyStats()
        ]);
        setAppointments(appts);
        setServices(srvs);
        setSettings(stgs);
        setStats(sts);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchData();
    }, [isAuthenticated, fetchData]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === '1234') { // Mock password
            setIsAuthenticated(true);
        } else {
            alert('סיסמה שגויה');
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
        // Implementation for PDF generation
        const doc = new jsPDF();
        doc.addFont("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto"); 
        
        doc.setFontSize(20);
        doc.text("Health Declaration", 105, 20, { align: "center" });
        
        doc.setFontSize(12);
        doc.text(`Client: ${apt.client_name}`, 20, 40);
        doc.text(`ID: ${apt.notes?.match(/ת\.ז: (\d+)/)?.[1] || 'N/A'}`, 20, 50);
        doc.text(`Date: ${new Date(apt.start_time).toLocaleDateString()}`, 20, 60);
        
        if (apt.signature) {
             doc.text("Signature:", 20, 80);
             doc.addImage(apt.signature, 'PNG', 20, 90, 100, 50);
        }

        doc.save(`declaration_${apt.client_name}.pdf`);
    };

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
                            onChange={(e) => setPassword(e.target.value)} 
                            autoFocus
                        />
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
        <div className="min-h-screen bg-brand-dark pb-20 pt-24">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 shrink-0 space-y-2">
                         {[
                             { id: 'dashboard', label: 'לוח בקרה', icon: Activity },
                             { id: 'calendar', label: 'יומן תורים', icon: CalendarIcon },
                             { id: 'services', label: 'ניהול שירותים', icon: SettingsIcon },
                             { id: 'settings', label: 'הגדרות עסק', icon: MapPin },
                         ].map(item => (
                             <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-brand-primary text-brand-dark font-medium shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                             >
                                 <item.icon className="w-5 h-5" />
                                 {item.label}
                             </button>
                         ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                         <AnimatePresence mode="wait">
                             <m.div
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
                                        settings={settings}
                                        onUpdateSettings={(newSettings: StudioSettings) => {
                                            api.updateSettings(newSettings).then(fetchData);
                                        }}
                                        onViewAppointment={(id: string) => {
                                            setFilterId(id);
                                            setActiveTab('calendar');
                                        }}
                                     />
                                 )}
                                 {activeTab === 'calendar' && (
                                     <CalendarTab 
                                        appointments={appointments}
                                        filterId={filterId}
                                        onClearFilter={() => setFilterId(null)}
                                        studioAddress={settings.studio_details.address}
                                        onStatusUpdate={async (id: string, status: string) => {
                                            await api.updateAppointmentStatus(id, status);
                                            fetchData();
                                        }}
                                        onCancelRequest={(item: any) => setModalData({ isOpen: true, type: 'cancel', item })}
                                        onDownloadPdf={handleDownloadPdf}
                                     />
                                 )}
                                 {activeTab === 'services' && (
                                     <ServicesTab 
                                        services={services}
                                        onAddService={async (s: Service) => { await api.addService(s); fetchData(); }}
                                        onUpdateService={async (id: string, s: Partial<Service>) => { await api.updateService(id, s); fetchData(); }}
                                        onDeleteService={async (id: string) => { await api.deleteService(id); fetchData(); }}
                                     />
                                 )}
                                 {activeTab === 'settings' && (
                                     <SettingsTab 
                                        settings={settings}
                                        onUpdateSettings={async (s: StudioSettings) => { await api.updateSettings(s); fetchData(); }}
                                     />
                                 )}
                             </m.div>
                         </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmationModal 
                isOpen={modalData.isOpen && modalData.type === 'cancel'}
                onClose={() => setModalData({ ...modalData, isOpen: false })}
                onConfirm={handleCancelAppointment}
                title="ביטול תור"
                description="האם אתה בטוח שברצונך לבטל את התור? פעולה זו תשלח הודעת עדכון ללקוח."
                confirmText="בטל תור"
                variant="danger"
            />
        </div>
    );
};

export default Admin;
