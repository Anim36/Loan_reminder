"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Status badge, nodes 10:8278 Paid / 10:8279 Pending / 10:8280 Overdue
 *   Pill 100px, 11px medium (DM Sans), 4px vertical / 10px horizontal padding
 *
 * i18n: by default the English `status` is rendered. Pass `label` to
 *       override the displayed text with a localized string.
 */

export type LoanStatus = "Paid" | "Pending" | "Overdue";

export interface StatusBadgeProps {
  status: LoanStatus;
  /** Optional pre-translated label. Falls back to the English `status`. */
  label?: string;
  className?: string;
}

const styles: Record<LoanStatus, string> = {
  Paid: "bg-status-paid-bg text-status-paid-text",
  Pending: "bg-status-pending-bg text-status-pending-text",
  Overdue: "bg-status-overdue-bg text-status-overdue-text",
};

export function StatusBadge({
  status,
  label,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-[10px] py-[4px] rounded-pill font-medium text-badge whitespace-nowrap",
        styles[status],
        className,
      ].join(" ")}
      data-status={status}
    >
      {label ?? status}
    </span>
  );
}
