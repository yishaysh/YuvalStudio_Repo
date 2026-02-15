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
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl z-[101] overflow-hidden"
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
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                    התחבר עם Google
                                </Button>

                                {/* Apple Placeholder - Requires setup */}
                                <Button
                                    disabled
                                    className="w-full bg-black border border-zinc-700 text-zinc-500 flex items-center justify-center gap-3 py-6 rounded-xl font-medium cursor-not-allowed"
                                >
                                    <img src="https://www.svgrepo.com/show/445105/apple.svg" alt="Apple" className="w-5 h-5 opacity-50" />
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
                </>
            )}
        </AnimatePresence>
    );
};
