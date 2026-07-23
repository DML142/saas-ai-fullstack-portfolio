'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * Minimal dialog: backdrop + centred panel, closed by Escape or a backdrop
 * click. Deliberately not a full focus-trap implementation — these dialogs
 * hold one input and two buttons, and pulling in a headless-dialog dependency
 * for that would be more machinery than the case warrants.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        aria-hidden
        className="absolute inset-0 bg-black/70"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-sm rounded-xl border border-border/60 bg-bg p-5"
      >
        <h2 className="mb-4 font-display text-lg text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}
