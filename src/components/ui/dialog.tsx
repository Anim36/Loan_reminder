"use client";

/**
 * Generic dialog primitive.
 *
 * The existing `Modal` is purpose-built for the destructive "Delete
 * this loan?" confirmation (it hard-codes the trash icon, the
 * overdue-red background, and the secondary / destructive button
 * labels). For everything else (Record payment, Reschedule, future
 * editing dialogs) we need a more flexible surface that:
 *   - hosts arbitrary form content,
 *   - exposes primary + secondary buttons with arbitrary labels,
 *   - is keyboard accessible (focus trap, ESC, focus restore),
 *   - and visually matches `Modal` (card on a scrim).
 *
 * Design tokens: the card uses `bg-surface`, `rounded-card`, and
 * `shadow-overlay` — the same shape as the delete modal. The header
 * slot is optional; pass a `title` and an `eyebrow` for the standard
 * 12px uppercase label.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Optional eyebrow text (uppercase, muted). */
  eyebrow?: string;
  title?: string;
  /** Optional body copy. Use `children` for richer content. */
  description?: string;
  children?: ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  /** Disable the primary button (e.g. while a form is invalid). */
  primaryDisabled?: boolean;
  primaryBusy?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "w-[420px]",
  md: "w-[480px]",
  lg: "w-[560px]",
};

export function Dialog({
  open,
  onClose,
  eyebrow,
  title,
  description,
  children,
  primaryLabel = "Save",
  secondaryLabel = "Cancel",
  onPrimary,
  onSecondary,
  primaryDisabled = false,
  primaryBusy = false,
  size = "md",
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
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
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-scrim"
      />
      <div
        ref={containerRef}
        className={[
          "relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100vw-2rem)] flex-col gap-5 overflow-y-auto rounded-card bg-surface p-6 shadow-overlay md:p-8",
          SIZE_CLASS[size],
        ].join(" ")}
      >
        {eyebrow ? (
          <p className="eyebrow">{eyebrow}</p>
        ) : null}
        {title ? (
          <h2 className="font-semibold text-modal-heading text-text">{title}</h2>
        ) : null}
        {description ? (
          <p className="font-normal text-body text-muted">{description}</p>
        ) : null}
        {children}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
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
            disabled={primaryDisabled || primaryBusy}
            className="flex-1 min-w-0 h-[44px] px-[18px] py-[11px] bg-brand-600 border border-brand-600 rounded-input font-semibold text-label text-white hover:bg-[#176348] transition-colors disabled:bg-disabled-bg disabled:text-disabled-text disabled:border-transparent disabled:cursor-not-allowed"
          >
            {primaryBusy ? "Saving…" : primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
