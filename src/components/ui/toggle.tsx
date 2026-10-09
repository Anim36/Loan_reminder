"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Toggle, nodes 10:6709 (on) and 10:6712 (off)
 *   Track: 40×24, 3px padding, 100px radius
 *   Thumb: 18×18, white, 100px radius
 */

import type { ButtonHTMLAttributes } from "react";

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type"> {
  /** Controlled on/off state. */
  checked?: boolean;
  /** Uncontrolled initial state. */
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function Toggle({
  checked,
  defaultChecked,
  onChange,
  className = "",
  disabled,
  ...rest
}: ToggleProps) {
  // Support both controlled and uncontrolled usage.
  const isControlled = checked !== undefined;
  const internal = (defaultChecked ?? false) as boolean;
  const on = isControlled ? !!checked : internal;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      data-state={on ? "on" : "off"}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={[
        "h-6 w-10 p-[3px] rounded-pill flex items-center overflow-hidden transition-colors",
        on ? "bg-brand-600 justify-end" : "bg-switch-off justify-start",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
      {...rest}
    >
      <span className="size-[18px] rounded-pill bg-surface shadow-card" />
    </button>
  );
}