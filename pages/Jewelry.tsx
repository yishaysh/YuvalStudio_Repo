import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/mockApi';
import { X, ChevronRight, ChevronLeft, Tag, ShoppingBag, Share2, Sparkles } from 'lucide-react';
import { Button } from '../components/ui';
import { DEFAULT_STUDIO_DETAILS } from '../constants';

const m = motion as any;

// --- Mock Data for "Get The Look" ---
// In a real app, this would come from the database relationship between Gallery items and Products
const MOCK_LOOKS: Record<number, { items: { name: string; price: number; type: string }[] }> = {
    0: {
        items: [
            { name: 'הליקס כפול - חישוק זהב 14K', price: 450, type: 'Piercing' },
            { name: 'עגיל תנוך - יהלום שחור', price: 300, type: 'Jewelry' }
        ]
    },
    1: {
        items: [
            { name: 'ספטום קליקר טיטניום', price: 180, type: 'Piercing' },
            { name: 'נזם נקודה זהב', price: 120, type: 'Jewelry' }
        ]
    },
    3: {
        items: [
            { name: 'אינדסטריאל קלאסי', price: 250, type: 'Piercing' },
            { name: 'הליקס קדמי (Forward Helix)', price: 180, type: 'Piercing' }
        ]
    }
};

const JewelryPage: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const data = await api.getGallery();
        if (data && data.length > 0) {
          const dbImages = data.map((item: any) => item.image_url);
          setImages(dbImages);
        } else {
             // Fallback images if DB is empty
             setImages([
                'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1629224316810-9d8805b95076?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1630019852942-e5e1237d6d49?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1589904107470-38e07923366c?q=80&w=800&auto=format&fit=crop',
            ]);
        }
      } catch (error) {
        console.error("Failed to load gallery images", error);
      }
    };
    loadGallery();
  }, []);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => prev === null ? null : (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => prev === null ? null : (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowLeft') handleNext();
      if (e.key === 'ArrowRight') handlePrev();
      if (e.key === 'Escape') setSelectedIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handleNext, handlePrev]);

  // Get look details for current index
  const currentLook = selectedIndex !== null ? MOCK_LOOKS[selectedIndex % 4] : null; // Using modulo to fake data for all images
  const totalPrice = currentLook?.items.reduce((acc, item) => acc + item.price, 0) || 0;

  const handleBuyLook = () => {
      if (!currentLook || selectedIndex === null) return;
      const phone = DEFAULT_STUDIO_DETAILS.phone.replace(/\D/g, '').replace(/^0/, '972');
      
      const itemsList = currentLook.items.map(i => `- ${i.name} (₪${i.price})`).join('\n');
      const msg = `*היי יובל! אהבתי את הלוק הזה מהאתר:* 😍\n\n${itemsList}\n\n*סה"כ משוער:* ₪${totalPrice}\n\nאשמח לקבוע תור לביצוע!`;
      
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="pt-24 pb-20">
      <section className="text-center mb-12 px-6">
        <h1 className="text-5xl font-serif text-white mb-6">הגלריה</h1>
        <p className="text-slate-400 text-lg">השראה, דיוק ואסתטיקה</p>
      </section>

      <div className="container mx-auto px-6">
        {images.length > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {images.map((src, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "100px" }}
                transition={{ duration: 0.4 }}
                className="break-inside-avoid rounded-xl overflow-hidden shadow-xl border border-white/5 cursor-zoom-in relative group"
                onClick={() => setSelectedIndex(i)}
                whileHover={{ y: -5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex items-end p-6">
                    <div className="text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <p className="font-serif text-lg flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-primary" /> Get The Look</p>
                    </div>
                </div>
                <img 
                  src={src} 
                  alt={`Jewelry ${i}`} 
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
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

      {/* Enhanced Lightbox / Get The Look Modal */}
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
                {/* Close Button */}
                <button
                    onClick={() => setSelectedIndex(null)}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Left Side: Image */}
                <div className="w-full md:w-2/3 h-[50vh] md:h-auto relative bg-black flex items-center justify-center group">
                     {/* Navigation on Image */}
                    <button onClick={handlePrev} className="absolute right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all hidden md:block">
                        <ChevronRight className="w-8 h-8" />
                    </button>
                    <button onClick={handleNext} className="absolute left-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all hidden md:block">
                        <ChevronLeft className="w-8 h-8" />
                    </button>

                    <img 
                        src={images[selectedIndex]} 
                        className="max-w-full max-h-full object-contain"
                        alt="Look detail"
                    />
                    
                    {/* Mobile Navigation Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 md:hidden">
                         <button onClick={handlePrev} className="p-2 bg-black/30 rounded-full text-white"><ChevronRight className="w-5 h-5"/></button>
                         <button onClick={handleNext} className="p-2 bg-black/30 rounded-full text-white"><ChevronLeft className="w-5 h-5"/></button>
                    </div>
                </div>

                {/* Right Side: "Get The Look" Details */}
                <div className="w-full md:w-1/3 bg-brand-dark/95 border-l border-white/5 flex flex-col">
                    <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                        <div className="mb-6 pb-6 border-b border-white/10">
                            <h2 className="text-3xl font-serif text-white mb-2">Get The Look</h2>
                            <p className="text-slate-400 text-sm">הפריטים המופיעים בתמונה זו</p>
                        </div>

                        {currentLook ? (
                            <div className="space-y-4">
                                {currentLook.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-primary/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-slate-200 font-medium text-sm">{item.name}</p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.type}</p>
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
                                <p>פרטי הלוק אינם זמינים כרגע</p>
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div className="p-6 border-t border-white/10 bg-brand-surface/50 backdrop-blur-sm z-10">
                        <Button onClick={handleBuyLook} className="w-full py-4 text-lg mb-3 shadow-xl shadow-brand-primary/20" disabled={!currentLook}>
                            <span className="flex items-center justify-center gap-2">
                                אני רוצה את הלוק הזה <Share2 className="w-4 h-4" />
                            </span>
                        </Button>
                        <p className="text-center text-xs text-slate-500">לחיצה תעביר אותך לוואטסאפ לתיאום</p>
                    </div>
                </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JewelryPage;