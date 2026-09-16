// Cookie Settings Modal Component
// Fully redesigned with luxury aesthetic, high-contrast accessible switch toggles, and clear Hebrew RTL typography.
// Compliant with Israeli Privacy Protection Authority and GDPR guidelines.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Cookie, ShieldCheck, BarChart3, Megaphone, Sliders, Check, Lock, 
  Sparkles, CheckCircle2, RotateCcw
} from 'lucide-react';
import { useCookieConsent } from '../../contexts/CookieConsentContext';
import { COOKIE_CATEGORIES_META } from '../../services/cookieConsent';
import { CookieCategory } from '../../types';

interface ToggleSwitchProps {
  isChecked: boolean;
  isMandatory?: boolean;
  onToggle?: () => void;
  label: string;
}

const LuxuryToggleSwitch: React.FC<ToggleSwitchProps> = ({
  isChecked,
  isMandatory = false,
  onToggle,
  label,
}) => {
  return (
    <div className="flex items-center gap-2.5 shrink-0 select-none">
      {/* State Text Label */}
      <span
        className={`text-xs font-semibold tracking-wide whitespace-nowrap min-w-[36px] text-center transition-colors ${
          isMandatory
            ? 'text-emerald-400'
            : isChecked
            ? 'text-brand-primary'
            : 'text-slate-500'
        }`}
      >
        {isMandatory ? 'חובה' : isChecked ? 'פעיל' : 'כבוי'}
      </span>

      {/* Switch Track (rendered with dir="ltr" to guarantee physical transform predictability) */}
      <button
        type="button"
        role="switch"
        dir="ltr"
        aria-checked={isChecked}
        aria-label={label}
        disabled={isMandatory}
        onClick={isMandatory ? undefined : onToggle}
        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 ${
          isMandatory
            ? 'bg-emerald-500/20 border border-emerald-500/40 cursor-not-allowed opacity-90'
            : isChecked
            ? 'bg-gradient-to-r from-brand-primary via-[#dfbe7f] to-[#eed297] shadow-[0_0_16px_rgba(212,181,133,0.4)] border border-brand-primary/60'
            : 'bg-white/10 hover:bg-white/20 border border-white/20'
        }`}
      >
        {/* Sliding Thumb Knob */}
        <span
          className={`pointer-events-none flex items-center justify-center h-6 w-6 transform rounded-full shadow-lg transition-transform duration-300 ease-out ${
            isChecked
              ? 'translate-x-7 bg-brand-dark border border-brand-primary/40'
              : 'translate-x-0 bg-slate-300'
          }`}
        >
          {isMandatory ? (
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          ) : isChecked ? (
            <Check className="w-3.5 h-3.5 text-brand-primary stroke-[3]" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-500" />
          )}
        </span>
      </button>
    </div>
  );
};

export const CookieSettingsModal: React.FC = () => {
  const { 
    preferences, 
    isSettingsModalOpen, 
    closeSettingsModal, 
    savePreferences, 
    acceptAll, 
    rejectAll 
  } = useCookieConsent();

  // Local state for interactive choices within the modal
  const [localChoices, setLocalChoices] = useState({
    analytics: false,
    marketing: false,
    preferences: false,
  });

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isSettingsModalOpen) {
      setLocalChoices({
        analytics: preferences.analytics,
        marketing: preferences.marketing,
        preferences: preferences.preferences,
      });
    }
  }, [isSettingsModalOpen, preferences]);

  if (!isSettingsModalOpen) {
    return null;
  }

  const handleToggle = (category: 'analytics' | 'marketing' | 'preferences') => {
    setLocalChoices((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSelectAll = () => {
    setLocalChoices({
      analytics: true,
      marketing: true,
      preferences: true,
    });
  };

  const handleDeselectAll = () => {
    setLocalChoices({
      analytics: false,
      marketing: false,
      preferences: false,
    });
  };

  const handleSave = () => {
    savePreferences(localChoices);
  };

  const getCategoryDetails = (id: CookieCategory) => {
    switch (id) {
      case 'necessary':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          badgeText: 'חיוני לאבטחה וסשן',
          accentBorder: 'border-emerald-500/30',
        };
      case 'analytics':
        return {
          icon: <BarChart3 className="w-5 h-5 text-sky-400" />,
          badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
          badgeText: 'סטטיסטיקה אנונימית',
          accentBorder: 'border-sky-500/30',
        };
      case 'marketing':
        return {
          icon: <Megaphone className="w-5 h-5 text-amber-400" />,
          badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          badgeText: 'התאמת תוכן ומודעות',
          accentBorder: 'border-amber-500/30',
        };
      case 'preferences':
        return {
          icon: <Sliders className="w-5 h-5 text-purple-400" />,
          badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          badgeText: 'חוויית משתמש וסטייל',
          accentBorder: 'border-purple-500/30',
        };
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-brand-surface/98 border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] text-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-brand-dark/70 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center text-brand-primary shadow-inner">
                <Cookie className="w-6 h-6" />
              </div>
              <div>
                <h2 id="cookie-settings-title" className="text-lg sm:text-xl font-serif font-bold text-white flex items-center gap-2">
                  מרכז העדפות עוגיות ופרטיות
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  שקיפות מלאה ושליטה אישית בטכנולוגיות המעקב של סטודיו יובל
                </p>
              </div>
            </div>
            <button
              onClick={closeSettingsModal}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              aria-label="סגירת חלון הגדרות עוגיות"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm text-slate-300 custom-scrollbar">
            {/* Information Notice & Quick Helpers */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand-primary/10 via-brand-primary/5 to-transparent border border-brand-primary/20 space-y-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  אנו פועלים על פי עקרון <strong>ההסכמה המוקדמת (Prior Consent)</strong>. שום כלי שאינו חיוני אינו פועל לפני אישורך. באפשרותך להפעיל או לכבות כל קטגוריה בנפרד, או להשתמש בפעולות המהירות:
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                  <span>סמן הכל כפעיל</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>השבת הכל (למעט חובה)</span>
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-4">
              {COOKIE_CATEGORIES_META.map((category) => {
                const isMandatory = category.isMandatory;
                const isChecked = isMandatory ? true : localChoices[category.id as keyof typeof localChoices];
                const meta = getCategoryDetails(category.id);

                return (
                  <div
                    key={category.id}
                    className={`p-4 sm:p-5 rounded-2xl transition-all duration-300 border ${
                      isChecked
                        ? 'bg-white/[0.04] border-white/15 shadow-sm'
                        : 'bg-white/[0.02] border-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Header Row: Icon, Title, Badge, and Switch */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-inner shrink-0">
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-serif font-bold text-white text-base">
                              {category.title}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${meta.badgeClass}`}>
                              {meta.badgeText}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1 sm:line-clamp-none">
                            {category.description}
                          </p>
                        </div>
                      </div>

                      {/* Switch Button */}
                      <LuxuryToggleSwitch
                        isChecked={isChecked}
                        isMandatory={isMandatory}
                        onToggle={() => handleToggle(category.id as 'analytics' | 'marketing' | 'preferences')}
                        label={`הפעלת ${category.title}`}
                      />
                    </div>

                    {/* Detailed Accordion Information */}
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs">
                      <p className="text-slate-300">
                        <span className="text-slate-400 font-medium">תכלית השימוש: </span>
                        {category.purpose}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <span className="text-slate-500 font-medium">דוגמאות:</span>
                        {category.examples.map((example, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-300 font-sans"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions - Strict Equality and Clear Action */}
          <div className="p-4 sm:p-6 border-t border-white/10 bg-brand-dark/90 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={rejectAll}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white font-medium text-xs sm:text-sm transition-all text-center focus:ring-2 focus:ring-white/30"
              >
                דחה הכל
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-brand-primary/40 bg-brand-primary/15 hover:bg-brand-primary/25 text-brand-primary font-medium text-xs sm:text-sm transition-all text-center focus:ring-2 focus:ring-brand-primary/40"
              >
                קבל הכל
              </button>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={closeSettingsModal}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs sm:text-sm transition-colors"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-brand-dark font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 focus:ring-2 focus:ring-brand-primary/50"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>שמור העדפות</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
