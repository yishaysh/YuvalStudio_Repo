import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Check, Loader2, ArrowRight, Zap, Droplets, Info } from 'lucide-react';
import { Service, BookingStep } from '../types';
import { api, TimeSlot } from '../services/mockApi';
import { Button, Card, Input } from '../components/ui';

// --- Local Data Enhancements ---
// Since the DB types are simple, we map extra visual data locally for the "Wow" factor
const SERVICE_META: Record<string, { pain: number; healing: string }> = {
    'Ear': { pain: 3, healing: '4-8 שבועות' },
    'Face': { pain: 5, healing: '2-4 חודשים' },
    'Body': { pain: 4, healing: '3-6 חודשים' },
    'Jewelry': { pain: 0, healing: '-' }
};

const getMeta = (category: string) => SERVICE_META[category] || { pain: 2, healing: 'משתנה' };

const Booking: React.FC = () => {
  const [step, setStep] = useState<BookingStep>(BookingStep.SELECT_SERVICE);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  // Selection State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getServices().then((data) => {
        setServices(data);
        setFilteredServices(data);
    });
  }, []);

  useEffect(() => {
      if (activeCategory === 'All') {
          setFilteredServices(services);
      } else {
          setFilteredServices(services.filter(s => s.category === activeCategory));
      }
  }, [activeCategory, services]);

  useEffect(() => {
      if (selectedDate) {
          setIsLoadingSlots(true);
          api.getAvailability(selectedDate).then((slots) => {
              setAvailableSlots(slots);
              setIsLoadingSlots(false);
          });
      }
  }, [selectedDate]);

  const generateCalendarDays = () => {
      const today = new Date();
      const days = [];
      for(let i = 0; i < 14; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          days.push(d);
      }
      return days;
  };

  const handleBook = async () => {
      if(!selectedService || !selectedDate || !selectedSlot) return;
      setIsSubmitting(true);
      const [hours, minutes] = selectedSlot.split(':').map(Number);
      const date = new Date(selectedDate);
      date.setHours(hours, minutes);

      try {
        await api.createAppointment({
            service_id: selectedService.id,
            start_time: date.toISOString(),
            client_name: formData.name,
            client_phone: formData.phone,
            client_email: formData.email,
            notes: formData.notes
        });
        setStep(BookingStep.CONFIRMATION);
      } catch (err) {
          console.error(err);
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- Components ---

  const PainLevel = ({ level }: { level: number }) => (
      <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className={`w-1.5 h-4 rounded-full transition-all ${i <= level ? 'bg-brand-primary shadow-[0_0_8px_rgba(212,181,133,0.6)]' : 'bg-white/10'}`} 
              />
          ))}
      </div>
  );

  const categories = [
      { id: 'All', label: 'הכל' },
      { id: 'Ear', label: 'אוזניים' },
      { id: 'Face', label: 'פנים' },
      { id: 'Body', label: 'גוף' },
  ];

  return (
    <div className="min-h-screen bg-brand-dark pt-24 pb-12 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
            
            <div className="flex flex-col lg:flex-row gap-8 relative">
                
                {/* LEFT SIDE: MAIN CONTENT */}
                <div className="flex-1 z-10">
                    <div className="mb-8">
                        <h1 className="text-4xl font-serif text-white mb-2">
                            {step === BookingStep.SELECT_SERVICE && 'בחירת טיפול'}
                            {step === BookingStep.SELECT_DATE && 'תאריך ושעה'}
                            {step === BookingStep.DETAILS && 'פרטים אחרונים'}
                            {step === BookingStep.CONFIRMATION && 'אישור הזמנה'}
                        </h1>
                        <p className="text-slate-400 flex items-center gap-2">
                            <span className="bg-brand-primary/10 text-brand-primary text-xs px-2 py-0.5 rounded-full border border-brand-primary/20">שלב {step} מתוך 3</span>
                            {step === BookingStep.SELECT_SERVICE && 'בחר את הפירסינג המושלם בשבילך'}
                            {step === BookingStep.SELECT_DATE && 'מתי נוח לך להגיע אלינו?'}
                            {step === BookingStep.DETAILS && 'כדי שנוכל לשמור לך את התור'}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {/* STEP 1: SERVICE SELECTION */}
                        {step === BookingStep.SELECT_SERVICE && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {/* Category Filter */}
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`px-6 py-2 rounded-full text-sm transition-all whitespace-nowrap border ${
                                                activeCategory === cat.id 
                                                ? 'bg-white text-brand-dark border-white font-medium' 
                                                : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Service Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredServices.map((service) => {
                                        const meta = getMeta(service.category);
                                        const isSelected = selectedService?.id === service.id;
                                        return (
                                            <motion.div
                                                layout
                                                key={service.id}
                                                onClick={() => setSelectedService(service)}
                                                className={`relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-300 group ${
                                                    isSelected 
                                                    ? 'border-brand-primary bg-brand-primary/5 shadow-[0_0_30px_rgba(212,181,133,0.1)]' 
                                                    : 'border-white/5 bg-brand-surface/50 hover:border-brand-primary/30'
                                                }`}
                                            >
                                                <div className="flex h-32">
                                                    <div className="w-32 shrink-0 relative overflow-hidden">
                                                        <img src={service.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-brand-dark/20 group-hover:bg-transparent transition-colors" />
                                                    </div>
                                                    <div className="flex-1 p-4 flex flex-col justify-between">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className={`font-medium text-lg ${isSelected ? 'text-brand-primary' : 'text-white'}`}>{service.name}</h3>
                                                            <span className="text-brand-primary font-serif font-bold">₪{service.price}</span>
                                                        </div>
                                                        
                                                        <div className="flex items-end justify-between mt-2">
                                                            <div className="text-xs text-slate-400 space-y-1">
                                                                <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {service.duration_minutes} דקות</div>
                                                                <div className="flex items-center gap-1.5"><Droplets className="w-3 h-3" /> החלמה: {meta.healing}</div>
                                                            </div>
                                                            
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">רמת כאב</span>
                                                                <PainLevel level={meta.pain} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: DATE & TIME */}
                        {step === BookingStep.SELECT_DATE && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <h3 className="text-white font-medium flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-brand-primary"/> בחר תאריך
                                    </h3>
                                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                                        {generateCalendarDays().map((date, i) => {
                                            const isSelected = selectedDate?.toDateString() === date.toDateString();
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                                                    className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-xl border transition-all ${
                                                        isSelected 
                                                        ? 'bg-white text-brand-dark border-white scale-105 shadow-lg' 
                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-brand-primary/50 hover:text-white'
                                                    }`}
                                                >
                                                    <span className="text-xs">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                                                    <span className="text-xl font-bold font-serif">{date.getDate()}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4 min-h-[200px]">
                                    <h3 className="text-white font-medium flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-brand-primary"/> בחר שעה
                                    </h3>
                                    {!selectedDate ? (
                                        <div className="text-slate-600 text-sm border border-dashed border-white/10 rounded-xl p-8 text-center">אנא בחר תאריך כדי לראות שעות פנויות</div>
                                    ) : isLoadingSlots ? (
                                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
                                    ) : (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                                            {availableSlots.length > 0 ? availableSlots.map((slot, i) => (
                                                <button
                                                    key={i}
                                                    disabled={!slot.available}
                                                    onClick={() => setSelectedSlot(slot.time)}
                                                    className={`py-2 rounded-lg text-sm border transition-all ${
                                                        selectedSlot === slot.time
                                                        ? 'bg-brand-primary text-brand-dark border-brand-primary font-bold shadow-[0_0_15px_rgba(212,181,133,0.4)]'
                                                        : slot.available
                                                            ? 'bg-white/5 border-white/10 text-white hover:border-brand-primary/50'
                                                            : 'bg-transparent border-transparent text-slate-700 cursor-not-allowed decoration-slate-700'
                                                    }`}
                                                >
                                                    {slot.time}
                                                </button>
                                            )) : (
                                                <div className="col-span-full text-center text-slate-500 py-8">אין תורים פנויים לתאריך זה.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: DETAILS */}
                        {step === BookingStep.DETAILS && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <Card className="border-none bg-white/5">
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Input 
                                                label="שם מלא" 
                                                value={formData.name}
                                                onChange={e => setFormData({...formData, name: e.target.value})}
                                            />
                                            <Input 
                                                label="טלפון" 
                                                type="tel"
                                                value={formData.phone}
                                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                            />
                                        </div>
                                        <Input 
                                            label="אימייל (לקבלת אישור)" 
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                        />
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-400 ms-1">הערות / בקשות מיוחדות</label>
                                            <textarea 
                                                className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 min-h-[100px]"
                                                value={formData.notes}
                                                onChange={e => setFormData({...formData, notes: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* STEP 4: CONFIRMATION */}
                        {step === BookingStep.CONFIRMATION && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12"
                            >
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 ring-1 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                    <Check className="w-10 h-10" />
                                </div>
                                <h2 className="text-4xl font-serif text-white mb-4">תודה רבה!</h2>
                                <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
                                    התור שלך ל{selectedService?.name} נקבע בהצלחה.<br/>
                                    שלחנו לך הודעת אישור לנייד ולמייל.
                                </p>
                                <Button onClick={() => window.location.href = '/'}>
                                    חזרה לדף הבית
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation Buttons (Desktop: Bottom Left, Mobile: Fixed Bottom) */}
                    {step < BookingStep.CONFIRMATION && (
                        <div className="mt-8 flex items-center gap-4">
                            {step > 1 && (
                                <button 
                                    onClick={() => setStep(step - 1)} 
                                    className="px-6 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    חזרה
                                </button>
                            )}
                            <Button 
                                onClick={() => {
                                    if(step === BookingStep.SELECT_SERVICE) setStep(BookingStep.SELECT_DATE);
                                    else if(step === BookingStep.SELECT_DATE) setStep(BookingStep.DETAILS);
                                    else if(step === BookingStep.DETAILS) handleBook();
                                }}
                                disabled={
                                    (step === BookingStep.SELECT_SERVICE && !selectedService) ||
                                    (step === BookingStep.SELECT_DATE && (!selectedDate || !selectedSlot)) ||
                                    (step === BookingStep.DETAILS && (!formData.name || !formData.phone)) ||
                                    isSubmitting
                                }
                                isLoading={isSubmitting}
                                className="flex-1 md:flex-none md:min-w-[200px]"
                            >
                                {step === BookingStep.DETAILS ? 'אשר וקבע תור' : 'המשך'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE: DYNAMIC TICKET (Sticky) */}
                <div className="hidden lg:block w-80 relative">
                    <div className="sticky top-28">
                        <div className="relative bg-brand-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                            {/* Ticket Header */}
                            <div className="bg-brand-primary p-6 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                <h2 className="text-brand-dark font-serif font-bold text-xl relative z-10">סיכום הזמנה</h2>
                                <div className="text-brand-dark/70 text-xs font-medium uppercase tracking-widest relative z-10">Yuval Studio</div>
                            </div>

                            {/* Ticket Body */}
                            <div className="p-6 space-y-6">
                                {/* Service Info */}
                                <div className={`transition-all duration-500 ${selectedService ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-2 grayscale'}`}>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">טיפול נבחר</div>
                                    <div className="font-medium text-white text-lg">{selectedService?.name || '---'}</div>
                                    <div className="text-brand-primary">{selectedService ? `₪${selectedService.price}` : ''}</div>
                                </div>

                                <div className="w-full h-[1px] bg-white/10 border-t border-dashed border-white/20"></div>

                                {/* Date Info */}
                                <div className={`transition-all duration-500 ${selectedDate && selectedSlot ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-2 grayscale'}`}>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">מועד התור</div>
                                    <div className="font-medium text-white text-lg">
                                        {selectedDate ? selectedDate.toLocaleDateString('he-IL', {day:'numeric', month:'long'}) : '---'}
                                    </div>
                                    <div className="text-slate-300">
                                        {selectedSlot || '--:--'}
                                    </div>
                                </div>

                                <div className="w-full h-[1px] bg-white/10 border-t border-dashed border-white/20"></div>

                                {/* Total */}
                                <div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-slate-400 text-sm">סה"כ לתשלום</span>
                                        <span className="text-3xl font-serif text-white">{selectedService ? `₪${selectedService.price}` : '0'}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        * התשלום מתבצע בסטודיו בסיום הטיפול
                                    </p>
                                </div>
                            </div>

                            {/* Ticket Bottom Design */}
                            <div className="bg-brand-dark h-3 w-full relative">
                                <div className="absolute -top-3 w-full h-3 bg-[radial-gradient(circle,transparent_50%,#1e293b_50%)] bg-[length:12px_12px] rotate-180"></div>
                            </div>
                        </div>
                        
                        {/* Trust Badges */}
                        <div className="mt-6 flex justify-center gap-4 text-slate-500">
                            <div className="flex items-center gap-1.5 text-xs"><Check className="w-3 h-3 text-brand-primary" /> ללא מקדמה</div>
                            <div className="flex items-center gap-1.5 text-xs"><Info className="w-3 h-3 text-brand-primary" /> ביטול ללא עלות</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Booking;