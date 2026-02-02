
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Check, Loader2, ArrowRight, ArrowLeft, Droplets, Info, Send, FileText, Eraser, Plus, Minus, Trash2, ShoppingBag, ChevronDown, ChevronUp, Tag, Sparkles } from 'lucide-react';
import { Service, BookingStep, StudioSettings, Coupon } from '../types';
import { api, TimeSlot } from '../services/mockApi';
import { Button, Card, Input, SectionHeading } from '../components/ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { SmartImage } from '../components/SmartImage';

const m = motion as any;

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

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    onSave(canvasRef.current?.toDataURL() || '');
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/1] bg-brand-dark/40 rounded-xl border border-white/10 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          width={600}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="absolute bottom-2 left-2 pointer-events-none opacity-20">
            <span className="text-[10px] text-white uppercase tracking-widest">חתימה דיגיטלית</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        onClear();
      }} className="w-full text-xs">
        <Eraser className="w-3 h-3 me-2" /> נקה חתימה
      </Button>
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
        setFilteredServices(fetchedServices);

        if (location.state) {
            if (location.state.preSelectedServices) {
                const preSelected = location.state.preSelectedServices as Service[];
                setSelectedServices(preSelected);
                if (preSelected.length > 0) setStep(BookingStep.SELECT_DATE);
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
  }, []);

  const filterByCategory = (category: string) => {
    setActiveCategory(category);
    if (category === 'All') setFilteredServices(services);
    else setFilteredServices(services.filter(s => s.category === category));
  };

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
    if (coupon) setAppliedCoupon(coupon);
    else {
      setCouponError('קוד קופון לא תקין');
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
        client_name: formData.name,
        client_email: formData.email,
        client_phone: formData.phone,
        service_id: selectedServices[0].id,
        start_time: startTime.toISOString(),
        notes: formData.notes,
        signature: signatureData || undefined,
        coupon_code: appliedCoupon?.code
      });
      setStep(BookingStep.CONFIRMATION);
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
  let discount = 0;
  if (appliedCoupon) {
      discount = appliedCoupon.type === 'percent' 
          ? Math.round((totalPrice * appliedCoupon.value) / 100) 
          : appliedCoupon.value;
  }
  const finalPrice = Math.max(0, totalPrice - discount);

  return (
    <div className="pt-24 pb-32 container mx-auto px-6 max-w-4xl">
      <SectionHeading title="קביעת תור" subtitle={`שלב ${step} מתוך 5`} />
      
      <AnimatePresence mode="wait">
        {step === BookingStep.SELECT_SERVICE && (
          <m.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {['All', 'Ear', 'Face', 'Body', 'Jewelry'].map(cat => (
                <button
                  key={cat}
                  onClick={() => filterByCategory(cat)}
                  className={`px-6 py-2 rounded-full text-xs font-medium transition-all border ${activeCategory === cat ? 'bg-brand-primary text-brand-dark border-brand-primary' : 'bg-brand-surface/50 text-slate-400 border-white/5 hover:border-white/10'}`}
                >
                  {cat === 'All' ? 'הכל' : cat === 'Ear' ? 'אוזניים' : cat === 'Face' ? 'פנים' : cat === 'Body' ? 'גוף' : 'תכשיטים'}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map(service => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <Card 
                    key={service.id} 
                    onClick={() => toggleService(service)}
                    className={`cursor-pointer transition-all border flex gap-4 p-4 ${isSelected ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/20' : 'border-white/5 hover:border-white/10'}`}
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-brand-dark">
                      <SmartImage src={service.image_url} alt={service.name} className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="text-white font-medium text-sm">{service.name}</h3>
                          {isSelected && <Check className="w-4 h-4 text-brand-primary" />}
                        </div>
                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{service.description}</p>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <span className="text-brand-primary font-serif">₪{service.price}</span>
                        <span className="text-[10px] text-slate-500">{service.duration_minutes} דק׳</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </m.div>
        )}

        {step === BookingStep.SELECT_DATE && (
          <m.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
             <Card className="mb-6">
                <Input label="בחר תאריך" type="date" min={new Date().toISOString().split('T')[0]} onChange={(e) => handleDateSelect(new Date(e.target.value))} />
                
                {selectedDate && (
                    <div className="mt-8">
                        <h4 className="text-white text-sm font-medium mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-brand-primary" /> שעות פנויות
                        </h4>
                        {isLoadingSlots ? (
                          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-primary" /></div>
                        ) : availableSlots.length > 0 ? (
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {availableSlots.map(slot => (
                              <button 
                                key={slot.time}
                                disabled={!slot.available}
                                onClick={() => setSelectedSlot(slot.time)}
                                className={`py-2 rounded-lg text-xs border transition-all ${selectedSlot === slot.time ? 'bg-brand-primary text-brand-dark border-brand-primary shadow-lg shadow-brand-primary/20' : slot.available ? 'border-white/10 text-white hover:border-brand-primary/50' : 'opacity-20 border-white/5 text-slate-500 cursor-not-allowed'}`}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 border border-dashed border-white/5 rounded-xl text-slate-500 text-sm">אין שעות פנויות לתאריך זה</div>
                        )}
                    </div>
                )}
             </Card>
             <Button variant="ghost" onClick={() => setStep(BookingStep.SELECT_SERVICE)} className="w-full">
                חזור לבחירת שירות
             </Button>
          </m.div>
        )}

        {step === BookingStep.DETAILS && (
          <m.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="שם מלא" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="ישראל ישראלי" />
                <Input label="טלפון" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="050-1234567" />
              </div>
              <Input label="אימייל" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="your@email.com" />
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-400 ms-1">הערות מיוחדות</label>
                <textarea 
                    className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-all h-24 resize-none text-sm"
                    value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="pt-4 border-t border-white/5">
                <label className="text-sm font-medium text-slate-400 ms-1 block mb-2">יש לך קוד קופון?</label>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-brand-dark/30 border border-white/10 text-white px-4 py-2 rounded-lg outline-none text-sm font-mono tracking-wider uppercase"
                    value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="PROMO10"
                  />
                  <Button variant="outline" size="sm" onClick={validateCoupon} isLoading={isValidatingCoupon}>החל</Button>
                </div>
                {couponError && <p className="text-red-400 text-[10px] mt-1 ms-1">{couponError}</p>}
                {appliedCoupon && <p className="text-emerald-400 text-[10px] mt-1 ms-1 font-medium">קופון הוחל! ({appliedCoupon.type === 'percent' ? `${appliedCoupon.value}%` : `₪${appliedCoupon.value}`} הנחה)</p>}
              </div>
            </Card>
            <Button variant="ghost" onClick={() => setStep(BookingStep.SELECT_DATE)} className="w-full">חזור לבחירת תאריך</Button>
          </m.div>
        )}

        {step === BookingStep.CONSENT && (
          <m.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="mb-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="text-brand-primary" />
                <h3 className="text-xl font-serif text-white">הצהרת בריאות והסכמה</h3>
              </div>
              <div className="text-slate-400 text-xs space-y-4 h-64 overflow-y-auto mb-8 p-6 bg-brand-dark/40 rounded-xl leading-relaxed custom-scrollbar border border-white/5">
                <p className="font-bold text-white mb-2">אנא קראי בעיון:</p>
                <p>1. אני מצהירה כי מלאו לי 16 שנים (או שאני מלווה באפוטרופוס חוקי שחתום מטה).</p>
                <p>2. אינני תחת השפעת סמים או אלכוהול.</p>
                <p>3. אינני בהריון או מניקה.</p>
                <p>4. לא ידוע לי על רגישויות למתכות (טיטניום/זהב) או חומרי חיטוי.</p>
                <p>5. אני מבינה כי פירסינג הוא פצע פתוח הדורש טיפול קפדני לפי ההוראות שאקבל.</p>
                <p>6. אני משחררת את הסטודיו מכל אחריות במקרה של זיהום הנובע מטיפול לקוי בבית.</p>
                <p className="pt-4 border-t border-white/5">אני מאשרת כי כל הפרטים שמסרתי נכונים.</p>
              </div>
              
              <div className="mb-8">
                 <label className="text-xs text-slate-500 block mb-3 uppercase tracking-wider">חתימה</label>
                 <SignaturePad onSave={setSignatureData} onClear={() => setSignatureData(null)} />
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-all ${hasAgreedToTerms ? 'bg-brand-primary border-brand-primary' : 'border-white/20 bg-brand-dark/50'}`}>
                  {hasAgreedToTerms && <Check className="w-3 h-3 text-brand-dark stroke-[3]" />}
                </div>
                <input type="checkbox" className="hidden" checked={hasAgreedToTerms} onChange={e => setHasAgreedToTerms(e.target.checked)} />
                <span className="text-slate-400 text-xs leading-tight group-hover:text-white transition-colors">אני מאשרת שקראתי והבנתי את כל סעיפי ההצהרה ומתחייבת לפעול לפי הנחיות הסטודיו.</span>
              </label>
            </Card>
            <Button variant="ghost" onClick={() => setStep(BookingStep.DETAILS)} className="w-full">חזור לעריכת פרטים</Button>
          </m.div>
        )}

        {step === BookingStep.CONFIRMATION && (
          <m.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8 ring-1 ring-emerald-500/20">
              <Check className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-serif text-white mb-4">התור הוזמן!</h2>
            <p className="text-slate-400 mb-10 max-w-sm mx-auto leading-relaxed">
                קיבלנו את הפרטים שלך. אישור נשלח אלייך במייל וב-SMS. אנחנו כבר מחכים לראות אותך!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/')} variant="outline" className="min-w-[160px]">חזרה לדף הבית</Button>
                <a href={`https://wa.me/972501234567?text=${encodeURIComponent('היי, קבעתי תור עכשיו דרך האתר ל' + selectedServices[0]?.name)}`} target="_blank" rel="noopener noreferrer">
                    <Button className="min-w-[160px] bg-emerald-600 hover:bg-emerald-700 text-white border-none">שלחי לנו ווטסאפ</Button>
                </a>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Floating Action Bar - Only show if not confirmed */}
      {step !== BookingStep.CONFIRMATION && (
          <m.div 
            initial={{ y: 100 }} animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-6 bg-brand-dark/80 backdrop-blur-xl border-t border-white/5"
          >
              <div className="container mx-auto max-w-4xl flex items-center justify-between">
                  <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">סה״כ לתשלום</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-serif text-white">₪{finalPrice}</span>
                        {discount > 0 && <span className="text-xs text-slate-500 line-through">₪{totalPrice}</span>}
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                      {step === BookingStep.SELECT_SERVICE && (
                          <div className="hidden md:block text-right">
                              <p className="text-xs text-slate-400">{selectedServices.length} שירותים נבחרו</p>
                              <p className="text-[10px] text-slate-500">משך זמן מוערך: {selectedServices.reduce((a,b)=>a+b.duration_minutes, 0)} דק׳</p>
                          </div>
                      )}
                      
                      <Button 
                        disabled={(step === BookingStep.SELECT_SERVICE && selectedServices.length === 0) || (step === BookingStep.SELECT_DATE && !selectedSlot) || (step === BookingStep.DETAILS && (!formData.name || !formData.phone)) || (step === BookingStep.CONSENT && (!hasAgreedToTerms || !signatureData))}
                        onClick={() => {
                            if (step === BookingStep.SELECT_SERVICE) setStep(BookingStep.SELECT_DATE);
                            else if (step === BookingStep.SELECT_DATE) setStep(BookingStep.DETAILS);
                            else if (step === BookingStep.DETAILS) setStep(BookingStep.CONSENT);
                            else if (step === BookingStep.CONSENT) handleBook();
                        }}
                        isLoading={isSubmitting}
                        className="min-w-[140px] shadow-xl shadow-brand-primary/20"
                      >
                         {step === BookingStep.CONSENT ? 'סיום הזמנה' : 'המשך'} <ArrowRight className="w-4 h-4 mr-2" />
                      </Button>
                  </div>
              </div>
          </m.div>
      )}
    </div>
  );
};

export default Booking;
