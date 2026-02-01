import React, { useEffect, useState } from 'react';
import { SectionHeading } from '../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/mockApi';
import { X } from 'lucide-react';

const m = motion as any;

const STATIC_IMAGES = [
  'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1599643478518-17488fbbcd75?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1630019852942-e5e1237d6d49?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1589904107470-38e07923366c?q=80&w=800&auto=format&fit=crop',
];

const JewelryPage: React.FC = () => {
  const [images, setImages] = useState<string[]>(STATIC_IMAGES);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const data = await api.getGallery();
        if (data && data.length > 0) {
          const dbImages = data.map((item: any) => item.image_url);
          // Show uploaded images first, then static ones
          setImages([...dbImages, ...STATIC_IMAGES]);
        }
      } catch (error) {
        console.error("Failed to load gallery images", error);
      }
    };
    loadGallery();
  }, []);

  return (
    <div className="pt-24 pb-20">
      <section className="text-center mb-20 px-6">
        <h1 className="text-5xl font-serif text-white mb-6">גלריה</h1>
        <p className="text-slate-400 text-lg">קולקציית הזהב והטיטניום שלנו</p>
      </section>

      <div className="container mx-auto px-6">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {images.map((src, i) => (
            <m.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="break-inside-avoid rounded-xl overflow-hidden shadow-xl border border-white/5 cursor-zoom-in relative group"
              onClick={() => setSelectedImage(src)}
              whileHover={{ y: -5 }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-10" />
              <img 
                src={src} 
                alt={`Jewelry ${i}`} 
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" 
              />
            </m.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 z-50 bg-black/20 rounded-full"
            >
              <X className="w-8 h-8" />
            </button>

            <m.img
              src={selectedImage}
              alt="Full screen"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e: any) => e.stopPropagation()} 
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JewelryPage;