import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Heart, RefreshCw, ChevronLeft } from 'lucide-react';
import { api } from '../services/mockApi';
import { Link } from 'react-router-dom';
import { SmartImage } from '../components/SmartImage';

const m = motion as any;

const StyleMatcher: React.FC = () => {
    const [cards, setCards] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [likedItems, setLikedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const directionRef = React.useRef<'left' | 'right'>('right');

    useEffect(() => {
        const loadCards = async () => {
            try {
                // Fetch some gallery items to use as styles
                const { items } = await api.getGallery(1, 15);
                setCards(items.slice(0, 10)); // Just 10 items for a fast experience
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

        directionRef.current = direction;
        const currentCard = cards[currentIndex];

        if (direction === 'right') {
            setLikedItems(prev => [...prev, currentCard]);
        }

        setTimeout(() => {
            if (currentIndex + 1 >= cards.length) {
                setIsFinished(true);
            } else {
                setCurrentIndex(prev => prev + 1);
            }
        }, 200);
    };

    const handleDragEnd = (event: any, info: any) => {
        const swipeThreshold = 50;
        if (info.offset.x > swipeThreshold) {
            handleSwipe('right');
        } else if (info.offset.x < -swipeThreshold) {
            handleSwipe('left');
        }
    };

    const resetMatcher = () => {
        setIsFinished(false);
        setCurrentIndex(0);
        setLikedItems([]);
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
            <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center">
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

                            <Link
                                to="/booking"
                                className="block w-full py-4 rounded-xl bg-brand-primary text-brand-dark font-medium hover:bg-white transition-all shadow-lg"
                            >
                                קבע תור עכשיו
                            </Link>
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
        <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center overflow-hidden">
            <div className="w-full max-w-sm mb-8 text-center">
                <h1 className="text-3xl font-serif text-white flex items-center justify-center gap-3">
                    <Sparkles className="text-brand-primary w-6 h-6" />
                    Style Matcher
                </h1>
                <p className="text-slate-400 mt-2 text-sm">
                    החלק ימינה אם אהבת, שמאלה אם פחות. נגלה יחד את הסטייל המדויק שלך!
                </p>
            </div>

            <div className="relative w-full max-w-sm aspect-[4/5] perspective-1000">
                <AnimatePresence>
                    {cards.map((card, index) => {
                        // Only render the top 3 cards for performance
                        if (index < currentIndex || index > currentIndex + 2) return null;

                        const isTop = index === currentIndex;
                        const offset = index - currentIndex;

                        return (
                            <m.div
                                key={card.id || index}
                                className="absolute w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-brand-dark cursor-grab active:cursor-grabbing border border-white/10"
                                style={{ zIndex: cards.length - index }}
                                initial={{ scale: 0.95, y: offset * 20, opacity: 0 }}
                                animate={{
                                    scale: 1 - offset * 0.05,
                                    y: offset * 15,
                                    opacity: 1 - offset * 0.2
                                }}
                                exit={{ x: directionRef.current === 'right' ? 300 : -300, opacity: 0, rotate: directionRef.current === 'right' ? 20 : -20 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                drag={isTop ? "x" : false}
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={isTop ? handleDragEnd : undefined}
                                whileTap={isTop ? { scale: 1.05 } : {}}
                            >
                                <SmartImage
                                    src={card.image_url}
                                    alt="Style Match"
                                    className="w-full h-full object-cover pointer-events-none"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent pointer-events-none" />

                                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
                                    {card.tags && card.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {card.tags.slice(0, 2).map((tag: string, tIdx: number) => (
                                                <span key={tIdx} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs text-white border border-white/20">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Overlay indicators */}
                                {isTop && (
                                    <>
                                        <div className="absolute top-6 right-6 w-16 h-16 border-4 border-green-500 text-green-500 rounded-full flex items-center justify-center opacity-0 transition-opacity duration-200" id={`like-indicator-${index}`}>
                                            <Heart className="w-8 h-8 fill-current" />
                                        </div>
                                        <div className="absolute top-6 left-6 w-16 h-16 border-4 border-red-500 text-red-500 rounded-full flex items-center justify-center opacity-0 transition-opacity duration-200" id={`nope-indicator-${index}`}>
                                            <X className="w-8 h-8" />
                                        </div>
                                    </>
                                )}
                            </m.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <div className="flex gap-6 mt-12 w-full max-w-sm justify-center">
                <button
                    onClick={() => handleSwipe('left')}
                    className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-red-400 hover:bg-red-400/20 hover:text-red-300 transition-colors shadow-lg shadow-black/50 border border-white/10"
                >
                    <X className="w-8 h-8" />
                </button>
                <button
                    onClick={() => handleSwipe('right')}
                    className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-green-400 hover:bg-green-400/20 hover:text-green-300 transition-colors shadow-lg shadow-black/50 border border-white/10"
                >
                    <Heart className="w-7 h-7 fill-current" />
                </button>
            </div>

            <div className="mt-8 text-slate-500 text-sm font-mono">
                {currentIndex + 1} / {cards.length}
            </div>
        </div>
    );
};

export default StyleMatcher;
