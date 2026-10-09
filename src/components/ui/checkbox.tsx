"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Checkbox, nodes 10:6749 (checked) and 10:6753 (unchecked)
 *   Box: 18×18, 4px radius
 *   Checked: bg-brand-600 + border-brand-600 + white check icon
 *   Unchecked: bg-surface + border-border
 */

import { Check } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export interface CheckboxProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
}

export function Checkbox({
  checked,
  defaultChecked,
  onChange,
  label = "I will let my friend know they may receive reminders.",
  className = "",
  ...rest
}: CheckboxProps) {
  const isControlled = checked !== undefined;
  const on = isControlled ? !!checked : !!defaultChecked;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      data-state={on ? "checked" : "unchecked"}
      onClick={() => onChange?.(!on)}
      className={[
        "flex items-start gap-[10px] text-left",
        className,
      ].join(" ")}
      {...rest}
    >
      <span
        className={[
          "size-[18px] rounded-[4px] shrink-0 flex items-center justify-center border",
          on
            ? "bg-brand-600 border-brand-600"
            : "bg-surface border-border",
        ].join(" ")}
        aria-hidden
      >
        {on ? <Check size={13} className="text-white" strokeWidth={3} /> : null}
      </span>
      <span className="font-normal text-helper text-muted leading-[1.5]">
        {label}
      </span>
    </button>
  );
}