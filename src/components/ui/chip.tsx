"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Chip, nodes 10:8268 (Selected) and 10:8269 (Unselected)
 *   Pill: 100px radius, 12px horizontal / 8px vertical padding
 *   Selected: bg-brand-50 + border #bcd9cb + semibold text-brand-600 (DM Sans)
 *   Unselected: bg-surface + border-border + regular text-muted (DM Sans)
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  selected?: boolean;
  children: ReactNode;
}

export function Chip({
  selected = false,
  children,
  className = "",
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      data-state={selected ? "selected" : "unselected"}
      aria-pressed={selected}
      className={[
        "inline-flex items-center px-[12px] py-[8px] rounded-pill border whitespace-nowrap",
        selected
          ? "bg-brand-50 border-chip-selected-border font-semibold text-badge text-brand-600"
          : "bg-surface border-border font-normal text-helper text-muted",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}