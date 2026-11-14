import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, Check, Loader2, ArrowRight, ArrowLeft, Droplets, Send, FileText, Eraser, Trash2, ShoppingBag, ChevronDown, ChevronUp, Ticket, X, Camera, Image as ImageIcon, CheckCircle, Info, ChevronRight, Wand2, Sparkles, CheckCircle2, AlertCircle, Upload, BrainCircuit, Plus, User
} from 'lucide-react';
import { Appointment, Service, BookingStep, StudioSettings, Coupon } from '../types';
import { api, ApiError, DayAvailabilityResult, TimeSlot } from '../services/mockApi';
import { Button, Card, Input } from '../components/ui';
import { Money } from '../components/Money';
import { DEFAULT_WORKING_HOURS, DEFAULT_STUDIO_DETAILS, JEWELRY_CATALOG } from '../constants';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { aiStylistService, AIAnalysisResult } from '../services/aiStylistService';
import { StoryGallery } from '../components/StoryGallery';
import { SmartImage } from '../components/SmartImage';
import { useAuth } from '../contexts/AuthContext';
import {
    buildBookingHorizonDays,
    DEFAULT_BOOKING_HORIZON_DAYS,
    getJerusalemParts,
    isStudioCompletelyClosed,
    jerusalemLocalToUtcDate,
    STUDIO_TIMEZONE,
} from '../shared/availability';
import {
    agorotToShekels,
    calculateAppointmentPricing,
} from '../shared/money';
import { extractHealingTime, getPainDisplay } from '../shared/serviceInfo';
import { isValidIsraeliPhone, pluralizeHebrew, validateBookingCustomerInput } from '../shared/validation';
import { buildWaitlistWhatsAppMessage, buildWhatsAppContactUrl } from '../services/notifications';

const m = motion as any;
const BOOKING_DRAFT_KEY = 'yuval_booking_draft_v1';

// --- Helper Utilities ---

const parseDateKeyNoonUtc = (dateKey: string): Date => {
    const [y, mo, d] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(y, (mo || 1) - 1, d || 1, 12, 0, 0));
};

const formatDateKeyLong = (dateKey: string | null): string => {
    if (!dateKey) return '---';
    return new Intl.DateTimeFormat('he-IL', {
        timeZone: STUDIO_TIMEZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(parseDateKeyNoonUtc(dateKey));
};

const formatDateKeyParts = (dateKey: string) => {
    const dt = parseDateKeyNoonUtc(dateKey);
    return {
        weekday: new Intl.DateTimeFormat('he-IL', { timeZone: STUDIO_TIMEZONE, weekday: 'short' }).format(dt),
        dayNum: Number(dateKey.split('-')[2] || '1'),
        monthShort: new Intl.DateTimeFormat('he-IL', { timeZone: STUDIO_TIMEZONE, month: 'short' }).format(dt),
    };
};

const createIdempotencyKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `appt_${crypto.randomUUID()}`;
    }
    return `appt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getBookingDetailsFieldErrors = (input: {
    name: string;
    phone: string;
    email: string;
    isUnder16: boolean;
    parentName: string;
    parentId: string;
    parentPhone: string;
}) => {
    const errs: Record<string, string> = {};
    const name = input.name.trim();
    if (name.length < 2 || !/[a-zA-Z\u0590-\u05FF]/.test(name)) {
        errs.client_name = 'נא להזין שם מלא תקין (לפחות 2 תווים)';
    }
    if (!isValidIsraeliPhone(input.phone)) {
        errs.client_phone = 'נא להזין מספר טלפון ישראלי תקין (למשל 054-1234567)';
    }
    const email = input.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errs.client_email = 'כתובת האימייל אינה תקינה';
    }
    if (input.isUnder16) {
        if (input.parentName.trim().length < 2) {
            errs.parent_name = 'חובה להזין שם הורה מלא';
        }
        const cleanPid = input.parentId.replace(/\D/g, '');
        if (cleanPid.length < 5 || cleanPid.length > 9) {
            errs.parent_id = 'חובה להזין תעודת זהות הורה תקינה';
        }
        if (!isValidIsraeliPhone(input.parentPhone)) {
            errs.parent_phone = 'חובה להזין טלפון הורה ישראלי תקין';
        }
    }
    return errs;
};

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

const ServiceCard = React.memo(({ service, isSelected, onClick, priority = false, showPainLevel = true }: { service: Service, isSelected: boolean, onClick: () => void, priority?: boolean, showPainLevel?: boolean }) => {
    const healingTime = extractHealingTime(service);
    const painInfo = getPainDisplay(service.pain_level);

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isSelected}
            className={`relative w-full text-right overflow-hidden rounded-2xl border cursor-pointer transition-[background-color,border-color,box-shadow] duration-200 ease-emil-out group h-32 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${isSelected ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(212,181,133,0.1)]' : 'border-white/5 bg-brand-surface/50 hover:border-brand-primary/30'}`}
        >
            <div className="flex h-full">
                <div className="w-28 sm:w-32 shrink-0 relative overflow-hidden bg-brand-dark/50">
                    <SmartImage
                        src={service.image_url}
                        alt={service.name}
                        priority={priority}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-brand-dark/20 group-hover:bg-transparent transition-colors" />
                    {isSelected && <div className="absolute inset-0 bg-brand-primary/20 flex items-center justify-center"><Check className="w-8 h-8 text-brand-primary drop-shadow-md" /></div>}
                </div>
                <div className="flex-1 p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className={`font-medium text-base sm:text-lg leading-tight truncate ${isSelected ? 'text-brand-primary' : 'text-white'}`}>{service.name}</h3>
                        <Money amount={service.price} className="text-brand-primary font-serif font-bold shrink-0" />
                    </div>
                    <div className="flex items-end justify-between mt-1 gap-2">
                        <div className="text-xs text-slate-400 space-y-0.5">
                            <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 shrink-0" /> {service.duration_minutes} דק'</div>
                            {healingTime && (
                                <div className="flex items-center gap-1.5"><Droplets className="w-3 h-3 shrink-0" /> {healingTime}</div>
                            )}
                        </div>
                        {showPainLevel && painInfo && (
                            <div className="flex flex-col items-end gap-1 shrink-0" aria-label={`רמת כאב ${painInfo.value} מתוך ${painInfo.max}`}>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">כאב ({painInfo.value})</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                                        <div key={i} className={`w-0.5 sm:w-1 h-2 sm:h-3 rounded-full ${i <= painInfo.value ? 'bg-brand-primary' : 'bg-white/10'}`} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </button>
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
    // Track active stroke synchronously in a ref so rapid pointer/touch strokes never miss draw/stopDrawing before React re-renders.
    const isDrawingRef = useRef(false);

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
        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('clientX' in e) {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawingRef.current = true;
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.beginPath();
        ctx?.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingRef.current) return;
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
        if (isDrawingRef.current) {
            isDrawingRef.current = false;
            onSave(canvasRef.current?.toDataURL() || '');
        }
    };

    const clearCanvas = () => {
        isDrawingRef.current = false;
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
                    role="application"
                    aria-label="משטח לחתימה דיגיטלית ידנית"
                    tabIndex={0}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseMove={draw}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="w-full h-[150px] cursor-crosshair touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                />
                <button
                    onClick={clearCanvas}
                    type="button"
                    aria-label="נקה משטח חתימה"
                    className="absolute top-2 left-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                    <Eraser className="w-4 h-4" />
                </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">חתום בתוך התיבה</p>
        </div>
    );
};

const TicketSummary: React.FC<any> = ({
    selectedServices, selectedJewelry, selectedDateKey, selectedSlot, totalDuration, appliedCoupon, couponCode, couponError, isCheckingCoupon, discountAmount, finalPrice, step, readOnly, aiRecommendation, onToggleService, onToggleJewelry, onSetCouponCode, onApplyCoupon, onClearCoupon, referralCode
}) => {
    const result: AIAnalysisResult | null = aiRecommendation;

    return (
        <div className="p-6 space-y-6">
            <div className={`transition-opacity duration-300 ${selectedServices.length > 0 || selectedJewelry?.length > 0 ? 'opacity-100' : 'opacity-30'}`}>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">טיפולים שנבחרו</div>
                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                    {selectedServices.map((s: Service, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm gap-2">
                            <span className="text-white truncate max-w-[150px]">{s.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                                <Money amount={s.price} className="text-brand-primary" />
                                {step === BookingStep.SELECT_SERVICE && !readOnly && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onToggleService(s); }}
                                        aria-label={`הסר טיפול ${s.name}`}
                                        className="text-red-400 hover:text-red-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Jewelry Section in Ticket */}
                    {selectedJewelry?.map((item: any, idx: number) => (
                        <div key={`j-${idx}`} className="flex justify-between items-center text-sm bg-brand-primary/5 p-2 rounded-lg border border-brand-primary/10 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <Sparkles className="w-3 h-3 text-brand-primary shrink-0" />
                                <span className="text-white truncate max-w-[130px]">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Money amount={item.price} className="text-brand-primary" />
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => onToggleJewelry(item)}
                                        aria-label={`הסר תכשיט ${item.name}`}
                                        className="text-red-400 hover:text-red-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                    >
                                        <Trash2 className="w-4 h-4" />
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

            <div className={`transition-opacity duration-300 ${selectedDateKey && selectedSlot ? 'opacity-100' : 'opacity-40'}`}>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">מועד התור</div>
                <div className="font-medium text-white text-lg">{formatDateKeyLong(selectedDateKey)}</div>
                <div className="text-slate-300 flex justify-between">
                    <span>{selectedSlot || '--:--'}</span>
                    <span className="text-xs text-slate-500 mt-1">({totalDuration || 30} דק')</span>
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
                            <button type="button" onClick={onClearCoupon} aria-label="הסר קופון" className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="קוד קופון"
                            aria-label="קוד קופון"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-brand-primary/30 uppercase disabled:opacity-50"
                            value={couponCode}
                            onChange={(e) => onSetCouponCode(e.target.value)}
                            disabled={readOnly || (selectedServices.length === 0 && selectedJewelry.length === 0)}
                        />
                        <button
                            type="button"
                            onClick={onApplyCoupon}
                            disabled={readOnly || !couponCode || isCheckingCoupon || (selectedServices.length === 0 && selectedJewelry.length === 0)}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm border border-white/10 disabled:opacity-50"
                        >
                            {isCheckingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'הפעל'}
                        </button>
                    </div>
                )}
                {couponError && !readOnly && <p className="text-xs text-red-400">{couponError}</p>}

                {/* Show Referral Discount Info if active and no coupon applied */}
                {referralCode && !appliedCoupon && (
                    <div className="mt-3 p-3 bg-brand-primary/10 border border-brand-primary/30 rounded-lg flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-300">
                            <span className="font-bold text-brand-primary">הטבת חברה:</span> זיהינו שהגעת דרך המלצה של חברה! הופעלה 10% הנחה על ההזמנה שלך.
                        </div>
                    </div>
                )}
            </div>

            <div>
                {discountAmount > 0 && (
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-slate-400 text-xs">הנחה</span>
                        <Money amount={discountAmount} prefix="-" className="text-sm text-brand-primary" />
                    </div>
                )}
                <div className="flex justify-between items-end">
                    <span className="text-slate-400 text-sm">סה"כ לתשלום</span>
                    <Money amount={finalPrice} className="text-3xl font-serif text-white" />
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
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [availabilityDetail, setAvailabilityDetail] = useState<DayAvailabilityResult | null>(null);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [studioSettings, setStudioSettings] = useState<StudioSettings | null>(null);
    const [jewelryCatalog, setJewelryCatalog] = useState<any[]>(JEWELRY_CATALOG);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });
    const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({});
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [initError, setInitError] = useState<string | null>(null);
    const [restoredDraftBanner, setRestoredDraftBanner] = useState(false);
    const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
    const [hasAgreedToHealth, setHasAgreedToHealth] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);

    // Waitlist State (for closed / full dates)
    const [showWaitlistForm, setShowWaitlistForm] = useState(false);
    const [waitlistPhone, setWaitlistPhone] = useState('');
    const [waitlistName, setWaitlistName] = useState('');
    const [waitlistNotes, setWaitlistNotes] = useState('');
    const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
    const [waitlistError, setWaitlistError] = useState<string | null>(null);
    const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

    // Parental Consent State
    const [isUnder16, setIsUnder16] = useState(false);
    const [parentData, setParentData] = useState({ name: '', id: '', phone: '' });

    // Gallery State
    const [galleryImages, setGalleryImages] = useState<any[]>([]);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // AI State
    const [isAiEnabled, setIsAiEnabled] = useState(true);
    const [aiImage, setAiImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // Selected recommendation hotspot index
    const [selectedRecommendation, setSelectedRecommendation] = useState<number | null>(null);

    // Coupon & Referral State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
    const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
    const [referralCode, setReferralCode] = useState<string | null>(null);

    // Anatomy State
    const [anatomyImage, setAnatomyImage] = useState<string | null>(null);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const datePickerRef = useRef<HTMLInputElement>(null);
    const anatomyInputRef = useRef<HTMLInputElement>(null);
    const idempotencyKeyRef = useRef<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile, signInWithGoogle } = useAuth();

    // Reset idempotency key when core selection or slot changes
    useEffect(() => {
        idempotencyKeyRef.current = null;
    }, [selectedDateKey, selectedSlot, selectedServices, selectedJewelry, appliedCoupon?.code]);

    // --- Pre-fill Data ---
    useEffect(() => {
        if (profile || user) {
            setFormData(prev => ({
                ...prev,
                name: profile?.full_name || user?.user_metadata?.full_name || prev.name,
                email: profile?.email || user?.email || prev.email,
                phone: profile?.phone || prev.phone
            }));
        }
    }, [profile, user]);

    // --- Initialization (Single Bootstrap Fetch + Local Unsent Draft Recovery) ---
    useEffect(() => {
        const init = async () => {
            try {
                const bootstrap = await api.getBootstrap();
                const fetchedServices = bootstrap.services || [];
                const fetchedSettings = bootstrap.settings;
                const fetchedGallery = bootstrap.gallery || { items: [] };

                setServices(fetchedServices);
                setStudioSettings(fetchedSettings);
                setGalleryImages(fetchedGallery?.items || []);

                if (bootstrap.inventoryItems && Array.isArray(bootstrap.inventoryItems)) {
                    setJewelryCatalog(bootstrap.inventoryItems);
                } else {
                    setJewelryCatalog(JEWELRY_CATALOG);
                }

                const aiSetting = (fetchedSettings as any)?.enable_ai;
                setIsAiEnabled(aiSetting !== false);

                if (location.state) {
                    const enableAi = (fetchedSettings as any)?.enable_ai !== false;

                    if (location.state.preSelectedServices) {
                        const preSelected = location.state.preSelectedServices as Service[];
                        const validPreSelected = preSelected.filter(ps => fetchedServices.some(s => s.id === ps.id));
                        if (validPreSelected.length > 0) {
                            setSelectedServices(validPreSelected);
                            const shouldSkipAi = location.state.skipAi || !enableAi;
                            setStep(shouldSkipAi ? BookingStep.SELECT_DATE : BookingStep.AI_STYLIST);
                        }
                    } else if (location.state.preSelectedJewelry) {
                        const preSelectedJ = location.state.preSelectedJewelry;
                        if (preSelectedJ.length > 0) {
                            setSelectedJewelry(preSelectedJ);
                            setStep(BookingStep.SELECT_SERVICE);
                        }
                    }
                    window.history.replaceState({}, document.title);
                } else {
                    try {
                        const rawDraft = localStorage.getItem(BOOKING_DRAFT_KEY);
                        if (rawDraft) {
                            const draft = JSON.parse(rawDraft);
                            if (draft && (draft.formData?.name || draft.formData?.phone || draft.selectedServiceIds?.length)) {
                                if (draft.formData) {
                                    setFormData(prev => ({ ...prev, ...draft.formData }));
                                }
                                if (Array.isArray(draft.selectedServiceIds)) {
                                    const restored = fetchedServices.filter(s => draft.selectedServiceIds.includes(s.id));
                                    if (restored.length > 0) setSelectedServices(restored);
                                }
                                if (typeof draft.selectedDateKey === 'string') {
                                    setSelectedDateKey(draft.selectedDateKey);
                                }
                                setRestoredDraftBanner(true);
                            }
                        }
                    } catch {
                        // Ignore malformed local draft
                    }
                }

                const storedRef = localStorage.getItem('referred_by');
                if (storedRef) {
                    setReferralCode(storedRef);
                }
            } catch (e: any) {
                console.error("Failed to initialize booking:", e);
                setInitError(e?.message || 'לא הצלחנו לטעון את נתוני התורים כרגע. נסה לרענן את העמוד.');
            }
        };
        init();
    }, []);

    // Save local unsent draft safely
    useEffect(() => {
        if (step === BookingStep.CONFIRMATION) return;
        const hasMeaningfulInput =
            selectedServices.length > 0 ||
            Boolean(formData.name.trim()) ||
            Boolean(formData.phone.trim());
        if (!hasMeaningfulInput) return;

        try {
            localStorage.setItem(
                BOOKING_DRAFT_KEY,
                JSON.stringify({
                    selectedServiceIds: selectedServices.map(s => s.id),
                    selectedDateKey,
                    formData,
                    savedAt: new Date().toISOString(),
                })
            );
        } catch {
            // Quota exceeded; ignore
        }
    }, [selectedServices, selectedDateKey, formData, step]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(BOOKING_DRAFT_KEY);
        } catch {
            // Ignore
        }
        setRestoredDraftBanner(false);
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    // --- Dynamic Navigation Logic ---
    const handleNextStep = useCallback(() => {
        setBookingError(null);
        if (step === BookingStep.DETAILS) {
            const errs = getBookingDetailsFieldErrors({
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                isUnder16: false,
                parentName: '',
                parentId: '',
                parentPhone: '',
            });
            const sharedErr = validateBookingCustomerInput({
                client_name: formData.name,
                client_phone: formData.phone,
                is_under_16: false,
            });
            if (Object.keys(errs).length > 0 || sharedErr) {
                setDetailsErrors(errs);
                return;
            }
            setDetailsErrors({});
        }
        setStep((current) => {
            if (current === BookingStep.SELECT_SERVICE) {
                return isAiEnabled ? BookingStep.AI_STYLIST : BookingStep.SELECT_DATE;
            }
            if (current === BookingStep.AI_STYLIST) return BookingStep.SELECT_DATE;
            if (current === BookingStep.SELECT_DATE) return BookingStep.DETAILS;
            if (current === BookingStep.DETAILS) return BookingStep.CONSENT;
            return current;
        });
    }, [isAiEnabled, step, formData]);

    const handlePrevStep = useCallback(() => {
        setBookingError(null);
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

    // --- Memoized Values (Integer Agorot Pricing — P1-A) ---
    const filteredServices = useMemo(() => {
        if (activeCategory === 'All') return services;
        return services.filter(s => s.category === activeCategory);
    }, [activeCategory, services]);

    const totalDuration = useMemo(
        () => selectedServices.reduce((acc, s) => acc + (Number(s.duration_minutes) || 0), 0),
        [selectedServices]
    );
    const effectiveDurationMinutes = useMemo(() => Math.max(30, totalDuration || 30), [totalDuration]);

    const pricing = useMemo(
        () =>
            calculateAppointmentPricing({
                servicePricesShekels: selectedServices.map(s => s.price),
                jewelryPricesShekels: selectedJewelry.map(j => j.price),
                coupon: appliedCoupon,
                hasReferralDiscount: Boolean(referralCode),
            }),
        [selectedServices, selectedJewelry, appliedCoupon, referralCode]
    );

    const basePrice = agorotToShekels(pricing.subtotalAgorot);
    const finalPrice = agorotToShekels(pricing.finalTotalAgorot);
    const discountAmount = agorotToShekels(pricing.totalDiscountAgorot);

    // --- Horizon & Working Hours Calendar (Asia/Jerusalem) ---
    const workingHours = useMemo(
        () => studioSettings?.working_hours || DEFAULT_WORKING_HOURS,
        [studioSettings]
    );
    const horizonDaysCount = studioSettings?.booking_horizon_days ?? DEFAULT_BOOKING_HORIZON_DAYS;
    const todayDateKey = useMemo(() => getJerusalemParts(new Date()).dateKey, []);

    const horizonDaysMeta = useMemo(
        () =>
            buildBookingHorizonDays({
                workingHours,
                horizonDays: horizonDaysCount,
            }),
        [workingHours, horizonDaysCount]
    );

    const openCalendarDays = useMemo(
        () => horizonDaysMeta.filter(d => d.isOpenSchedule),
        [horizonDaysMeta]
    );

    const maxBookableDateKey = useMemo(
        () => horizonDaysMeta[horizonDaysMeta.length - 1]?.dateKey || todayDateKey,
        [horizonDaysMeta, todayDateKey]
    );

    const isAllStudioClosed = useMemo(
        () => isStudioCompletelyClosed(workingHours),
        [workingHours]
    );

    useEffect(() => {
        if (step !== BookingStep.SELECT_DATE) return;
        if (!selectedDateKey) {
            if (openCalendarDays.length > 0) {
                setSelectedDateKey(openCalendarDays[0].dateKey);
            } else {
                setSelectedDateKey(todayDateKey);
            }
        }
    }, [step, selectedDateKey, openCalendarDays, todayDateKey]);

    // Abortable Availability Fetch
    useEffect(() => {
        setSelectedSlot(null);
        setWaitlistSubmitted(false);
        setWaitlistError(null);
        if (!selectedDateKey) {
            setAvailabilityDetail(null);
            setAvailableSlots([]);
            return;
        }

        const controller = new AbortController();
        setIsLoadingSlots(true);

        api.getAvailabilityDetail(selectedDateKey, effectiveDurationMinutes, controller.signal)
            .then((detail) => {
                if (controller.signal.aborted) return;
                setAvailabilityDetail(detail);
                setAvailableSlots(detail.slots || []);
                setIsLoadingSlots(false);
            })
            .catch((err) => {
                if (controller.signal.aborted || err?.name === 'AbortError') return;
                setAvailabilityDetail({
                    date: selectedDateKey,
                    dayOfWeek: 0,
                    status: 'error',
                    reasonMessage: err?.message || 'שגיאה בבדיקת השעות הפנויות.',
                    horizonDays: horizonDaysCount,
                    maxBookableDate: maxBookableDateKey,
                    slots: [],
                    serviceDurationMinutes: effectiveDurationMinutes,
                });
                setAvailableSlots([]);
                setIsLoadingSlots(false);
            });

        return () => controller.abort();
    }, [selectedDateKey, effectiveDurationMinutes, horizonDaysCount, maxBookableDateKey]);

    const toggleService = useCallback((service: Service) => {
        setSelectedServices(prev => {
            const exists = prev.find(s => s.id === service.id);
            if (exists) return prev.filter(s => s.id !== service.id);
            return [...prev, service];
        });
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

    const handleAnatomyImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const compressedDataUrl = await compressImage(file);
            setAnatomyImage(compressedDataUrl);
        } catch (err) {
            console.error(err);
            setBookingError("שגיאה בטעינת תמונת האוזן. נסה קובץ אחר.");
        }
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!aiImage) return;
        setIsAnalyzing(true);
        setAiError(null);

        try {
            const cleanBase64 = aiImage.split(',')[1];
            const result = await aiStylistService.analyzeEar(cleanBase64);

            const filteredRecs = result.recommendations.filter(rec => {
                const item = jewelryCatalog.find(j => j.id === rec.jewelry_id);
                return item && item.in_stock !== false;
            });

            setAiResult({ ...result, recommendations: filteredRecs });
        } catch (err: any) {
            console.error("Analysis Failed:", err);
            setAiError("אופס! הסטייליסט הוירטואלי שלנו קצת עמוס כרגע... נסו שוב עוד כמה דקות או המשיכו לקביעת תור רגילה.");
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
        } catch {
            setCouponError('שגיאה בבדיקת הקופון');
        } finally {
            setIsCheckingCoupon(false);
        }
    }, [couponCode, basePrice]);

    const isSlotValid = useCallback((startIndex: number) => {
        const slotsNeeded = Math.ceil(effectiveDurationMinutes / 30);
        if (startIndex + slotsNeeded > availableSlots.length) return false;
        for (let i = 0; i < slotsNeeded; i++) {
            if (!availableSlots[startIndex + i]?.available) return false;
        }
        return true;
    }, [availableSlots, effectiveDurationMinutes]);

    const hasAnyValidSlot = useMemo(
        () => availableSlots.some((_, idx) => isSlotValid(idx)),
        [availableSlots, isSlotValid]
    );

    const handleWaitlistSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setWaitlistError(null);
        const nameToUse = waitlistName.trim() || formData.name.trim();
        const phoneToUse = waitlistPhone.trim() || formData.phone.trim();
        const checkErr = validateBookingCustomerInput({
            client_name: nameToUse,
            client_phone: phoneToUse,
            is_under_16: false,
        });
        if (checkErr) {
            setWaitlistError(checkErr);
            return;
        }

        setWaitlistSubmitting(true);
        try {
            await api.submitWaitlist({
                client_name: nameToUse,
                client_phone: phoneToUse,
                preferred_date: selectedDateKey || undefined,
                service_names: selectedServices.map(s => s.name).join(' + '),
                notes: waitlistNotes.trim() || undefined,
            });
            setWaitlistSubmitted(true);
        } catch (err: any) {
            setWaitlistError(err?.message || 'שגיאה בשמירת הפניה לרשימת ההמתנה. נסה לפנות בוואטסאפ.');
        } finally {
            setWaitlistSubmitting(false);
        }
    }, [waitlistName, waitlistPhone, waitlistNotes, formData, selectedDateKey, selectedServices]);

    const handleBook = useCallback(async () => {
        setBookingError(null);

        const fieldErrs = getBookingDetailsFieldErrors({
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            isUnder16,
            parentName: parentData.name,
            parentId: parentData.id,
            parentPhone: parentData.phone,
        });
        const validationErr = validateBookingCustomerInput({
            client_name: formData.name,
            client_phone: formData.phone,
            is_under_16: isUnder16,
            parent_name: parentData.name,
            parent_id: parentData.id,
            parent_phone: parentData.phone,
        });
        if (Object.keys(fieldErrs).length > 0 || validationErr) {
            setDetailsErrors(fieldErrs);
            setBookingError(validationErr || Object.values(fieldErrs)[0] || 'נא לבדוק את הפרטים שהוזנו.');
            return;
        }

        if (!selectedDateKey || !selectedSlot) {
            setBookingError('יש לבחור תאריך ושעה פנויה לפני השליחה.');
            return;
        }

        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = createIdempotencyKey();
        }

        setIsSubmitting(true);

        try {
            const [hours, minutes] = selectedSlot.split(':').map(Number);
            const startMinutes = (hours || 0) * 60 + (minutes || 0);
            const appointmentStart = jerusalemLocalToUtcDate(selectedDateKey, startMinutes);
            const endTime = new Date(appointmentStart.getTime() + effectiveDurationMinutes * 60000).toISOString();

            const visualPlanString = selectedJewelry.length > 0 ? JSON.stringify({
                original_image: aiImage && aiImage.startsWith('http') ? aiImage : undefined,
                recommendations: aiResult?.recommendations || [],
                selected_items: selectedJewelry.map(j => j.id),
            }) : '';

            const created = await api.createAppointment({
                idempotency_key: idempotencyKeyRef.current,
                client_id: user?.id,
                service_id: selectedServices[0]?.id || 'combined',
                service_ids: selectedServices.map(s => s.id),
                jewelry_ids: selectedJewelry.map(j => j.id),
                service_name: [
                    ...selectedServices.map(s => s.name),
                    ...selectedJewelry.map(j => j.name),
                ].filter(Boolean).join(' + '),
                start_time: appointmentStart.toISOString(),
                end_time: endTime,
                client_name: formData.name.trim(),
                client_phone: formData.phone.trim(),
                client_email: formData.email.trim(),
                notes: formData.notes.trim(),
                signature: signatureData!,
                coupon_code: appliedCoupon?.code,
                final_price: finalPrice,
                visual_plan: visualPlanString,
                ai_recommendation_text: visualPlanString,
                ai_image_data_url:
                    aiImage && selectedJewelry.length > 0 && aiImage.startsWith('data:image/')
                        ? aiImage
                        : undefined,
                anatomy_image_data_url:
                    anatomyImage && anatomyImage.startsWith('data:image/')
                        ? anatomyImage
                        : undefined,
                terms_accepted: hasAgreedToTerms,
                privacy_accepted: hasAgreedToTerms,
                marketing_opt_in: marketingOptIn,
                consent_timestamp: new Date().toISOString(),
                is_under_16: isUnder16,
                parent_name: isUnder16 ? parentData.name.trim() : undefined,
                parent_id: isUnder16 ? parentData.id.trim() : undefined,
                parent_phone: isUnder16 ? parentData.phone.trim() : undefined,
                referred_by: referralCode || undefined,
            });

            clearDraft();
            setConfirmedAppointment(created);
            setStep(BookingStep.CONFIRMATION);
        } catch (err: any) {
            console.error("Booking error:", err);
            const message =
                err instanceof ApiError && err.fieldErrors
                    ? Object.values(err.fieldErrors)[0] || err.message
                    : err?.message || 'התור לא נשמר במערכת — אנא בדקו חיבור ונסו שוב.';
            setBookingError(message);

            if (err instanceof ApiError && err.status === 409) {
                setSelectedSlot(null);
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [
        formData,
        isUnder16,
        parentData,
        selectedDateKey,
        selectedSlot,
        effectiveDurationMinutes,
        selectedJewelry,
        aiImage,
        aiResult,
        user?.id,
        selectedServices,
        signatureData,
        appliedCoupon,
        finalPrice,
        anatomyImage,
        hasAgreedToTerms,
        marketingOptIn,
        referralCode,
        clearDraft,
    ]);

    const sendConfirmationWhatsapp = useCallback(() => {
        if ((selectedServices.length === 0 && selectedJewelry.length === 0) || !selectedDateKey || !selectedSlot) return;
        const phone = studioSettings?.studio_details?.phone || DEFAULT_STUDIO_DETAILS.phone;
        const items = [
            ...selectedServices.map(s => s.name),
            ...selectedJewelry.map(j => j.name)
        ].join(' + ');
        const refLine = confirmedAppointment?.id ? `\n*מספר פניה:* #${confirmedAppointment.id.slice(-8)}` : '';
        const msg = `*היי, קבעתי תור באתר!* 👋${refLine}\n\n*שם:* ${formData.name}\n*פריטים:* ${items}\n*תאריך:* ${formatDateKeyLong(selectedDateKey)}\n*שעה:* ${selectedSlot}\n\nאשמח לאישור סופי. תודה! 🙏`;
        window.open(buildWhatsAppContactUrl(phone, msg), '_blank', 'noopener,noreferrer');
    }, [selectedServices, selectedJewelry, selectedDateKey, selectedSlot, formData, studioSettings, confirmedAppointment]);

    const categories = useMemo(() => [{ id: 'All', label: 'הכל' }, { id: 'Ear', label: 'אוזניים' }, { id: 'Face', label: 'פנים' }, { id: 'Body', label: 'גוף' }], []);
    const showBottomBar = (step === BookingStep.SELECT_SERVICE && (selectedServices.length > 0 || selectedJewelry.length > 0)) || (step > BookingStep.SELECT_SERVICE && step < BookingStep.CONFIRMATION);

    return (
        <div className="min-h-screen bg-brand-dark pt-24 pb-32 lg:pb-12">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-8 relative items-start">

                    <div className="flex-1 w-full z-10">
                        {/* Header */}
                        <div className="mb-4">
                            <h1 className="sr-only">הזמנת תור לפירסינג ותכשיטים - סטודיו יובל</h1>
                            {/* Accessible Step Transition Announcement */}
                            <div aria-live="polite" aria-atomic="true" className="sr-only">
                                {step === BookingStep.CONFIRMATION
                                    ? 'הזמנת התור נקלטה בהצלחה! פרטי האישור מוצגים כעת.'
                                    : `עברת לשלב ${currentStepDisplay} מתוך ${totalSteps}: ${step === BookingStep.SELECT_SERVICE ? 'בחירת טיפול' :
                                        step === BookingStep.AI_STYLIST ? 'מעצב האוזן האישי' :
                                            step === BookingStep.SELECT_DATE ? 'תאריך ושעה' :
                                                step === BookingStep.DETAILS ? 'פרטים אישיים' :
                                                    step === BookingStep.CONSENT ? 'הצהרת בריאות ואישור' : 'אישור הזמנה'
                                    }`}
                            </div>
                            <h2 className="text-4xl font-serif text-white mb-2">
                                {step === BookingStep.SELECT_SERVICE && 'בחירת טיפול'}
                                {step === BookingStep.AI_STYLIST && 'מעצב האוזן האישי (AI)'}
                                {step === BookingStep.SELECT_DATE && 'תאריך ושעה'}
                                {step === BookingStep.DETAILS && 'פרטים אישיים'}
                                {step === BookingStep.CONSENT && 'הצהרת בריאות ואישור'}
                                {step === BookingStep.CONFIRMATION && 'אישור הזמנה'}
                            </h2>
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

                        {initError && (
                            <div role="alert" className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                <span>{initError}</span>
                            </div>
                        )}

                        {restoredDraftBanner && step < BookingStep.CONFIRMATION && (
                            <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2">
                                <span>שוחזרה טיוטת תור שלא נשלחה מהביקור הקודם. ניתן להמשיך או לנקות.</span>
                                <button
                                    type="button"
                                    onClick={clearDraft}
                                    className="text-xs font-medium underline hover:text-white"
                                >
                                    הסתר הודעה / נקה טיוטה
                                </button>
                            </div>
                        )}

                        {/* Mobile Summary - Fixed Z-Index */}
                        {(selectedServices.length > 0 || selectedJewelry.length > 0) && step < BookingStep.CONFIRMATION && (
                            <div className="lg:hidden mb-6 relative z-[70]">
                                <button
                                    type="button"
                                    onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
                                    aria-expanded={isMobileSummaryOpen}
                                    aria-label="פתח או סגור סיכום ביניים לתור"
                                    className="w-full flex items-center justify-between p-4 bg-brand-surface/90 backdrop-blur-md border border-white/10 rounded-xl shadow-lg transition-[background-color,border-color,box-shadow,transform] duration-150 ease-emil-out active:scale-[0.98] relative z-20"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                            <ShoppingBag className="w-5 h-5" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">סיכום ביניים</p>
                                            <p className="text-sm font-medium text-white">
                                                {pluralizeHebrew(
                                                    selectedServices.length + selectedJewelry.length,
                                                    'פריט 1 נבחר',
                                                    `${selectedServices.length + selectedJewelry.length} פריטים נבחרו`
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Money amount={finalPrice} className="text-xl font-serif text-brand-primary" />
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
                                                    selectedDateKey={selectedDateKey}
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
                                                    referralCode={referralCode}
                                                />
                                            </div>
                                        </m.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        <AnimatePresence mode="wait" initial={false}>
                            {step === BookingStep.SELECT_SERVICE && (
                                <m.div key="step1" initial={{ opacity: 0, transform: "translateY(10px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} exit={{ opacity: 0, transform: "translateY(-10px)" }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="space-y-6">
                                    {/* Booking Disclaimer */}
                                    <div className="bg-brand-primary/10 border border-brand-primary/30 p-4 rounded-xl flex items-start gap-4">
                                        <Info className="w-6 h-6 text-brand-primary shrink-0 mt-0.5" />
                                        <div className="text-sm text-slate-200 leading-relaxed w-full">
                                            <span className="font-bold text-brand-primary block mb-1">חשוב לדעת:</span>
                                            <p className="mb-3">
                                                מחיר השירות <b>לא כולל</b> את העגילים מהמלאי (אותם ניתן לבחור ולרכוש בקליניקה). המחיר מגלם בתוכו עגיל טיטניום רפואי (סטנדרטי) שמגיע יחד עם הניקוב.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/jewelry', { state: { activeTab: 'inventory' } })}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/30 rounded-lg text-xs font-medium hover:bg-brand-primary hover:text-brand-dark transition-[background-color,border-color,color,transform] duration-150 ease-emil-out active:scale-[0.97]"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                קחי אותי לגלריה
                                            </button>
                                        </div>
                                    </div>

                                    {galleryImages.length > 0 && studioSettings?.enable_gallery !== false && (
                                        <m.button
                                            type="button"
                                            layoutId="story-gallery-opener"
                                            onClick={() => setIsGalleryOpen(true)}
                                            className="w-full relative overflow-hidden group rounded-2xl border border-brand-primary/30 p-1 block text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
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
                                    <div className="flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label="קטגוריות טיפולים">
                                        {categories.map(cat => (
                                            <button type="button" role="tab" aria-selected={activeCategory === cat.id} key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`min-h-[44px] px-6 py-2.5 rounded-full text-sm transition-[background-color,border-color,color] duration-150 ease-out active:scale-[0.98] whitespace-nowrap border flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${activeCategory === cat.id ? 'bg-white text-brand-dark border-white font-medium shadow-md' : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'}`}>{cat.label}</button>
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
                                                showPainLevel={studioSettings?.show_pain_level !== false}
                                            />
                                        ))}
                                    </div>
                                </m.div>
                            )}

                            {step === BookingStep.AI_STYLIST && (
                                <m.div key="ai" initial={{ opacity: 0, transform: "translateX(20px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} exit={{ opacity: 0, transform: "translateX(-20px)" }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="space-y-6">
                                    <Card className="bg-brand-surface/50 border-brand-primary/20 p-8 text-center relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-primary/20 transition-colors"></div>

                                        {!aiImage ? (
                                            <div className="py-12 flex flex-col items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    aria-label="צלם תמונה לניתוח התאמת עגילים"
                                                    className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-6 ring-1 ring-brand-primary/30 cursor-pointer hover:bg-brand-primary/20 transition-[background-color,transform] duration-200 ease-emil-out hover:scale-105 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                                    title="צלם תמונה"
                                                >
                                                    <Camera className="w-10 h-10" />
                                                </button>
                                                <h3 className="text-2xl font-serif text-white mb-2">גלה את הפוטנציאל שלך</h3>
                                                <p className="text-slate-400 text-sm mb-8 max-w-sm">העלה תמונה ברורה של האוזן שלך וקבל המלצות סטיילינג מותאמות אישית מהבינה המלאכותית שלנו.</p>

                                                <div className="flex flex-wrap justify-center gap-4">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="user"
                                                        className="hidden"
                                                        ref={cameraInputRef}
                                                        onChange={handleImageUpload}
                                                    />
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        ref={galleryInputRef}
                                                        onChange={handleImageUpload}
                                                    />
                                                    <Button type="button" onClick={() => galleryInputRef.current?.click()} variant="outline" className="gap-2">
                                                        <Upload className="w-4 h-4" /> בחר תמונה
                                                    </Button>
                                                    <Button type="button" onClick={handleNextStep} variant="ghost">דלג על השלב</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Container wrapper for positioning */}
                                                <div className="relative w-full max-w-md mx-auto">
                                                    {/* Image Container with clipping */}
                                                    <div className="relative rounded-2xl border-2 border-brand-primary/30 shadow-2xl bg-black/40">
                                                        <img src={aiImage} alt="תמונת אוזן שהועלתה" className="w-full h-auto block rounded-2xl" />
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
                                                                            className="absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2 z-30"
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                aria-label={`הצג המלצת תכשיט למיקום ${rec.location}`}
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedRecommendation(selectedRecommendation === i ? null : i); }}
                                                                                title={rec.location}
                                                                                className="w-full h-full rounded-full border-2 border-brand-primary bg-white overflow-hidden shadow-[0_0_15px_rgba(212,181,133,0.5)] hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                                                            >
                                                                                <img src={jewelry.image_url} alt={jewelry.name} className="w-full h-full object-cover" />
                                                                            </button>

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
                                                                                                <Money amount={jewelry.price} className="text-brand-primary font-serif font-bold" />
                                                                                                {selectedJewelry.find(j => j.id === jewelry.id) ? (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => toggleJewelry(jewelry)}
                                                                                                        className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500 hover:text-white transition-colors"
                                                                                                    >
                                                                                                        הסר
                                                                                                    </button>
                                                                                                ) : (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => toggleJewelry(jewelry)}
                                                                                                        className="px-3 py-1 bg-brand-primary text-brand-dark text-xs font-bold rounded hover:bg-white transition-colors"
                                                                                                    >
                                                                                                        הוסף לתור
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <button
                                                                                            type="button"
                                                                                            aria-label="סגור חלונית תכשיט"
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

                                                    <button type="button" aria-label="הסר תמונה" onClick={() => { setAiImage(null); setAiResult(null); setAiError(null); setSelectedJewelry([]); }} className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors z-40">
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
                                                            <Button type="button" onClick={handleNextStep} className="w-full mt-2 gap-2">
                                                                המשך לקביעת תור <ArrowLeft className="w-4 h-4" />
                                                            </Button>
                                                        </m.div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {aiError && (
                                                                <m.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                                                                    <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                        <AlertCircle className="w-6 h-6" />
                                                                    </div>
                                                                    <p className="font-bold text-red-400 mb-1">העיצוב מתעכב קלות</p>
                                                                    <p className="text-slate-300 text-sm leading-relaxed">{aiError}</p>
                                                                </m.div>
                                                            )}

                                                            {!isAnalyzing && (
                                                                <Button type="button" onClick={handleAnalyze} className="w-full py-4 text-lg shadow-xl shadow-brand-primary/20 gap-2">
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
                                <m.div key="step2" initial={{ opacity: 0, transform: "translateX(20px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} exit={{ opacity: 0, transform: "translateX(-20px)" }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-5 h-5 text-brand-primary" />
                                                <span className="text-white font-medium">בחר תאריך</span>
                                                <span className="text-xs text-slate-400">(עד {horizonDaysCount} ימים קדימה)</span>
                                            </div>
                                            <label className="inline-flex items-center gap-2 text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:border-brand-primary/40">
                                                <span>בחירה מיומן:</span>
                                                <input
                                                    type="date"
                                                    ref={datePickerRef}
                                                    aria-label="בחר תאריך מדויק מהיומן"
                                                    className="bg-transparent text-white text-xs outline-none [color-scheme:dark]"
                                                    min={todayDateKey}
                                                    max={maxBookableDateKey}
                                                    value={selectedDateKey || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val) setSelectedDateKey(val);
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        {selectedDateKey && (
                                            <div className="text-sm text-brand-primary font-medium" aria-live="polite">
                                                תאריך נבחר: {formatDateKeyLong(selectedDateKey)}
                                            </div>
                                        )}

                                        {openCalendarDays.length > 0 ? (
                                            <div className="flex gap-3 overflow-x-auto pb-4">
                                                {openCalendarDays.map((dayMeta) => {
                                                    const isSelected = selectedDateKey === dayMeta.dateKey;
                                                    const parts = formatDateKeyParts(dayMeta.dateKey);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={dayMeta.dateKey}
                                                            aria-pressed={isSelected}
                                                            onClick={() => setSelectedDateKey(dayMeta.dateKey)}
                                                            className={`flex flex-col items-center justify-center min-w-[74px] h-22 py-2 px-2 rounded-xl border transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${isSelected ? 'bg-white text-brand-dark border-white scale-105 shadow-lg' : 'bg-white/5 border-white/10 text-slate-300 hover:border-brand-primary/50 hover:text-white'}`}
                                                        >
                                                            <span className="text-xs opacity-80">{parts.weekday}</span>
                                                            <span className="text-xl font-bold font-serif">{parts.dayNum}</span>
                                                            <span className="text-[10px] opacity-75">{parts.monthShort}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                                                כרגע אין ימי קבלה פתוחים בהגדרות הסטודיו. ניתן להירשם לרשימת המתנה או לתאם ישירות בוואטסאפ.
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 min-h-[200px]">
                                        <h3 className="text-white font-medium flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-brand-primary" /> בחר שעה{' '}
                                            <span className="text-xs text-slate-400 mr-2">(זמן נדרש: {effectiveDurationMinutes} דקות)</span>
                                        </h3>

                                        {!selectedDateKey ? (
                                            <div className="text-slate-500 text-sm border border-dashed border-white/10 rounded-xl p-8 text-center">
                                                אנא בחר תאריך כדי לראות שעות פנויות
                                            </div>
                                        ) : isLoadingSlots ? (
                                            <div className="flex justify-center py-10" aria-label="בודק זמינות...">
                                                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                                            </div>
                                        ) : availabilityDetail && availabilityDetail.status === 'open' && hasAnyValidSlot ? (
                                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                                                {availableSlots.map((slot, i) => {
                                                    const valid = isSlotValid(i);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={slot.time}
                                                            disabled={!valid}
                                                            aria-pressed={selectedSlot === slot.time}
                                                            onClick={() => setSelectedSlot(selectedSlot === slot.time ? null : slot.time)}
                                                            className={`min-h-[44px] py-2 px-3 rounded-lg text-sm border flex items-center justify-center transition-[background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${selectedSlot === slot.time ? 'bg-brand-primary text-brand-dark border-brand-primary font-bold shadow-[0_0_15px_rgba(212,181,133,0.4)]' : valid ? 'bg-white/5 border-white/10 text-white hover:border-brand-primary/50' : 'bg-transparent border-transparent text-slate-600 cursor-not-allowed opacity-40'}`}
                                                        >
                                                            {slot.time}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-6 rounded-2xl bg-brand-surface/70 border border-white/10 space-y-4 text-right">
                                                <div className="flex items-start gap-3">
                                                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-medium text-white mb-1">
                                                            {isAllStudioClosed
                                                                ? 'הסטודיו אינו פתוח להזמנה אונליין כרגע'
                                                                : 'אין חלונות זמן פנויים בתאריך זה'}
                                                        </p>
                                                        <p className="text-sm text-slate-300">
                                                            {availabilityDetail?.reasonMessage ||
                                                                'לא נמצאו שעות פנויות לתאריך שבחרת.'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-3">
                                                    {openCalendarDays.find(d => d.dateKey !== selectedDateKey) && (
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                const nextOpen = openCalendarDays.find(d => d.dateKey !== selectedDateKey);
                                                                if (nextOpen) setSelectedDateKey(nextOpen.dateKey);
                                                            }}
                                                        >
                                                            עבור ליום פתוח אחר ({formatDateKeyLong(openCalendarDays.find(d => d.dateKey !== selectedDateKey)!.dateKey)})
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setShowWaitlistForm(prev => !prev)}
                                                    >
                                                        {showWaitlistForm ? 'סגור טופס המתנה' : 'הצטרף לרשימת המתנה'}
                                                    </Button>
                                                    <a
                                                        href={buildWhatsAppContactUrl(
                                                            studioSettings?.studio_details?.phone || DEFAULT_STUDIO_DETAILS.phone,
                                                            buildWaitlistWhatsAppMessage({
                                                                serviceNames: selectedServices.map(s => s.name).join(' + '),
                                                                preferredDate: selectedDateKey ? formatDateKeyLong(selectedDateKey) : undefined,
                                                            })
                                                        )}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                                                    >
                                                        <Send className="w-4 h-4" /> תיאום תור בוואטסאפ
                                                    </a>
                                                </div>

                                                {showWaitlistForm && (
                                                    <form onSubmit={handleWaitlistSubmit} className="pt-4 border-t border-white/10 space-y-3">
                                                        {waitlistSubmitted ? (
                                                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
                                                                פנייתך נשמרה ברשימת ההמתנה של הסטודיו! ניצור איתך קשר כשיתפנה מקום.
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <Input
                                                                        label="שם מלא"
                                                                        value={waitlistName || formData.name}
                                                                        onChange={e => setWaitlistName(e.target.value)}
                                                                    />
                                                                    <Input
                                                                        label="טלפון ליצירת קשר"
                                                                        type="tel"
                                                                        dir="ltr"
                                                                        className="text-right"
                                                                        value={waitlistPhone || formData.phone}
                                                                        onChange={e => setWaitlistPhone(e.target.value)}
                                                                    />
                                                                </div>
                                                                <Input
                                                                    label="העדפות ימים ושעות (רשות)"
                                                                    value={waitlistNotes}
                                                                    onChange={e => setWaitlistNotes(e.target.value)}
                                                                />
                                                                {waitlistError && (
                                                                    <p role="alert" className="text-xs text-red-400">{waitlistError}</p>
                                                                )}
                                                                <Button type="submit" isLoading={waitlistSubmitting} className="w-full sm:w-auto">
                                                                    שמור פניה ברשימת ההמתנה
                                                                </Button>
                                                            </>
                                                        )}
                                                    </form>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </m.div>
                            )}

                            {step === BookingStep.DETAILS && (
                                <m.div key="step3" initial={{ opacity: 0, transform: "translateX(20px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} exit={{ opacity: 0, transform: "translateX(-20px)" }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="space-y-6">
                                    {!user && (
                                        <div className="bg-gradient-to-r from-brand-primary/20 to-transparent border border-brand-primary/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                                <Sparkles className="w-24 h-24 text-brand-primary" />
                                            </div>
                                            <div className="flex items-start gap-3 relative z-10">
                                                <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div className="text-right">
                                                    <h3 className="font-bold text-white mb-1">משתמשת רשומה? התחברי ולחסוך זמן</h3>
                                                    <p className="text-sm text-slate-300">התחברי עם גוגל ותוכלי לעקוב אחרי הפירסינג שלך, לשתף המלצות ולצבור קרדיט לקניית תכשיטים!</p>
                                                </div>
                                            </div>
                                            <Button type="button" onClick={() => signInWithGoogle()} className="w-full md:w-auto whitespace-nowrap gap-2 relative z-10">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                                המשך עם Google
                                            </Button>
                                        </div>
                                    )}

                                    <Card className="border-none bg-white/5 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Input
                                                label="שם מלא"
                                                value={formData.name}
                                                error={detailsErrors.client_name}
                                                onChange={e => {
                                                    setFormData({ ...formData, name: e.target.value });
                                                    if (detailsErrors.client_name) setDetailsErrors(prev => ({ ...prev, client_name: '' }));
                                                }}
                                            />
                                            <Input
                                                label="טלפון"
                                                type="tel"
                                                inputMode="numeric"
                                                dir="ltr"
                                                className="text-right"
                                                value={formData.phone}
                                                error={detailsErrors.client_phone}
                                                onChange={e => {
                                                    setFormData({ ...formData, phone: e.target.value });
                                                    if (detailsErrors.client_phone) setDetailsErrors(prev => ({ ...prev, client_phone: '' }));
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <Input
                                                label="אימייל"
                                                type="email"
                                                inputMode="email"
                                                dir="ltr"
                                                className="text-right"
                                                value={formData.email}
                                                error={detailsErrors.client_email}
                                                onChange={e => {
                                                    const cleanValue = e.target.value.replace(/[^a-zA-Z0-9@._+-]/g, '');
                                                    setFormData({ ...formData, email: cleanValue });
                                                    if (detailsErrors.client_email) setDetailsErrors(prev => ({ ...prev, client_email: '' }));
                                                }}
                                                lang="en"
                                                autoCapitalize="none"
                                                autoCorrect="off"
                                                spellCheck="false"
                                                autoComplete="email"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="booking-notes" className="text-sm font-medium text-slate-400 ms-1">הערות נוספות</label>
                                            <textarea id="booking-notes" className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-[border-color,box-shadow,color] duration-150 ease-out placeholder:text-slate-600 min-h-[100px]" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                                        </div>
                                    </Card>
                                </m.div>
                            )}

                            {step === BookingStep.CONSENT && (
                                <m.div key="consent" initial={{ opacity: 0, transform: "translateX(20px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} exit={{ opacity: 0, transform: "translateX(-20px)" }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="space-y-6">
                                    {/* U3 Pre-Submit Review Summary Card */}
                                    <Card className="bg-brand-surface/80 border border-brand-primary/30 p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                            <h3 className="font-serif text-lg text-white">סקירה סופית לפני שליחה</h3>
                                            <div className="flex gap-3 text-xs">
                                                <button type="button" onClick={() => setStep(BookingStep.SELECT_DATE)} className="text-brand-primary hover:underline">שנה מועד</button>
                                                <button type="button" onClick={() => setStep(BookingStep.DETAILS)} className="text-brand-primary hover:underline">ערוך פרטים</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-300">
                                            <div>
                                                <span className="text-slate-500 block">טיפולים ותכשיטים:</span>
                                                <span className="text-white font-medium">
                                                    {[...selectedServices.map(s => s.name), ...selectedJewelry.map(j => j.name)].join(' + ')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">תאריך ושעה:</span>
                                                <span className="text-white font-medium">{formatDateKeyLong(selectedDateKey)} • {selectedSlot}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">פרטי קשר:</span>
                                                <span className="text-white">{formData.name} • <bdi dir="ltr">{formData.phone}</bdi></span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">סה&quot;כ משוער:</span>
                                                <Money amount={finalPrice} className="text-brand-primary font-bold text-base" />
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="bg-white/5 border-none p-6">
                                        <div className="flex items-center gap-2 text-brand-primary mb-2">
                                            <Camera className="w-5 h-5" />
                                            <h3 className="font-medium">בדיקת התאמה אנטומית (לא חובה)</h3>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-4">
                                            תוכלו להעלות או לצלם תמונה של האוזן כדי שיובל תבדוק מראש אם המבנה האנטומי מתאים לפירסינג שבחרתם.
                                        </p>

                                        {!anatomyImage ? (
                                            <div className="flex flex-wrap gap-4">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="user"
                                                    className="hidden"
                                                    ref={anatomyInputRef}
                                                    onChange={handleAnatomyImageUpload}
                                                />
                                                <Button type="button" onClick={() => anatomyInputRef.current?.click()} variant="outline" className="gap-2">
                                                    <Camera className="w-4 h-4" /> צלם / בחר תמונה
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-brand-primary border-dashed relative">
                                                    <img src={anatomyImage} alt="תמונת אוזן לבדיקת אנטומיה" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-emerald-400 text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> התמונה צורפה לתור</span>
                                                    <button type="button" onClick={() => setAnatomyImage(null)} className="text-red-400 hover:text-red-300 text-sm text-right transition-colors underline decoration-dotted underline-offset-4">
                                                        הסר תמונה
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </Card>

                                    <Card className="bg-white/5 border-none p-6">
                                        <div className="flex items-center gap-2 text-brand-primary mb-4">
                                            <FileText className="w-5 h-5" />
                                            <h3 className="font-medium">הצהרת בריאות ואישור ביצוע</h3>
                                        </div>
                                        <div className="text-sm text-slate-300 space-y-3 h-64 overflow-y-auto pr-2 custom-scrollbar mb-6 bg-brand-dark/20 p-4 rounded-xl leading-relaxed border border-white/5">
                                            <p className="font-medium mb-2 text-white">אני מצהיר/ה בזאת כי:</p>
                                            <div className="space-y-2 text-slate-300">
                                                <p>- {isUnder16 ? 'אני ההורה/אפוטרופוס החוקי של הקטין/ה.' : 'אני מעל גיל 16 (או מלווה באישור הורה/אפוטרופוס).'}</p>
                                                <p>- איני סובל/ת ממחלות דם, סוכרת לא מאוזנת או מחלות זיהומיות.</p>
                                                <p>- איני נוטל/ת תרופות המדללות את הדם ללא היוועצות רפואית.</p>
                                                <p>- איני בהריון או מניקה (לפירסינג בפטמה/טבור).</p>
                                                <p>- אני מבין/ה כי הפירסינג דורש טיפול יומיומי והקפדה על היגיינה.</p>
                                                <p>- אני מבין/ה את הסיכונים הכרוכים (זיהום, צלקות, רגישות למתכת).</p>
                                                <p>- קראתי והבנתי את <Link to="/aftercare" target="_blank" className="text-brand-primary underline">הוראות הטיפול</Link> המופיעות באתר.</p>
                                            </div>
                                            <p className="font-medium text-brand-primary border-t border-white/5 pt-4 mt-4">
                                                {isUnder16 ? 'אני מאשר/ת לסטודיו לבצע את הניקוב עבור בני/בתי ומבין/ה את חשיבות המילוי אחר הוראות הטיפול.' : 'אני מאשר/ת לסטודיו לבצע את הניקוב ומבין/ה את חשיבות המילוי אחר הוראות הטיפול.'}
                                            </p>
                                        </div>

                                        <div className="mb-8 p-5 rounded-2xl border border-brand-primary/20 bg-brand-primary/5">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isUnder16}
                                                    onChange={(e) => {
                                                        setIsUnder16(e.target.checked);
                                                        if (!e.target.checked) setParentData({ name: '', id: '', phone: '' });
                                                    }}
                                                />
                                                <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary ${isUnder16 ? 'bg-brand-primary border-brand-primary' : 'border-slate-500 group-hover:border-brand-primary/50'}`}>
                                                    {isUnder16 && <Check className="w-4 h-4 text-brand-dark" />}
                                                </div>
                                                <span className="text-white font-medium select-none text-lg">אני מתחת לגיל 16 (נדרש אישור הורה)</span>
                                            </label>

                                            {/* Parent Details Reveal */}
                                            <AnimatePresence>
                                                {isUnder16 && (
                                                    <m.div
                                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-brand-primary/10">
                                                            <Input
                                                                label="שם ההורה המאשר"
                                                                value={parentData.name}
                                                                error={detailsErrors.parent_name}
                                                                onChange={e => setParentData({ ...parentData, name: e.target.value })}
                                                            />
                                                            <Input
                                                                label="ת.ז של ההורה"
                                                                type="tel"
                                                                inputMode="numeric"
                                                                maxLength={9}
                                                                value={parentData.id}
                                                                error={detailsErrors.parent_id}
                                                                onChange={e => setParentData({ ...parentData, id: e.target.value })}
                                                            />
                                                            <Input
                                                                label="טלפון של ההורה"
                                                                type="tel"
                                                                inputMode="numeric"
                                                                dir="ltr"
                                                                className="text-right"
                                                                value={parentData.phone}
                                                                error={detailsErrors.parent_phone}
                                                                onChange={e => setParentData({ ...parentData, phone: e.target.value })}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-brand-primary/80 mt-3">* החתימה מטה מהווה את אישור ההורה האמור.</p>
                                                    </m.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Statutory Consent & Health Declaration Checkboxes */}
                                        <div className="space-y-3 mb-8">
                                            <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={hasAgreedToHealth}
                                                    onChange={(e) => setHasAgreedToHealth(e.target.checked)}
                                                />
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary ${hasAgreedToHealth ? 'bg-brand-primary border-brand-primary text-brand-dark' : 'border-slate-600'}`}>
                                                    {hasAgreedToHealth && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                                                </div>
                                                <span className="text-sm text-slate-200 select-none leading-relaxed">
                                                    <span className="text-brand-primary font-medium">[חובה]</span> {isUnder16 ? 'אני ההורה/אפוטרופוס החתום למטה מאשר כי קראתי את כל סעיפי הצהרת הבריאות לעיל, הפרטים שמסרתי נכונים ומלאים, ואני מאשר את ביצוע הניקוב לבני/בתי.' : 'אני מאשר/ת בזאת כי קראתי את כל סעיפי הצהרת הבריאות לעיל, הפרטים שמסרתי נכונים ומלאים, ואני מאשר/ת את ביצוע הפעולה.'}
                                                </span>
                                            </label>

                                            <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={hasAgreedToTerms}
                                                    onChange={(e) => setHasAgreedToTerms(e.target.checked)}
                                                />
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary ${hasAgreedToTerms ? 'bg-brand-primary border-brand-primary text-brand-dark' : 'border-slate-600'}`}>
                                                    {hasAgreedToTerms && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                                                </div>
                                                <span className="text-sm text-slate-200 select-none leading-relaxed">
                                                    <span className="text-brand-primary font-medium">[חובה]</span> קראתי ואני מסכים/ה ל
                                                    <Link
                                                        to="/terms"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-brand-primary underline hover:text-brand-primary/80 mx-1 font-medium transition-colors"
                                                    >
                                                        תנאי השימוש
                                                    </Link>
                                                    ו
                                                    <Link
                                                        to="/privacy"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-brand-primary underline hover:text-brand-primary/80 mx-1 font-medium transition-colors"
                                                    >
                                                        מדיניות הפרטיות
                                                    </Link>
                                                    של הסטודיו.
                                                </span>
                                            </label>

                                            <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={marketingOptIn}
                                                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                                                />
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary ${marketingOptIn ? 'bg-brand-primary border-brand-primary text-brand-dark' : 'border-slate-600'}`}>
                                                    {marketingOptIn && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                                                </div>
                                                <span className="text-sm text-slate-300 select-none leading-relaxed">
                                                    <span className="text-slate-400 font-medium">[רשות]</span> אני מאשר/ת קבלת עדכונים, מבצעים והטבות בלעדיות מהסטודיו באמצעות WhatsApp או הודעות SMS (ניתן לבטל את ההסכמה בכל עת).
                                                </span>
                                            </label>
                                        </div>

                                        {/* Digital Signature Pad */}
                                        <div className="pt-2 border-t border-white/5">
                                            <label className="text-sm font-medium text-slate-300 block mb-2">
                                                {isUnder16 ? 'חתימת ההורה / האפוטרופוס (חובה)' : 'חתימת המזמין/ה (חובה)'}
                                            </label>
                                            <SignaturePad onSave={(data) => setSignatureData(data)} onClear={() => setSignatureData(null)} />
                                        </div>

                                        {bookingError && (
                                            <div role="alert" className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm space-y-1">
                                                <p className="font-bold text-red-400">התור טרם נשמר בשרת</p>
                                                <p>{bookingError}</p>
                                                <p className="text-xs text-slate-400">הפרטים שמורים בינתיים כטיוטה מקומית שלא נשלחה.</p>
                                            </div>
                                        )}
                                    </Card>
                                </m.div>
                            )}

                            {step === BookingStep.CONFIRMATION && (
                                <m.div key="step6" initial={{ opacity: 0, transform: "scale(0.9)" }} animate={{ opacity: 1, transform: "scale(1)" }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="text-center py-12">
                                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 ring-1 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                        <Check className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-4xl font-serif text-white mb-4">בקשתך התקבלה בהצלחה!</h2>
                                    {confirmedAppointment?.id && (
                                        <p className="text-sm text-brand-primary font-mono mb-3">
                                            מספר פניה מאומת בשרת: #{confirmedAppointment.id.slice(-8)}
                                        </p>
                                    )}
                                    <p className="text-slate-400 text-lg mb-6 max-w-md mx-auto">
                                        התור שלך נקלט במערכת כממתין לאישור (<Money amount={confirmedAppointment?.final_price ?? finalPrice} />). הסטודיו ייצור איתך קשר בהקדם.
                                    </p>

                                    {(confirmedAppointment?.notification_status === 'failed' || confirmedAppointment?.notification_status === 'partial') && (
                                        <div role="status" className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm text-right">
                                            הבקשה נשמרה בשרת בהצלחה, אך שליחת ההתראה המיידית לסטודיו התעכבה ({confirmedAppointment.notification_error || 'תקלת רשת זמנית'}). מומלץ ללחוץ מטה ולשלוח הודעה קצרה בוואטסאפ לוודא קבלה.
                                        </div>
                                    )}

                                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-8">
                                        <Button type="button" onClick={sendConfirmationWhatsapp} className="bg-green-600 hover:bg-green-700 text-white border-none flex items-center gap-2">
                                            <Send className="w-4 h-4" /> שלח אישור לסטודיו בוואטסאפ
                                        </Button>
                                        <Button type="button" variant="ghost" onClick={() => navigate('/')}>חזרה לדף הבית</Button>
                                    </div>
                                </m.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className={`hidden lg:block w-80 relative shrink-0 ${step === BookingStep.CONSENT ? 'opacity-90' : ''}`}>
                        <div className="sticky top-28">
                            <div className="relative bg-brand-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <div className="bg-brand-primary p-6 relative overflow-hidden">
                                    <h2 className="text-brand-dark font-serif font-bold text-xl relative z-10">סיכום הזמנה</h2>
                                    <div className="text-brand-dark/70 text-xs font-medium uppercase tracking-widest relative z-10">Yuval Studio</div>
                                </div>
                                <TicketSummary
                                    selectedServices={selectedServices}
                                    selectedJewelry={selectedJewelry}
                                    selectedDateKey={selectedDateKey}
                                    selectedSlot={selectedSlot}
                                    totalDuration={totalDuration}
                                    appliedCoupon={appliedCoupon}
                                    couponCode={couponCode}
                                    couponError={couponError}
                                    isCheckingCoupon={isCheckingCoupon}
                                    discountAmount={discountAmount}
                                    finalPrice={finalPrice}
                                    step={step}
                                    readOnly={step === BookingStep.CONFIRMATION || step === BookingStep.CONSENT}
                                    aiRecommendation={aiResult}
                                    onToggleService={toggleService}
                                    onToggleJewelry={toggleJewelry}
                                    onSetCouponCode={setCouponCode}
                                    onApplyCoupon={handleApplyCoupon}
                                    onClearCoupon={() => { setAppliedCoupon(null); setCouponCode(''); }}
                                    referralCode={referralCode}
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
                    <m.div initial={{ opacity: 0, transform: "translateY(100%)" }} animate={{ opacity: 1, transform: "translateY(0%)" }} exit={{ opacity: 0, transform: "translateY(100%)" }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-brand-dark/95 backdrop-blur-xl border-t border-white/10 z-50 flex justify-center shadow-[0_-5px_30px_rgba(0,0,0,0.5)]">
                        <div className="container max-w-4xl flex items-center gap-4 w-full">
                            {step > 1 && (
                                <button type="button" onClick={handlePrevStep} className="min-w-[44px] min-h-[44px] px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
                                    <ArrowRight className="w-5 h-5" />
                                    <span className="hidden sm:inline">חזרה</span>
                                </button>
                            )}
                            <Button
                                type="button"
                                onClick={() => {
                                    if (step === BookingStep.SELECT_SERVICE) handleNextStep();
                                    else if (step === BookingStep.AI_STYLIST) handleNextStep();
                                    else if (step === BookingStep.SELECT_DATE) handleNextStep();
                                    else if (step === BookingStep.DETAILS) handleNextStep();
                                    else if (step === BookingStep.CONSENT) handleBook();
                                }}
                                disabled={
                                    (step === BookingStep.SELECT_SERVICE && selectedServices.length === 0 && selectedJewelry.length === 0) ||
                                    (step === BookingStep.SELECT_DATE && (!selectedDateKey || !selectedSlot)) ||
                                    (step === BookingStep.DETAILS && (!formData.name.trim() || !formData.phone.trim())) ||
                                    (step === BookingStep.CONSENT && (!hasAgreedToTerms || !hasAgreedToHealth || !signatureData || (isUnder16 && (!parentData.name.trim() || !parentData.id.trim() || !parentData.phone.trim())))) ||
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
                onBookService={(bookedServices: Service[]) => {
                    bookedServices.forEach(s => toggleService(s));
                    setStep(BookingStep.SELECT_SERVICE);
                }}
            />
        </div>
    );
};

export default Booking;