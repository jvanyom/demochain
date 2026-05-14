import { AnimatePresence, m } from 'framer-motion';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-elevated p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              {title && <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-fg"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
