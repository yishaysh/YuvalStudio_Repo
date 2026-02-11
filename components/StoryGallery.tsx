
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ShoppingBag, ArrowRight } from 'lucide-react';
import { Service } from '../types';
import { Button } from './ui';

interface StoryGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    images: any[]; // Gallery items
    startIndex?: number;
    services: Service[]; // To match tags with actual service data
    onBookService: (service: Service) => void;
}

const STORY_DURATION = 5000; // 5 seconds per slide

export const StoryGallery: React.FC<StoryGalleryProps> = ({
    isOpen,
    onClose,
    images,
    startIndex = 0,
    services,
    onBookService
}) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isPaused, setIsPaused] = useState(false);
    const [showProducts, setShowProducts] = useState(false);
    const progressControls = useAnimation();

    // Reset index when opening
    useEffect(() => {
        if (isOpen) setCurrentIndex(startIndex);
    }, [isOpen, startIndex]);

    // Handle auto-advance
    useEffect(() => {
        if (!isOpen || isPaused || showProducts) return;

        const timer = setTimeout(() => {
            handleNext();
        }, STORY_DURATION);

        return () => clearTimeout(timer);
    }, [currentIndex, isOpen, isPaused, showProducts]);

    const handleNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose(); // Close at the end
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const currentImage = images[currentIndex];

    // Find tagged services for current image
    const taggedProducts = currentImage?.taggedServices?.map((tag: any) => {
        if (typeof tag === 'string') {
            return services.find(s => s.id === tag);
        }
        return tag;
    }).filter(Boolean) || [];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] bg-black text-white flex flex-col md:flex-row h-[100dvh]"
                >
                    {/* Main Story Area */}
                    <div className="relative flex-1 bg-black h-full flex items-center justify-center">

                        {/* Progress Bars */}
                        <div className="absolute top-4 left-4 right-4 z-20 flex gap-1 h-1">
                            {images.map((_, idx) => (
                                <div key={idx} className="h-full flex-1 bg-white/20 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: idx < currentIndex ? "100%" : "0%" }}
                                        animate={{
                                            width: idx === currentIndex
                                                ? (isPaused || showProducts ? "100%" : "100%")
                                                : idx < currentIndex ? "100%" : "0%"
                                        }}
                                        transition={{
                                            duration: idx === currentIndex ? STORY_DURATION / 1000 : 0,
                                            ease: "linear"
                                        }}
                                        className="h-full bg-white"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Header Controls */}
                        <div className="absolute top-8 left-4 right-4 z-20 flex justify-between items-center px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/50">
                                    <span className="font-serif font-bold text-brand-primary">Y</span>
                                </div>
                                <span className="font-medium text-sm">Yuval Studio</span>
                            </div>
                            <button onClick={onClose} className="p-2 bg-black/20 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Image */}
                        <div
                            className="w-full h-full relative"
                            onMouseDown={() => setIsPaused(true)}
                            onMouseUp={() => setIsPaused(false)}
                            onTouchStart={() => setIsPaused(true)}
                            onTouchEnd={() => setIsPaused(false)}
                        >
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={currentImage.id}
                                    src={currentImage.image_url}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full object-contain md:object-cover bg-neutral-900"
                                    alt="Gallery Story"
                                />
                            </AnimatePresence>

                            {/* Tap Areas for Navigation */}
                            <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                            <div className="absolute inset-y-0 right-0 w-1/4 z-10" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
                        </div>

                        {/* Bottom Actions - Shop The Look */}
                        {taggedProducts.length > 0 && (
                            <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center pb-safe">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowProducts(true)}
                                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-xl hover:bg-brand-primary transition-colors"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    Shop The Look ({taggedProducts.length})
                                </motion.button>
                            </div>
                        )}
                    </div>

                    {/* Product Drawer / Sidebar */}
                    <AnimatePresence>
                        {showProducts && (
                            <motion.div
                                initial={{ x: "100%", opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: "100%", opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="absolute md:relative inset-0 md:inset-auto md:w-[400px] bg-brand-surface/95 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col h-full shadow-2xl"
                            >
                                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-serif text-white">Shop The Look</h3>
                                        <p className="text-sm text-slate-400">פריטים המופיעים בתמונה</p>
                                    </div>
                                    <button onClick={() => setShowProducts(false)} className="p-2 hover:bg-white/10 rounded-full">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {taggedProducts.map((product: any) => (
                                        <div key={product.id} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-brand-primary/30 transition-colors">
                                            <div className="w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0">
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h4 className="font-bold text-white mb-1">{product.name}</h4>
                                                    <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>
                                                </div>
                                                <div className="flex justify-between items-end mt-2">
                                                    <span className="text-brand-primary font-serif">₪{product.price}</span>
                                                    <button
                                                        onClick={() => {
                                                            onBookService(product);
                                                            setShowProducts(false);
                                                            onClose();
                                                        }}
                                                        className="text-xs bg-brand-primary text-brand-dark px-3 py-1.5 rounded-lg font-bold hover:bg-white transition-colors flex items-center gap-1"
                                                    >
                                                        הזמן תור <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
