import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Sparkles, X, Heart, RefreshCw, LogOut } from 'lucide-react';
import { api } from '../services/mockApi';
import { useNavigate } from 'react-router-dom';
import { SmartImage } from '../components/SmartImage';

const m = motion as any;

const SwipeCard = ({ card, active, onSwipe, zIndex, exitDirection }: any) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);

    // Indicators mapping - Right is Like, Left is Nope
    const likeOpacity = useTransform(x, [20, 100], [0, 1]);
    const nopeOpacity = useTransform(x, [-20, -100], [0, 1]);

    const handleDragEnd = (event: any, info: any) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            onSwipe('right');
        } else if (info.offset.x < -threshold) {
            onSwipe('left');
        }
    };

    return (
        <m.div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl bg-brand-dark cursor-grab active:cursor-grabbing border border-white/10 origin-bottom"
            style={{
                zIndex,
                x: active ? x : 0,
                rotate: active ? rotate : 0,
                scale: active ? 1 : 0.95,
                y: active ? 0 : 20,
            }}
            initial={{ scale: 0.95, y: 30, opacity: 0 }}
            animate={{ scale: active ? 1 : 0.95, y: active ? 0 : 20, opacity: 1 }}
            exit={{
                x: exitDirection === 'right' ? 500 : -500,
                opacity: 0,
                rotate: exitDirection === 'right' ? 20 : -20,
                transition: { duration: 0.4, ease: "easeOut" }
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            drag={active ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            onDragEnd={handleDragEnd}
            whileTap={active ? { cursor: 'grabbing' } : {}}
            dir="rtl"
        >
            <SmartImage src={card.image_url} alt="" className="w-full h-full object-cover pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-brand-dark via-brand-dark/70 to-transparent pointer-events-none" />

            <div className="absolute bottom-6 left-6 right-6 flex flex-col items-start pointer-events-none">
                <h3 className="text-2xl font-serif text-white mb-1 drop-shadow-md">{card.name}</h3>
                <p className="text-brand-primary font-medium text-lg drop-shadow-md">₪{card.price}</p>
                <div className="flex gap-3 mt-3 text-xs text-slate-300">
                    <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                        כאב: {card.pain_level || 1}/10
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                        {card.duration_minutes} דק'
                    </div>
                </div>
            </div>

            {/* Like/Nope Overlays */}
            {active && (
                <>
                    <m.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 w-16 h-16 border-4 border-green-500 text-green-500 rounded-full flex items-center justify-center rotate-[-15deg] bg-brand-dark/40 backdrop-blur-sm shadow-xl z-10">
                        <Heart className="w-8 h-8 fill-current" />
                    </m.div>
                    <m.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 w-16 h-16 border-4 border-red-500 text-red-500 rounded-full flex items-center justify-center rotate-[15deg] bg-brand-dark/40 backdrop-blur-sm shadow-xl z-10">
                        <X className="w-8 h-8" />
                    </m.div>
                </>
            )}
        </m.div>
    );
};

const StyleMatcher: React.FC = () => {
    const [cards, setCards] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [likedItems, setLikedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [exitDirection, setExitDirection] = useState<'left' | 'right'>('right');
    const navigate = useNavigate();

    useEffect(() => {
        const loadCards = async () => {
            try {
                const fetchedServices = await api.getServices();
                const shuffled = fetchedServices.sort(() => 0.5 - Math.random());
                setCards(shuffled.slice(0, 10));
            } catch (err) {
                console.error("Error loading style cards", err);
            } finally {
                setLoading(false);
            }
        };
        loadCards();
    }, []);

    const handleSwipe = (direction: 'left' | 'right') => {
        if (currentIndex >= cards.length) return;

        setExitDirection(direction);
        const currentCard = cards[currentIndex];

        if (direction === 'right') {
            setLikedItems(prev => [...prev, currentCard]);
        }

        // Advance slightly after exit animation starts
        setTimeout(() => {
            if (currentIndex + 1 >= cards.length) {
                setIsFinished(true);
            } else {
                setCurrentIndex(prev => prev + 1);
            }
        }, 150);
    };

    const resetMatcher = () => {
        setIsFinished(false);
        setCurrentIndex(0);
        setLikedItems([]);
    };

    const endMatcherEarly = () => {
        setIsFinished(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent animate-spin rounded-full"></div>
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center" dir="rtl">
                <m.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl text-center"
                >
                    <div className="w-16 h-16 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-serif text-white mb-4">הסטייל שלך נחשף!</h2>

                    {likedItems.length > 0 ? (
                        <>
                            <p className="text-slate-400 mb-6">
                                בחרת {likedItems.length} עיצובים שאהבת. הסטייל שלך משדר אלגנטיות, יוקרה וביטוי אישי חזק.
                            </p>

                            <div className="grid grid-cols-3 gap-2 mb-8">
                                {likedItems.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-white/10 relative">
                                        <SmartImage src={item.image_url} alt="Style Match" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => navigate('/booking', { state: { preSelectedServices: likedItems } })}
                                className="block w-full py-4 rounded-xl bg-brand-primary text-brand-dark font-medium hover:bg-white transition-all shadow-lg"
                            >
                                קבע תור עכשיו
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-slate-400 mb-8">
                                נראה שאתה די בררן... או שאתה מחפש משהו מאוד מסוים. נשמח לייעץ לך בסטודיו!
                            </p>
                            <button
                                onClick={resetMatcher}
                                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border border-brand-primary text-brand-primary font-medium hover:bg-brand-primary/10 transition-all"
                            >
                                <RefreshCw className="w-5 h-5" /> נסה שוב
                            </button>
                        </>
                    )}
                </m.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-brand-dark font-sans overflow-hidden fixed inset-0 touch-none pt-24 pb-12" dir="rtl">
            <div className="w-full max-w-sm mb-4 text-center px-6">
                <h1 className="text-3xl font-serif text-white flex items-center justify-center gap-3">
                    <Sparkles className="text-brand-primary w-6 h-6" />
                    Style Matcher
                </h1>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    החלק ימינה אם אהבת, שמאלה אם פחות.<br />נגלה יחד את הסטייל המדויק שלך!
                </p>
            </div>

            <button
                onClick={endMatcherEarly}
                className="absolute top-24 left-6 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors flex items-center gap-2 text-sm z-50 border border-white/10"
            >
                <LogOut className="w-4 h-4 ml-1" /> סיום
            </button>

            <div className="relative w-[90%] max-w-sm aspect-[3/4] sm:aspect-[4/5] perspective-1000 mt-4">
                <AnimatePresence>
                    {cards.map((card, index) => {
                        if (index < currentIndex || index > currentIndex + 2) return null;

                        const isTop = index === currentIndex;

                        return (
                            <SwipeCard
                                key={card.id || index}
                                card={card}
                                active={isTop}
                                zIndex={cards.length - index}
                                onSwipe={handleSwipe}
                                exitDirection={exitDirection}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* In RTL layout (dir="rtl") elements are rendered Right-to-Left by default. 
                We want X (nope) on the Left visually, and Heart (like) on the Right visually.
                With row-reverse in flex, the first item goes to the left edge of the container. 
             */}
            <div className="flex flex-row-reverse gap-8 mt-10 w-full max-w-sm justify-center px-6">
                <button
                    onClick={() => handleSwipe('left')}
                    className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-red-400 hover:bg-red-400/20 hover:text-red-300 transition-all shadow-lg shadow-black/50 border border-white/10 hover:scale-110 active:scale-95"
                >
                    <X className="w-8 h-8" />
                </button>
                <button
                    onClick={() => handleSwipe('right')}
                    className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary hover:bg-brand-primary/30 transition-all shadow-lg shadow-black/50 border border-brand-primary/30 hover:scale-110 active:scale-95"
                >
                    <Heart className="w-7 h-7 fill-current" />
                </button>
            </div>

            <div className="mt-8 text-slate-500 text-sm font-mono tracking-wider font-semibold">
                {currentIndex + 1} / {cards.length}
            </div>
        </div>
    );
};

export default StyleMatcher;
