"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Modal delete, nodes 10:8306 Desktop (440px) / 10:8307 Mobile (350px)
 *   Bg-surface, rounded-card, shadow-overlay, 24/32px padding
 *   Header: 48px overdue pill + trash-2 icon
 *   Title: 24px medium (DM Sans)
 *   Body: muted 14px
 *   Actions: secondary (Keep) + destructive filled (Delete)
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: "Desktop" | "Mobile";
  title?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

export function Modal({
  open,
  onClose,
  size = "Desktop",
  title = "Delete this loan?",
  description = "Rafi’s ৳5,000 loan and its reminder history will be permanently deleted. This can’t be undone.",
  primaryLabel = "Delete loan",
  secondaryLabel = "Keep loan",
  onPrimary,
  onSecondary,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Remember the element that opened the modal so we can restore focus
    // when it closes (helps screen-reader and keyboard users keep their
    // place in the page).
    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Focus trap: when Tab/Shift+Tab reaches the boundary of the
      // dialog, loop the focus to the opposite side.
      if (e.key === "Tab" && containerRef.current) {
        const focusables =
          containerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
          );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isMobile = size === "Mobile";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Scrim — keep click-out dismiss */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-scrim"
      />
      <div
        ref={containerRef}
        className={[
          "relative z-10 bg-surface rounded-card shadow-overlay flex flex-col gap-6 items-start overflow-hidden",
          isMobile ? "p-6 w-[350px]" : "p-8 w-[440px]",
        ].join(" ")}
        data-size={size}
      >
        <div className="bg-status-overdue-bg rounded-pill size-12 flex items-center justify-center shrink-0">
          <Trash2 size={20} className="text-status-overdue-text" />
        </div>
        <div className="flex flex-col gap-3 items-start leading-[1.5] w-full">
          <p className="font-medium text-modal-heading text-text">{title}</p>
          <p className="font-normal text-body text-muted">{description}</p>
        </div>
        <div className="flex gap-3 items-start w-full">
          <button
            type="button"
            onClick={onSecondary ?? onClose}
            className="flex-1 min-w-0 h-[44px] px-[18px] py-[11px] bg-surface border border-border rounded-input font-semibold text-label text-text hover:bg-brand-50 hover:text-brand-600 transition-colors"
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            onClick={onPrimary}
            className="flex-1 min-w-0 px-[12px] py-[12px] bg-status-overdue-text rounded-input font-semibold text-label text-white hover:opacity-90 transition-opacity"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}