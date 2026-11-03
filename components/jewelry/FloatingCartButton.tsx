import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useJewelryCart } from '../../contexts/JewelryCartContext';
import { useLocation } from 'react-router-dom';

const m = motion as any;

export const FloatingCartButton: React.FC = () => {
  const { totalCount, openCart, justAddedItemId } = useJewelryCart();
  const location = useLocation();

  // Show if there are items, or if user is browsing the jewelry catalog
  const shouldShow = totalCount > 0 || location.pathname === '/jewelry';

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, transform: 'scale(0.8) translateY(20px)' }}
        animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
        exit={{ opacity: 0, transform: 'scale(0.8) translateY(20px)' }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="fixed left-6 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-6 z-[9985] print:hidden"
      >
        <button
          onClick={openCart}
          aria-label={`שקית קניות, ${totalCount} פריטים`}
          className="relative group flex items-center gap-2.5 px-4 py-3 bg-brand-surface/95 backdrop-blur-xl border border-brand-primary/40 text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-[background-color,border-color,transform] duration-[160ms] ease-emil-out hover:border-brand-primary active:scale-[0.95] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-brand-primary transition-transform duration-200 group-hover:scale-110" />
            
            {/* Animated Badge */}
            {totalCount > 0 && (
              <m.span
                key={totalCount}
                initial={{ transform: 'scale(0.5)' }}
                animate={{ transform: justAddedItemId ? 'scale(1.3)' : 'scale(1)' }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-brand-primary text-brand-dark font-bold text-[10px] rounded-full flex items-center justify-center shadow-md"
              >
                {totalCount}
              </m.span>
            )}
          </div>

          <span className="text-xs font-semibold text-white group-hover:text-brand-primary transition-colors hidden sm:inline">
            שקית תכשיטים
          </span>
        </button>
      </m.div>
    </AnimatePresence>
  );
};

