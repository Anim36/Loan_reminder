"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Date picker, nodes 10:6682 (Default) and 10:6688 (Open)
 *   Default: label + 48px input with calendar icon
 *   Open: same input but border-brand-600 + focus shadow, plus popover with
 *   month/year header (14px semibold), chevron-left/right, weekday
 *   row, day grid (today = brand-600 semibold, selected = brand-600
 *   underlined).
 *
 * The popover's calendar grid is not in the Figma spec (the open frame
 * only shows a sample month). Built per the spec the user described:
 *   month/year header with prev/next, day grid, today highlighted,
 *   selected day in brand-600.
 */

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToday } from "@/lib/use-today";

export interface DatePickerProps {
  label?: string;
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  className?: string;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmt(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DatePicker({
  label = "Repayment due date",
  value,
  onChange,
  placeholder = "Pick a date",
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  // Defer `new Date()` to the client to avoid prerender warnings.
  const [view, setView] = useState<Date | undefined>(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Capture "today" once per mount, never during render. The hook
  // returns a stable Date object — same reference across renders on
  // the same day — so React never sees a "changed" snapshot.
  const today = useToday();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const safeView = view ?? value ?? today;
  const monthStart = startOfMonth(safeView);
  // Figma grid is Monday-first; compute the offset (0 = Monday)
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(
    safeView.getFullYear(),
    safeView.getMonth() + 1,
    0
  ).getDate();

  // Build 6×7 grid
  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(safeView.getFullYear(), safeView.getMonth(), d) });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  return (
    <div ref={wrapRef} className={["relative flex flex-col gap-2", className].join(" ")}>
      <span className="font-medium text-label text-text">{label}</span>

      {/* Input */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "w-full h-[48px] px-[14px] flex items-center gap-[10px] rounded-input border bg-surface text-left",
          open
            ? "border-2 border-brand-600 shadow-focus"
            : "border border-border",
        ].join(" ")}
      >
        <span className="flex-1 min-w-0 font-normal text-body text-text truncate">
          {value ? fmt(value) : <span className="text-placeholder">{placeholder}</span>}
        </span>
        <CalendarDays size={18} className="text-muted shrink-0" />
      </button>

      {/* Popover */}
      {open ? (
        <div className="absolute z-30 top-full mt-2 w-full bg-surface border border-border rounded-input shadow-overlay p-5 flex flex-col gap-4">
          {/* Month header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setView(new Date(safeView.getFullYear(), safeView.getMonth() - 1, 1))
              }
              className="size-[18px] flex items-center justify-center text-muted hover:text-text"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-body text-text whitespace-nowrap">
              {safeView.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setView(new Date(safeView.getFullYear(), safeView.getMonth() + 1, 1))
              }
              className="size-[18px] flex items-center justify-center text-muted hover:text-text"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday row */}
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((w, i) => (
              <span
                key={`${w}-${i}`}
                className="font-normal text-helper text-muted"
              >
                {w}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 text-center">
            {cells.map((cell, i) => {
              if (!cell.date) return <span key={i} className="h-8" />;
              const d = cell.date;
              const isToday = isSameDay(d, today);
              const isSelected = value ? isSameDay(d, value) : false;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange?.(d);
                    setOpen(false);
                  }}
                  className={[
                    "h-8 flex items-center justify-center font-normal text-label",
                    isSelected
                      ? "text-brand-600 font-semibold underline underline-offset-4"
                      : isToday
                        ? "text-brand-600 font-semibold"
                        : "text-text hover:bg-neutral-50 rounded-sm",
                  ].join(" ")}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <p className="font-normal text-badge text-muted">
            Today: {fmt(today)}
            {value ? ` · Selected: ${fmt(value)}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}