import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

function buildCloudinaryVariant(src: string, width: number): string {
  if (!src || !src.includes('res.cloudinary.com/') || !src.includes('/image/upload/')) {
    return src;
  }
  const marker = '/image/upload/';
  const idx = src.indexOf(marker);
  if (idx === -1) return src;
  const prefix = src.slice(0, idx + marker.length);
  const rest = src.slice(idx + marker.length);
  const firstSegment = rest.split('/')[0] || '';
  if (
    firstSegment.startsWith('f_') ||
    firstSegment.startsWith('q_') ||
    firstSegment.startsWith('w_') ||
    firstSegment.startsWith('c_')
  ) {
    return src;
  }
  return `${prefix}f_auto,q_auto,w_${width},c_limit/${rest}`;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
  sizes,
  srcSet,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const isCloudinary = Boolean(src && src.includes('res.cloudinary.com/') && src.includes('/image/upload/'));
  const resolvedSrc = isCloudinary ? buildCloudinaryVariant(src, 800) : src;
  const resolvedSrcSet =
    srcSet ||
    (isCloudinary
      ? `${buildCloudinaryVariant(src, 400)} 400w, ${buildCloudinaryVariant(src, 800)} 800w, ${buildCloudinaryVariant(src, 1200)} 1200w`
      : undefined);
  const resolvedSizes =
    sizes || (resolvedSrcSet ? '(max-width: 640px) 95vw, (max-width: 1024px) 50vw, 33vw' : undefined);

  return (
    <div className={`relative overflow-hidden bg-brand-surface/50 ${className}`}>
      {/* Loading Placeholder */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-surface z-10 transition-opacity duration-300">
          <div className="w-full h-full animate-pulse bg-white/5" />
        </div>
      )}

      {/* Error State */}
      {error || !src ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-brand-surface z-10">
          <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
          <span className="text-[10px]">תמונה לא זמינה</span>
        </div>
      ) : (
        <img
          src={resolvedSrc}
          srcSet={resolvedSrcSet}
          sizes={resolvedSizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
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
