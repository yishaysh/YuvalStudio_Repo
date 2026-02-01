import React from 'react';
import { SectionHeading } from '../components/ui';
import { motion } from 'framer-motion';

const JewelryPage: React.FC = () => {
  const images = [
    'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599643478518-17488fbbcd75?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1630019852942-e5e1237d6d49?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589904107470-38e07923366c?q=80&w=800&auto=format&fit=crop',
  ];

  return (
    <div className="pt-24 pb-20">
      <section className="text-center mb-20 px-6">
        <h1 className="text-5xl font-serif text-white mb-6">גלריה</h1>
        <p className="text-slate-400 text-lg">קולקציית הזהב והטיטניום שלנו</p>
      </section>

      <div className="container mx-auto px-6">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {images.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="break-inside-avoid rounded-xl overflow-hidden shadow-xl border border-white/5"
            >
              <img 
                src={src} 
                alt={`Jewelry ${i}`} 
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" 
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JewelryPage;