"use client";

/**
 * Plain textarea. Visually mirrors Input (label + helper line + 12px radius,
 * 1px border) so it slots into the form rhythm. Not in the Figma library
 * directly — kept here for form usage.
 */

import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, helperText, className = "", id, rows = 4, ...rest },
    ref
  ) {
    const reactId = useId();
    const inputId = id ?? reactId;
    return (
      <div className={["flex flex-col gap-2 w-full", className].join(" ")}>
        <label
          htmlFor={inputId}
          className="font-medium text-label text-text"
        >
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className="w-full px-[14px] py-[12px] rounded-input border border-border bg-surface font-normal text-body text-text placeholder:text-placeholder outline-none focus:border-brand-600 focus:border-2 focus:shadow-focus resize-y"
          {...rest}
        />
        {helperText ? (
          <p className="font-normal text-helper text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);