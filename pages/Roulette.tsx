
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { Sparkles, Trophy, ArrowRight, Gift, Loader2 } from 'lucide-react';
import { api } from '../services/mockApi';

const m = motion as any;

// Updated Prizes with specific Service IDs (mock IDs for demo)
const PRIZES = [
    { id: 1, label: '10% הנחה על הכל', type: 'percent', value: 10, color: '#d4b585', serviceId: null },
    { id: 2, label: 'ספטום ב-15% הנחה', type: 'percent', value: 15, color: '#334155', serviceId: '4' },
    { id: 3, label: '5% הנחה על הכל', type: 'percent', value: 5, color: '#d4b585', serviceId: null },
    { id: 4, label: 'עגיל בטבור ב-10% הנחה', type: 'percent', value: 10, color: '#334155', serviceId: '6' },
    { id: 5, label: 'הליקס ב-10% הנחה', type: 'percent', value: 10, color: '#d4b585', serviceId: '2' },
    { id: 6, label: 'נסה שוב', type: 'loss', value: 0, color: '#0f172a', serviceId: null },
];

const Roulette: React.FC = () => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [generatedCoupon, setGeneratedCoupon] = useState<string | null>(null);
    const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
    const navigate = useNavigate();

    const handleSpin = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setResult(null);
        setGeneratedCoupon(null);

        const prizeIndex = Math.floor(Math.random() * PRIZES.length);
        const prize = PRIZES[prizeIndex];

        const segmentAngle = 360 / PRIZES.length;
        const spinCount = 8 + Math.floor(Math.random() * 5);
        const baseRotation = 360 * spinCount;
        const targetRotation = baseRotation + (360 - (prizeIndex * segmentAngle));
        const noise = (Math.random() - 0.5) * (segmentAngle * 0.7);

        setRotation(targetRotation + noise);

        setTimeout(async () => {
            setIsSpinning(false);
            setResult(prize);
            
            if (prize.type !== 'loss') {
                setIsCreatingCoupon(true);
                const code = `WIN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                try {
                    await api.createCoupon({
                        code,
                        type: prize.type as 'percent' | 'fixed',
                        value: prize.value,
                        is_active: true
                    });
                    setGeneratedCoupon(code);
                } catch (e) {
                    console.error("Failed to create coupon", e);
                }
                setIsCreatingCoupon(false);
            }
        }, 5000);
    };

    const handleClaim = async () => {
        if (!result) return;
        if (result.type === 'loss') {
            setResult(null);
            setRotation(0);
            return;
        }

        let preSelectedServices = null;
        if (result.serviceId) {
            const allServices = await api.getServices();
            const service = allServices.find(s => s.id === result.serviceId);
            if (service) preSelectedServices = [service];
        }

        navigate('/booking', { 
            state: { 
                couponCode: generatedCoupon,
                preSelectedServices: preSelectedServices 
            } 
        });
    };

    return (
        <div className="pt-24 pb-20 min-h-screen bg-brand-dark overflow-hidden flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-primary/5 via-transparent to-transparent pointer-events-none" />

            <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4">
                     <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
                     <span className="text-xs font-bold tracking-widest text-brand-primary uppercase">Piercing Roulette</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-serif text-white mb-2 text-shadow-lg">הגרלת המזל</h1>
                <p className="text-slate-400">האם הגורל יחייך אלייך היום?</p>
            </div>

            <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] mb-12">
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 z-20 w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-r-[25px] border-r-white drop-shadow-lg" />

                <m.div
                    className="w-full h-full rounded-full border-[8px] border-brand-dark shadow-[0_0_80px_rgba(212,181,133,0.15)] relative overflow-hidden"
                    animate={{ rotate: rotation }}
                    transition={{ duration: 5, ease: [0.15, 0.85, 0.35, 1] }}
                >
                     <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                         {PRIZES.map((prize, i) => {
                             const segmentAngle = 360 / PRIZES.length;
                             const startAngle = i * segmentAngle;
                             const endAngle = (i + 1) * segmentAngle;
                             const x1 = 50 + 50 * Math.cos(Math.PI * startAngle / 180);
                             const y1 = 50 + 50 * Math.sin(Math.PI * startAngle / 180);
                             const x2 = 50 + 50 * Math.cos(Math.PI * endAngle / 180);
                             const y2 = 50 + 50 * Math.sin(Math.PI * endAngle / 180);
                             
                             return (
                                 <g key={prize.id}>
                                     <path d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`} fill={prize.color} stroke="#0f172a" strokeWidth="0.5" />
                                     <text 
                                        x="72" y="50" 
                                        fill={i % 2 === 0 ? '#0f172a' : '#ffffff'}
                                        fontSize="3.2" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle"
                                        transform={`rotate(${startAngle + segmentAngle/2}, 50, 50)`}
                                     >
                                         {prize.label}
                                     </text>
                                 </g>
                             )
                         })}
                     </svg>
                </m.div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-16 h-16 bg-brand-dark rounded-full border-4 border-brand-primary shadow-xl flex items-center justify-center">
                         <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                     </div>
                </div>
            </div>

            <Button onClick={handleSpin} disabled={isSpinning} className="w-48 py-4 text-xl shadow-[0_0_30px_rgba(212,181,133,0.3)]">
                {isSpinning ? 'מסתובב...' : 'סובב את הגלגל'}
            </Button>

            <AnimatePresence>
                {result && (
                    <m.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/90 backdrop-blur-md"
                    >
                        <m.div 
                            initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
                            className="bg-brand-surface border border-brand-primary/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
                        >
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-brand-primary/10 to-transparent" />
                             
                             <div className="w-20 h-20 mx-auto bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 text-brand-primary ring-1 ring-brand-primary/30">
                                 {result.type === 'loss' ? <span className="text-3xl">🌑</span> : <Trophy className="w-10 h-10" />}
                             </div>

                             <h2 className="text-3xl font-serif text-white mb-2">
                                 {result.type === 'loss' ? 'אולי בפעם הבאה...' : 'יש לנו זוכה!'}
                             </h2>
                             <p className="text-slate-400 mb-6 leading-relaxed">
                                 {result.type === 'loss' 
                                    ? 'הגלגל עצר על "נסה שוב". לא נורא, תמיד יש הזדמנות נוספת.' 
                                    : `זכית ב-${result.label}! הקופון שלך נוצר ומחכה למימוש.`}
                             </p>

                             {result.type !== 'loss' && (
                                 <div className="bg-brand-dark p-4 rounded-xl mb-6 border border-dashed border-brand-primary/40 font-mono text-brand-primary tracking-widest text-xl relative group">
                                     {isCreatingCoupon ? <Loader2 className="w-6 h-6 animate-spin mx-auto"/> : generatedCoupon}
                                 </div>
                             )}

                             <Button onClick={handleClaim} className="w-full py-4 shadow-lg shadow-brand-primary/20">
                                 {result.type === 'loss' ? 'סגור ונסה שוב' : 'קבעי תור עם ההטבה'} <ArrowRight className="w-4 h-4 mr-2" />
                             </Button>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Roulette;
