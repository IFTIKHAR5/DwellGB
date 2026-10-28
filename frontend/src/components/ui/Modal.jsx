import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from '@/components/icons';

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const panelRef = useRef(null);
  // Keep the latest onClose in a ref. Parents usually pass a new arrow function on
  // every render; if the effect below depended on it, it would re-run on every
  // keystroke and jump the focus back to the first field.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Runs once when the modal opens: Escape key, lock page scroll, focus the first field.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => panelRef.current?.querySelector('input, textarea, select, button:not([data-close])')?.focus(), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div className="absolute inset-0 bg-pine-900/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${widths[size]} bg-surface rounded-t-3xl sm:rounded-3xl shadow-pop max-h-[92dvh] flex flex-col`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          >
            {title && (
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-lg font-bold">{title}</h2>
                <button data-close className="btn btn-ghost btn-icon -me-2" onClick={onClose} aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
            )}
            <div className="px-6 pb-6 overflow-y-auto scrollbar-thin">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-line flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
