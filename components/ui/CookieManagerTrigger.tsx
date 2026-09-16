// Cookie Manager Floating Trigger
// Provides persistent, accessible control to reopen cookie preferences at any time.
// Positioned bottom-left to avoid conflict with the accessibility button on the bottom-right.

import React from 'react';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

export const CookieManagerTrigger: React.FC = () => {
  const { openSettingsModal, isBannerOpen } = useCookieConsent();

  // If the banner itself is actively open, hide the small trigger to prevent redundancy
  if (isBannerOpen) {
    return null;
  }

  return (
    <aside
      aria-label="ניהול עוגיות ופרטיות"
      className="fixed bottom-6 left-6 z-[9990] print:hidden"
    >
      <button
        type="button"
        onClick={openSettingsModal}
        className="group relative w-12 h-12 rounded-full bg-brand-surface/90 hover:bg-brand-surface border border-white/10 hover:border-brand-primary/40 text-slate-300 hover:text-brand-primary shadow-xl backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-brand-primary/30"
        aria-label="ניהול הגדרות עוגיות ופרטיות"
      >
        <Cookie className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />

        {/* Hover Tooltip */}
        <span className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-brand-dark/95 border border-white/10 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xl hidden sm:block">
          הגדרות עוגיות ופרטיות
        </span>
      </button>
    </aside>
  );
};
