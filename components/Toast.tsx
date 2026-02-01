import React, { useEffect } from 'react';

export type ToastTone = 'default' | 'success' | 'error';

export interface ToastProps {
  open: boolean;
  message: string;
  tone?: ToastTone;
  onClose: () => void;
  /** Auto-dismiss after ms; 0 = no auto-dismiss */
  duration?: number;
}

/**
 * Minimal Dropam toast: white, slight blur, thin border, soft shadow, small type.
 * No bright colors, no loud icons. Disappears quietly.
 */
export const Toast: React.FC<ToastProps> = ({
  open,
  message,
  tone = 'default',
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    if (!open || duration <= 0) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-3 py-2.5 min-w-[200px] max-w-sm
        bg-white/95 backdrop-blur-sm
        border border-black/5
        shadow-sm
        text-[12px] font-medium text-[#111111]
        rounded-lg
        transition-opacity duration-150 ease-out"
    >
      <span className="flex-1 truncate">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="flex-shrink-0 p-0.5 text-gray-400 hover:text-[#111111] transition-colors rounded"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
