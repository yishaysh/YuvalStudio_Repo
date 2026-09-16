// Cookie & Tracker Consent Management Service
// Compliant with Israeli Privacy Protection Authority guidelines and GDPR standards.
// Implements Prior Consent (strict opt-in) and equal visual weight (no dark patterns).

import { CookieCategory, CookieCategoryMeta, CookieConsentPreferences } from '../types';

export const COOKIE_CONSENT_STORAGE_KEY = 'yuval_cookie_consent';
export const COOKIE_CONSENT_VERSION = '2026.1';
export const COOKIE_CONSENT_EVENT = 'yuval_cookie_consent_updated';

// Metadata definition for all cookie categories
export const COOKIE_CATEGORIES_META: CookieCategoryMeta[] = [
  {
    id: 'necessary',
    title: 'עוגיות חיוניות (הכרחיות לתפעול)',
    description: 'קובצי עוגיות הנדרשים לתפקוד הבסיסי והמאובטח של האתר. לא ניתן להשבית קטגוריה זו.',
    purpose: 'אימות משתמשים וסשן מאובטח, ניהול הזמנת תורים, אבטחת טפסים ומניעת הונאות.',
    isMandatory: true,
    examples: ['סשן התחברות מאובטח (Google/Neon Auth)', 'שמירת מזהה תור פעיל', 'אסימוני אבטחה והגנה']
  },
  {
    id: 'analytics',
    title: 'עוגיות אנליטיקה וביצועים',
    description: 'איסוף מידע סטטיסטי ומצטבר אודות אופן השימוש באתר במטרה לשפר את השירותים והתוכן.',
    purpose: 'מדידת כמות המבקרים, זיהוי עמודים פופולריים ואיתור תקלות טכניות באופן אנונימי.',
    isMandatory: false,
    examples: ['Google Analytics 4 (סטטיסטיקה אנונימית)', 'מדדי ביצועים וטעינת עמודים']
  },
  {
    id: 'marketing',
    title: 'עוגיות שיווק ומדיה',
    description: 'התאמת תוכן שיווקי ומודעות ברשתות החברתיות על סמך העדפותיך ותחומי העניין שלך באתר.',
    purpose: 'מדידת אפקטיביות קמפיינים והצגת הצעות רלוונטיות של תכשיטים ושירותי הסטודיו ברשת.',
    isMandatory: false,
    examples: ['Meta Pixel (אינסטגרם/פייסבוק)', 'התאמת מודעות שיווקיות']
  },
  {
    id: 'preferences',
    title: 'עוגיות העדפות חוויית משתמש',
    description: 'שמירת הגדרות אישיות שבחרת באתר על מנת להעניק חוויית גלישה רציפה ומותאמת אישית.',
    purpose: 'שמירת העדפות צפייה, המלצות מותאמות אישית של סטייל מאצ\'ר, וסינוני גלריה מועדפים.',
    isMandatory: false,
    examples: ['המלצות תכשיטים בסטייל מאצ\'ר AI', 'זכירת העדפות תצוגה אישיות']
  }
];

export const DEFAULT_COOKIE_CONSENT: CookieConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
  consentTimestamp: null,
  hasInteracted: false,
  version: COOKIE_CONSENT_VERSION,
};

/**
 * Retrieves the stored cookie consent preferences from localStorage.
 * If none exists, returns default strict preferences (all non-essential false).
 */
export const getStoredConsent = (): CookieConsentPreferences => {
  if (typeof window === 'undefined') {
    return DEFAULT_COOKIE_CONSENT;
  }

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_COOKIE_CONSENT;
    }

    const parsed = JSON.parse(raw);
    return {
      necessary: true, // Always enforce necessary
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      preferences: Boolean(parsed.preferences),
      consentTimestamp: parsed.consentTimestamp || null,
      hasInteracted: Boolean(parsed.hasInteracted),
      version: parsed.version || COOKIE_CONSENT_VERSION,
    };
  } catch (error) {
    console.error('Error reading cookie consent preferences:', error);
    return DEFAULT_COOKIE_CONSENT;
  }
};

/**
 * Saves updated preferences to localStorage and dispatches a window event.
 */
export const saveConsent = (updates: Partial<CookieConsentPreferences>): CookieConsentPreferences => {
  const current = getStoredConsent();
  const nextPreferences: CookieConsentPreferences = {
    ...current,
    ...updates,
    necessary: true, // Always locked to true
    hasInteracted: true,
    consentTimestamp: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(nextPreferences));
  } catch (error) {
    console.error('Error saving cookie consent preferences:', error);
  }

  // Dispatch custom event for real-time reactivity across components and tracker engines
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_EVENT, { detail: nextPreferences })
    );
  }

  return nextPreferences;
};

/**
 * Accepts all cookie categories.
 */
export const acceptAllCookies = (): CookieConsentPreferences => {
  return saveConsent({
    necessary: true,
    analytics: true,
    marketing: true,
    preferences: true,
  });
};

/**
 * Rejects all non-essential cookie categories.
 * Preserves strict compliance with no dark patterns.
 */
export const rejectAllCookies = (): CookieConsentPreferences => {
  return saveConsent({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });
};

/**
 * Saves granular user selections for optional categories.
 */
export const saveCustomConsent = (custom: {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}): CookieConsentPreferences => {
  return saveConsent({
    necessary: true,
    analytics: custom.analytics,
    marketing: custom.marketing,
    preferences: custom.preferences,
  });
};

/**
 * Clears stored consent (useful for testing or manual reset).
 */
export const resetConsent = (): CookieConsentPreferences => {
  try {
    localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch (error) {
    console.error('Error removing cookie consent from storage:', error);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_EVENT, { detail: DEFAULT_COOKIE_CONSENT })
    );
  }

  return DEFAULT_COOKIE_CONSENT;
};

/**
 * Checks if a specific category is allowed under current consent.
 */
export const isCategoryAllowed = (category: CookieCategory): boolean => {
  if (category === 'necessary') return true;
  const current = getStoredConsent();
  return Boolean(current[category]);
};

/**
 * Executes a callback only if the user has consented to the category.
 */
export const executeIfAllowed = (category: CookieCategory, action: () => void): boolean => {
  if (isCategoryAllowed(category)) {
    action();
    return true;
  }
  return false;
};

/**
 * Injects a third-party script only if the corresponding category is consented to.
 */
export const injectScriptIfAllowed = (
  category: CookieCategory,
  src: string,
  id?: string
): boolean => {
  if (!isCategoryAllowed(category)) {
    return false;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const scriptId = id || `script-${category}-${src.replace(/[^a-zA-Z0-9]/g, '_')}`;
  if (document.getElementById(scriptId)) {
    return true; // Already loaded
  }

  const script = document.createElement('script');
  script.id = scriptId;
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
  return true;
};

/**
 * Registers an event listener for cookie consent changes.
 * Returns an unregister function.
 */
export const onConsentChange = (
  callback: (preferences: CookieConsentPreferences) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<CookieConsentPreferences>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener(COOKIE_CONSENT_EVENT, handler);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handler);
};
