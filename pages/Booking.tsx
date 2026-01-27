import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Check, Loader2, ArrowRight, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import { Service, BookingStep } from '../types';
import { api, TimeSlot } from '../services/mockApi';
import { Button, Card, Input } from '../components/ui';

// --- Interactive Anatomy Map Component ---

interface AnatomyPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  keyword: string; 
  type: 'stud' | 'ring' | 'barbell' | 'curved' | 'industrial' | 'septum'; 
  rotation?: number; // Optional rotation for the jewelry
}

// --- PRECISE COORDINATES (0-100 ViewBox) ---

const earPoints: AnatomyPoint[] = [
    // Industrial crosses from approx (28,25) to (82,20)
    { id: 'industrial', x: 55, y: 22, label: 'אינדסטריאל', keyword: 'אינדסטריאל', type: 'industrial', rotation: -15 }, 
    
    { id: 'helix-upper', x: 82, y: 18, label: 'הליקס', keyword: 'הליקס', type: 'ring' },
    { id: 'forward-helix', x: 28, y: 25, label: 'פורוורד הליקס', keyword: 'פורוורד', type: 'stud' },
    { id: 'rook', x: 45, y: 32, label: 'רוק', keyword: 'רוק', type: 'curved', rotation: -10 },
    { id: 'daith', x: 36, y: 46, label: 'דיית׳', keyword: 'דיית', type: 'ring' },
    { id: 'tragus', x: 23, y: 52, label: 'טראגוס', keyword: 'טראגוס', type: 'stud' },
    { id: 'snug', x: 80, y: 55, label: 'סנאג', keyword: 'סנאג', type: 'curved', rotation: 10 },
    { id: 'conch', x: 52, y: 55, label: 'קונץ׳', keyword: 'קונץ', type: 'ring' },
    { id: 'anti-tragus', x: 62, y: 72, label: 'אנטי-טראגוס', keyword: 'אנטי', type: 'stud' },
    { id: 'lobe-upper', x: 58, y: 80, label: 'תנוך עליון', keyword: 'תנוך', type: 'stud' },
    { id: 'lobe-main', x: 52, y: 89, label: 'תנוך', keyword: 'תנוך', type: 'stud' },
];

const facePoints: AnatomyPoint[] = [
    { id: 'eyebrow', x: 32, y: 34, label: 'גבה', keyword: 'גבה', type: 'curved', rotation: -15 },
    { id: 'bridge', x: 50, y: 34, label: 'ברידג׳', keyword: 'ברידג', type: 'barbell' },
    { id: 'nostril', x: 43, y: 57, label: 'נזם', keyword: 'נזם', type: 'stud' },
    { id: 'septum', x: 50, y: 63, label: 'ספטום', keyword: 'ספטום', type: 'septum' },
    { id: 'philtrum', x: 50, y: 69, label: 'מדוזה', keyword: 'מדוזה', type: 'stud' },
    { id: 'monroe', x: 36, y: 67, label: 'מונרו', keyword: 'מונרו', type: 'stud' },
    { id: 'labret-side', x: 38, y: 79, label: 'סייד ליפ', keyword: 'שפה', type: 'ring' },
    { id: 'labret-center', x: 50, y: 81, label: 'לאברט', keyword: 'לאברט', type: 'stud' },
    { id: 'vertical-labret', x: 50, y: 78, label: 'ורטיקל', keyword: 'ורטיקל', type: 'curved' },
];

const AnatomyMap = ({ services, onSelect, selectedService }: { services: Service[], onSelect: (s: Service | null) => void, selectedService: Service | null }) => {
  const [view, setView] = useState<'ear' | 'face'>('ear');
  const [hoverMessage, setHoverMessage] = useState<{ x: number, y: number, text: string } | null>(null);
  const [visualSelectionId, setVisualSelectionId] = useState<string | null>(null);

  useEffect(() => {
      if (selectedService) {
          const point = [...earPoints, ...facePoints].find(p => selectedService.name.includes(p.keyword));
          if (point) setVisualSelectionId(point.id);
      }
  }, [selectedService]);

  const findService = (keyword: string) => services.find(s => s.name.includes(keyword) || s.category.includes(keyword));

  const handlePointClick = (point: AnatomyPoint) => {
    setVisualSelectionId(point.id);
    const service = findService(point.keyword);
    if (service) {
      onSelect(service);
      setHoverMessage(null);
    } else {
      onSelect(null);
      setHoverMessage({ x: point.x, y: point.y, text: 'שירות זה אינו זמין כרגע' });
      setTimeout(() => setHoverMessage(null), 3000);
    }
  };

  const currentPoints = view === 'ear' ? earPoints : facePoints;

  const JewelryRenderer = ({ point, isSelected }: { point: AnatomyPoint, isSelected: boolean }) => {
     if (!isSelected) {
         return <circle cx={0} cy={0} r="2" className="fill-white/20 group-hover:fill-white/60 transition-colors" />;
     }

     const colorPrimary = "#d4b585"; 
     const colorHighlight = "#fffbeb"; 
     const glowFilter = "url(#jewelryGlow)";
     const rot = point.rotation || 0;

     switch(point.type) {
         case 'industrial':
             // Correct Industrial Barbell shape
             return (
                 <g filter={glowFilter} transform={`rotate(${rot})`}>
                     {/* Long bar connecting forward helix to outer helix */}
                     <motion.line 
                        x1="-28" y1="3" x2="28" y2="-3" 
                        stroke={colorPrimary} 
                        strokeWidth="1.8" 
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                     />
                     <circle cx="-28" cy="3" r="2.2" fill={colorHighlight} />
                     <circle cx="28" cy="-3" r="2.2" fill={colorHighlight} />
                 </g>
             );
         case 'septum':
             return (
                 <g filter={glowFilter} transform={`translate(0, 2)`}>
                     <motion.path 
                        d="M -4 -2 Q 0 5 4 -2" 
                        fill="none" 
                        stroke={colorPrimary} 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 1, pathLength: 1 }}
                     />
                     <circle cx="-4" cy="-2" r="1.2" fill={colorHighlight} />
                     <circle cx="4" cy="-2" r="1.2" fill={colorHighlight} />
                 </g>
             );
         case 'ring':
             return (
                 <g filter={glowFilter}>
                     <motion.circle 
                        r="4" 
                        fill="none" 
                        stroke={colorPrimary} 
                        strokeWidth="1.2" 
                        strokeDasharray="20 5" 
                        initial={{ rotate: 0, scale: 0 }}
                        animate={{ rotate: 360, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                     />
                     <circle cx="0" cy="4" r="1.5" fill={colorHighlight} />
                 </g>
             );
         case 'barbell': 
             return (
                 <g filter={glowFilter} transform={`rotate(${rot})`}>
                     <line x1="-6" y1="0" x2="6" y2="0" stroke={colorPrimary} strokeWidth="1.2" />
                     <circle cx="-6" cy="0" r="1.8" fill={colorHighlight} />
                     <circle cx="6" cy="0" r="1.8" fill={colorHighlight} />
                 </g>
             );
         case 'curved': 
             return (
                 <g filter={glowFilter} transform={`rotate(${rot})`}>
                     <motion.path 
                        d="M -4 -4 Q 0 0 4 4" 
                        fill="none" 
                        stroke={colorPrimary} 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                     />
                     <circle cx="-4" cy="-4" r="1.8" fill={colorHighlight} />
                     <circle cx="4" cy="4" r="1.8" fill={colorHighlight} />
                 </g>
             );
         case 'stud': 
         default:
             return (
                 <g filter={glowFilter}>
                    <motion.path 
                       d="M 0 -2.5 L 2 0 L 0 2.5 L -2 0 Z" 
                       fill={colorHighlight} 
                       initial={{ scale: 0 }}
                       animate={{ scale: [1, 1.2, 1] }}
                       transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                    />
                    <circle cx="0" cy="0" r="1.5" fill={colorHighlight} />
                 </g>
             );
     }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center min-h-[500px]">
      <div className="relative order-2 md:order-1 flex flex-col items-center">
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

        <div className="relative w-[300px] h-[400px] md:w-[400px] md:h-[500px] select-none">
           <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl overflow-visible">
             <defs>
               <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor="#d4b585" stopOpacity="0.8" />
                 <stop offset="100%" stopColor="#c19f6e" stopOpacity="0.4" />
               </linearGradient>
               <filter id="jewelryGlow" x="-50%" y="-50%" width="200%" height="200%">
                 <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
                 <feColorMatrix in="blur" type="matrix" values="
                    0 0 0 0 1
                    0 0 0 0 0.9
                    0 0 0 0 0.5
                    0 0 0 0.6 0" result="coloredBlur"/>
                 <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                 </feMerge>
               </filter>
             </defs>

             {/* Background Illustration Group */}
             <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
             >
                 {view === 'ear' ? (
                   // Precise Ear Illustration
                   <g fill="none" stroke="url(#goldGradient)" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                      {/* Outer Rim (Helix to Lobe) */}
                      <path d="M 50 95 C 35 95 25 85 25 70 C 25 60 22 55 20 45 C 18 35 25 15 50 10 C 75 5 95 20 95 45 C 95 75 75 95 50 95" />
                      
                      {/* Inner Helix Ridge */}
                      <path d="M 50 15 Q 80 15 85 45 Q 87 65 75 75" opacity="0.8" />
                      
                      {/* Antihelix / Rook Area */}
                      <path d="M 40 30 Q 50 35 50 50 Q 50 65 60 70" opacity="0.8" />
                      
                      {/* Daith / Crus of Helix */}
                      <path d="M 28 45 Q 35 48 38 48" opacity="0.8" />
                      
                      {/* Tragus */}
                      <path d="M 20 45 Q 28 50 28 58 Q 28 62 22 65" opacity="0.9" />
                      
                      {/* Antitragus */}
                      <path d="M 55 80 Q 62 78 65 70" opacity="0.8" />
                   </g>
                 ) : (
                   // Precise Face Illustration (Minimalist)
                   <g fill="none" stroke="url(#goldGradient)" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                      {/* Nose Outline */}
                      <path d="M 50 30 L 50 55 Q 50 60 55 60 M 42 58 Q 38 55 42 50 M 58 58 Q 62 55 58 50" opacity="0.9" />
                      <path d="M 45 62 Q 50 65 55 62" opacity="0.7" />

                      {/* Lips Outline */}
                      <path d="M 35 75 Q 50 70 65 75" opacity="0.9" /> {/* Upper Lip Top */}
                      <path d="M 35 75 Q 50 78 65 75" opacity="0.9" /> {/* Upper Lip Bottom */}
                      <path d="M 37 76 Q 50 85 63 76" opacity="0.9" /> {/* Lower Lip */}

                      {/* Eyebrows (Left side for demo) */}
                      <path d="M 25 38 Q 35 32 45 35" opacity="0.8" />
                      <path d="M 55 35 Q 65 32 75 38" opacity="0.8" />
                      
                      {/* Face Contour Hint */}
                      <path d="M 15 50 Q 15 90 50 98 Q 85 90 85 50" opacity="0.3" strokeDasharray="2 2" />
                   </g>
                 )}
             </motion.g>

             {/* Hit Areas & Jewelry */}
             {currentPoints.map((point) => {
               const isSelected = visualSelectionId === point.id;
               return (
                 <g key={point.id} onClick={() => handlePointClick(point)} className="cursor-pointer group">
                   {/* Larger Hit Area (Invisible) */}
                   <circle cx={point.x} cy={point.y} r="6" fill="transparent" />
                   
                   {/* Jewelry Graphic */}
                   <g transform={`translate(${point.x}, ${point.y})`}>
                      <JewelryRenderer point={point} isSelected={isSelected} />
                   </g>

                   {/* Text Label on Selection/Hover */}
                   <g className={`transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                       <text 
                        x={point.x} 
                        y={point.y + 8} 
                        fontSize="3.5" 
                        fill="white"
                        textAnchor="middle"
                        className="font-sans pointer-events-none drop-shadow-md select-none"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
                        >
                        {point.label}
                        </text>
                   </g>
                 </g>
               );
             })}
           </svg>
           
           <AnimatePresence>
             {hoverMessage && (
               <motion.div
                 initial={{ opacity: 0, y: 5 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 5 }}
                 className="absolute z-20 bg-brand-surface border border-white/10 text-slate-200 text-xs px-4 py-2 rounded-xl shadow-xl backdrop-blur-md whitespace-nowrap pointer-events-none flex items-center gap-2"
                 style={{ 
                   left: `${hoverMessage.x}%`, 
                   top: `${hoverMessage.y - 12}%`,
                   transform: 'translate(-50%, -100%)' 
                 }}
               >
                 <AlertCircle className="w-3 h-3 text-brand-primary" />
                 {hoverMessage.text}
                 <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-brand-surface border-b border-r border-white/10 rotate-45"></div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

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
                     <button onClick={() => { onSelect(null as any); setVisualSelectionId(null); }} className="text-sm text-slate-500 hover:text-white underline">
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
                      onClick={() => {
                          const point = [...earPoints, ...facePoints].find(p => service.name.includes(p.keyword));
                          if (point) setVisualSelectionId(point.id);
                          onSelect(service);
                      }}
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

const Booking: React.FC = () => {
  const [step, setStep] = useState<BookingStep>(BookingStep.SELECT_SERVICE);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getServices().then(setServices);
  }, []);

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

  return (
    <div className="min-h-screen bg-brand-dark pt-24 pb-12">
        <div className="container mx-auto px-6">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-serif text-white mb-2">קביעת תור</h1>
                    <p className="text-slate-400 text-sm">שלב {step} מתוך 4</p>
                </div>
                {step > 1 && step < 4 && (
                    <button onClick={() => setStep(step - 1)} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm">
                        <ArrowRight className="w-4 h-4" /> חזרה
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {step === BookingStep.SELECT_SERVICE && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <AnatomyMap services={services} selectedService={selectedService} onSelect={setSelectedService} />
                        <div className="flex justify-center mt-8">
                            <Button disabled={!selectedService} onClick={() => setStep(BookingStep.SELECT_DATE)} className="w-full md:w-auto min-w-[200px]">
                                המשך לבחירת תאריך
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === BookingStep.SELECT_DATE && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto">
                        <Card className="mb-8">
                            <h3 className="text-white font-medium mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-brand-primary"/> בחר תאריך</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                {generateCalendarDays().map((date, i) => {
                                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                                    return (
                                        <button key={i} onClick={() => { setSelectedDate(date); setSelectedSlot(null); }} className={`flex flex-col items-center justify-center min-w-[80px] h-24 rounded-xl border transition-all ${isSelected ? 'bg-brand-primary text-brand-dark border-brand-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:border-brand-primary/50 hover:text-white'}`}>
                                            <span className="text-xs">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                                            <span className="text-2xl font-bold font-serif">{date.getDate()}</span>
                                            <span className="text-xs">{date.toLocaleDateString('he-IL', { month: 'short' })}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </Card>
                        {selectedDate && (
                            <Card>
                                <h3 className="text-white font-medium mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-brand-primary"/> בחר שעה</h3>
                                {isLoadingSlots ? <div className="py-12 flex justify-center text-brand-primary"><Loader2 className="w-8 h-8 animate-spin" /></div> : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                        {availableSlots.length > 0 ? availableSlots.map((slot, i) => (
                                            <button key={i} disabled={!slot.available} onClick={() => setSelectedSlot(slot.time)} className={`py-2 rounded-lg text-sm border transition-all ${selectedSlot === slot.time ? 'bg-brand-primary text-brand-dark border-brand-primary font-bold' : slot.available ? 'bg-white/5 border-white/10 text-white hover:border-brand-primary/50' : 'bg-transparent border-transparent text-slate-600 cursor-not-allowed line-through'}`}>
                                                {slot.time}
                                            </button>
                                        )) : <div className="col-span-full text-center text-slate-500 py-8">אין תורים פנויים לתאריך זה. נסה תאריך אחר.</div>}
                                    </div>
                                )}
                            </Card>
                        )}
                        <div className="flex justify-center mt-8">
                            <Button disabled={!selectedDate || !selectedSlot} onClick={() => setStep(BookingStep.DETAILS)} className="w-full md:w-auto min-w-[200px]">המשך למילוי פרטים</Button>
                        </div>
                    </motion.div>
                )}

                {step === BookingStep.DETAILS && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto">
                        <Card>
                            <h3 className="text-white font-medium mb-6">פרטים אישיים</h3>
                            <div className="space-y-4">
                                <Input label="שם מלא" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                <Input label="טלפון נייד" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                <Input label="אימייל" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-slate-400 ms-1">הערות נוספות</label>
                                    <textarea className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 min-h-[100px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/10">
                                <div className="flex justify-between items-center mb-2 text-sm text-slate-400"><span>שירות נבחר:</span><span className="text-white font-medium">{selectedService?.name}</span></div>
                                <div className="flex justify-between items-center mb-2 text-sm text-slate-400"><span>מועד:</span><span className="text-white font-medium">{selectedDate?.toLocaleDateString('he-IL')} בשעה {selectedSlot}</span></div>
                                <div className="flex justify-between items-center mt-4 text-xl text-white font-serif"><span>סה"כ לתשלום:</span><span className="text-brand-primary">₪{selectedService?.price}</span></div>
                            </div>
                        </Card>
                        <div className="flex justify-center mt-8">
                            <Button disabled={!formData.name || !formData.phone || isSubmitting} onClick={handleBook} isLoading={isSubmitting} className="w-full md:w-auto min-w-[200px]">אשר וקבע תור</Button>
                        </div>
                    </motion.div>
                )}

                {step === BookingStep.CONFIRMATION && (
                    <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500"><Sparkles className="w-12 h-12" /></div>
                        <h2 className="text-3xl font-serif text-white mb-4">התור נקבע בהצלחה!</h2>
                        <p className="text-slate-400 mb-8">תודה {formData.name}, קבענו לך תור ל{selectedService?.name} בתאריך {selectedDate?.toLocaleDateString('he-IL')} בשעה {selectedSlot}.<br/>נשלח לך פרטים נוספים לנייד.</p>
                        <Button onClick={() => window.location.href = '/'}>חזרה לדף הבית</Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
};

export default Booking;