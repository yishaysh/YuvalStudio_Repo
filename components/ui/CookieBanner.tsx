// Cookie Banner Component
// Displays initial consent banner with equal visual weight for Accept and Reject (No Dark Patterns).
// Strictly adheres to Israeli Privacy Protection Authority and GDPR rules.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Cookie, SlidersHorizontal, Check, X } from 'lucide-react';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

export const CookieBanner: React.FC = () => {
  const { isBannerOpen, acceptAll, rejectAll, openSettingsModal } = useCookieConsent();

  if (!isBannerOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.section
        role="region"
        aria-label="הודעת קובצי עוגיות ופרטיות"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[10001] p-4 sm:p-6 bg-brand-surface/98 backdrop-blur-2xl border-t border-brand-primary/20 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] text-right"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Content & Legal Links */}
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <Cookie className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                  שקיפות ובחירה בקובצי עוגיות (Cookies)
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                אנו משתמשים בקובצי עוגיות הכרחיים לתפקודו התקין והמאובטח של האתר ולתיאום תורים. בנוסף, נשמח להשתמש בעוגיות אנליטיקה ושיווק לצורך שיפור השירות והתאמת תוכן אישי, אך רק בהסכמתך המפורשת. באפשרותך לאשר את כל העוגיות, לדחות את הלא-חיוניות, או לקבוע העדפות באופן פרטני.
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                <span>למידע מפורט:</span>
                <Link to="/privacy" className="text-brand-primary hover:underline font-medium">
                  מדיניות פרטיות
                </Link>
                <span className="text-white/20">•</span>
                <Link to="/terms" className="text-brand-primary hover:underline font-medium">
                  תקנון האתר
                </Link>
              </div>
            </div>

            {/* Action Buttons - Equal Stature (No Dark Patterns) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              {/* Customize Button */}
              <button
                type="button"
                onClick={openSettingsModal}
                className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-brand-primary/40"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>התאמה אישית</span>
              </button>

              {/* Reject All Button (No Dark Patterns: High contrast, equal size and weight) */}
              <button
                type="button"
                onClick={rejectAll}
                className="px-5 py-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm focus:ring-2 focus:ring-white/30"
              >
                <X className="w-4 h-4" />
                <span>דחה הכל</span>
              </button>

              {/* Accept All Button */}
              <button
                type="button"
                onClick={acceptAll}
                className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-brand-dark text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-brand-primary/15 flex items-center justify-center gap-2 focus:ring-2 focus:ring-brand-primary/50"
              >
                <Check className="w-4 h-4" />
                <span>קבל הכל</span>
              </button>
            </div>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
};
