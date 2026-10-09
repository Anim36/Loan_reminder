// Small type-system helpers used everywhere on the logged-in shell.
//
// `CardHeading` — the heading inside a card / panel (Profile, Appearance,
// Payment history, etc.). 18px / semibold, dark text.
//
// `FieldLabel` — the label above form inputs (above an Input,
// Textarea, DatePicker, Select, or Checkbox). 13px / weight 500,
// never heavier than the input text. Replaces the older pattern
// of "label uses text-helper" or "label is bold" which was heavier
// than the value.

import type { HTMLAttributes, ReactNode } from "react";

export function CardHeading({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h2 className={["text-card-heading font-semibold text-text", className ?? ""].join(" ").trim()} {...rest}>
      {children}
    </h2>
  );
}

export function FieldLabel({
  children,
  htmlFor,
  className,
  ...rest
}: HTMLAttributes<HTMLLabelElement> & { htmlFor?: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className={["text-label font-medium text-text", className ?? ""].join(" ").trim()}
      {...rest}
    >
      {children}
    </label>
  );
}
