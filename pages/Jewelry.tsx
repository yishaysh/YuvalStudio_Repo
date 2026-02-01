import React, { useEffect, useState, useCallback } from 'react';
import { SectionHeading } from '../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/mockApi';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const m = motion as any;

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

  return (
    <div className="pt-24 pb-20">
      <section className="text-center mb-20 px-6">
        <h1 className="text-5xl font-serif text-white mb-6">גלריה</h1>
        <p className="text-slate-400 text-lg">קולקציית הזהב והטיטניום שלנו</p>
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
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-10" />
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

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedIndex(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 z-50 bg-black/20 rounded-full"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Navigation Buttons */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 transition-all p-3 rounded-full hidden md:flex z-50"
                        title="הקודם"
                    >
                        <ChevronRight className="w-10 h-10" />
                    </button>

                    <button
                        onClick={handleNext}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 transition-all p-3 rounded-full hidden md:flex z-50"
                        title="הבא"
                    >
                        <ChevronLeft className="w-10 h-10" />
                    </button>
                </>
            )}

            <m.img
              key={selectedIndex}
              src={images[selectedIndex]}
              alt="Full screen"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
              onClick={(e: any) => e.stopPropagation()} 
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e: any, { offset, velocity }: any) => {
                const swipe = offset.x;
                if (swipe < -100) handleNext();
                else if (swipe > 100) handlePrev();
              }}
            />
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-500 text-sm font-medium tracking-widest bg-black/20 px-4 py-1 rounded-full backdrop-blur-sm">
                {selectedIndex + 1} / {images.length}
            </div>

            {/* Hidden Preloader for next/prev images to ensure instant swipe */}
            <div className="hidden">
               {images[(selectedIndex + 1) % images.length] && <img src={images[(selectedIndex + 1) % images.length]} alt="preload-next" />}
               {images[(selectedIndex - 1 + images.length) % images.length] && <img src={images[(selectedIndex - 1 + images.length) % images.length]} alt="preload-prev" />}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JewelryPage;