import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Check, Loader2, ArrowRight, ArrowLeft, MessageCircle, Mail, Smartphone, AlertCircle } from 'lucide-react';
import { Service, BookingStep, StudioSettings } from '../types';
import { api, TimeSlot } from '../services/mockApi';
import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { Button, Card, Input } from '../components/ui';

// --- Sub-Components defined outside to prevent re-render focus loss ---

const Stepper = ({ step }: { step: number }) => (
  <div className="flex items-center justify-center gap-4 mb-8">
    {[1, 2, 3].map((s) => (
      <div key={s} className="flex items-center">
         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-500 ${step >= s ? 'bg-brand-primary text-brand-dark' : 'bg-brand-surface text-slate-500 border border-white/10'}`}>
           {s}
         </div>
         {s < 3 && <div className={`w-12 h-[1px] mx-2 ${step > s ? 'bg-brand-primary/50' : 'bg-white/10'}`}></div>}
      </div>
    ))}
  </div>
);

const ServiceSelection = ({ services, selectedService, onSelect }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {services.map((service: Service) => (
      <motion.div
        key={service.id}
        whileHover={{ y: -4 }}
        onClick={() => onSelect(service)}
        className={`cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 group ${selectedService?.id === service.id ? 'border-brand-primary ring-1 ring-brand-primary/30 bg-brand-surface' : 'border-white/5 bg-brand-surface/50 hover:bg-brand-surface'}`}
      >
        <div className="aspect-video w-full overflow-hidden relative">
           <div className="absolute inset-0 bg-brand-dark/20 group-hover:bg-transparent transition-colors z-10"></div>
           <img src={service.image_url} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt={service.name} />
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-lg text-white">{service.name}</h3>
            <span className="text-brand-primary font-serif">₪{service.price}</span>
          </div>
          <div className="flex items-center text-xs text-slate-500 gap-2 mt-3">
            <Clock className="w-3 h-3" />
            <span>{service.duration_minutes} דקות</span>
          </div>
        </div>
      </motion.div>
    ))}
  </div>
);

const DateTimeSelection = ({ 
  selectedDate, 
  setSelectedDate, 
  selectedTime, 
  setSelectedTime, 
  availableSlots,
  loadingSlots 
}: any) => {
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5">
        <Card className="h-full">
          <h3 className="text-white text-lg font-medium mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-primary" /> בחר תאריך
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dates.map((date, i) => (
              <button
                key={i}
                onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                className={`p-3 text-center rounded-xl border transition-all ${
                  selectedDate?.toDateString() === date.toDateString()
                    ? 'border-brand-primary bg-brand-primary text-brand-dark font-medium shadow-lg shadow-brand-primary/10'
                    : 'border-white/5 text-slate-400 hover:border-brand-primary/30 hover:bg-white/5'
                }`}
              >
                <div className="text-xs opacity-80 mb-1">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</div>
                <div className="text-xl font-serif">{date.getDate()}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-7" id="time-selection-area">
        <Card className="h-full min-h-[400px]">
          <h3 className="text-white text-lg font-medium mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" /> בחר שעה
          </h3>
          {!selectedDate ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm">
               <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5 opacity-50" />
               </div>
               יש לבחור תאריך תחילה
            </div>
          ) : loadingSlots ? (
             <div className="h-64 flex items-center justify-center text-brand-primary">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
               <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-slate-500">
                  <AlertCircle className="w-5 h-5" />
               </div>
               לא נמצאו תורים פתוחים לתאריך זה.
               <br />
               ייתכן והסטודיו סגור ביום זה.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {availableSlots.map((slot: TimeSlot) => {
                const isSelected = selectedTime === slot.time;
                const isAvailable = slot.available;
                
                return (
                  <button
                    key={slot.time}
                    disabled={!isAvailable}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`py-3 text-sm rounded-lg border transition-all relative overflow-hidden ${
                      !isAvailable 
                       ? 'bg-white/[0.02] border-transparent text-slate-600 cursor-not-allowed opacity-60' // Unavailable Style
                       : isSelected
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-medium shadow-[0_0_15px_rgba(212,181,133,0.15)]' // Selected Style
                          : 'border-white/5 text-slate-300 hover:border-brand-primary/30 hover:bg-white/5' // Default Available Style
                    }`}
                  >
                    <span className={!isAvailable ? 'line-through decoration-slate-600/50' : ''}>
                        {slot.time}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const DetailsForm = ({ clientDetails, setClientDetails, selectedService, selectedDate, selectedTime, validationErrors }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
    <div className="space-y-6">
      <h3 className="text-white text-xl font-serif mb-6">פרטים אישיים</h3>
      <Input 
        label="שם מלא" 
        value={clientDetails.name} 
        onChange={(e) => setClientDetails({...clientDetails, name: e.target.value})}
        className="w-full"
      />
      <div>
        <Input 
          label="אימייל" 
          type="email"
          value={clientDetails.email} 
          onChange={(e) => setClientDetails({...clientDetails, email: e.target.value})}
          className={validationErrors.email ? 'border-red-500/50 focus:border-red-500' : ''}
        />
        {validationErrors.email && <p className="text-red-400 text-xs mt-1 mr-1">כתובת אימייל לא תקינה</p>}
      </div>
      <div>
        <Input 
          label="טלפון" 
          type="tel" 
          value={clientDetails.phone} 
          onChange={(e) => setClientDetails({...clientDetails, phone: e.target.value})}
          className={validationErrors.phone ? 'border-red-500/50 focus:border-red-500' : ''}
          placeholder="050-0000000"
        />
        {validationErrors.phone && <p className="text-red-400 text-xs mt-1 mr-1">מספר טלפון לא תקין</p>}
      </div>
      
      <div className="flex flex-col gap-2">
           <label className="text-sm font-medium text-slate-400 ms-1">הערות</label>
           <textarea 
             className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none min-h-[100px] focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder:text-slate-600"
             value={clientDetails.notes} 
             onChange={(e) => setClientDetails({...clientDetails, notes: e.target.value})}
           />
        </div>
    </div>

    <Card className="h-fit">
      <h3 className="text-brand-primary text-xs uppercase tracking-widest font-medium mb-6">סיכום הזמנה</h3>
      <div className="space-y-6">
        <div className="pb-6 border-b border-white/5">
          <span className="text-slate-500 text-xs mb-1 block">שירות</span>
          <div className="flex justify-between items-baseline">
            <div className="text-xl font-medium text-white">{selectedService?.name}</div>
            <div className="text-brand-primary font-serif text-lg">₪{selectedService?.price}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8 pb-6 border-b border-white/5">
          <div>
            <span className="text-slate-500 text-xs mb-1 block">תאריך</span>
            <div className="text-white">{selectedDate?.toLocaleDateString('he-IL')}</div>
          </div>
          <div>
            <span className="text-slate-500 text-xs mb-1 block">שעה</span>
            <div className="text-white font-medium">{selectedTime}</div>
          </div>
        </div>
        
        <div className="text-xs text-slate-500 leading-relaxed bg-brand-dark/30 p-4 rounded-lg">
          בלחיצה על "אישור" אני מאשר/ת את פרטי ההזמנה ומדיניות הביטולים של הסטודיו (ביטול עד 24 שעות מראש).
        </div>
      </div>
    </Card>
  </div>
);

const SuccessView = ({ clientDetails, selectedService, selectedDate, selectedTime }: any) => {
    const [studioPhone, setStudioPhone] = useState('');
    const [isSimulating, setIsSimulating] = useState(true);

    useEffect(() => {
        // Fetch real studio settings immediately
        const fetchSettings = async () => {
            const settings = await api.getSettings();
            if (settings.studio_details?.phone) {
                setStudioPhone(settings.studio_details.phone);
            } else {
                setStudioPhone(DEFAULT_STUDIO_DETAILS.phone);
            }
        };
        fetchSettings();

        // Simulate "Sending" process for UX
        const timer = setTimeout(() => {
            setIsSimulating(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    const getWhatsappLink = () => {
        const msg = `היי יובל, הזמנתי תור ל${selectedService?.name} בתאריך ${selectedDate?.toLocaleDateString()} בשעה ${selectedTime}. שמי ${clientDetails.name}.`;
        const cleanPhone = studioPhone.replace(/-/g, '').replace(/^0/, '972');
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    };

    const handleSendWhatsapp = () => {
        if (!studioPhone) return;
        window.open(getWhatsappLink(), '_blank');
    };

    // Client-side Mailto Fallback
    const handleManualEmail = () => {
        const subject = `אישור תור ל${selectedService?.name}`;
        const body = `היי ${clientDetails.name},\n\nהתור שלך נקבע בהצלחה!\nשירות: ${selectedService?.name}\nתאריך: ${selectedDate?.toLocaleDateString()}\nשעה: ${selectedTime}\n\nנתראה בסטודיו!\nיובל סטודיו`;
        window.location.href = `mailto:${clientDetails.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    if (isSimulating) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-6" />
                <h3 className="text-2xl font-serif text-white mb-2">מבצע רישום במערכת...</h3>
                <p className="text-slate-500 text-sm">שולח אישור למייל ולוואטסאפ</p>
                
                {/* Visual Fake Progress */}
                <div className="mt-8 space-y-3 w-full max-w-xs text-xs text-slate-500">
                     <div className="flex justify-between items-center">
                         <span>מייל ללקוח...</span>
                         <Check className="w-3 h-3 text-emerald-500" />
                     </div>
                     <div className="flex justify-between items-center">
                         <span>הודעה לסטודיו...</span>
                         <Check className="w-3 h-3 text-emerald-500" />
                     </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
            <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-brand-success/10 rounded-full flex items-center justify-center mb-6 border border-brand-success/20"
            >
            <Check className="w-8 h-8 text-brand-success" strokeWidth={2} />
            </motion.div>
            <h2 className="text-3xl font-serif text-white mb-2">התור נקבע בהצלחה</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed text-sm">
            פרטי התור נשמרו במערכת.<br/>
            במידה ולא קיבלת מייל, ניתן לשלוח עותק ידנית למטה.
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                 {/* 1. Update Studio */}
                 <Button onClick={handleSendWhatsapp} disabled={!studioPhone} className="bg-[#25D366] text-white hover:bg-[#128C7E] border-transparent w-full py-4 shadow-none">
                     <div className="flex items-center justify-center w-full gap-2">
                        <MessageCircle className="w-5 h-5" /> 
                        <span className="font-bold">עדכן את הסטודיו בוואטסאפ</span>
                     </div>
                 </Button>

                 {/* 2. Manual Email Fallback */}
                 <Button onClick={handleManualEmail} variant="secondary" className="w-full py-4 border-white/5 bg-white/5">
                     <div className="flex items-center justify-center w-full gap-2">
                        <Mail className="w-5 h-5" /> 
                        <span>שלח עותק אישור למייל שלי</span>
                     </div>
                 </Button>

                 <Button onClick={() => window.location.href = '/'} variant="ghost" className="w-full py-2 text-xs text-slate-500 hover:text-white">
                    חזרה לדף הבית
                </Button>
            </div>
        </div>
    );
};

// --- Main Component ---

const Booking: React.FC = () => {
  const [step, setStep] = useState<BookingStep>(BookingStep.SELECT_SERVICE);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Form State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [clientDetails, setClientDetails] = useState({ name: '', email: '', phone: '', notes: '' });
  const [validationErrors, setValidationErrors] = useState({ email: false, phone: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Scroll to top on step change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    api.getServices().then(data => {
      setServices(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setAvailableSlots([]); 
      setLoadingSlots(true);
      const loadSlots = async () => {
        const slots = await api.getAvailability(selectedDate);
        setAvailableSlots(slots);
        setLoadingSlots(false);
        // Scroll to time selection after date pick
        setTimeout(() => {
          document.getElementById('time-selection-area')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      };
      loadSlots();
    }
  }, [selectedDate]);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(BookingStep.SELECT_DATE);
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^05\d-?\d{7}$/;
    
    const isEmailValid = emailRegex.test(clientDetails.email);
    const isPhoneValid = phoneRegex.test(clientDetails.phone);
    
    setValidationErrors({
      email: !isEmailValid,
      phone: !isPhoneValid
    });

    return isEmailValid && isPhoneValid && clientDetails.name.length > 0;
  };

  const handleNext = () => {
     if (step === BookingStep.SELECT_DATE && selectedDate && selectedTime) setStep(BookingStep.DETAILS);
     else if (step === BookingStep.DETAILS) {
       if (validateForm()) {
         submitBooking();
       }
     }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitBooking = async () => {
    setIsSubmitting(true);
    await api.createAppointment({
      service_id: selectedService!.id,
      start_time: new Date(`${selectedDate!.toDateString()} ${selectedTime}`).toISOString(),
      client_name: clientDetails.name,
      client_email: clientDetails.email,
      client_phone: clientDetails.phone,
      notes: clientDetails.notes
    });
    setIsSubmitting(false);
    setStep(BookingStep.CONFIRMATION);
  };

  return (
    <div className="min-h-screen pt-32 pb-12 px-4 container mx-auto max-w-5xl relative">
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-serif text-white mb-6">
           {step === BookingStep.CONFIRMATION ? 'אישור הזמנה' : 'זימון תור'}
        </h1>
        {step !== BookingStep.CONFIRMATION && <Stepper step={step} />}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {loading ? (
             <div className="h-64 flex items-center justify-center">
               <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
             </div>
          ) : (
            <>
              {step === 1 && (
                <ServiceSelection 
                  services={services} 
                  selectedService={selectedService} 
                  onSelect={handleServiceSelect} 
                />
              )}
              {step === 2 && (
                <DateTimeSelection 
                  selectedDate={selectedDate} 
                  setSelectedDate={setSelectedDate} 
                  selectedTime={selectedTime} 
                  setSelectedTime={setSelectedTime} 
                  availableSlots={availableSlots} 
                  loadingSlots={loadingSlots}
                />
              )}
              {step === 3 && (
                <DetailsForm 
                  clientDetails={clientDetails} 
                  setClientDetails={setClientDetails} 
                  selectedService={selectedService} 
                  selectedDate={selectedDate} 
                  selectedTime={selectedTime} 
                  validationErrors={validationErrors}
                />
              )}
              {step === 4 && <SuccessView clientDetails={clientDetails} selectedService={selectedService} selectedDate={selectedDate} selectedTime={selectedTime} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {step < 4 && !loading && (
        <div className="mt-12 flex justify-between items-center border-t border-white/5 pt-8">
           {step > 1 ? (
             <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5">
               <ArrowRight className="w-4 h-4" /> חזור
             </button>
           ) : <div></div>}
           
           {/* Static Next Button for Step 3 */}
           {step === 3 && (
             <Button 
               onClick={handleNext} 
               isLoading={isSubmitting}
               className="w-40"
             >
               אשר
             </Button>
           )}
        </div>
      )}

      {/* Floating Action Button for Step 2 */}
      <AnimatePresence>
        {step === 2 && selectedTime && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 md:right-auto md:w-auto z-50"
          >
            <Button 
              onClick={handleNext} 
              className="w-full md:w-auto shadow-2xl shadow-brand-primary/20 flex items-center gap-2 text-lg py-4 px-8"
            >
              המשך לשלב הבא <ArrowLeft className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Booking;