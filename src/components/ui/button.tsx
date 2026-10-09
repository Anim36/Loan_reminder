"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Buttons section, nodes 10:8240 – 10:8255
 *   Style = Primary | Secondary | Ghost | Destructive
 *   State = Default | Hover | Focus | Disabled
 *
 * Focus note: Figma renders focus as `border-3 border-brand-600` plus a
 * 3px brand-ring shadow. Because the focus border is *3px* (not 1px), the
 * button grows 4px wider in the focus column of the Figma grid (301 → 305).
 * We mirror that by applying a 3px brand border only when focused, so the
 * preview grid lines up with the design grid pixel-for-pixel.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Style = "primary" | "secondary" | "ghost" | "destructive";
type State = "default" | "hover" | "focus" | "disabled";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: Style;
  state?: State;
  icon?: ReactNode;
  children: ReactNode;
}

// Base layout — 44px min-height, 12px radius, 13px semibold label (DM Sans).
const base =
  "inline-flex items-center justify-center gap-2 min-h-[44px] rounded-input font-semibold text-label whitespace-nowrap transition-colors";

// Default border thickness — 1px on every side, themed per style.
const basePadding = "px-[18px] py-[11px] border";

// Focus grows the border from 1px → 3px and shrinks the inner padding so
// the visible size stays consistent (Figma grows the *outer* box by 4px).
const focusPadding =
  "px-[16px] py-[9px] border-[3px] shadow-[0px_0px_0px_3px_rgba(31,122,92,0.14)]";

const styleClasses: Record<Style, string> = {
  // Primary: solid brand fill, white label.
  primary:
    "bg-brand-600 text-white border-transparent hover:bg-[#176348]",
  // Secondary: white surface, hairline border, dark label.
  secondary:
    "bg-surface text-text border-border hover:bg-brand-50 hover:text-brand-600",
  // Ghost: transparent, dark label, brand-50 on hover.
  ghost:
    "bg-transparent text-text border-transparent hover:bg-brand-50 hover:text-brand-600",
  // Destructive: transparent, overdue-red label, light red on hover.
  destructive:
    "bg-transparent text-status-overdue-text border-transparent hover:bg-status-overdue-bg",
};

// Disabled palette is shared by every style — surface-tinted bg + disabled text.
const disabledClass =
  "bg-disabled-bg text-disabled-text border-transparent cursor-not-allowed";

export function Button({
  variant = "primary",
  state = "default",
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = state === "disabled" || disabled;
  const isFocused = state === "focus";
  return (
    <button
      type="button"
      className={[
        base,
        isFocused ? focusPadding : basePadding,
        isDisabled ? disabledClass : styleClasses[variant],
        isFocused ? "border-brand-600" : "",
        isDisabled ? "" : "cursor-pointer",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={isDisabled}
      data-state={state}
      {...rest}
    >
      {icon ? <span className="shrink-0 size-[18px]">{icon}</span> : null}
      {children}
    </button>
  );
}

export type { Style as ButtonVariant, State as ButtonState };