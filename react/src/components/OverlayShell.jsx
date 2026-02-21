import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function OverlayShell({
  open,
  onClose,
  children,
  className = '',
  panelClassName = '',
  closeOnBackdrop = true,
  closeOnEsc = true,
  lockScroll = true,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ESC to close
  useEffect(() => {
    if (!open || !closeOnEsc) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closeOnEsc, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open || !lockScroll) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockScroll]);

  if (!mounted || !open) return null;

  const overlay = (
    <div
      className={[
        'fixed inset-0 z-[100] flex items-center justify-center',
        'p-4 md:p-6',
        className,
      ].join(' ')}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onMouseDown={() => {
          if (closeOnBackdrop) onClose?.();
        }}
      />

      {/* Panel */}
      <div
        className={[
          'relative z-[101] w-full max-w-xl',
          'rounded-2xl border border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-800',
          'shadow-xl',
          'max-h-[85vh] overflow-auto',
          panelClassName,
        ].join(' ')}
        // Prevent backdrop close when clicking inside
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}