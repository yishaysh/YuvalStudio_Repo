import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { api } from '../services/mockApi';
import { X, ChevronRight, ChevronLeft, Tag, ShoppingBag, Sparkles, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { Service } from '../types';
import { SmartImage } from '../components/SmartImage';

const m = motion as any;

const JewelryPage: React.FC = () => {
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Selection Dialog State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [direction, setDirection] = useState(0);

  // Refs for event listener access
  const selectedIndexRef = useRef(selectedIndex);
  const isSelectionModeRef = useRef(isSelectionMode);
  const galleryItemsRef = useRef(galleryItems);

  const navigate = useNavigate();

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    isSelectionModeRef.current = isSelectionMode;
  }, [isSelectionMode]);

  useEffect(() => {
    galleryItemsRef.current = galleryItems;
  }, [galleryItems]);

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const data = await api.getGallery();
        setGalleryItems(data);
      } catch (error) {
        console.error("Failed to load gallery images", error);
      }
    };
    loadGallery();
  }, []);

  // Lock body scroll when modal is open - dedicated effect with cleanup
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function ensures scroll is restored when unmounting or navigating away
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedIndex]);

  // Handler refs to use inside the stable event listener
  const handleNextStable = useCallback(() => {
    const currentItems = galleryItemsRef.current;
    const currentIdx = selectedIndexRef.current;
    if (currentIdx === null || currentItems.length === 0) return;

    setDirection(1);
    setSelectedIndex((currentIdx + 1) % currentItems.length);
    if (isSelectionModeRef.current) setIsSelectionMode(false);
  }, []);

  const handlePrevStable = useCallback(() => {
    const currentItems = galleryItemsRef.current;
    const currentIdx = selectedIndexRef.current;
    if (currentIdx === null || currentItems.length === 0) return;

    setDirection(-1);
    setSelectedIndex((currentIdx - 1 + currentItems.length) % currentItems.length);
    if (isSelectionModeRef.current) setIsSelectionMode(false);
  }, []);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleNextStable();
  }, [handleNextStable]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    handlePrevStable();
  }, [handlePrevStable]);

  // Keydown listener - attached once
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndexRef.current === null) return;

      if (e.key === 'ArrowLeft') handleNextStable();
      if (e.key === 'ArrowRight') handlePrevStable();
      if (e.key === 'Escape') {
        if (isSelectionModeRef.current) setIsSelectionMode(false);
        else setSelectedIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStable, handlePrevStable]);

  const currentItem = selectedIndex !== null ? galleryItems[selectedIndex] : null;
  const taggedServices: Service[] = currentItem?.taggedServices || [];

  const handleOpenSelection = () => {
    setSelectedServices(taggedServices);
    setIsSelectionMode(true);
  };

  const toggleServiceSelection = (service: Service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleFinalBooking = () => {
    if (!selectedServices.length) return;
    navigate('/booking', { state: { preSelectedServices: selectedServices } });
  };

  const totalPrice = taggedServices.reduce((acc, item) => acc + item.price, 0);
  const selectedPrice = selectedServices.reduce((acc, item) => acc + item.price, 0);

  // Swipe logic
  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      handleNext();
    } else if (swipe > swipeConfidenceThreshold) {
      handlePrev();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    })
  };

  return (
    <div className="pt-24 pb-20">
      <section className="text-center mb-12 px-6">
        <h1 className="text-5xl font-serif text-white mb-6">הגלריה</h1>
        <p className="text-slate-400 text-lg">השראה, דיוק ואסתטיקה</p>
      </section>

      <div className="container mx-auto px-6">
        {galleryItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {galleryItems.map((item, i) => (
              <m.div
                key={item.id || i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "100px" }}
                transition={{ duration: 0.4 }}
                className="aspect-[4/5] rounded-xl overflow-hidden shadow-xl border border-white/5 cursor-zoom-in relative group will-change-transform"
                onClick={() => { setDirection(1); setSelectedIndex(i); }}
                whileHover={{ y: -5 }}
              >
                {/* Overlay - Centered "Get The Look" */}
                {item.taggedServices?.length > 0 && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex items-center justify-center">
                    <div className="text-white transform scale-90 group-hover:scale-100 transition-transform duration-300 bg-black/60 px-5 py-2.5 rounded-full border border-white/20 shadow-xl backdrop-blur-md">
                      <p className="font-serif text-sm md:text-base flex items-center gap-2 tracking-wide">
                        <Sparkles className="w-4 h-4 text-brand-primary" /> Get The Look
                      </p>
                    </div>
                  </div>
                )}

                <SmartImage
                  src={item.image_url}
                  alt={`Jewelry ${i}`}
                  className="w-full h-full object-cover"
                />
              </m.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-slate-400 text-lg">הגלריה ריקה כרגע. תמונות יעלו בקרוב!</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedIndex(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-0 md:p-8 backdrop-blur-xl"
          >
            <div
              className="relative w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] bg-brand-surface rounded-none md:rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/10"
              onClick={(e: any) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedIndex(null)}
                className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-full md:w-2/3 h-[40vh] md:h-auto relative bg-black flex items-center justify-center group overflow-hidden">
                {/* Navigation Arrows - Centered Vertically */}
                <button onClick={handlePrev} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white/90 hover:text-white p-3 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all border border-white/5">
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button onClick={handleNext} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white/90 hover:text-white p-3 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all border border-white/5">
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Image with Swipe */}
                <AnimatePresence initial={false} custom={direction}>
                  <m.img
                    key={selectedIndex}
                    src={galleryItems[selectedIndex].image_url}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={handleDragEnd}
                    className="absolute max-w-full max-h-full object-contain touch-pan-y"
                    alt="Look detail"
                  />
                </AnimatePresence>
              </div>

              <div className="w-full md:w-1/3 bg-brand-dark/95 border-l border-white/5 flex flex-col h-[60vh] md:h-auto relative overflow-hidden z-30">
                <AnimatePresence mode="wait">
                  {!isSelectionMode ? (
                    <m.div
                      key="details"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full"
                    >
                      <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="mb-6 pb-6 border-b border-white/10 text-center">
                          <h2 className="text-3xl font-serif text-white mb-2">Get The Look</h2>
                          <p className="text-slate-400 text-sm">הפריטים המופיעים בתמונה זו</p>
                        </div>

                        {taggedServices.length > 0 ? (
                          <div className="space-y-4">
                            {taggedServices.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-primary/30 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                    <Tag className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-slate-200 font-medium text-sm">{item.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.category}</p>
                                  </div>
                                </div>
                                <span className="text-white font-serif">₪{item.price}</span>
                              </div>
                            ))}

                            <div className="mt-8 p-4 bg-brand-surface rounded-xl border border-brand-primary/20">
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-slate-400">סה"כ לוק משוער</span>
                                <span className="text-2xl font-serif text-brand-primary">₪{totalPrice}</span>
                              </div>
                              <p className="text-[10px] text-slate-500">* המחיר כולל תכשיט וביצוע</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                            <ShoppingBag className="w-8 h-8 mb-2 opacity-50" />
                            <p>לא תויגו מוצרים לתמונה זו עדיין</p>
                          </div>
                        )}
                      </div>

                      <div className="p-6 border-t border-white/10 bg-brand-surface/95 backdrop-blur-sm z-10 mt-auto">
                        <Button onClick={handleOpenSelection} className="w-full py-4 text-lg mb-2 shadow-xl shadow-brand-primary/20" disabled={taggedServices.length === 0}>
                          <span className="flex items-center justify-center gap-2">
                            אני רוצה את הלוק הזה <Calendar className="w-4 h-4" />
                          </span>
                        </Button>
                        <p className="text-center text-[10px] text-slate-500">לחיצה תעביר לבחירת הפריטים הרצויים</p>
                      </div>
                    </m.div>
                  ) : (
                    <m.div
                      key="selection"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full bg-brand-dark"
                    >
                      <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-serif text-white">הרכבת הלוק</h2>
                          <p className="text-slate-400 text-xs">בחר את הפריטים שתרצה לבצע</p>
                        </div>
                        <button onClick={() => setIsSelectionMode(false)} className="text-slate-400 hover:text-white">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="space-y-3">
                          {taggedServices.map((item) => {
                            const isSelected = selectedServices.some(s => s.id === item.id);
                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleServiceSelection(item)}
                                className={`flex justify-between items-center p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-brand-primary/10 border-brand-primary' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`transition-colors ${isSelected ? 'text-brand-primary' : 'text-slate-600'}`}>
                                    {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                  </div>
                                  <div>
                                    <p className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-slate-400'}`}>{item.name}</p>
                                    <p className="text-[10px] text-slate-500">{item.category}</p>
                                  </div>
                                </div>
                                <span className={isSelected ? 'text-brand-primary font-bold' : 'text-slate-500'}>₪{item.price}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-6 border-t border-white/10 bg-brand-surface/95 backdrop-blur-sm z-10">
                        <div className="flex justify-between items-end mb-4 px-1">
                          <span className="text-slate-400 text-sm">סה"כ נבחר</span>
                          <span className="text-2xl font-serif text-white">₪{selectedPrice}</span>
                        </div>
                        <Button onClick={handleFinalBooking} className="w-full py-4 text-lg shadow-xl" disabled={selectedServices.length === 0}>
                          המשך לקביעת תור ({selectedServices.length} פריטים)
                        </Button>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JewelryPage;
