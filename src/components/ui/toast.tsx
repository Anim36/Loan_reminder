"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Toast, nodes 10:8309 (Loan saved) / 10:8310 (Marked as paid) /
 *   10:8311 (Reminder sent)
 *   bg-surface + border-toast-positive-border + shadow-overlay
 *   + rounded-input (12px). 16px padding, 28px success pill (brand-50),
 *   13px medium label (DM Sans), 16px close icon.
 *
 * The renderer is the visible Toast card. Stack management, auto-dismiss,
 * and the useToast hook live in toast-provider.tsx.
 */

import { Check, X } from "lucide-react";

export interface ToastCardProps {
  message: string;
  onDismiss?: () => void;
}

export function ToastCard({ message, onDismiss }: ToastCardProps) {
  return (
    <div
      role="status"
      className="w-full min-w-[320px] max-w-[420px] bg-surface border border-toast-positive-border rounded-input shadow-overlay flex items-center gap-3 p-4"
    >
      <span className="size-7 rounded-pill bg-brand-50 flex items-center justify-center shrink-0">
        <Check size={16} className="text-brand-600" strokeWidth={3} />
      </span>
      <p className="flex-1 min-w-0 font-medium text-label text-text leading-[1.5]">
        {message}
      </p>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="shrink-0 size-4 flex items-center justify-center text-muted hover:text-text"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}