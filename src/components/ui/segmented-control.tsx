"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Segmented control, nodes 10:8271 Friendly / 10:8272 Neutral / 10:8273 Firm
 *   Track: bg-neutral-50 + 4px gap + 4px padding + rounded-input (12px)
 *   Selected pill: bg-surface + shadow-card + semibold text-brand-600 (DM Sans)
 *   Unselected: transparent + regular text-muted (DM Sans)
 *
 * i18n: the displayed label is taken from `labelFor(tone)` so callers
 * can pass a localized label map; the internal value stays as the
 * English `Tone` literal.
 */

export type Tone = "Friendly" | "Neutral" | "Firm";

export interface SegmentedControlProps {
  tone: Tone;
  className?: string;
  /** Optional click handler. When omitted, the control is read-only
   *  (mirrors the Figma design with no interactivity). */
  onChange?: (tone: Tone) => void;
  /** Optional map of localized labels. Defaults to the English
   *  `Tone` literal when omitted. */
  labels?: Partial<Record<Tone, string>>;
}

const TONES: Tone[] = ["Friendly", "Neutral", "Firm"];

export function SegmentedControl({
  tone,
  onChange,
  labels,
  className = "",
}: SegmentedControlProps) {
  const interactive = !!onChange;
  return (
    <div
      role={interactive ? "radiogroup" : undefined}
      className={[
        "flex items-stretch gap-[4px] p-[4px] rounded-input bg-neutral-50 w-full max-w-md",
        className,
      ].join(" ")}
      data-tone={tone}
    >
      {TONES.map((t) => {
        const active = t === tone;
        const label = labels?.[t] ?? t;
        const base =
          "flex-1 min-w-0 px-[8px] py-[9px] rounded-[9px] text-center whitespace-nowrap transition-colors";
        const state = active
          ? "bg-surface shadow-card font-semibold text-helper text-brand-600"
          : "bg-transparent font-normal text-helper text-muted";
        if (interactive) {
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              data-tone={t}
              onClick={() => onChange?.(t)}
              className={[base, state, "hover:text-text"].join(" ")}
            >
              {label}
            </button>
          );
        }
        return (
          <div
            key={t}
            role="radio"
            aria-checked={active}
            className={[base, state].join(" ")}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
