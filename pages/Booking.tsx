import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Check, Loader2, ArrowRight, ArrowLeft, MessageCircle, Mail, AlertCircle, MapPin, Sparkles } from 'lucide-react';
import { Service, BookingStep, StudioSettings } from '../types';
import { api, TimeSlot } from '../services/mockApi';
import { DEFAULT_STUDIO_DETAILS, DEFAULT_WORKING_HOURS } from '../constants';
import { Button, Card, Input } from '../components/ui';

// --- Interactive Anatomy Map Component ---

const AnatomyMap = ({ services, onSelect, selectedService }: { services: Service[], onSelect: (s: Service) => void, selectedService: Service | null }) => {
  const [view, setView] = useState<'ear' | 'face'>('ear');

  // Helper to find service by partial name match (since IDs might change in DB)
  const findService = (keyword: string) => services.find(s => s.name.includes(keyword) || s.category.includes(keyword));

  // Points configuration
  const earPoints = [
    { id: 'helix', x: 75, y: 15, label: 'הליקס', keyword: 'הליקס' },
    { id: 'industrial', x: 60, y: 10, label: 'אינדסטריאל', keyword: 'אינדסטריאל' },
    { id: 'tragus', x: 35, y: 45, label: 'טראגוס', keyword: 'טראגוס' }, // Adjusted from generic
    { id: 'lobe', x: 45, y: 85, label: 'תנוך', keyword: 'תנוך' },
    { id: 'conch', x: 55, y: 50, label: 'קונץ׳', keyword: 'קונץ' }, // Fallback generic
  ];

  const facePoints = [
    { id: 'nose', x: 50, y: 55, label: 'נזם', keyword: 'נזם' },
    { id: 'septum', x: 50, y: 62, label: 'ספטום', keyword: 'ספטום' },
    { id: 'eyebrow', x: 25, y: 35, label: 'גבה', keyword: 'גבה' }, // Fallback
    { id: 'lip', x: 50, y: 75, label: 'שפה', keyword: 'שפה' }, // Fallback
  ];

  const currentPoints = view === 'ear' ? earPoints : facePoints;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center min-h-[500px]">
      {/* Left Side: The Map */}
      <div className="relative order-2 md:order-1 flex flex-col items-center">
        {/* Toggle View */}
        <div className="flex gap-4 mb-8 bg-brand-surface p-1 rounded-full border border-white/5">
          <button 
            onClick={() => setView('ear')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${view === 'ear' ? 'bg-brand-primary text-brand-dark' : 'text-slate-400 hover:text-white'}`}
          >
            אוזן
          </button>
          <button 
             onClick={() => setView('face')}
             className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${view === 'face' ? 'bg-brand-primary text-brand-dark' : 'text-slate-400 hover:text-white'}`}
          >
            פנים
          </button>
        </div>

        {/* The SVG Illustration */}
        <div className="relative w-[300px] h-[400px] md:w-[400px] md:h-[500px]">
           <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
             <defs>
               <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor="#d4b585" stopOpacity="0.8" />
                 <stop offset="100%" stopColor="#c19f6e" stopOpacity="0.4" />
               </linearGradient>
               <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                 <feGaussianBlur stdDeviation="2" result="blur" />
                 <feComposite in="SourceGraphic" in2="blur" operator="over" />
               </filter>
             </defs>

             {/* Outlines */}
             {view === 'ear' ? (
               <motion.path 
                 initial={{ pathLength: 0, opacity: 0 }}
                 animate={{ pathLength: 1, opacity: 1 }}
                 transition={{ duration: 1.5, ease: "easeInOut" }}
                 d="M 45 90 C 25 90 20 70 20 50 C 20 20 40 5 60 5 C 85 5 90 25 90 45 C 90 70 75 90 45 90 Z M 60 15 C 75 15 80 30 80 45 C 80 60 70 75 50 75"
                 fill="none"
                 stroke="url(#goldGradient)"
                 strokeWidth="0.8"
                 strokeLinecap="round"
               />
             ) : (
               <motion.path 
                 initial={{ pathLength: 0, opacity: 0 }}
                 animate={{ pathLength: 1, opacity: 1 }}
                 transition={{ duration: 1.5, ease: "easeInOut" }}
                 d="M 20 20 Q 50 20 80 20 Q 90 50 80 80 Q 50 100 20 80 Q 10 50 20 20 M 40 55 Q 50 60 60 55 M 40 75 Q 50 80 60 75"
                 fill="none"
                 stroke="url(#goldGradient)"
                 strokeWidth="0.8"
                 strokeLinecap="round"
               />
             )}

             {/* Hotspots */}
             {currentPoints.map((point) => {
               const service = findService(point.keyword);
               // If no service found for this keyword, don't show point (or show disabled)
               if (!service) return null;

               const isSelected = selectedService?.id === service.id;

               return (
                 <g key={point.id} onClick={() => onSelect(service)} className="cursor-pointer group">
                   {/* Pulse Effect */}
                   <motion.circle
                     cx={point.x} cy={point.y}
                     r="3"
                     className="fill-brand-primary/20"
                     animate={{ r: [3, 8, 3], opacity: [0.5, 0, 0.5] }}
                     transition={{ duration: 2, repeat: Infinity }}
                   />
                   {/* Main Dot */}
                   <circle 
                     cx={point.x} cy={point.y} 
                     r={isSelected ? "2.5" : "1.5"} 
                     className={`transition-all duration-300 ${isSelected ? 'fill-brand-primary' : 'fill-white group-hover:fill-brand-primary'}`}
                   />
                   
                   {/* Label Line */}
                   <motion.line
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      x1={point.x} y1={point.y}
                      x2={point.x > 50 ? point.x + 10 : point.x - 10}
                      y2={point.y}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="0.2"
                   />
                   
                   {/* Label Text */}
                   <text 
                     x={point.x > 50 ? point.x + 12 : point.x - 12} 
                     y={point.y + 1} 
                     fontSize="3" 
                     className={`font-sans font-light ${isSelected ? 'fill-brand-primary' : 'fill-slate-400 group-hover:fill-white'}`}
                     textAnchor={point.x > 50 ? "start" : "end"}
                   >
                     {point.label}
                   </text>
                 </g>
               );
             })}
           </svg>
        </div>
      </div>

      {/* Right Side: Service Info / List Fallback */}
      <div className="order-1 md:order-2 h-full">
        <h3 className="text-2xl font-serif text-white mb-6 border-r-2 border-brand-primary pr-4">
           {selectedService ? 'הבחירה שלך' : 'בחר אזור לניקוב'}
        </h3>
        
        <AnimatePresence mode="wait">
          {selectedService ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-brand-surface border-brand-primary/30 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                 
                 <div className="relative z-10">
                   <div className="flex justify-between items-start mb-4">
                     <h2 className="text-3xl font-medium text-white">{selectedService.name}</h2>
                     <div className="text-3xl font-serif text-brand-primary">₪{selectedService.price}</div>
                   </div>
                   
                   <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3 text-slate-400">
                        <Clock className="w-4 h-4 text-brand-primary" />
                        <span>משך טיפול: <span className="text-white">{selectedService.duration_minutes} דקות</span></span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <Sparkles className="w-4 h-4 text-brand-primary" />
                        <span>רמת כאב: <span className="text-white">●●○○○ (קל)</span></span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        {selectedService.description}
                      </p>
                   </div>
                   
                   <div className="flex gap-3">
                     <button onClick={() => onSelect(null as any)} className="text-sm text-slate-500 hover:text-white underline">
                        בחר שירות אחר
                     </button>
                   </div>
                 </div>
              </Card>
            </motion.div>
          ) : (
             <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
             >
                <p className="text-slate-500 text-sm mb-4">
                   לחץ על האזורים במפה או בחר מהרשימה המלאה:
                </p>
                {services.filter(s => view === 'ear' ? s.category === 'Ear' : s.category !== 'Ear').map((service) => (
                   <div 
                      key={service.id}
                      onClick={() => onSelect(service)}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-brand-primary/20 cursor-pointer transition-all group"
                   >
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-lg bg-brand-dark overflow-hidden">
                            <img src={service.image_url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100" />
                         </div>
                         <div>
                            <div className="text-white font-medium text-sm group-hover:text-brand-primary transition-colors">{service.name}</div>
                            <div className="text-xs text-slate-500">{service.duration_minutes} דק'</div>
                         </div>
                      </div>
                      <div className="text-brand-primary/70 font-serif">₪{service.price}</div>
                   </div>
                ))}
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};


// --- Original Sub-Components ---

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

const DateTimeSelection = ({ 
  selectedDate, 
  setSelectedDate, 
  selectedTime, 
  setSelectedTime, 
  availableSlots,
  loadingSlots,
  workingHours
}: any) => {
  
  // Logic to generate valid dates based on Settings
  const generateAvailableDates = () => {
      const dates = [];
      let currentDate = new Date();
      let daysFound = 0;
      
      // Safety break after checking 60 days to prevent infinite loops if studio is closed for months
      let safetyCounter = 0;

      while (daysFound < 14 && safetyCounter < 60) {
          const dayIndex = currentDate.getDay().toString();
          // Check if explicit setting exists, or use default fallback if somehow missing
          const dayConfig = workingHours?.[dayIndex] || DEFAULT_WORKING_HOURS[dayIndex];

          if (dayConfig && dayConfig.isOpen) {
              dates.push(new Date(currentDate));
              daysFound++;
          }
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          safetyCounter++;
      }
      return dates;
  };

  const dates = generateAvailableDates();

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
                       ? 'bg-white/[0.02] border-transparent text-slate-600 cursor-not-allowed opacity-60' 
                       : isSelected
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-medium shadow-[0_0_15px_rgba(212,181,133,0.15)]' 
                          : 'border-white/5 text-slate-300 hover:border-brand-primary/30 hover:bg-white/5' 
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
                 <Button onClick={handleSendWhatsapp} disabled={!studioPhone} className="bg-[#25D366] text-white hover:bg-[#128C7E] border-transparent w-full py-4 shadow-none">
                     <div className="flex items-center justify-center w-full gap-2">
                        <MessageCircle className="w-5 h-5" /> 
                        <span className="font-bold">עדכן את הסטודיו בוואטסאפ</span>
                     </div>
                 </Button>

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
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  
  // Form State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [clientDetails, setClientDetails] = useState({ name: '', email: '', phone: '', notes: '' });
  const [validationErrors, setValidationErrors] = useState({ email: false, phone: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    const fetchData = async () => {
        const [loadedServices, loadedSettings] = await Promise.all([
            api.getServices(),
            api.getSettings()
        ]);
        setServices(loadedServices);
        setSettings(loadedSettings);
        setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setAvailableSlots([]); 
      setLoadingSlots(true);
      
      // Fix: Scroll immediately to make UX responsive
      setTimeout(() => {
        document.getElementById('time-selection-area')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);

      const loadSlots = async () => {
        const slots = await api.getAvailability(selectedDate);
        setAvailableSlots(slots);
        setLoadingSlots(false);
      };
      loadSlots();
    }
  }, [selectedDate]);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    // Don't auto advance, let user confirm selection in map view
  };

  const handleNext = () => {
     if (step === BookingStep.SELECT_SERVICE && selectedService) setStep(BookingStep.SELECT_DATE);
     else if (step === BookingStep.SELECT_DATE && selectedDate && selectedTime) setStep(BookingStep.DETAILS);
     else if (step === BookingStep.DETAILS) {
       if (validateForm()) {
         submitBooking();
       }
     }
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
                <AnatomyMap 
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
                  workingHours={settings?.working_hours}
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
           
           {step === 3 && (
             <Button onClick={handleNext} isLoading={isSubmitting} className="w-40">
               אשר
             </Button>
           )}
           
           {/* Step 1 Next Button (Only if service selected) */}
           {step === 1 && selectedService && (
             <Button onClick={handleNext} className="w-40 flex items-center gap-2">
                המשך <ArrowLeft className="w-4 h-4" />
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