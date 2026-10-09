"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Empty state, nodes 10:8313 Loans / 10:8314 Reminder history
 *   Loans: 64px padding all around, 104×88 brand-50 bubble with hand-coins
 *     + sparkle, 24px heading, muted body, primary "Add Loan" CTA
 *   Reminder history: 64px horizontal / 32px vertical padding, message-circle
 *     icon, 18px heading, muted body, no CTA
 */

import { HandCoins, MessageCircle, Sparkles, Plus } from "lucide-react";

export type EmptyStateType = "Loans" | "Reminder history";

export interface EmptyStateProps {
  type?: EmptyStateType;
  className?: string;
  onAddLoan?: () => void;
}

export function EmptyState({
  type = "Loans",
  className = "",
  onAddLoan,
}: EmptyStateProps) {
  const isLoans = type === "Loans";

  return (
    <div
      className={[
        "flex flex-col items-center gap-4",
        isLoans ? "p-8 sm:p-16 w-full max-w-[600px]" : "px-8 sm:px-16 py-8 w-full max-w-[600px]",
        className,
      ].join(" ")}
      data-type={type}
    >
      <div className="relative w-[104px] h-[88px] bg-brand-50 rounded-bubble flex items-center justify-center overflow-hidden shrink-0">
        <div className="size-12 flex items-center justify-center text-brand-600">
          {isLoans ? <HandCoins size={48} /> : <MessageCircle size={48} />}
        </div>
        <div className="absolute left-[80px] top-0 size-6 rounded-pill bg-bg flex items-center justify-center">
          <Sparkles size={16} className="text-brand-600" />
        </div>
      </div>
      <p
        className={[
          "w-full font-medium text-text text-center",
          isLoans ? "text-modal-heading" : "text-card-heading",
        ].join(" ")}
      >
        {isLoans ? "No loans yet" : "No reminders sent yet"}
      </p>
      <p className="w-full font-normal text-label text-muted text-center">
        {isLoans
          ? "Add your first loan and we’ll handle the reminders"
          : "Your sent reminders will appear here, along with their delivery status."}
      </p>
      {isLoans ? (
        <button
          type="button"
          onClick={onAddLoan}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-[18px] py-[11px] bg-brand-600 text-white border border-transparent rounded-input font-semibold text-label hover:bg-[#176348] transition-colors"
        >
          <Plus size={18} />
          Add Loan
        </button>
      ) : null}
    </div>
  );
}