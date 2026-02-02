import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { Sparkles, Trophy, ArrowRight, Gift } from 'lucide-react';

const m = motion as any;

const PRIZES = [
    { id: 1, label: '10% הנחה', code: 'LUCK10', type: 'coupon', value: 10, color: '#d4b585' },
    { id: 2, label: 'עגיל מתנה', code: 'FREEJEWEL', type: 'item', value: 0, color: '#334155' },
    { id: 3, label: '5% הנחה', code: 'LUCK5', type: 'coupon', value: 5, color: '#d4b585' },
    { id: 4, label: 'מי מלח מתנה', code: 'FREESALT', type: 'item', value: 0, color: '#334155' },
    { id: 5, label: '15% הנחה', code: 'LUCK15', type: 'coupon', value: 15, color: '#d4b585' },
    { id: 6, label: 'נסה שוב', code: '', type: 'loss', value: 0, color: '#0f172a' },
];

const Roulette: React.FC = () => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<any>(null);
    const navigate = useNavigate();

    const handleSpin = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setResult(null);

        // Random prize index
        const prizeIndex = Math.floor(Math.random() * PRIZES.length);
        const prize = PRIZES[prizeIndex];

        // Calculations:
        // Full circles (5 to 10) + Slice Offset
        const segmentAngle = 360 / PRIZES.length;
        // We want the pointer (top) to land on the segment.
        // If segment 0 is at 0 degrees, we need to rotate so that segment is at 270 (top) or similar depending on SVG orientation.
        // Assuming SVG 0 is East. We need to rotate negative to bring it to pointer.
        // Let's just add random full spins + specific offset.
        
        const spinCount = 5 + Math.floor(Math.random() * 5);
        const baseRotation = 360 * spinCount;
        
        // Offset to land exactly on the slice. 
        // Note: The pointer is usually static at top/right. Let's assume pointer is at RIGHT (0deg in SVG).
        // To land Index 0 at Right, rotation is 0. 
        // To land Index 1 at Right, rotation is -segmentAngle (counter clockwise).
        const targetRotation = baseRotation + (360 - (prizeIndex * segmentAngle));
        
        // Add some noise so it doesn't land perfectly in center of slice
        const noise = (Math.random() - 0.5) * (segmentAngle * 0.8);

        setRotation(targetRotation + noise);

        setTimeout(() => {
            setIsSpinning(false);
            setResult(prize);
        }, 5000); // Duration matches transition
    };

    const handleClaim = () => {
        if (!result) return;
        if (result.type === 'loss') {
            setResult(null);
            setRotation(0);
            return;
        }
        // Navigate to booking with coupon code
        navigate('/booking', { state: { couponCode: result.code } });
    };

    return (
        <div className="pt-24 pb-20 min-h-screen bg-brand-dark overflow-hidden flex flex-col items-center justify-center relative">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-primary/5 via-transparent to-transparent pointer-events-none" />

            <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4 animate-pulse">
                     <Sparkles className="w-4 h-4 text-brand-primary" />
                     <span className="text-xs font-bold tracking-widest text-brand-primary uppercase">Piercing Roulette</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-serif text-white mb-2 text-shadow-lg">נסה את מזלך</h1>
                <p className="text-slate-400">סובב את הגלגל וזכה בהטבות בלעדיות</p>
            </div>

            {/* WHEEL CONTAINER */}
            <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] mb-12">
                {/* Pointer */}
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 z-20 w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-r-[25px] border-r-white drop-shadow-lg filter" style={{filter: 'drop-shadow(-2px 0 2px rgba(0,0,0,0.5))'}} />

                {/* The Wheel */}
                <m.div
                    className="w-full h-full rounded-full border-[8px] border-brand-dark shadow-[0_0_50px_rgba(212,181,133,0.2)] relative overflow-hidden"
                    animate={{ rotate: rotation }}
                    transition={{ duration: 5, ease: [0.15, 0.85, 0.35, 1] }} // Bezier for spin up/down
                >
                     <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                         {PRIZES.map((prize, i) => {
                             const segmentAngle = 360 / PRIZES.length;
                             const startAngle = i * segmentAngle;
                             const endAngle = (i + 1) * segmentAngle;
                             
                             // Calculate SVG Path for Slice
                             // Using simple math to draw arcs
                             const x1 = 50 + 50 * Math.cos(Math.PI * startAngle / 180);
                             const y1 = 50 + 50 * Math.sin(Math.PI * startAngle / 180);
                             const x2 = 50 + 50 * Math.cos(Math.PI * endAngle / 180);
                             const y2 = 50 + 50 * Math.sin(Math.PI * endAngle / 180);
                             
                             return (
                                 <g key={prize.id}>
                                     <path 
                                        d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`} 
                                        fill={prize.color} 
                                        stroke="#0f172a" 
                                        strokeWidth="0.5"
                                        className={`${prize.type === 'loss' ? 'opacity-90' : 'opacity-100'}`}
                                     />
                                     {/* Text Label - rotated to center of slice */}
                                     <text 
                                        x="75" 
                                        y="50" 
                                        fill={prize.type === 'coupon' ? '#0f172a' : '#ffffff'}
                                        fontSize="4" 
                                        fontWeight="bold"
                                        fontFamily="sans-serif"
                                        textAnchor="middle" 
                                        alignmentBaseline="middle"
                                        transform={`rotate(${startAngle + segmentAngle/2}, 50, 50)`}
                                     >
                                         {prize.label}
                                     </text>
                                 </g>
                             )
                         })}
                     </svg>
                </m.div>

                {/* Center Cap */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-16 h-16 bg-brand-dark rounded-full border-4 border-brand-primary shadow-xl flex items-center justify-center">
                         <div className="w-2 h-2 bg-white rounded-full"></div>
                     </div>
                </div>
            </div>

            <Button 
                onClick={handleSpin} 
                disabled={isSpinning}
                className="w-48 py-4 text-xl shadow-[0_0_20px_rgba(212,181,133,0.4)] hover:shadow-[0_0_30px_rgba(212,181,133,0.6)]"
            >
                {isSpinning ? 'מסתובב...' : 'סובב את הגלגל'}
            </Button>

            {/* WIN MODAL */}
            <AnimatePresence>
                {result && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-md">
                        <m.div 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="bg-brand-surface border border-brand-primary/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
                        >
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-brand-primary/10 to-transparent" />
                             
                             <div className="w-20 h-20 mx-auto bg-brand-primary/20 rounded-full flex items-center justify-center mb-6 text-brand-primary ring-1 ring-brand-primary/50">
                                 {result.type === 'loss' ? <div className="text-3xl">😢</div> : <Trophy className="w-10 h-10" />}
                             </div>

                             <h2 className="text-3xl font-serif text-white mb-2">
                                 {result.type === 'loss' ? 'לא נורא...' : 'כל הכבוד!'}
                             </h2>
                             <p className="text-slate-300 mb-6">
                                 {result.type === 'loss' ? 'לא זכית הפעם, אבל תמיד אפשר לנסות שוב!' : `זכית ב-${result.label}! הקופון יחכה לך בעמוד ההזמנה.`}
                             </p>

                             {result.type !== 'loss' && (
                                 <div className="bg-brand-dark p-3 rounded-lg mb-6 border border-dashed border-brand-primary/30 font-mono text-brand-primary tracking-widest text-lg">
                                     {result.code}
                                 </div>
                             )}

                             <Button onClick={handleClaim} className="w-full">
                                 {result.type === 'loss' ? 'נסה שוב' : 'ממש הטבה עכשיו'} <ArrowRight className="w-4 h-4 mr-2" />
                             </Button>
                        </m.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Roulette;