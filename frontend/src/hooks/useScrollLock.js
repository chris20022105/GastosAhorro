import { useEffect } from 'react';

/**
 * Custom hook to lock body scroll on iOS/Safari and other platforms.
 * It uses the position: fixed technique to prevent scroll-induced 
 * viewport/touch-target misalignment on Safari.
 * 
 * @param {boolean} isOpen - Whether the scroll lock should be active.
 */
export default function useScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;

    // Capture the current scroll position before modifying body styles
    const scrollY = window.scrollY || window.pageYOffset;

    // Save current styles to restore them when unlocking
    const originalStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    // Apply styles to freeze the background safely
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    let timeoutId = null;

    const handleFocusOut = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        timeoutId = setTimeout(() => {
          // Solo restablecemos el scroll visual si no se enfocó otro input/textarea/select
          if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
            window.scrollTo(0, 0);
          }
        }, 50);
      }
    };

    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('focusout', handleFocusOut);

      // Restore the original styles
      document.body.style.position = originalStyle.position;
      document.body.style.top = originalStyle.top;
      document.body.style.left = originalStyle.left;
      document.body.style.width = originalStyle.width;
      document.body.style.overflow = originalStyle.overflow;

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
}
