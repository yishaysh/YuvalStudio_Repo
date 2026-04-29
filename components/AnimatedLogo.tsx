import React from 'react';
import Lottie from 'lottie-react';
import animationData from './logoAnimation.json';

interface AnimatedLogoProps {
  className?: string;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ className }) => {
  return (
    <div className={className} style={{
      // Force all SVG strokes inside Lottie to use currentColor to respect text-brand-primary
      // and match the previous static SVG behavior
    }}>
      <style>{`
        .lottie-container svg path[stroke] {
          stroke: currentColor !important;
        }
        .lottie-container svg path[fill] {
          fill: currentColor !important;
        }
      `}</style>
      <div className="lottie-container" style={{ width: '100%', height: '100%' }}>
        <Lottie 
          animationData={animationData} 
          loop={false} 
          autoplay={true} 
          renderer="svg"
        />
      </div>
    </div>
  );
};
