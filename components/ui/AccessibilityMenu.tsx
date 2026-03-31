import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { 
    Accessibility, X, Eye, Type, Link, RefreshCcw, ZoomIn, ZoomOut, Play, Square, Settings2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccessibilityMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { settings, updateSetting, resetSettings } = useAccessibility();
    const navigate = useNavigate();

    const handleZoomIn = () => {
        if (settings.fontSize < 1.4) {
            updateSetting('fontSize', settings.fontSize + 0.1);
        }
    };

    const handleZoomOut = () => {
        if (settings.fontSize > 1) {
            updateSetting('fontSize', settings.fontSize - 0.1);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] print:hidden">
            {/* Main Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-brand-primary/50 ${
                    isOpen ? 'bg-brand-surface border border-white/10 text-white' : 'bg-brand-primary text-brand-dark hover:scale-105'
                }`}
                aria-label="תפריט נגישות"
                aria-expanded={isOpen}
            >
                <Accessibility className="w-7 h-7" />
            </button>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-16 right-0 w-80 bg-brand-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden origin-bottom-right"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-brand-dark/50">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-brand-primary" />
                                התאמות נגישות
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                                aria-label="סגור תפריט נגישות"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
                            
                            {/* Font Size controls */}
                            <div className="bg-white/5 rounded-xl p-3">
                                <span className="text-sm font-medium text-slate-300 mb-2 block">גודל טקסט: {Math.round(settings.fontSize * 100)}%</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleZoomIn}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                                        disabled={settings.fontSize >= 1.4}
                                        aria-label="הגדל טקסט"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                        <span>הגדל</span>
                                    </button>
                                    <button
                                        onClick={() => updateSetting('fontSize', 1)}
                                        className="w-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
                                        aria-label="אפס גודל טקסט"
                                    >
                                        100%
                                    </button>
                                    <button
                                        onClick={handleZoomOut}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                                        disabled={settings.fontSize <= 1}
                                        aria-label="הקטן טקסט"
                                    >
                                        <ZoomOut className="w-4 h-4" />
                                        <span>הקטן</span>
                                    </button>
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="space-y-2">
                                <ToggleRow 
                                    active={settings.highContrast} 
                                    onClick={() => updateSetting('highContrast', !settings.highContrast)}
                                    icon={<Eye className="w-4 h-4" />}
                                    label="ניגודיות גבוהה"
                                    description="צבעים בולטים לקריאה נוחה"
                                />
                                <ToggleRow 
                                    active={settings.grayscale} 
                                    onClick={() => updateSetting('grayscale', !settings.grayscale)}
                                    icon={<div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-300 to-gray-600"></div>}
                                    label="גווני אפור"
                                    description="ביטול צבעים ססגוניים באתר"
                                />
                                <ToggleRow 
                                    active={settings.readableFont} 
                                    onClick={() => updateSetting('readableFont', !settings.readableFont)}
                                    icon={<Type className="w-4 h-4" />}
                                    label="פונט קריא"
                                    description="שימוש בגופן מערכת פשוט"
                                />
                                <ToggleRow 
                                    active={settings.highlightLinks} 
                                    onClick={() => updateSetting('highlightLinks', !settings.highlightLinks)}
                                    icon={<Link className="w-4 h-4" />}
                                    label="הדגשת קישורים"
                                    description="קו תחתון לכל כפתור או קישור"
                                />
                                <ToggleRow 
                                    active={settings.stopAnimations} 
                                    onClick={() => updateSetting('stopAnimations', !settings.stopAnimations)}
                                    icon={settings.stopAnimations ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4" />}
                                    label="עצירת אנימציות"
                                    description="ביטול תנועות והנפשות שאינן חובה"
                                />
                            </div>

                            {/* Options */}
                            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        resetSettings();
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium text-sm"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                    איפוס כל ההגדרות
                                </button>
                                <button
                                    onClick={() => {
                                        navigate('/accessibility-statement');
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-xl transition-colors font-medium text-sm border border-brand-primary/20"
                                >
                                    הצהרת נגישות מרכזית
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper component for toggle rows
const ToggleRow = ({ active, onClick, icon, label, description }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, description: string }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full text-right flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                active 
                ? 'bg-brand-primary/10 border-brand-primary/30 text-white' 
                : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-300'
            }`}
            aria-pressed={active}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-brand-primary text-brand-dark' : 'bg-white/10 text-slate-400'}`}>
                {icon}
            </div>
            <div className="flex-1 flex flex-col">
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs text-slate-400 mt-0.5">{description}</span>
            </div>
            <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${active ? 'bg-brand-primary' : 'bg-white/20'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${active ? '-translate-x-4 shadow-sm' : 'translate-x-0'}`} />
            </div>
        </button>
    );
};
