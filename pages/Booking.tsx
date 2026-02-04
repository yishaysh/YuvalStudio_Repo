
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Check, Loader2, ArrowRight, ArrowLeft, Droplets, Info, Send, FileText, Eraser, Plus, Minus, Trash2, ShoppingBag, ChevronDown, ChevronUp, Edit3, Ticket, X, Camera, Sparkles, Upload, Wand2 } from 'lucide-react';
import { Service, BookingStep, StudioSettings, Coupon } from '../types';
import { api, TimeSlot } from '../services/mockApi';
import { Button, Card, Input } from '../components/ui';
import { DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS } from '../constants';
import { useLocation, useNavigate } from 'react-router-dom';
import { aiStylistService } from '../services/aiStylistService';

const m = motion as any;

// --- Local Data Enhancements ---
const SERVICE_META: Record<string, { healing: string }> = {
    'Ear': { healing: '4-8 שבועות' },
    'Face': { healing: '2-4 חודשים' },
    'Body': { healing: '3-6 חודשים' },
    'Jewelry': { healing: '-' }
};

const getMeta = (category: string) => SERVICE_META[category] || { healing: 'משתנה' };

// --- Signature Pad Component ---
const SignaturePad: React.FC<{ onSave: (data: string) => void, onClear: () => void }> = ({ onSave, onClear }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.strokeStyle = '#d4b585';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
             clientX = e.touches[0].clientX;
             clientY = e.touches[0].clientY;
        } else {
             clientX = (e as React.MouseEvent).clientX;
             clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            const canvas = canvasRef.current;
            if (canvas) {
                onSave(canvas.toDataURL());
            }
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        onClear();
    };

    return (
        <div className="space-y-2">
            <div className="relative border border-white/10 bg-brand-dark/50 rounded-xl overflow-hidden touch-none">
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={300}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseMove={draw}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="w-full h-[150px] cursor-crosshair touch-none"
                    style={{ touchAction: 'none' }}
                />
                <button 
                    onClick={clearCanvas}
                    type="button"
                    className="absolute top-2 left-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="נקה חתימה"
                >
                    <Eraser className="w-4 h-4" />
                </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">חתום בתוך התיבה</p>
        </div>
    );
};

interface TicketSummaryProps {
  selectedServices: Service[];
  selectedDate: Date | null;
  selectedSlot: string | null;
  totalDuration: number;
  appliedCoupon: Coupon | null;
  couponCode: string;
  couponError: string | null;
  isCheckingCoupon: boolean;
  discountAmount: number;
  finalPrice: number;
  step: BookingStep;
  readOnly?: boolean;
  aiRecommendation?: string | null;
  onToggleService: (s: Service) => void;
  onSetCouponCode: (code: string) => void;
  onApplyCoupon: () => void;
  onClearCoupon: () => void;
}

const TicketSummary: React.FC<TicketSummaryProps> = ({
  selectedServices,
  selectedDate,
  selectedSlot,
  totalDuration,
  appliedCoupon,
  couponCode,
  couponError,
  isCheckingCoupon,
  discountAmount,
  finalPrice,
  step,
  readOnly = false,
  aiRecommendation,
  onToggleService,
  onSetCouponCode,
  onApplyCoupon,
  onClearCoupon
}) => {
  return (
      <div className="p-6 space-y-6">
        <div className={`transition-all duration-500 ${selectedServices.length > 0 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">טיפולים שנבחרו</div>
            <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                {selectedServices.length > 0 ? selectedServices.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-white truncate max-w-[150px]">{s.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-brand-primary">₪{s.price}</span>
                            {step === BookingStep.SELECT_SERVICE && !readOnly && (
                                <button onClick={(e) => { e.stopPropagation(); onToggleService(s); }} className="text-red-400 hover:text-red-300">
                                    <Trash2 className="w-3 h-3"/>
                                </button>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="text-slate-600 italic">לא נבחרו טיפולים</div>
                )}
            </div>
        </div>
        
        {aiRecommendation && (
            <div className="bg-brand-primary/5 border border-brand-primary/10 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-brand-primary text-xs font-bold uppercase mb-2">
                    <Sparkles className="w-3 h-3"/> המלצת הסטייליסט
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {aiRecommendation}
                </div>
            </div>
        )}

        <div className="w-full h-[1px] bg-white/10 border-t border-dashed border-white/20"></div>
        <div className={`transition-all duration-500 ${selectedDate && selectedSlot ? 'opacity-100' : 'opacity-30'}`}>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">מועד התור</div>
            <div className="font-medium text-white text-lg">{selectedDate ? selectedDate.toLocaleDateString('he-IL', {day:'numeric', month:'long'}) : '---'}</div>
            <div className="text-slate-300 flex justify-between">
                <span>{selectedSlot || '--:--'}</span>
                <span className="text-xs text-slate-500 mt-1">({totalDuration} דק')</span>
            </div>
        </div>
        <div className="w-full h-[1px] bg-white/10 border-t border-dashed border-white/20"></div>
        
        <div className="space-y-3">
             {appliedCoupon ? (
                 <div className="flex justify-between items-center bg-brand-primary/10 p-2 rounded-lg border border-brand-primary/20">
                     <div className="flex items-center gap-2">
                         <Ticket className="w-4 h-4 text-brand-primary" />
                         <span className="text-sm text-brand-primary font-medium">{appliedCoupon.code}</span>
                     </div>
                     {!readOnly && (
                         <button onClick={onClearCoupon} className="text-slate-500 hover:text-white">
                             <X className="w-4 h-4" />
                         </button>
                     )}
                 </div>
             ) : (
                 <div className="flex gap-2">
                     <input 
                         type="text" 
                         placeholder="קוד קופון" 
                         className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-brand-primary/30 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                         value={couponCode}
                         onChange={(e) => onSetCouponCode(e.target.value)}
                         disabled={readOnly || selectedServices.length === 0}
                     />
                     <button 
                        onClick={onApplyCoupon}
                        disabled={readOnly || !couponCode || isCheckingCoupon || selectedServices.length === 0}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         {isCheckingCoupon ? <Loader2 className="w-4 h-4 animate-spin"/> : 'הפעל'}
                     </button>
                 </div>
             )}
             {couponError && !readOnly && <p className="text-xs text-red-400">{couponError}</p>}
        </div>

        <div>
            {appliedCoupon && (
                <div className="flex justify-between items-end mb-1">
                     <span className="text-slate-400 text-xs">הנחה</span>
                     <span className="text-sm text-brand-primary">-₪{discountAmount}</span>
                </div>
            )}
            <div className="flex justify-between items-end">
                <span className="text-slate-400 text-sm">סה"כ לתשלום</span>
                <span className="text-3xl font-serif text-white">₪{finalPrice}</span>
            </div>
        </div>
    </div>
  );
};

const Booking: React.FC = () => {
  const [step, setStep] = useState<BookingStep>(BookingStep.SELECT_SERVICE);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  const [studioSettings, setStudioSettings] = useState<StudioSettings | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', nationalId: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  
  // AI Stylist State
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

  const datePickerRef = useRef<HTMLInputElement>(null);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
        const fetchedServices = await api.getServices();
        setServices(fetchedServices);
        setFilteredServices(fetchedServices);
        setStudioSettings(await api.getSettings());

        if (location.state && location.state.preSelectedServices) {
            const preSelected = location.state.preSelectedServices as Service[];
            const validPreSelected = preSelected.filter(ps => fetchedServices.some(s => s.id === ps.id));
            if (validPreSelected.length > 0) {
                setSelectedServices(validPreSelected);
                setStep(BookingStep.AI_STYLIST);
            }
            window.history.replaceState({}, document.title);
        }
    };
    init();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

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

  const toggleService = (service: Service) => {
      const exists = selectedServices.find(s => s.id === service.id);
      if (exists) {
          setSelectedServices(selectedServices.filter(s => s.id !== service.id));
      } else {
          setSelectedServices([...selectedServices, service]);
      }
      if (appliedCoupon) {
          setAppliedCoupon(null);
          setCouponCode('');
          setCouponError(null);
      }
  };

  // AI Logic
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onloadend = () => {
          setAiImage(reader.result as string);
          setAiError(null);
          setAiRecommendation(null);
      };
      reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
      if (!aiImage) return;
      setIsAnalyzing(true);
      setAiError(null);
      try {
          const result = await aiStylistService.analyzeEar(aiImage);
          setAiRecommendation(result);
      } catch (err: any) {
          setAiError(err.message || "שגיאה לא ידועה בניתוח התמונה");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0);
  const basePrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

  const calculateTotal = () => {
      if (!appliedCoupon) return basePrice;
      let discount = appliedCoupon.discountType === 'percentage' 
          ? basePrice * (appliedCoupon.value / 100) 
          : appliedCoupon.value;
      return Math.round(Math.max(0, basePrice - discount));
  };

  const finalPrice = calculateTotal();
  const discountAmount = basePrice - finalPrice;

  const handleApplyCoupon = async () => {
      setCouponError(null);
      if (!couponCode) return;
      setIsCheckingCoupon(true);
      try {
          const result = await api.validateCoupon(couponCode, basePrice);
          if (result.isValid && result.coupon) {
              setAppliedCoupon(result.coupon);
          } else {
              setCouponError(result.error || 'קופון לא תקין');
              setAppliedCoupon(null);
          }
      } catch (e) {
          setCouponError('שגיאה בבדיקת הקופון');
      } finally {
          setIsCheckingCoupon(false);
      }
  };

  const isSlotValid = (startIndex: number) => {
      if (!availableSlots[startIndex]?.available) return false;
      const slotsNeeded = Math.ceil(totalDuration / 30);
      if (startIndex + slotsNeeded > availableSlots.length) return false;
      for (let i = 0; i < slotsNeeded; i++) {
          if (!availableSlots[startIndex + i]?.available) return false;
      }
      return true;
  };

  const generateCalendarDays = () => {
      const today = new Date();
      const days = [];
      const workingHours = studioSettings?.working_hours || DEFAULT_WORKING_HOURS;
      for(let i = 0; i < 21; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const dayIndex = d.getDay().toString();
          const dayConfig = workingHours[dayIndex];
          if (dayConfig && dayConfig.isOpen) days.push(d);
      }
      return days.slice(0, 14);
  };

  const handleBook = async () => {
      if(selectedServices.length === 0 || !selectedDate || !selectedSlot || !signatureData) return;
      setIsSubmitting(true);
      const [hours, minutes] = selectedSlot.split(':').map(Number);
      const date = new Date(selectedDate);
      date.setHours(hours, minutes);

      const primaryService = selectedServices[0];
      const otherServices = selectedServices.slice(1);
      
      let finalNotes = formData.notes;
      if (formData.nationalId) finalNotes = `ת.ז: ${formData.nationalId}\n` + finalNotes;
      if (otherServices.length > 0) {
          finalNotes += `\n\n--- חבילת שירותים משולבת ---\nטיפול ראשי: ${primaryService.name}\nתוספות: ${otherServices.map(s => s.name).join(', ')}`;
      }
      finalNotes += `\n[חתם על הצהרת בריאות]`;

      const endTime = new Date(date.getTime() + totalDuration * 60000).toISOString();

      try {
        await api.createAppointment({
            service_id: primaryService.id,
            start_time: date.toISOString(),
            // @ts-ignore
            end_time: endTime, 
            client_name: formData.name,
            client_phone: formData.phone,
            client_email: formData.email,
            notes: finalNotes,
            signature: signatureData,
            coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
            final_price: finalPrice,
            ai_recommendation_text: aiRecommendation || undefined
        });
        setStep(BookingStep.CONFIRMATION);
      } catch (err) {
          console.error(err);
      } finally {
          setIsSubmitting(false);
      }
  };

  const sendConfirmationWhatsapp = () => {
      if (selectedServices.length === 0 || !selectedDate || !selectedSlot) return;
      const phone = studioSettings?.studio_details.phone || DEFAULT_STUDIO_DETAILS.phone;
      const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '972');
      const serviceNames = selectedServices.map(s => s.name).join(' + ');
      const msg = `*היי, קבעתי תור באתר!* 👋\n\n*שם:* ${formData.name}\n*טיפול:* ${serviceNames}\n*תאריך:* ${selectedDate.toLocaleDateString('he-IL')}\n*שעה:* ${selectedSlot}\n\nאשמח לאישור סופי. תודה! 🙏`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const categories = [{ id: 'All', label: 'הכל' }, { id: 'Ear', label: 'אוזניים' }, { id: 'Face', label: 'פנים' }, { id: 'Body', label: 'גוף' }];
  const showBottomBar = (step === BookingStep.SELECT_SERVICE && selectedServices.length > 0) || (step > BookingStep.SELECT_SERVICE && step < BookingStep.CONFIRMATION); 

  return (
    <div className="min-h-screen bg-brand-dark pt-24 pb-32 lg:pb-12">
        <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-8 relative items-start">
                
                <div className="flex-1 w-full z-10">
                    <div className="mb-4">
                        <h1 className="text-4xl font-serif text-white mb-2">
                            {step === BookingStep.SELECT_SERVICE && 'בחירת טיפול'}
                            {step === BookingStep.AI_STYLIST && 'מעצב האוזן האישי (AI)'}
                            {step === BookingStep.SELECT_DATE && 'תאריך ושעה'}
                            {step === BookingStep.DETAILS && 'פרטים אישיים'}
                            {step === BookingStep.CONSENT && 'הצהרת בריאות ואישור'}
                            {step === BookingStep.CONFIRMATION && 'אישור הזמנה'}
                        </h1>
                        <p className="text-slate-400 flex items-center gap-2">
                            {step !== BookingStep.CONFIRMATION && (
                                <span className="bg-brand-primary/10 text-brand-primary text-xs px-2 py-0.5 rounded-full border border-brand-primary/20">
                                    שלב {step} מתוך 5
                                </span>
                            )}
                            {step === BookingStep.SELECT_SERVICE && 'בחר את הפירסינג המושלם בשבילך.'}
                            {step === BookingStep.AI_STYLIST && 'העלה תמונה לקבלת המלצות סטיילינג אישיות מה-AI שלנו.'}
                        </p>
                    </div>

                    {selectedServices.length > 0 && step < BookingStep.CONFIRMATION && (
                        <div className="lg:hidden mb-6 relative z-20">
                            <button 
                                onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
                                className="w-full flex items-center justify-between p-4 bg-brand-surface/80 backdrop-blur-md border border-white/10 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                        <ShoppingBag className="w-5 h-5" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">סיכום ביניים</p>
                                        <p className="text-sm font-medium text-white">{selectedServices.length} פריטים נבחרו</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                     <span className="text-xl font-serif text-brand-primary">₪{finalPrice}</span>
                                     {isMobileSummaryOpen ? <ChevronUp className="w-5 h-5 text-slate-400"/> : <ChevronDown className="w-5 h-5 text-slate-400"/>}
                                </div>
                            </button>

                            <AnimatePresence>
                                {isMobileSummaryOpen && (
                                    <m.div 
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-2 bg-brand-surface border border-white/5 rounded-xl shadow-xl">
                                            <TicketSummary 
                                                selectedServices={selectedServices}
                                                selectedDate={selectedDate}
                                                selectedSlot={selectedSlot}
                                                totalDuration={totalDuration}
                                                appliedCoupon={appliedCoupon}
                                                couponCode={couponCode}
                                                couponError={couponError}
                                                isCheckingCoupon={isCheckingCoupon}
                                                discountAmount={discountAmount}
                                                finalPrice={finalPrice}
                                                step={step}
                                                readOnly={step === BookingStep.CONFIRMATION}
                                                aiRecommendation={aiRecommendation}
                                                onToggleService={toggleService}
                                                onSetCouponCode={setCouponCode}
                                                onApplyCoupon={handleApplyCoupon}
                                                onClearCoupon={() => { setAppliedCoupon(null); setCouponCode(''); }}
                                            />
                                        </div>
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === BookingStep.SELECT_SERVICE && (
                            <m.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {categories.map(cat => (
                                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-6 py-2 rounded-full text-sm transition-all whitespace-nowrap border ${activeCategory === cat.id ? 'bg-white text-brand-dark border-white font-medium' : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'}`}>{cat.label}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredServices.map((service) => {
                                        const meta = getMeta(service.category);
                                        const isSelected = selectedServices.some(s => s.id === service.id);
                                        return (
                                            <m.div layout key={service.id} onClick={() => toggleService(service)} className={`relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-300 group ${isSelected ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_30px_rgba(212,181,133,0.1)]' : 'border-white/5 bg-brand-surface/50 hover:border-brand-primary/30'}`}>
                                                <div className="flex h-32">
                                                    <div className="w-32 shrink-0 relative overflow-hidden">
                                                        <img src={service.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-brand-dark/20 group-hover:bg-transparent transition-colors" />
                                                        {isSelected && <div className="absolute inset-0 bg-brand-primary/20 flex items-center justify-center"><Check className="w-8 h-8 text-brand-primary drop-shadow-md"/></div>}
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
                                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">רמת כאב ({service.pain_level || 1})</span>
                                                                <div className="flex gap-1">
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                                                                        <div key={i} className={`w-1 h-3 rounded-full transition-all ${i <= (service.pain_level || 1) ? 'bg-brand-primary shadow-[0_0_8px_rgba(212,181,133,0.6)]' : 'bg-white/10'}`} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </m.div>
                                        );
                                    })}
                                </div>
                            </m.div>
                        )}

                        {step === BookingStep.AI_STYLIST && (
                            <m.div key="ai" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <Card className="bg-brand-surface/50 border-brand-primary/20 p-8 text-center relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-primary/20 transition-colors"></div>
                                    
                                    {!aiImage ? (
                                        <div className="py-12 flex flex-col items-center">
                                            {/* Made clickable wrapper for image upload */}
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-6 ring-1 ring-brand-primary/30 cursor-pointer hover:bg-brand-primary/20 transition-all hover:scale-105 active:scale-95"
                                                title="לחץ להעלאת תמונה"
                                            >
                                                <Camera className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-2xl font-serif text-white mb-2">גלה את הפוטנציאל שלך</h3>
                                            <p className="text-slate-400 text-sm mb-8 max-w-sm">העלה תמונה ברורה של האוזן שלך וקבל המלצות סטיילינג מותאמות אישית מהבינה המלאכותית שלנו.</p>
                                            
                                            <div className="flex gap-4">
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    ref={fileInputRef} 
                                                    onChange={handleImageUpload} 
                                                />
                                                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                                                    <Upload className="w-4 h-4"/> בחר תמונה
                                                </Button>
                                                <Button onClick={() => setStep(BookingStep.SELECT_DATE)} variant="ghost">דלג על השלב</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="relative w-48 h-64 mx-auto rounded-2xl overflow-hidden border-2 border-brand-primary/30 shadow-2xl">
                                                <img src={aiImage} alt="Ear upload" className="w-full h-full object-cover" />
                                                {isAnalyzing && (
                                                    <div className="absolute inset-0 bg-brand-dark/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                                        <div className="relative">
                                                            <div className="w-16 h-16 border-2 border-brand-primary border-t-transparent animate-spin rounded-full"></div>
                                                            <m.div 
                                                                animate={{ y: [0, 64, 0] }}
                                                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                                                className="absolute top-0 left-0 w-full h-[2px] bg-brand-primary shadow-[0_0_10px_#d4b585] z-10"
                                                            ></m.div>
                                                        </div>
                                                        <p className="text-white text-xs mt-4 font-medium animate-pulse">סורק אנטומיה...</p>
                                                    </div>
                                                )}
                                                <button onClick={() => { setAiImage(null); setAiRecommendation(null); setAiError(null); }} className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <AnimatePresence mode="wait">
                                                {aiRecommendation ? (
                                                    <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-brand-dark/40 border border-brand-primary/20 rounded-2xl p-6 text-right relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                            <Sparkles className="w-24 h-24 text-brand-primary"/>
                                                        </div>
                                                        <h4 className="text-brand-primary font-bold flex items-center gap-2 mb-4">
                                                            <Sparkles className="w-5 h-5"/> המלצות הסטייליסט
                                                        </h4>
                                                        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                                            {aiRecommendation}
                                                        </div>
                                                        <Button onClick={() => setStep(BookingStep.SELECT_DATE)} className="w-full mt-6 gap-2">
                                                            נשמע מעולה, המשך לקביעת תור <ArrowLeft className="w-4 h-4"/>
                                                        </Button>
                                                    </m.div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {/* Error Message Display */}
                                                        {aiError && (
                                                            <m.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                                                                <p className="font-bold mb-1">שגיאה בניתוח</p>
                                                                {aiError}
                                                            </m.div>
                                                        )}
                                                        
                                                        {!isAnalyzing && (
                                                            <Button onClick={handleAnalyze} className="w-full py-4 text-lg shadow-xl shadow-brand-primary/20 gap-2">
                                                                <Wand2 className="w-5 h-5"/> נתח וקבל המלצות
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </Card>
                            </m.div>
                        )}

                        {/* ... Rest of steps ... */}
                        {step === BookingStep.SELECT_DATE && (
                            <m.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => datePickerRef.current?.showPicker()} className="text-white font-medium flex items-center gap-2 hover:text-brand-primary transition-colors">
                                            <Calendar className="w-5 h-5 text-brand-primary"/> 
                                            בחר תאריך
                                            <span className="text-xs font-normal text-slate-400">(לחץ לפתיחת יומן)</span>
                                        </button>
                                        <input type="date" ref={datePickerRef} className="invisible absolute" min={new Date().toISOString().split('T')[0]} onChange={(e) => { if(e.target.valueAsDate) { setSelectedDate(e.target.valueAsDate); setSelectedSlot(null); } }} />
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-4">
                                        {generateCalendarDays().map((date, i) => {
                                            const isSelected = selectedDate?.toDateString() === date.toDateString();
                                            return (
                                                <button key={i} onClick={() => { setSelectedDate(date); setSelectedSlot(null); }} className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-xl border transition-all shrink-0 ${isSelected ? 'bg-white text-brand-dark border-white scale-105 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:border-brand-primary/50 hover:text-white'}`}>
                                                    <span className="text-xs">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                                                    <span className="text-xl font-bold font-serif">{date.getDate()}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-4 min-h-[200px]">
                                    <h3 className="text-white font-medium flex items-center gap-2"><Clock className="w-5 h-5 text-brand-primary"/> בחר שעה <span className="text-xs text-slate-400 mr-2">(זמן נדרש: {totalDuration} דקות)</span></h3>
                                    {!selectedDate ? (
                                        <div className="text-slate-600 text-sm border border-dashed border-white/10 rounded-xl p-8 text-center">אנא בחר תאריך כדי לראות שעות פנויות</div>
                                    ) : isLoadingSlots ? (
                                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
                                    ) : (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                                            {availableSlots.length > 0 ? availableSlots.map((slot, i) => {
                                                const valid = isSlotValid(i);
                                                return (
                                                    <button key={i} disabled={!valid} onClick={() => setSelectedSlot(selectedSlot === slot.time ? null : slot.time)} className={`py-2 rounded-lg text-sm border transition-all ${selectedSlot === slot.time ? 'bg-brand-primary text-brand-dark border-brand-primary font-bold shadow-[0_0_15px_rgba(212,181,133,0.4)]' : valid ? 'bg-white/5 border-white/10 text-white hover:border-brand-primary/50' : 'bg-transparent border-transparent text-slate-700 cursor-not-allowed decoration-slate-700 opacity-50'}`}>
                                                        {slot.time}
                                                    </button>
                                                )
                                            }) : (
                                                <div className="col-span-full text-center text-slate-500 py-8">אין תורים פנויים לתאריך זה.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </m.div>
                        )}

                        {step === BookingStep.DETAILS && (
                            <m.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <Card className="border-none bg-white/5 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input label="שם מלא" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                        <Input label="טלפון" type="tel" inputMode="numeric" dir="ltr" className="text-right" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input label="אימייל" type="email" inputMode="email" dir="ltr" className="text-right" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                        <Input label="תעודת זהות" type="tel" inputMode="numeric" maxLength={9} value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-slate-400 ms-1">הערות נוספות</label>
                                        <textarea className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 min-h-[100px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                                    </div>
                                </Card>
                            </m.div>
                        )}

                        {step === BookingStep.CONSENT && (
                            <m.div key="consent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <Card className="bg-white/5 border-none p-6">
                                    <div className="flex items-center gap-2 text-brand-primary mb-4">
                                        <FileText className="w-5 h-5" />
                                        <h3 className="font-medium">הצהרת בריאות ואישור ביצוע</h3>
                                    </div>
                                    <div className="text-sm text-slate-300 space-y-3 h-64 overflow-y-auto pr-2 custom-scrollbar mb-6 bg-brand-dark/20 p-4 rounded-xl leading-relaxed border border-white/5">
                                        <p className="font-medium mb-2 text-white">אני מצהיר בזאת כי:</p>
                                        <div className="space-y-2 text-slate-300">
                                            <p>- אני מעל גיל 16 (או מלווה באישור הורה/אפוטרופוס).</p>
                                            <p>- איני סובל ממחלות דם, סוכרת לא מאוזנת או מחלות זיהומיות.</p>
                                            <p>- איני נוטל תרופות המדללות את הדם.</p>
                                            <p>- איני בהריון או מניקה (לפירסינג בפטמה/טבור).</p>
                                            <p>- אני מבין כי הפירסינג דורש טיפול יומיומי והקפדה על היגיינה.</p>
                                            <p>- אני מבין את הסיכונים הכרוכים (זיהום, צלקות, רגישות למתכת).</p>
                                            <p>- קראתי והבנתי את הוראות הטיפול שניתנו לי.</p>
                                        </div>
                                        <p className="font-medium text-brand-primary border-t border-white/5 pt-4 mt-4">
                                            אני מאשר לסטודיו לבצע את הנקיב ומסיר כל אחריות במקרה של אי-מילוי אחר הוראות הטיפול.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setHasAgreedToTerms(!hasAgreedToTerms)}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${hasAgreedToTerms ? 'bg-brand-primary border-brand-primary text-brand-dark' : 'border-slate-600'}`}>
                                                {hasAgreedToTerms && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                                            </div>
                                            <span className="text-sm text-slate-200 select-none">אני מאשר כי קראתי את כל הסעיפים ומסכים לתוכן.</span>
                                        </div>
                                        <SignaturePad onSave={(data) => setSignatureData(data)} onClear={() => setSignatureData(null)} />
                                    </div>
                                </Card>
                            </m.div>
                        )}

                        {step === BookingStep.CONFIRMATION && (
                            <m.div key="step6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 ring-1 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                    <Check className="w-10 h-10" />
                                </div>
                                <h2 className="text-4xl font-serif text-white mb-4">בקשתך התקבלה בהצלחה!</h2>
                                <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">התור שלך נקלט במערכת כממתין לאישור. הסטודיו ייצור איתך קשר בהקדם.</p>
                                <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-8">
                                    <Button onClick={sendConfirmationWhatsapp} className="bg-green-600 hover:bg-green-700 text-white border-none flex items-center gap-2">
                                        <Send className="w-4 h-4" /> שלח אישור לסטודיו בוואטסאפ
                                    </Button>
                                    <Button variant="ghost" onClick={() => navigate('/')}>חזרה לדף הבית</Button>
                                </div>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className={`hidden lg:block w-80 relative shrink-0 ${step === BookingStep.CONSENT ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    <div className="sticky top-28">
                        <div className="relative bg-brand-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="bg-brand-primary p-6 relative overflow-hidden">
                                <h2 className="text-brand-dark font-serif font-bold text-xl relative z-10">סיכום הזמנה</h2>
                                <div className="text-brand-dark/70 text-xs font-medium uppercase tracking-widest relative z-10">Yuval Studio</div>
                            </div>
                            <TicketSummary 
                                selectedServices={selectedServices}
                                selectedDate={selectedDate}
                                selectedSlot={selectedSlot}
                                totalDuration={totalDuration}
                                appliedCoupon={appliedCoupon}
                                couponCode={couponCode}
                                couponError={couponError}
                                isCheckingCoupon={isCheckingCoupon}
                                discountAmount={discountAmount}
                                finalPrice={finalPrice}
                                step={step}
                                readOnly={step === BookingStep.CONFIRMATION}
                                aiRecommendation={aiRecommendation}
                                onToggleService={toggleService}
                                onSetCouponCode={setCouponCode}
                                onApplyCoupon={handleApplyCoupon}
                                onClearCoupon={() => { setAppliedCoupon(null); setCouponCode(''); }}
                            />
                            <div className="bg-brand-dark h-3 w-full relative">
                                <div className="absolute -top-3 w-full h-3 bg-[radial-gradient(circle,transparent_50%,#1e293b_50%)] bg-[length:12px_12px] rotate-180"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <AnimatePresence>
            {showBottomBar && (
                <m.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 p-4 bg-brand-dark/95 backdrop-blur-xl border-t border-white/10 z-50 flex justify-center shadow-[0_-5px_30px_rgba(0,0,0,0.5)]">
                    <div className="container max-w-4xl flex items-center gap-4 w-full">
                        {step > 1 && (
                            <button onClick={() => setStep(step - 1)} className="px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                                <ArrowRight className="w-5 h-5" />
                                <span className="hidden sm:inline">חזרה</span>
                            </button>
                        )}
                        <Button 
                            onClick={() => {
                                if(step === BookingStep.SELECT_SERVICE) setStep(BookingStep.AI_STYLIST);
                                else if(step === BookingStep.AI_STYLIST) setStep(BookingStep.SELECT_DATE);
                                else if(step === BookingStep.SELECT_DATE) setStep(BookingStep.DETAILS);
                                else if(step === BookingStep.DETAILS) setStep(BookingStep.CONSENT);
                                else if(step === BookingStep.CONSENT) handleBook();
                            }}
                            disabled={
                                (step === BookingStep.SELECT_SERVICE && selectedServices.length === 0) ||
                                (step === BookingStep.SELECT_DATE && (!selectedDate || !selectedSlot)) ||
                                (step === BookingStep.DETAILS && (!formData.name || !formData.phone || !formData.nationalId)) ||
                                (step === BookingStep.CONSENT && (!hasAgreedToTerms || !signatureData)) ||
                                isSubmitting || isAnalyzing
                            }
                            isLoading={isSubmitting}
                            className="flex-1 py-4 text-lg shadow-xl shadow-brand-primary/20"
                        >
                            <div className="flex items-center justify-center gap-2">
                                {step === BookingStep.CONSENT ? 'אשר וקבע תור' : 'המשך לשלב הבא'}
                                {step < BookingStep.CONSENT && <ArrowLeft className="w-5 h-5" />}
                            </div>
                        </Button>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Booking;
