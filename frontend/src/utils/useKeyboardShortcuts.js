import { useEffect } from 'react';

/**
 * Global keyboard shortcuts hook.
 * - Esc: Closes any visible modal overlay by clicking the overlay backdrop
 * - Enter: Submits any form inside a visible modal
 *
 * Usage: call useKeyboardShortcuts() in any component with modals,
 *        or call it once in Layout to apply globally.
 */
export function useKeyboardShortcuts() {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // ESC: Close topmost modal overlay
            if (e.key === 'Escape') {
                const overlays = document.querySelectorAll('.modal-overlay');
                if (overlays.length > 0) {
                    // Find any close/cancel button in the last (topmost) overlay
                    const lastOverlay = overlays[overlays.length - 1];
                    const cancelBtn = lastOverlay.querySelector('.clear-btn, .close-btn, [data-dismiss]');
                    if (cancelBtn) {
                        cancelBtn.click();
                        return;
                    }
                    // Fallback: click the overlay itself (some modals use overlay click to close)
                }
            }

            // ENTER: Submit form in active modal (only if not in a textarea or search box)
            if (e.key === 'Enter') {
                const tag = e.target.tagName;
                const type = e.target.type;
                
                // Don't intercept Enter in textareas or search inputs
                if (tag === 'TEXTAREA') return;
                if (tag === 'SELECT') return;
                
                // If inside a modal overlay, find and click the primary action button
                const overlays = document.querySelectorAll('.modal-overlay');
                if (overlays.length > 0) {
                    const lastOverlay = overlays[overlays.length - 1];
                    const primaryBtn = lastOverlay.querySelector('.checkout-btn:not(:disabled), .submit-btn:not(:disabled), .login-btn:not(:disabled)');
                    if (primaryBtn && !primaryBtn.disabled) {
                        e.preventDefault();
                        primaryBtn.click();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}

export default useKeyboardShortcuts;
