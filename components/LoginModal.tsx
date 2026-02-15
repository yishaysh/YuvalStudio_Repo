import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import { Button } from './ui';
import { useAuth } from '../contexts/AuthContext';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { signInWithGoogle } = useAuth();

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
            onClose();
        } catch (error) {
            console.error("Login Failed:", error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
                >
                    {/* Backdrop */}
                    <div
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* "Void" Decoration */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-50" />
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-serif text-white mb-2">ברוכים הבאים</h2>
                                    <p className="text-zinc-400 text-sm">התחברי כדי לנהל את התורים שלך ולצפות בתוכנית העיצוב האישית</p>
                                </div>
                                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <Button
                                    onClick={handleGoogleLogin}
                                    className="w-full bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-3 py-6 rounded-xl font-medium transition-transform active:scale-[0.98]"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    התחבר עם Google
                                </Button>

                                {/* Apple Placeholder - Requires setup */}
                                <Button
                                    disabled
                                    className="w-full bg-black border border-zinc-700 text-zinc-500 flex items-center justify-center gap-3 py-6 rounded-xl font-medium cursor-not-allowed"
                                >
                                    <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.09-.89 1.48.59 2.12 1.47 2.53 2.1-.38.25-2.4 1.44-2 4.88.33 2.76 2.87 3.66 2.92 3.68-.02.1-.45 1.55-1.57 3.19-.66.97-1.37 1.93-2.05 2.08zm-4.32-15.7c.6-1.04 2.14-1.84 3.34-1.29-.19 1.43-.88 2.68-1.66 3.41-1.06.91-2.92 1.39-3.32-.4-.05-.59.33-1.37 1.64-1.72z" />
                                    </svg>
                                    התחבר עם Apple (בקרוב)
                                </Button>
                            </div>

                            <div className="mt-8 text-center">
                                <p className="text-xs text-zinc-600">
                                    בלחיצה על התחברות את מאשרת את תנאי השימוש ומדיניות הפרטיות שלנו
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
