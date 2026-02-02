
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Check, Loader2, ArrowRight, ArrowLeft, Droplets, Info, Send, FileText, Eraser, Plus, Minus, Trash2, ShoppingBag, ChevronDown, ChevronUp, Tag, Sparkles } from 'lucide-react';
import { Service, BookingStep, StudioSettings, Coupon } from '../types';
import { api, TimeSlot } from '../services/mockApi';
import { Button, Card, Input, SectionHeading } from '../components/ui';
import { DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS } from '../constants';
import { useLocation, useNavigate } from 'react-router-dom';

const m = motion as any;

/**
 * SignaturePad component for digital consent
 * Fix: Added full implementation for line 15 error
 */
const SignaturePad = ({ onSave, onClear }: { onSave: (data: string) => void, onClear: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.beginPath();
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    onSave(canvas.toDataURL());
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-[2/1] bg-brand-dark/50 rounded-xl border border-white/10 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <Button variant="ghost" type="button" onClick={() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        onClear();
      }} className="w-full">
        <Eraser className="w-4 h-4 mr-2" /> נקה חתימה
      </Button>
    </div>
  );
};

/**
 * Booking component handling the multi-step appointment process
 * Fix: Added proper return statement and export default to resolve compilation and lazy loading errors
 */
const Booking: React.FC = () => {
  const [step, setStep] = useState<BookingStep>(BookingStep.SELECT_SERVICE);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
        const fetchedServices = await api.getServices();
        setServices(fetchedServices);

        if (location.state) {
            if (location.state.preSelectedServices) {
                const preSelected = location.state.preSelectedServices as Service[];
                setSelectedServices(preSelected);
                if (preSelected.length > 0) {
                    setStep(BookingStep.SELECT_DATE);
                }
            }
            if (location.state.couponCode) {
                setCouponCode(location.state.couponCode);
                const coupon = await api.validateCoupon(location.state.couponCode);
                if (coupon) setAppliedCoupon(coupon);
            }
            window.history.replaceState({}, document.title);
        }
    };
    init();
  }, [location.state]);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => 
      prev.find(s => s.id === service.id) 
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setIsLoadingSlots(true);
    const slots = await api.getAvailability(date);
    setAvailableSlots(slots);
    setIsLoadingSlots(false);
  };

  const validateCoupon = async () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    setCouponError('');
    const coupon = await api.validateCoupon(couponCode);
    if (coupon) {
      setAppliedCoupon(coupon);
    } else {
      setCouponError('קופון לא בתוקף');
      setAppliedCoupon(null);
    }
    setIsValidatingCoupon(false);
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot || selectedServices.length === 0) return;
    setIsSubmitting(true);
    try {
      const [h, m] = selectedSlot.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(h, m, 0, 0);

      await api.createAppointment({
        ...formData,
        client_name: formData.name,
        client_email: formData.email,
        client_phone: formData.phone,
        service_id: selectedServices[0].id,
        start_time: startTime.toISOString(),
        signature: signatureData || undefined,
        coupon_code: appliedCoupon?.code
      });
      setStep(BookingStep.CONFIRMATION);
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  const basePrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
  let discountAmount = 0;
  if (appliedCoupon) {
      discountAmount = appliedCoupon.type === 'percent' 
          ? Math.round((basePrice * appliedCoupon.value) / 100) 
          : appliedCoupon.value;
  }
  const finalPrice = Math.max(0, basePrice - discountAmount);

  return (
    <div className="pt-24 pb-20 container mx-auto px-6 max-w-4xl">
      <SectionHeading title="הזמנת תור" subtitle={`שלב ${step} מתוך 5`} />
      
      <AnimatePresence mode="wait">
        {step === BookingStep.SELECT_SERVICE && (
          <m.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {services.map(service => (
                <Card 
                  key={service.id} 
                  onClick={() => toggleService(service)}
                  className={`cursor-pointer transition-all border ${selectedServices.find(s => s.id === service.id) ? 'border-brand-primary bg-brand-primary/5' : 'border-white/5'}`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-white font-medium">{service.name}</h3>
                    <span className="text-brand-primary font-serif">₪{service.price}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">{service.description}</p>
                </Card>
              ))}
            </div>
            <Button disabled={selectedServices.length === 0} onClick={() => setStep(BookingStep.SELECT_DATE)} className="w-full">
              המשך לבחירת תאריך <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </m.div>
        )}

        {step === BookingStep.SELECT_DATE && (
          <m.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
             <Card className="mb-8">
                <Input label="בחר תאריך" type="date" onChange={(e) => handleDateSelect(new Date(e.target.value))} />
                {isLoadingSlots ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-primary" /></div>
                ) : (
                  <div className="grid grid-cols-4 gap-3 mt-6">
                    {availableSlots.map(slot => (
                      <button 
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`py-2 rounded-lg text-sm border ${selectedSlot === slot.time ? 'bg-brand-primary text-brand-dark border-brand-primary' : slot.available ? 'border-white/10 text-white' : 'opacity-20 border-white/5 text-slate-500'}`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
             </Card>
             <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(BookingStep.SELECT_SERVICE)} className="flex-1">חזור</Button>
                <Button disabled={!selectedSlot} onClick={() => setStep(BookingStep.DETAILS)} className="flex-1">המשך</Button>
             </div>
          </m.div>
        )}

        {step === BookingStep.DETAILS && (
          <m.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="space-y-4 mb-8">
              <Input label="שם מלא" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Input label="טלפון" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <Input label="אימייל" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <div className="pt-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input label="קופון (אופציונלי)" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                  </div>
                  <Button variant="outline" onClick={validateCoupon} isLoading={isValidatingCoupon}>בדיקה</Button>
                </div>
                {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
                {appliedCoupon && <p className="text-emerald-400 text-xs mt-1">קופון הוחל בהצלחה!</p>}
              </div>
            </Card>
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(BookingStep.SELECT_DATE)} className="flex-1">חזור</Button>
                <Button disabled={!formData.name || !formData.phone} onClick={() => setStep(BookingStep.CONSENT)} className="flex-1">המשך</Button>
             </div>
          </m.div>
        )}

        {step === BookingStep.CONSENT && (
          <m.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="mb-8">
              <h3 className="text-white font-medium mb-4">טופס הסכמה לפירסינג</h3>
              <div className="text-slate-400 text-sm space-y-4 h-48 overflow-y-auto mb-6 p-4 bg-brand-dark/30 rounded-lg">
                <p>אני מצהיר כי אני מעל גיל 16 (או מלווה בהורה) וכי אין לי רגישויות ידועות למתכות.</p>
                <p>אני מבין את הוראות הטיפול ומתחייב לפעול לפיהן.</p>
                <p>אני משחרר את הסטודיו מכל אחריות בגין טיפול לא נכון לאחר הניקוב.</p>
              </div>
              <SignaturePad onSave={setSignatureData} onClear={() => setSignatureData(null)} />
              <label className="flex items-center gap-3 mt-6 cursor-pointer">
                <input type="checkbox" checked={hasAgreedToTerms} onChange={e => setHasAgreedToTerms(e.target.checked)} className="w-5 h-5 rounded border-white/10 bg-brand-dark" />
                <span className="text-white text-sm">אני מאשר את התנאים</span>
              </label>
            </Card>
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(BookingStep.DETAILS)} className="flex-1">חזור</Button>
                <Button disabled={!hasAgreedToTerms || !signatureData} onClick={handleBook} isLoading={isSubmitting} className="flex-1">סיים והזמן</Button>
             </div>
          </m.div>
        )}

        {step === BookingStep.CONFIRMATION && (
          <m.div key="step5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-serif text-white mb-4">התור הוזמן בהצלחה!</h2>
            <p className="text-slate-400 mb-8">אישור נשלח אלייך במייל וב-SMS.</p>
            <Button onClick={() => navigate('/')} variant="outline">חזרה לדף הבית</Button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Booking;
