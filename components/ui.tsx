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
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-400 ms-1">{label}</label>
      <input
        className={`bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-brand-primary/20 ${className}`}
        {...props}
      />
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
}

// ... (keep existing interfaces)

export const NavigationModal: React.FC<NavigationModalProps> = ({ isOpen, onClose, address }) => {
  const encodedAddress = encodeURIComponent(address);

  const handleNavigation = (app: 'waze' | 'google') => {
    let url = '';
    if (app === 'waze') {
      // Waze deep link
      url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
    } else {
      // Google Maps
      url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
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
                <div className="w-10 h-10 drop-shadow-lg group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 512 512" fill="currentColor" className="text-[#33CCFF]">
                    <path d="M502.2 387.4L372.6 156.6c-28.7-50.6-88.8-62.5-128.8-29.3l-18 15.1c-10.4-1.7-21-2.6-31.8-2.6-67.7 0-128.7 34.1-163.6 85.3l-20.5 30c-15.3 22.5-9.3 53.1 13.2 68.4 22.5 15.3 53.1 9.3 68.4-13.2l20.5-30c18.5-27.1 50.8-45.2 86.8-45.2 5.6 0 11.2.5 16.6 1.4l-75.5 133.7c-21.7 38.3-8.2 86.5 30.1 108.2 12.7 7.2 26.6 10.7 40.3 10.7 27.5 0 54-13.9 67.9-38.6l15.1-26.7c18.2 12.1 40.1 19.3 63.6 19.3 63 0 114.1-51.1 114.1-114.1 0-35.3-16-66.9-41.2-87.9l75.6-7.8c27.1-2.8 46.5-27 43.7-54.1-3.2-27.5-30.8-46.1-57.3-43.2zM368.6 384.8c-23.2 0-42.1-18.9-42.1-42.1s18.9-42.1 42.1-42.1c23.2 0 42.1 18.9 42.1 42.1s-18.9 42.1-42.1 42.1z" />
                    <circle cx="152" cy="272" r="24" className="text-white" fill="white" />
                    <circle cx="280" cy="272" r="24" className="text-white" fill="white" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white">Waze</span>
              </button>

              <button
                onClick={() => handleNavigation('google')}
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#4285F4]/10 border border-[#4285F4]/20 hover:bg-[#4285F4]/20 transition-all group"
              >
                <div className="w-10 h-10 drop-shadow-lg group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.6 2.8C15.8 0.9 13.4 0 10.9 0 8.2 0 5.7 1 3.9 3 1 5.9 0 9.2 0 12.3c0 2.2 1 5.3 1.9 6.8l7.9 13.8c0.4 0.7 1.4 0.7 1.8 0l8.3-14.7c0.8-1.5 1.5-3.8 1.5-5.9C21.4 9.1 20.3 5.4 17.6 2.8z" fill="#EA4335" />
                    <circle cx="10.9" cy="9.1" r="3.6" fill="#fff" />
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