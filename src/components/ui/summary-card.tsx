"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Summary card, nodes 10:8282 Total Lent / 10:8283 Total Received /
 * 10:8284 Pending / 10:8285 Overdue
 *   16px radius, 20px padding, 1px border
 *   Overdue uses tinted bg + overdue border
 *   Icon: 16px square at top-right (hand-coins/circle-check/clock/circle-alert)
 *
 * Extended in Phase 10 with two extra types used on the Reports page
 * (Outstanding + On-time rate) — same visual, different icon.
 *
 * i18n: `type` is the already-localized label shown as the card title.
 * `variant` (optional) selects the icon — defaults to a generic circle
 * for fully-localized strings.
 */

import {
  HandCoins,
  CircleCheck,
  Clock,
  CircleAlert,
  Wallet,
  TrendingUp,
} from "lucide-react";

export type SummaryCardVariant =
  | "Total Lent"
  | "Total Received"
  | "Pending"
  | "Overdue"
  | "Outstanding"
  | "On-time rate";

/** Back-compat alias: previous callers passed the English literal as `type`.
 *  The prop is now widened to `string` so localized values work, but the
 *  name is kept for existing import sites. */
export type SummaryCardType = string;

export interface SummaryCardProps {
  /** Already-translated label, rendered as the card title. The
   *  component is i18n-agnostic — call sites use `useT()` to localize. */
  label: string;
  /** Localized title shown on the card. Falls back to `label`. */
  type?: string;
  /** Optional explicit icon variant. Defaults are matched by the
   *  English `type` literal; if you pass a localized `type`, also
   *  pass `variant` so the right icon renders. */
  variant?: SummaryCardVariant;
  amount: string;
  caption: string;
  className?: string;
}

function Icon({ variant }: { variant: SummaryCardVariant }) {
  if (variant === "Total Lent") return <HandCoins size={16} className="text-muted" />;
  if (variant === "Total Received")
    return <CircleCheck size={16} className="text-muted" />;
  if (variant === "Pending") return <Clock size={16} className="text-muted" />;
  if (variant === "Outstanding") return <Wallet size={16} className="text-muted" />;
  if (variant === "On-time rate")
    return <TrendingUp size={16} className="text-muted" />;
  return <CircleAlert size={16} className="text-status-overdue-text" />;
}

function detectVariant(type: string | undefined): SummaryCardVariant | undefined {
  if (!type) return undefined;
  const known: SummaryCardVariant[] = [
    "Total Lent",
    "Total Received",
    "Pending",
    "Overdue",
    "Outstanding",
    "On-time rate",
  ];
  return known.find((v) => v === type);
}

export function SummaryCard({
  label,
  type,
  variant,
  amount,
  caption,
  className = "",
}: SummaryCardProps) {
  const resolvedType = type ?? label;
  const isOverdue = resolvedType === "Overdue" || variant === "Overdue";
  const resolvedVariant: SummaryCardVariant =
    variant ?? detectVariant(resolvedType) ?? "Overdue";
  return (
    <div
      data-node-id={`10:8282-${resolvedVariant}`}
      className={[
        "flex min-w-0 flex-col items-start gap-1 overflow-clip rounded-card border p-5",
        isOverdue
          ? "border-status-overdue-border bg-status-overdue-bg"
          : "border-border bg-surface",
        className,
      ].join(" ")}
    >
      <p className="font-normal text-helper text-muted">{label}</p>
      <p className="tabular font-semibold text-summary text-text">{amount}</p>
      <p className="font-normal text-helper text-muted">{caption}</p>
      <span className="ml-auto -mt-6 self-end" aria-hidden>
        <Icon variant={resolvedVariant} />
      </span>
    </div>
  );
}
