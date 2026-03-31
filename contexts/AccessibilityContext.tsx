import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityState {
    fontSize: number; // 1, 1.2, 1.4 for zoom levels
    highContrast: boolean;
    grayscale: boolean;
    readableFont: boolean;
    highlightLinks: boolean;
    stopAnimations: boolean;
}

interface AccessibilityContextProps {
    settings: AccessibilityState;
    updateSetting: <K extends keyof AccessibilityState>(key: K, value: AccessibilityState[K]) => void;
    resetSettings: () => void;
}

const defaultSettings: AccessibilityState = {
    fontSize: 1,
    highContrast: false,
    grayscale: false,
    readableFont: false,
    highlightLinks: false,
    stopAnimations: false,
};

const AccessibilityContext = createContext<AccessibilityContextProps | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AccessibilityState>(() => {
        const saved = localStorage.getItem('yuval_accessibility');
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('yuval_accessibility', JSON.stringify(settings));

        const root = document.documentElement;

        // Base font size scaling
        root.style.fontSize = `${16 * settings.fontSize}px`;

        // Toggle CSS classes based on settings
        if (settings.highContrast) {
            root.classList.add('a11y-high-contrast');
        } else {
            root.classList.remove('a11y-high-contrast');
        }

        if (settings.grayscale) {
            root.classList.add('a11y-grayscale');
        } else {
            root.classList.remove('a11y-grayscale');
        }

        if (settings.readableFont) {
            root.classList.add('a11y-readable-font');
        } else {
            root.classList.remove('a11y-readable-font');
        }

        if (settings.highlightLinks) {
            root.classList.add('a11y-highlight-links');
        } else {
            root.classList.remove('a11y-highlight-links');
        }

        if (settings.stopAnimations) {
            root.classList.add('a11y-stop-animations');
        } else {
            root.classList.remove('a11y-stop-animations');
        }

    }, [settings]);

    const updateSetting = <K extends keyof AccessibilityState>(key: K, value: AccessibilityState[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
    };

    return (
        <AccessibilityContext.Provider value={{ settings, updateSetting, resetSettings }}>
            {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = () => {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
};
