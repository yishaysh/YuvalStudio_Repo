import React from 'react';
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

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
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal Content */}
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-md bg-brand-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={onClose}
                className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 text-center">
                {icon && (
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                    {icon}
                  </div>
                )}
                <h3 className="text-2xl font-serif text-white mb-4">{title}</h3>
                <div className="text-slate-400 text-sm leading-relaxed mb-8">
                  {children}
                </div>
              </div>
            </m.div>
          </m.div>
        </>
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