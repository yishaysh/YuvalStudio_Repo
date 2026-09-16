// Cookie Consent Context Provider
// Manages global consent state, banner display, and granular settings dialog.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CookieConsentPreferences } from '../types';
import {
  getStoredConsent,
  acceptAllCookies,
  rejectAllCookies,
  saveCustomConsent,
  resetConsent as serviceResetConsent,
  onConsentChange,
  DEFAULT_COOKIE_CONSENT,
} from '../services/cookieConsent';

interface CookieConsentContextType {
  preferences: CookieConsentPreferences;
  isBannerOpen: boolean;
  isSettingsModalOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (custom: { analytics: boolean; marketing: boolean; preferences: boolean }) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  resetConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<CookieConsentPreferences>(() => getStoredConsent());
  const [isBannerOpen, setIsBannerOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Sync initial state and listen for storage updates across tabs/events
  useEffect(() => {
    const current = getStoredConsent();
    setPreferences(current);

    // If user has not yet interacted with cookie consent, display banner with a tiny natural delay
    if (!current.hasInteracted) {
      const timer = setTimeout(() => {
        setIsBannerOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setIsBannerOpen(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onConsentChange((nextPrefs) => {
      setPreferences(nextPrefs);
      if (nextPrefs.hasInteracted) {
        setIsBannerOpen(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleAcceptAll = useCallback(() => {
    const updated = acceptAllCookies();
    setPreferences(updated);
    setIsBannerOpen(false);
    setIsSettingsModalOpen(false);
  }, []);

  const handleRejectAll = useCallback(() => {
    const updated = rejectAllCookies();
    setPreferences(updated);
    setIsBannerOpen(false);
    setIsSettingsModalOpen(false);
  }, []);

  const handleSavePreferences = useCallback((custom: {
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  }) => {
    const updated = saveCustomConsent(custom);
    setPreferences(updated);
    setIsBannerOpen(false);
    setIsSettingsModalOpen(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  const handleResetConsent = useCallback(() => {
    const reset = serviceResetConsent();
    setPreferences(reset);
    setIsBannerOpen(true);
    setIsSettingsModalOpen(false);
  }, []);

  const value: CookieConsentContextType = {
    preferences,
    isBannerOpen,
    isSettingsModalOpen,
    acceptAll: handleAcceptAll,
    rejectAll: handleRejectAll,
    savePreferences: handleSavePreferences,
    openSettingsModal: handleOpenSettings,
    closeSettingsModal: handleCloseSettings,
    resetConsent: handleResetConsent,
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = (): CookieConsentContextType => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
};
