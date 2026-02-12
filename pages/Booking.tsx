import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Check, Loader2, ArrowRight, ArrowLeft, Droplets, Send, FileText, Eraser, Trash2, ShoppingBag, ChevronDown, ChevronUp, Ticket, X, Camera, Sparkles, Upload, Wand2, BrainCircuit, AlertCircle, Info, Plus } from 'lucide-react';
import { Service, BookingStep, StudioSettings, Coupon } from '../types';
import { api, TimeSlot } from '../services/mockApi';
import { Button, Card, Input } from '../components/ui';
import { DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS, JEWELRY_CATALOG } from '../constants';
import { useLocation, useNavigate } from 'react-router-dom';
import { aiStylistService, AIAnalysisResult } from '../services/aiStylistService';
import { StoryGallery } from '../components/StoryGallery';
import { SmartImage } from '../components/SmartImage';

const m = motion as any;

// --- Helper Utilities ---

const SERVICE_META: Record<string, { healing: string }> = {
    'Ear': { healing: '4-8 שבועות' },
    'Face': { healing: '2-4 חודשים' },
    'Body': { healing: '3-6 חודשים' },
    'Jewelry': { healing: '-' }
};

const getMeta = (category: string) => SERVICE_META[category] || { healing: 'משתנה' };

const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 800;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// --- Sub-Components ---

const ServiceCard = React.memo(({ service, isSelected, onClick, priority = false }: { service: Service, isSelected: boolean, onClick: () => void, priority?: boolean }) => {
    const meta = getMeta(service.category);

    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-200 group h-32 ${isSelected ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(212,181,133,0.1)]' : 'border-white/5 bg-brand-surface/50 hover:border-brand-primary/30'}`}
        >
            <div className="flex h-full">
                <div className="w-32 shrink-0 relative overflow-hidden bg-brand-dark/50">
                    <SmartImage
                        src={service.image_url}
                        alt={service.name}
                        priority={priority}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-brand-dark/20 group-hover:bg-transparent transition-colors" />
                    {isSelected && <div className="absolute inset-0 bg-brand-primary/20 flex items-center justify-center"><Check className="w-8 h-8 text-brand-primary drop-shadow-md" /></div>}
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <h3 className={`font-medium text-base sm:text-lg leading-tight ${isSelected ? 'text-brand-primary' : 'text-white'}`}>{service.name}</h3>
                        <span className="text-brand-primary font-serif font-bold">₪{service.price}</span>
                    </div>
                    <div className="flex items-end justify-between mt-1">
                        <div className="text-xs text-slate-400 space-y-0.5">
                            <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {service.duration_minutes} דק'</div>
                            <div className="flex items-center gap-1.5"><Droplets className="w-3 h-3" /> {meta.healing}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">כאב ({service.pain_level || 1})</span>
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                                    <div key={i} className={`w-0.5 sm:w-1 h-2 sm:h-3 rounded-full ${i <= (service.pain_level || 1) ? 'bg-brand-primary' : 'bg-white/10'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// Horizontal Laser Scan Animation
const ScanningOverlay = () => (
    <div className="absolute inset-0 z-20 pointer-events-none rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-brand-primary/5 opacity-20" />
        <m.div
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent shadow-[0_0_20px_rgba(212,181,133,0.9)] opacity-100 z-30"
        />
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <div className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-brand-primary/40 flex items-center gap-3 shadow-lg">
                <BrainCircuit className="w-4 h-4 text-brand-primary animate-pulse" />
                <span className="text-brand-primary text-xs font-mono uppercase tracking-widest animate-pulse">
                    AI Scanning Structure...
                </span>
            </div>
        </div>
    </div>
);

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
        let clientX = 0, clientY = 0;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.beginPath();
        ctx?.moveTo(x, y);
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
            onSave(canvasRef.current?.toDataURL() || '');
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            onClear();
        }
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
                />
                <button onClick={clearCanvas} type="button" className="absolute top-2 left-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <Eraser className="w-4 h-4" />
                </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">חתום בתוך התיבה</p>
        </div>
    );
};

const TicketSummary: React.FC<any> = ({
    selectedServices, selectedJewelry, selectedDate, selectedSlot, totalDuration, appliedCoupon, couponCode, couponError, isCheckingCoupon, discountAmount, finalPrice, step, readOnly, aiRecommendation, onToggleService, onToggleJewelry, onSetCouponCode, onApplyCoupon, onClearCoupon
}) => {
    const result: AIAnalysisResult | null = aiRecommendation;

    return (
        <div className="p-6 space-y-6">
            <div className={`transition-opacity duration-300 ${selectedServices.length > 0 || selectedJewelry?.length > 0 ? 'opacity-100' : 'opacity-30'}`}>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">טיפולים שנבחרו</div>
                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                    {selectedServices.map((s: Service, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-white truncate max-w-[150px]">{s.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-brand-primary">₪{s.price}</span>
                                {step === BookingStep.SELECT_SERVICE && !readOnly && (
                                    <button onClick={(e) => { e.stopPropagation(); onToggleService(s); }} className="text-red-400 hover:text-red-300">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Jewelry Section in Ticket */}
                    {selectedJewelry?.map((item: any, idx: number) => (
                        <div key={`j-${idx}`} className="flex justify-between items-center text-sm bg-brand-primary/5 p-2 rounded-lg border border-brand-primary/10">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-brand-primary" />
                                <span className="text-white truncate max-w-[130px]">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-brand-primary">₪{item.price}</span>
                                {!readOnly && (
                                    <button onClick={() => onToggleJewelry(item)} className="text-red-400 hover:text-red-300">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {selectedServices.length === 0 && (!selectedJewelry || selectedJewelry.length === 0) && (
                        <div className="text-slate-600 italic">לא נבחרו טיפולים</div>
                    )}
                </div>
            </div>

            {result && (
                <div className="bg-brand-primary/5 border border-brand-primary/10 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-brand-primary text-xs font-bold uppercase mb-2">
                        <Sparkles className="w-3 h-3" /> {result.style_summary || "המלצת הסטייליסט"}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-relaxed">
                        {result.recommendations.length} המלצות זוהו. לחץ לפרטים.
                    </div>
                </div>
            )}

            <div className="w-full h-[1px] bg-white/10 border-t border-dashed border-white/20"></div>

            <div className={`transition-opacity duration-300 ${selectedDate && selectedSlot ? 'opacity-100' : 'opacity-30'}`}>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">מועד התור</div>
                <div className="font-medium text-white text-lg">{selectedDate ? selectedDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' }) : '---'}</div>
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
                            <button onClick={onClearCoupon} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="קוד קופון"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-brand-primary/30 uppercase disabled:opacity-50"
                            value={couponCode}
                            onChange={(e) => onSetCouponCode(e.target.value)}
                            disabled={readOnly || (selectedServices.length === 0 && selectedJewelry.length === 0)}
                        />
                        <button
                            onClick={onApplyCoupon}
                            disabled={readOnly || !couponCode || isCheckingCoupon || (selectedServices.length === 0 && selectedJewelry.length === 0)}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm border border-white/10 disabled:opacity-50"
                        >
                            {isCheckingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'הפעל'}
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

// --- Main Component ---

const Booking: React.FC = () => {
    // State
    const [step, setStep] = useState<BookingStep>(BookingStep.SELECT_SERVICE);
    const [services, setServices] = useState<Service[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedJewelry, setSelectedJewelry] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [studioSettings, setStudioSettings] = useState<StudioSettings | null>(null);
    const [jewelryCatalog, setJewelryCatalog] = useState<any[]>(JEWELRY_CATALOG);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', nationalId: '', notes: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);

    // Gallery State
    const [galleryImages, setGalleryImages] = useState<any[]>([]);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // AI State
    const [isAiEnabled, setIsAiEnabled] = useState(true);
    const [aiImage, setAiImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // Renamed state variable to match user request
    const [selectedRecommendation, setSelectedRecommendation] = useState<number | null>(null);

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
    const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const datePickerRef = useRef<HTMLInputElement>(null);
    const location = useLocation();
    const navigate = useNavigate();

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            try {
                const [fetchedServices, fetchedSettings, fetchedGallery] = await Promise.all([
                    api.getServices(),
                    api.getSettings(),
                    api.getGallery()
                ]);
                setServices(fetchedServices);
                setStudioSettings(fetchedSettings);
                setGalleryImages(fetchedGallery || []);

                // Hydrate Inventory from Settings
                // @ts-ignore
                if (fetchedSettings.inventory_items && Array.isArray(fetchedSettings.inventory_items)) {
                    // @ts-ignore
                    setJewelryCatalog(fetchedSettings.inventory_items);
                } else {
                    setJewelryCatalog(JEWELRY_CATALOG);
                }

                // Check for AI Setting
                const aiSetting = (fetchedSettings as any).enable_ai;
                setIsAiEnabled(aiSetting !== false);

                if (location.state && location.state.preSelectedServices) {
                    const preSelected = location.state.preSelectedServices as Service[];
                    const validPreSelected = preSelected.filter(ps => fetchedServices.some(s => s.id === ps.id));
                    if (validPreSelected.length > 0) {
                        setSelectedServices(validPreSelected);
                        // Skip AI if skipAi flag is present OR if AI is disabled in settings
                        const shouldSkipAi = location.state.skipAi || aiSetting === false;
                        setStep(shouldSkipAi ? BookingStep.SELECT_DATE : BookingStep.AI_STYLIST);
                    }
                    window.history.replaceState({}, document.title);
                }

                // Pre-warm images
                fetchedServices.forEach(s => {
                    const img = new Image();
                    img.src = s.image_url;
                });
            } catch (e) {
                console.error("Failed to initialize booking:", e);
            }
        };
        init();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    // --- Dynamic Navigation Logic ---
    const handleNextStep = useCallback(() => {
        setStep((current) => {
            if (current === BookingStep.SELECT_SERVICE) {
                return isAiEnabled ? BookingStep.AI_STYLIST : BookingStep.SELECT_DATE;
            }
            if (current === BookingStep.AI_STYLIST) return BookingStep.SELECT_DATE;
            if (current === BookingStep.SELECT_DATE) return BookingStep.DETAILS;
            if (current === BookingStep.DETAILS) return BookingStep.CONSENT;
            return current;
        });
    }, [isAiEnabled]);

    const handlePrevStep = useCallback(() => {
        setStep((current) => {
            if (current === BookingStep.SELECT_DATE) {
                return isAiEnabled ? BookingStep.AI_STYLIST : BookingStep.SELECT_SERVICE;
            }
            if (current === BookingStep.AI_STYLIST) return BookingStep.SELECT_SERVICE;
            if (current === BookingStep.DETAILS) return BookingStep.SELECT_DATE;
            if (current === BookingStep.CONSENT) return BookingStep.DETAILS;
            return current - 1;
        });
    }, [isAiEnabled]);

    // --- Visual Steps Calculation ---
    const currentStepDisplay = useMemo(() => {
        if (!isAiEnabled) {
            if (step === BookingStep.SELECT_SERVICE) return 1;
            if (step >= BookingStep.SELECT_DATE) return step - 1;
            return step;
        }
        return step;
    }, [step, isAiEnabled]);

    const totalSteps = isAiEnabled ? 5 : 4;


    // --- Memoized Values ---
    const filteredServices = useMemo(() => {
        if (activeCategory === 'All') return services;
        return services.filter(s => s.category === activeCategory);
    }, [activeCategory, services]);

    const totalDuration = useMemo(() => selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0), [selectedServices]);

    // Calculate base price including both standard services and AI selected jewelry
    const basePrice = useMemo(() => {
        const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
        const jewelryTotal = selectedJewelry.reduce((sum, j) => sum + j.price, 0);
        return servicesTotal + jewelryTotal;
    }, [selectedServices, selectedJewelry]);

    const finalPrice = useMemo(() => {
        if (!appliedCoupon) return basePrice;
        let discount = appliedCoupon.discountType === 'percentage'
            ? basePrice * (appliedCoupon.value / 100)
            : appliedCoupon.value;
        return Math.round(Math.max(0, basePrice - discount));
    }, [basePrice, appliedCoupon]);

    const discountAmount = basePrice - finalPrice;

    // --- Handlers ---

    // Date Change Handler (Auto-Reset Slot)
    useEffect(() => {
        setSelectedSlot(null);
        if (selectedDate) {
            setIsLoadingSlots(true);
            api.getAvailability(selectedDate).then((slots) => {
                setAvailableSlots(slots);
                setIsLoadingSlots(false);
            });
        }
    }, [selectedDate]);

    const toggleService = useCallback((service: Service) => {
        setSelectedServices(prev => {
            const exists = prev.find(s => s.id === service.id);
            if (exists) return prev.filter(s => s.id !== service.id);
            return [...prev, service];
        });
        // Reset coupon
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError(null);
    }, []);

    const toggleJewelry = useCallback((item: any) => {
        setSelectedJewelry(prev => {
            const exists = prev.find(j => j.id === item.id);
            if (exists) return prev.filter(j => j.id !== item.id);
            return [...prev, item];
        });
        setAppliedCoupon(null);
        setCouponCode('');
        // Close the popup after adding/removing jewelry
        setSelectedRecommendation(null);
    }, []);

    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const compressedDataUrl = await compressImage(file);
            setAiImage(compressedDataUrl);
            setAiError(null);
            setAiResult(null);
            setSelectedRecommendation(null);
            setSelectedJewelry([]);
        } catch (err) {
            console.error(err);
            setAiError("שגיאה בטעינת התמונה. נסה קובץ אחר.");
        }
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!aiImage) return;
        setIsAnalyzing(true);
        setAiError(null);

        try {
            const cleanBase64 = aiImage.split(',')[1];
            const result = await aiStylistService.analyzeEar(cleanBase64);

            // STRICT CLIENT-SIDE FILTERING based on dynamic inventory
            // Only show recommendations where in_stock !== false
            const filteredRecs = result.recommendations.filter(rec => {
                const item = jewelryCatalog.find(j => j.id === rec.jewelry_id);
                return item && item.in_stock !== false;
            });

            setAiResult({ ...result, recommendations: filteredRecs });
        } catch (err: any) {
            console.error("Analysis Failed:", err);
            setAiError(err.message || "אירעה שגיאה בניתוח התמונה.");
        } finally {
            setIsAnalyzing(false);
        }
    }, [aiImage, jewelryCatalog]);

    const handleApplyCoupon = useCallback(async () => {
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
    }, [couponCode, basePrice]);

    const isSlotValid = useCallback((startIndex: number) => {
        const slotsNeeded = Math.ceil(totalDuration / 30);
        if (startIndex + slotsNeeded > availableSlots.length) return false;
        for (let i = 0; i < slotsNeeded; i++) {
            if (!availableSlots[startIndex + i]?.available) return false;
        }
        return true;
    }, [availableSlots, totalDuration]);

    const calendarDays = useMemo(() => {
        const today = new Date();
        const days = [];
        const workingHours = studioSettings?.working_hours || DEFAULT_WORKING_HOURS;
        for (let i = 0; i < 21; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dayIndex = d.getDay().toString();
            const dayConfig = workingHours[dayIndex];
            if (dayConfig && dayConfig.isOpen) days.push(d);
        }
        return days.slice(0, 14);
    }, [studioSettings]);

    const handleBook = useCallback(async () => {
        setIsSubmitting(true);

        let finalImageUrl = null;
        let finalAiResult = aiResult;

        // 1. Upload AI Image ONLY if jewelry was selected from recommendations
        if (aiImage && selectedJewelry.length > 0 && !aiImage.startsWith('http')) {
            try {
                const uploadedUrl = await api.uploadBase64Image(aiImage, 'gallery-images');
                if (uploadedUrl) {
                    finalImageUrl = uploadedUrl;
                    // Update local copy of visual plan to use URL
                    if (finalAiResult) {
                        finalAiResult = { ...finalAiResult, original_image: uploadedUrl };
                    }
                }
            } catch (e) {
                console.error("Image upload failed, fallback to base64 in json", e);
                // If upload fails but jewelry selected, use base64
                finalImageUrl = aiImage;
            }
        } else if (aiImage && selectedJewelry.length > 0) {
            // Image is already a URL and jewelry selected
            finalImageUrl = aiImage;
        }

        // 2. Prepare Visual Plan JSON (only if jewelry selected)
        const visualPlanString = selectedJewelry.length > 0 ? JSON.stringify({
            original_image: finalImageUrl,
            recommendations: finalAiResult?.recommendations,
            selected_items: selectedJewelry.map(j => j.id),
            userImage: finalImageUrl
        }) : '';

        // 3. Price Calculation (Services + Jewelry - Discount)
        const servicesSum = selectedServices.reduce((sum, s) => sum + s.price, 0);
        const jewelrySum = selectedJewelry.reduce((sum, j) => sum + j.price, 0);
        let total = servicesSum + jewelrySum;

        if (appliedCoupon) {
            if (appliedCoupon.discountType === 'percentage') {
                total -= (total * appliedCoupon.value) / 100;
            } else {
                total -= appliedCoupon.value;
            }
        }
        const finalPriceToSave = Math.max(0, Math.round(total));

        // 4. Determine Service Duration
        // If combined services, sum them up or take max, or default 30
        const duration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0) || 30;
        const endTime = new Date(selectedDate!.getTime() + duration * 60000).toISOString();

        // 5. Append Image URL and National ID to notes for easy admin access
        let updatedNotes = formData.notes;
        if (finalImageUrl && finalImageUrl.startsWith('http')) {
            updatedNotes += `\n\n[תמונת לקוח מצורפת](${finalImageUrl})`;
        }
        if (formData.nationalId) {
            updatedNotes += `\nת.ז: ${formData.nationalId}`;
        }

        try {
            await api.createAppointment({
                service_id: selectedServices[0]?.id || 'combined',
                service_name: selectedServices.map(s => s.name).join(' + '),
                start_time: selectedDate!.toISOString(),
                end_time: endTime,
                client_name: formData.name,
                client_phone: formData.phone,
                client_email: formData.email,
                notes: updatedNotes,
                signature: signatureData!,
                coupon_code: appliedCoupon?.code,
                final_price: finalPriceToSave,
                visual_plan: visualPlanString,
                ai_recommendation_text: visualPlanString
            });

            setStep(BookingStep.CONFIRMATION);
        } catch (error) {
            console.error("Booking error:", error);
            alert("אירעה שגיאה בקביעת התור. אנא נסה שנית.");
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedServices, selectedDate, formData, signatureData, appliedCoupon, aiResult, selectedJewelry, setStep, aiImage]);

    const sendConfirmationWhatsapp = useCallback(() => {
        if ((selectedServices.length === 0 && selectedJewelry.length === 0) || !selectedDate || !selectedSlot) return;
        const phone = studioSettings?.studio_details.phone || DEFAULT_STUDIO_DETAILS.phone;
        const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '972');

        const items = [
            ...selectedServices.map(s => s.name),
            ...selectedJewelry.map(j => j.name)
        ].join(' + ');

        const msg = `*היי, קבעתי תור באתר!* 👋\n\n*שם:* ${formData.name}\n*פריטים:* ${items}\n*תאריך:* ${selectedDate.toLocaleDateString('he-IL')}\n*שעה:* ${selectedSlot}\n\nאשמח לאישור סופי. תודה! 🙏`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }, [selectedServices, selectedJewelry, selectedDate, selectedSlot, formData, studioSettings]);

    const categories = useMemo(() => [{ id: 'All', label: 'הכל' }, { id: 'Ear', label: 'אוזניים' }, { id: 'Face', label: 'פנים' }, { id: 'Body', label: 'גוף' }], []);
    const showBottomBar = (step === BookingStep.SELECT_SERVICE && selectedServices.length > 0) || (step > BookingStep.SELECT_SERVICE && step < BookingStep.CONFIRMATION);

    return (
        <div className="min-h-screen bg-brand-dark pt-24 pb-32 lg:pb-12">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-8 relative items-start">

                    <div className="flex-1 w-full z-10">
                        {/* Header */}
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
                                        שלב {currentStepDisplay} מתוך {totalSteps}
                                    </span>
                                )}
                                {step === BookingStep.SELECT_SERVICE && 'בחר את הפירסינג המושלם בשבילך.'}
                                {step === BookingStep.AI_STYLIST && 'העלה תמונה לקבלת המלצות סטיילינג אישיות מה-AI שלנו.'}
                            </p>
                        </div>

                        {/* Mobile Summary - Fixed Z-Index */}
                        {(selectedServices.length > 0 || selectedJewelry.length > 0) && step < BookingStep.CONFIRMATION && (
                            <div className="lg:hidden mb-6 relative z-[70]">
                                <button
                                    onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
                                    className="w-full flex items-center justify-between p-4 bg-brand-surface/90 backdrop-blur-md border border-white/10 rounded-xl shadow-lg transition-all active:scale-[0.98] relative z-20"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                            <ShoppingBag className="w-5 h-5" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">סיכום ביניים</p>
                                            <p className="text-sm font-medium text-white">{selectedServices.length + selectedJewelry.length} פריטים נבחרו</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl font-serif text-brand-primary">₪{finalPrice}</span>
                                        {isMobileSummaryOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {isMobileSummaryOpen && (
                                        <m.div
                                            initial={{ opacity: 0, height: 0, y: -10 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -10 }}
                                            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] overflow-hidden shadow-2xl rounded-xl"
                                        >
                                            <div className="bg-brand-surface border border-white/10 rounded-xl">
                                                <TicketSummary
                                                    selectedServices={selectedServices}
                                                    selectedJewelry={selectedJewelry}
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
                                                    aiRecommendation={aiResult}
                                                    onToggleService={toggleService}
                                                    onToggleJewelry={toggleJewelry}
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

                        <AnimatePresence mode="wait" initial={false}>
                            {step === BookingStep.SELECT_SERVICE && (
                                <m.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    {galleryImages.length > 0 && studioSettings?.enable_gallery !== false && (
                                        <m.button
                                            layoutId="story-gallery-opener"
                                            onClick={() => setIsGalleryOpen(true)}
                                            className="w-full relative overflow-hidden group rounded-2xl border border-brand-primary/30 p-1 block text-right"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 via-brand-surface/50 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative bg-brand-surface/40 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 text-brand-primary">
                                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                                    </div>
                                                    <div className="text-right">
                                                        <h3 className="font-serif text-lg text-white group-hover:text-brand-primary transition-colors">גלריית השראה</h3>
                                                        <p className="text-xs text-slate-400">Shop The Look - בחרי את הלוק שלך</p>
                                                    </div>
                                                </div>
                                                <div className="flex -space-x-2 space-x-reverse pl-2">
                                                    {galleryImages.slice(0, 3).map((img, i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-brand-dark overflow-hidden">
                                                            <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                    {galleryImages.length > 3 && (
                                                        <div className="w-8 h-8 rounded-full border-2 border-brand-dark bg-brand-surface flex items-center justify-center text-[10px] text-white font-medium">
                                                            +{galleryImages.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </m.button>
                                    )}
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        {categories.map(cat => (
                                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-6 py-2 rounded-full text-sm transition-all whitespace-nowrap border ${activeCategory === cat.id ? 'bg-white text-brand-dark border-white font-medium' : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'}`}>{cat.label}</button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredServices.map((service, idx) => (
                                            <ServiceCard
                                                key={service.id}
                                                service={service}
                                                priority={idx < 4}
                                                isSelected={selectedServices.some(s => s.id === service.id)}
                                                onClick={() => toggleService(service)}
                                            />
                                        ))}
                                    </div>
                                </m.div>
                            )}

                            {step === BookingStep.AI_STYLIST && (
                                <m.div key="ai" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <Card className="bg-brand-surface/50 border-brand-primary/20 p-8 text-center relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-primary/20 transition-colors"></div>

                                        {!aiImage ? (
                                            <div className="py-12 flex flex-col items-center">
                                                <div
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-6 ring-1 ring-brand-primary/30 cursor-pointer hover:bg-brand-primary/20 transition-all hover:scale-105 active:scale-95"
                                                    title="צלם תמונה"
                                                >
                                                    <Camera className="w-10 h-10" />
                                                </div>
                                                <h3 className="text-2xl font-serif text-white mb-2">גלה את הפוטנציאל שלך</h3>
                                                <p className="text-slate-400 text-sm mb-8 max-w-sm">העלה תמונה ברורה של האוזן שלך וקבל המלצות סטיילינג מותאמות אישית מהבינה המלאכותית שלנו.</p>

                                                <div className="flex gap-4">
                                                    {/* Camera Input - Opens Camera */}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="user"
                                                        className="hidden"
                                                        ref={cameraInputRef}
                                                        onChange={handleImageUpload}
                                                    />
                                                    {/* Gallery Input - Opens Gallery */}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        ref={galleryInputRef}
                                                        onChange={handleImageUpload}
                                                    />
                                                    <Button onClick={() => galleryInputRef.current?.click()} variant="outline" className="gap-2">
                                                        <Upload className="w-4 h-4" /> בחר תמונה
                                                    </Button>
                                                    <Button onClick={handleNextStep} variant="ghost">דלג על השלב</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Container wrapper for positioning */}
                                                <div className="relative w-full max-w-md mx-auto">
                                                    {/* Image Container with clipping */}
                                                    <div className="relative rounded-2xl border-2 border-brand-primary/30 shadow-2xl bg-black/40">
                                                        <img src={aiImage} alt="Ear upload" className="w-full h-auto block rounded-2xl" />
                                                        {isAnalyzing && <div className="absolute inset-0 rounded-2xl overflow-hidden"><ScanningOverlay /></div>}

                                                        {/* Visual Jewelry Try-On Overlays - Positioned absolutely within image container */}
                                                        {!isAnalyzing && aiResult && (
                                                            <div className="absolute inset-0" onClick={() => setSelectedRecommendation(null)}>
                                                                {aiResult.recommendations.map((rec, i) => {
                                                                    const jewelry = jewelryCatalog.find(j => j.id === rec.jewelry_id);
                                                                    if (!jewelry) return null;

                                                                    const isRightEdge = rec.x > 70;
                                                                    const isLeftEdge = rec.x < 30;
                                                                    const isBottomEdge = rec.y > 70;

                                                                    return (
                                                                        <div
                                                                            key={i}
                                                                            style={{ left: `${rec.x}%`, top: `${rec.y}%` }}
                                                                            className="absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30"
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedRecommendation(selectedRecommendation === i ? null : i); }}
                                                                            title={rec.location}
                                                                        >
                                                                            <div className="w-full h-full rounded-full border-2 border-brand-primary bg-white overflow-hidden shadow-[0_0_15px_rgba(212,181,133,0.5)] hover:scale-110 transition-transform">
                                                                                <img src={jewelry.image_url} alt={jewelry.name} className="w-full h-full object-cover" />
                                                                            </div>

                                                                            {/* Smart Popup - Edge Aware */}
                                                                            <AnimatePresence>
                                                                                {selectedRecommendation === i && (
                                                                                    <m.div
                                                                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                                                        className={`absolute z-[60] w-56 bg-brand-surface/95 backdrop-blur-xl border border-brand-primary/30 rounded-xl p-3 shadow-2xl flex flex-col gap-2 
                                                                                    ${isRightEdge ? 'right-full mr-3' : isLeftEdge ? 'left-full ml-3' : 'left-1/2 -translate-x-1/2 mt-3'} 
                                                                                    ${isBottomEdge ? 'bottom-0' : 'top-0'}`}
                                                                                    >
                                                                                        <div className="aspect-square w-full rounded-lg overflow-hidden bg-brand-dark/50">
                                                                                            <img src={jewelry.image_url} alt={jewelry.name} className="w-full h-full object-cover" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <div className="text-xs text-brand-primary font-bold uppercase mb-0.5">{rec.location}</div>
                                                                                            <div className="text-sm font-medium text-white mb-1">{jewelry.name}</div>
                                                                                            <div className="text-[10px] text-slate-400 mb-2 leading-tight line-clamp-2">{jewelry.description}</div>
                                                                                            <div className="flex items-center justify-between mt-2">
                                                                                                <span className="text-brand-primary font-serif font-bold">₪{jewelry.price}</span>
                                                                                                {selectedJewelry.find(j => j.id === jewelry.id) ? (
                                                                                                    <button
                                                                                                        onClick={() => toggleJewelry(jewelry)}
                                                                                                        className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500 hover:text-white transition-colors"
                                                                                                    >
                                                                                                        הסר
                                                                                                    </button>
                                                                                                ) : (
                                                                                                    <button
                                                                                                        onClick={() => toggleJewelry(jewelry)}
                                                                                                        className="px-3 py-1 bg-brand-primary text-brand-dark text-xs font-bold rounded hover:bg-white transition-colors"
                                                                                                    >
                                                                                                        הוסף לתור
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setSelectedRecommendation(null); }}
                                                                                            className="absolute top-2 right-2 p-1 bg-black/40 rounded-full text-white/80 hover:text-white md:hidden"
                                                                                        >
                                                                                            <X className="w-3 h-3" />
                                                                                        </button>
                                                                                    </m.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button onClick={() => { setAiImage(null); setAiResult(null); setAiError(null); setSelectedJewelry([]); }} className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors z-40">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <AnimatePresence mode="wait">
                                                    {aiResult ? (
                                                        <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-brand-dark/40 border border-brand-primary/20 rounded-2xl p-6 text-right relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                                <Sparkles className="w-24 h-24 text-brand-primary" />
                                                            </div>
                                                            <h4 className="text-brand-primary font-bold flex items-center gap-2 mb-2">
                                                                <Sparkles className="w-5 h-5" /> {aiResult.style_summary}
                                                            </h4>
                                                            <p className="text-sm text-slate-400 mb-4">
                                                                הקש על הפריטים בתמונה כדי לראות פרטים ולהוסיף אותם להזמנה שלך.
                                                            </p>
                                                            <Button onClick={handleNextStep} className="w-full mt-2 gap-2">
                                                                המשך לקביעת תור <ArrowLeft className="w-4 h-4" />
                                                            </Button>
                                                        </m.div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {aiError && (
                                                                <m.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                                                                    <p className="font-bold mb-1">שגיאה בניתוח</p>
                                                                    {aiError}
                                                                </m.div>
                                                            )}

                                                            {!isAnalyzing && (
                                                                <Button onClick={handleAnalyze} className="w-full py-4 text-lg shadow-xl shadow-brand-primary/20 gap-2">
                                                                    <Wand2 className="w-5 h-5" /> נתח וקבל המלצות
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

                            {step === BookingStep.SELECT_DATE && (
                                <m.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => datePickerRef.current?.showPicker()} className="text-white font-medium flex items-center gap-2 hover:text-brand-primary transition-colors">
                                                <Calendar className="w-5 h-5 text-brand-primary" />
                                                בחר תאריך
                                                <span className="text-xs font-normal text-slate-400">(לחץ לפתיחת יומן)</span>
                                            </button>
                                            <input type="date" ref={datePickerRef} className="invisible absolute" min={new Date().toISOString().split('T')[0]} onChange={(e) => { if (e.target.valueAsDate) { setSelectedDate(e.target.valueAsDate); } }} />
                                        </div>
                                        <div className="flex gap-3 overflow-x-auto pb-4">
                                            {calendarDays.map((date, i) => {
                                                const isSelected = selectedDate?.toDateString() === date.toDateString();
                                                return (
                                                    <button key={i} onClick={() => { setSelectedDate(date); }} className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-xl border transition-all shrink-0 ${isSelected ? 'bg-white text-brand-dark border-white scale-105 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:border-brand-primary/50 hover:text-white'}`}>
                                                        <span className="text-xs">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                                                        <span className="text-xl font-bold font-serif">{date.getDate()}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-4 min-h-[200px]">
                                        <h3 className="text-white font-medium flex items-center gap-2"><Clock className="w-5 h-5 text-brand-primary" /> בחר שעה <span className="text-xs text-slate-400 mr-2">(זמן נדרש: {totalDuration} דקות)</span></h3>
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
                                            <Input label="שם מלא" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                            <Input label="טלפון" type="tel" inputMode="numeric" dir="ltr" className="text-right" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Input
                                                label="אימייל"
                                                type="email"
                                                inputMode="url"
                                                dir="ltr"
                                                className="text-right"
                                                value={formData.email}
                                                onChange={e => {
                                                    // Allow only English letters, numbers, and common email symbols
                                                    const cleanValue = e.target.value.replace(/[^a-zA-Z0-9@._-]/g, '');
                                                    setFormData({ ...formData, email: cleanValue });
                                                }}
                                                lang="en"
                                                autoCapitalize="none"
                                                autoCorrect="off"
                                                spellCheck="false"
                                                autoComplete="email"
                                            />
                                            <Input label="תעודת זהות" type="tel" inputMode="numeric" maxLength={9} value={formData.nationalId} onChange={e => setFormData({ ...formData, nationalId: e.target.value })} />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-400 ms-1">הערות נוספות</label>
                                            <textarea className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 min-h-[100px]" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
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
                                    selectedJewelry={selectedJewelry}
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
                                    aiRecommendation={aiResult}
                                    onToggleService={toggleService}
                                    onToggleJewelry={toggleJewelry}
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
                                <button onClick={handlePrevStep} className="px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                                    <ArrowRight className="w-5 h-5" />
                                    <span className="hidden sm:inline">חזרה</span>
                                </button>
                            )}
                            <Button
                                onClick={() => {
                                    if (step === BookingStep.SELECT_SERVICE) handleNextStep();
                                    else if (step === BookingStep.AI_STYLIST) handleNextStep();
                                    else if (step === BookingStep.SELECT_DATE) handleNextStep();
                                    else if (step === BookingStep.DETAILS) handleNextStep();
                                    else if (step === BookingStep.CONSENT) handleBook();
                                }}
                                disabled={
                                    (step === BookingStep.SELECT_SERVICE && selectedServices.length === 0 && selectedJewelry.length === 0) ||
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

            {/* Story Gallery Viewer */}
            <StoryGallery
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                images={galleryImages}
                services={services}
                onBookService={(services: Service[]) => {
                    services.forEach(s => toggleService(s));
                    setStep(BookingStep.SELECT_SERVICE);
                }}
            />
        </div>
    );
};

export default Booking;