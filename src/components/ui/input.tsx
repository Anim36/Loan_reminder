"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Input section, nodes 10:6651 Default / 10:6658 Focus / 10:6665 Error / 10:6672 Disabled
 *
 * Prefix slot supports "+880" and "৳" out of the box. Pass `errorMessage`
 * to display the inline error copy below the input.
 */

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

type State = "default" | "focus" | "error" | "disabled";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  prefix?: ReactNode;
  state?: State;
  errorMessage?: string;
  helperText?: string;
}

const inputBase =
  "w-full h-[48px] px-[14px] flex items-center gap-[10px] rounded-input border bg-surface overflow-hidden font-normal text-body";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    prefix,
    state = "default",
    errorMessage,
    helperText,
    className = "",
    disabled,
    id,
    ...rest
  },
  ref
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const isDisabled = state === "disabled" || disabled;
  const isError = state === "error";
  const isFocus = state === "focus";

  const borderClasses = isError
    ? "border border-status-overdue-text"
    : isFocus
      ? "border-2 border-brand-600 shadow-focus"
      : "border border-border";

  const helper = isError
    ? errorMessage ?? "Enter a valid phone number"
    : helperText ?? "For polite SMS reminders.";

  const helperColor = isError
    ? "text-status-overdue-text"
    : "text-muted";

  return (
    <div className={["flex flex-col gap-2 w-full", className].join(" ")}>
      <label
        htmlFor={inputId}
        className="font-medium text-label text-text"
      >
        {label}
      </label>
      <div
        className={[
          inputBase,
          borderClasses,
          isDisabled ? "bg-disabled-bg" : "",
        ].join(" ")}
      >
        {prefix ? (
          <span className="tabular shrink-0 font-normal text-body text-muted whitespace-nowrap">
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          disabled={isDisabled}
          placeholder="1712 345678"
          className={[
            "tabular flex-1 min-w-0 bg-transparent outline-none font-normal text-body",
            isDisabled ? "text-disabled-text placeholder:text-disabled-text" : "text-text placeholder:text-placeholder",
          ].join(" ")}
          {...rest}
        />
      </div>
      <p className={["font-normal text-helper", helperColor].join(" ")}>
        {helper}
      </p>
    </div>
  );
});

export type { State as InputState };