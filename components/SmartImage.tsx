import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean; // If true, loads eagerly (for hero images)
}

export const SmartImage: React.FC<SmartImageProps> = ({ src, alt, className = '', priority = false, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Preload image in background
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setError(true);
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-brand-surface/50 ${className}`}>
      {/* Loading Placeholder - CSS Only */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-surface z-10 transition-opacity duration-500 ease-in-out opacity-100">
          <div className="w-full h-full animate-pulse bg-white/5" />
        </div>
      )}

      {/* Error State */}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-brand-surface z-10">
          <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
          <span className="text-[10px]">תמונה לא זמינה</span>
        </div>
      ) : (
        /* Image with CSS transition */
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={`w-full h-full object-cover transition-all duration-700 ease-out will-change-transform ${isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'} ${className}`}
          {...props}
        />
      )}
    </div>
  );
};