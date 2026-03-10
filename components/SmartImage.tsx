import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({ src, alt, className = '', priority = false, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-brand-surface/50 ${className}`}>
      {/* Loading Placeholder */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-surface z-10 transition-opacity duration-300">
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
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ease-out will-change-opacity ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          {...props}
        />
      )}
    </div>
  );
};