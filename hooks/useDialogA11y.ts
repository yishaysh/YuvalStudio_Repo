import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(el => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
    // Skip visually hidden / display:none ancestors
    return el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
  });
}

export interface UseDialogA11yOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
  closeOnEscape?: boolean;
}

export function useDialogA11y({
  isOpen,
  onClose,
  initialFocusRef,
  restoreFocus = true,
  closeOnEscape = true,
}: UseDialogA11yOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const target =
        initialFocusRef?.current ||
        getFocusableElements(container)[0] ||
        container;
      if (target && typeof target.focus === 'function') {
        target.focus({ preventScroll: true });
      }
    }, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Only let the topmost open modal/drawer handle global Escape / Tab trapping
      const openModals = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
      );
      if (openModals.length > 0) {
        const topmost = openModals[openModals.length - 1];
        if (topmost !== container && !container.contains(topmost) && !topmost.contains(container)) {
          return;
        }
      }

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const focusables = getFocusableElements(container);
        if (focusables.length === 0) {
          event.preventDefault();
          container.focus({ preventScroll: true });
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (!active || active === first || !container.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (!active || active === last || !container.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);

      if (restoreFocus && previousFocusRef.current && previousFocusRef.current.isConnected) {
        const toRestore = previousFocusRef.current;
        window.setTimeout(() => {
          if (toRestore.isConnected) {
            toRestore.focus({ preventScroll: true });
          }
        }, 0);
      }
    };
  }, [isOpen, restoreFocus, closeOnEscape, initialFocusRef]);

  return containerRef;
}
