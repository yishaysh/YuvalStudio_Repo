import React from 'react';
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Navigation } from 'lucide-react';
import { createPortal } from 'react-dom';

const m = motion as any;

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  isLoading,
  ...props
}) => {
  const baseStyle = "relative px-6 py-3 text-sm font-medium tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl overflow-hidden shadow-lg hover:shadow-xl active:scale-[0.98]";

  const variants = {
    primary: "bg-brand-primary text-brand-dark hover:bg-brand-primaryHover",
    secondary: "bg-brand-surface text-white border border-brand-border hover:bg-brand-border",
    outline: "bg-transparent border border-brand-primary/50 text-brand-primary hover:bg-brand-primary/10",
    ghost: "bg-transparent text-slate-400 hover:text-white",
    danger: "bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      <span className={`relative z-10 flex items-center justify-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-5 h-5 border-2 border-current border-t-transparent animate-spin rounded-full"></div>
        </div>
      )}
    </button>
  );
};

// --- Card ---
interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <m.div
      className={`bg-brand-surface/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl shadow-xl ${className}`}
      {...props}
    >
      {children}
    </m.div>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-400 ms-1">{label}</label>
      <div className="relative">
        <input
          className={`w-full bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-brand-primary/20 ${icon ? 'pl-12' : ''} ${className}`}
          {...props}
        />
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Section Heading ---
export const SectionHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-12 text-center">
    <h2 className="text-3xl md:text-5xl font-serif text-white mb-3 tracking-tight">
      {title}
    </h2>
    {subtitle && (
      <div className="flex items-center justify-center gap-3">
        <div className="h-[1px] w-8 bg-brand-primary/30"></div>
        <p className="text-brand-primary/80 uppercase tracking-widest text-xs font-medium">{subtitle}</p>
        <div className="h-[1px] w-8 bg-brand-primary/30"></div>
      </div>
    )}
  </div>
);

// --- Modal ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, icon }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-dark/90 backdrop-blur-md"
          />

          {/* Modal Content */}
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-brand-surface border border-white/10 rounded-3xl shadow-2xl relative z-10 max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-serif text-white">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              {icon && (
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                  {icon}
                </div>
              )}
              <div className="text-slate-400 text-sm leading-relaxed">
                {children}
              </div>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Confirmation Modal ---
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  children?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, onClose, onConfirm, title, description,
  confirmText = 'אישור', cancelText = 'ביטול', variant = 'primary',
  children
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={variant === 'danger' ? <AlertTriangle className="w-8 h-8 text-red-400" /> : undefined}
    >
      <p className="mb-6">{description}</p>
      {children && <div className="mb-8 text-right">{children}</div>}
      <div className="flex gap-3 justify-center">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          {cancelText}
        </Button>
        <Button
          variant={variant}
          onClick={() => { onConfirm(); onClose(); }}
          className="flex-1"
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

// --- Navigation Modal ---
interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// ... (keep existing interfaces)

export const NavigationModal: React.FC<NavigationModalProps> = ({ isOpen, onClose, address, coordinates }) => {
  const encodedAddress = encodeURIComponent(address);

  const handleNavigation = (app: 'waze' | 'google') => {
    let url = '';

    if (coordinates && coordinates.lat && coordinates.lng) {
      if (app === 'waze') {
        // Waze deep link with coordinates
        url = `https://waze.com/ul?ll=${coordinates.lat},${coordinates.lng}&navigate=yes`;
      } else {
        // Google Maps with coordinates
        url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
      }
    } else {
      // Fallback to address
      if (app === 'waze') {
        url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      }
    }

    window.open(url, '_blank');
    onClose();
  };

  // Prevent rendering if not open (optimization)
  // However, AnimatePresence needs the component to be mounted to animate out.
  // We will conditionally render the Portal content.

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[9999]"
          />
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed top-1/2 left-1/2 w-[90%] max-w-sm bg-brand-surface border border-white/10 rounded-2xl shadow-2xl z-[10000] p-6 text-center origin-center"
            style={{ transform: 'translate(-50%, -50%)' }} // Fallback / Ensure centering
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary">
              <Navigation className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-serif text-white mb-2">בחר אפליקציית ניווט</h3>
            <p className="text-slate-400 text-sm mb-6">כיצד תרצה לנווט לסטודיו?</p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleNavigation('waze')}
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#33CCFF]/10 border border-[#33CCFF]/20 hover:bg-[#33CCFF]/20 transition-all group"
              >
                <div className="w-10 h-10 bg-[#33CCFF] rounded-xl flex items-center justify-center drop-shadow-lg group-hover:scale-110 transition-transform text-white">
                  <svg role="img" viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <title>Waze</title>
                    <path d="M13.218 0C9.915 0 6.835 1.49 4.723 4.148c-1.515 1.913-2.31 4.272-2.31 6.706v1.739c0 .894-.62 1.738-1.862 1.813-.298.025-.547.224-.547.522-.05.82.82 2.31 2.012 3.502.82.844 1.788 1.515 2.832 2.036a3 3 0 0 0 2.955 3.528 2.966 2.966 0 0 0 2.931-2.385h2.509c.323 1.689 2.086 2.856 3.974 2.21 1.64-.546 2.36-2.409 1.763-3.924a12.84 12.84 0 0 0 1.838-1.465 10.73 10.73 0 0 0 3.18-7.65c0-2.882-1.118-5.589-3.155-7.625A10.899 10.899 0 0 0 13.218 0zm0 1.217c2.558 0 4.967.994 6.78 2.807a9.525 9.525 0 0 1 2.807 6.78A9.526 9.526 0 0 1 20 17.585a9.647 9.647 0 0 1-6.78 2.807h-2.46a3.008 3.008 0 0 0-2.93-2.41 3.03 3.03 0 0 0-2.534 1.367v.024a8.945 8.945 0 0 1-2.41-1.788c-.844-.844-1.316-1.614-1.515-2.11a2.858 2.858 0 0 0 1.441-.846 2.959 2.959 0 0 0 .795-2.036v-1.789c0-2.11.696-4.197 2.012-5.861 1.863-2.385 4.62-3.726 7.6-3.726zm-2.41 5.986a1.192 1.192 0 0 0-1.191 1.192 1.192 1.192 0 0 0 1.192 1.193A1.192 1.192 0 0 0 12 8.395a1.192 1.192 0 0 0-1.192-1.192zm7.204 0a1.192 1.192 0 0 0-1.192 1.192 1.192 1.192 0 0 0 1.192 1.193 1.192 1.192 0 0 0 1.192-1.193 1.192 1.192 0 0 0-1.192-1.192zm-7.377 4.769a.596.596 0 0 0-.546.845 4.813 4.813 0 0 0 4.346 2.757 4.77 4.77 0 0 0 4.347-2.757.596.596 0 0 0-.547-.845h-.025a.561.561 0 0 0-.521.348 3.59 3.59 0 0 1-3.254 2.061 3.591 3.591 0 0 1-3.254-2.061.64.64 0 0 0-.546-.348z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white">Waze</span>
              </button>

              <button
                onClick={() => handleNavigation('google')}
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#4285F4]/10 border border-[#4285F4]/20 hover:bg-[#4285F4]/20 transition-all group"
              >
                <div className="w-10 h-10 drop-shadow-lg group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 256 367" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <path d="M70.5853976,271.865254 C81.1995596,285.391378 90.8598594,299.639537 99.4963338,314.50654 C106.870174,328.489419 109.94381,337.97007 115.333495,354.817346 C118.638014,364.124835 121.625069,366.902652 128.046515,366.902652 C135.045169,366.902652 138.219816,362.176756 140.672953,354.867852 C145.766819,338.95854 149.763988,326.815514 156.069992,315.343493 C168.443902,293.193112 183.819296,273.510299 198.927732,254.592287 C203.018698,249.238677 229.462067,218.047767 241.366994,193.437035 C241.366994,193.437035 255.999233,166.402027 255.999233,128.645368 C255.999233,93.3274168 241.569017,68.8321265 241.569017,68.8321265 L200.024428,79.9578224 L174.793197,146.408963 L168.552129,155.57215 L167.303915,157.231625 L165.64444,159.309576 L162.729537,162.628525 L158.56642,166.791642 L136.098575,185.09637 L79.928962,217.528279 L70.5853976,271.865254 Z" fill="#34A853" />
                    <path d="M12.6120081,188.891517 C26.3207125,220.205084 52.7568668,247.730719 70.6431185,271.8869 L165.64444,159.352866 C165.64444,159.352866 152.260416,176.856717 127.981579,176.856717 C100.939355,176.856717 79.0920095,155.2619 79.0920095,128.032084 C79.0920095,109.359386 90.325932,96.5309245 90.325932,96.5309245 L25.8373003,113.811107 L12.6120081,188.891517 Z" fill="#FBBC04" />
                    <path d="M166.705061,5.78651629 C198.256727,15.959818 225.262874,37.3165365 241.597878,68.8104812 L165.673301,159.28793 C165.673301,159.28793 176.907223,146.228586 176.907223,127.671329 C176.907223,99.8065834 153.443693,78.990998 128.09702,78.990998 C104.128433,78.990998 90.3620076,96.4659886 90.3620076,96.4659886 L90.3620076,39.4666386 L166.705061,5.78651629 Z" fill="#4285F4" />
                    <path d="M30.0148476,45.7654275 C48.8607087,23.2182162 82.0213432,0 127.736265,0 C149.915506,0 166.625695,5.82259183 166.625695,5.82259183 L90.2898565,96.5164943 L36.2054099,96.5164943 L30.0148476,45.7654275 Z" fill="#1A73E8" />
                    <path d="M12.6120081,188.891517 C12.6120081,188.891517 0,164.194204 0,128.414485 C0,94.5972757 13.145926,65.0369799 30.0148476,45.7654275 L90.3331471,96.5237094 L12.6120081,188.891517 Z" fill="#EA4335" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white">Google Maps</span>
              </button>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};