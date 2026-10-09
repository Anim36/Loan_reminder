"use client";

// Loan details page.
// Figma frames: Loan details (10:5531 / 10:5672), Loan details delete
// modal (10:5805 / 10:5830), Loan details empty history (10:5855 /
// 10:5878).
//
// Sections (top to bottom on desktop, single-column on mobile):
//   1. Header  — back chevron + status badge
//   2. Summary card — amount, due date, given date, progress (when partial)
//   3. Action buttons — Record payment (primary), Mark fully paid,
//      Reschedule, Send reminder now, Edit, Delete
//   4. Two-column grid on desktop: Notes | Reminder history
//   5. Payment history card (only shown when there are payments)
//   6. Due date changes card (only shown when rescheduleHistory has rows)
//   7. Timeline of events (loan given, payment recorded, reschedule,
//      reminders, paid)
//
// SSR-safe data: the loan is fetched once on mount, then re-fetched on
// `loans:change` and `storage` events. The fetch is *not* in a
// `getSnapshot` (per the no-infinite-loop rule). All derived values
// (amountPaid, remaining, status) are recomputed on the client against
// a stable `useToday()`.

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CircleCheck,
  Clock,
  HandCoins,
  Mail,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { use, useMemo, useState } from "react";
import {
  amountPaid as sumPayments,
  remainingAmount,
} from "@/services/loanService";
import {
  useAddPaymentMutation,
  useDeleteLoanMutation,
  useDeletePaymentMutation,
  useLoanQuery,
  useMarkFullyPaidMutation,
  useRescheduleLoanMutation,
  useSendReminderMutation,
} from "@/services/useQueries";
import { ApiError } from "@/lib/api-client";
import {
  Avatar,
  Button,
  Chip,
  DatePicker,
  Modal,
  Textarea,
  TimelineItem,
  useToast,
  Dialog,
  type LoanStatus,
} from "@/components/ui";
import {
  daysBetween,
  formatDate,
  formatMoney,
} from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { useToday } from "@/lib/use-today";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { Loan, PaymentMethod } from "@/types";

const METHOD_OPTIONS: PaymentMethod[] = [
  "Cash",
  "bKash",
  "Nagad",
  "Bank",
  "Other",
];

/* ----------------------------------------------------------------
 * Page (server entry) — Next 16 unwraps params via `use()`.
 * ---------------------------------------------------------------- */

export default function LoanDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <LoanDetails id={id} />;
}

/* ----------------------------------------------------------------
 * Loading skeleton — used while the first fetch is in flight.
 * ---------------------------------------------------------------- */

function LoanDetailsSkeleton() {
  return (
    <section className="flex w-full flex-col gap-6 p-6">
      <div className="h-6 w-32 animate-pulse rounded-input bg-brand-50" />
      <div className="h-32 w-full animate-pulse rounded-card bg-brand-50" />
      <div className="h-64 w-full animate-pulse rounded-card bg-brand-50" />
    </section>
  );
}

/* ----------------------------------------------------------------
 * LoanDetails — the live, data-aware component.
 * ---------------------------------------------------------------- */

function LoanDetails({ id }: { id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { t, lang } = useT();
  const today = useToday();
  const numMode = "latin";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(
    null,
  );
  // `openCount` increments every time a modal opens. The parent passes
  // it as a `key` to the modals, so they remount with fresh state on
  // each open — no useEffect reset is needed inside the modal bodies.
  const [paymentOpenCount, setPaymentOpenCount] = useState(0);
  const [rescheduleOpenCount, setRescheduleOpenCount] = useState(0);
  const [deletePaymentCount, setDeletePaymentCount] = useState(0);

  // React Query owns the cache; the page just renders from it.
  const loanQ = useLoanQuery(id);
  const addPaymentM = useAddPaymentMutation();
  const deletePaymentM = useDeletePaymentMutation();
  const markPaidM = useMarkFullyPaidMutation();
  const rescheduleM = useRescheduleLoanMutation();
  const deleteLoanM = useDeleteLoanMutation();
  const sendReminderM = useSendReminderMutation();

  const loan = loanQ.data;
  const isMissing = loanQ.isError && loanQ.error instanceof ApiError && loanQ.error.status === 404;
  if (isMissing) {
    return (
      <NotFound
        onBack={() => router.push("/loans")}
        onAddLoan={() => router.push("/loans/new")}
      />
    );
  }
  if (!loan) {
    return <LoanDetailsSkeleton />;
  }

  const due = new Date(loan.dueDate);
  const daysToDue = daysBetween(today, due);
  const overdueBy = daysToDue < 0 ? -daysToDue : 0;
  const remainingDays = daysToDue > 0 ? daysToDue : 0;
  const paid = sumPayments(loan);
  const balance = remainingAmount(loan);
  const progress = loan.amount > 0 ? Math.min(1, paid / loan.amount) : 0;
  const isPaid = balance === 0;
  const isPartial = !isPaid && paid > 0;

  // ---- Event handlers -------------------------------------------

  async function handleRecordPayment(args: {
    amount: number;
    date: string;
    method: PaymentMethod;
    note?: string;
  }) {
    try {
      await addPaymentM.mutateAsync({ loanId: id, ...args });
      show(t["loanDetails.toast.paymentRecorded"]);
      setPaymentOpen(false);
    } catch (err) {
      show(t["loanDetails.toast.paymentError"]);
      throw err;
    }
  }

  async function handleDeletePayment(paymentId: string) {
    try {
      await deletePaymentM.mutateAsync({ loanId: id, paymentId });
      show(t["loanDetails.toast.paymentDeleted"]);
      setDeletingPaymentId(null);
    } catch {
      show(t["loanDetails.toast.paymentError"]);
    }
  }

  async function handleMarkFullyPaid() {
    try {
      await markPaidM.mutateAsync(id);
      show(t["loanDetails.toast.markedPaid"]);
    } catch {
      show(t["loanDetails.toast.paymentError"]);
    }
  }

  async function handleReschedule(args: {
    to: string;
    reason?: string;
  }) {
    try {
      await rescheduleM.mutateAsync({ id, ...args });
      show(t["loanDetails.toast.dueDateUpdated"]);
      setRescheduleOpen(false);
    } catch {
      show(t["loanDetails.toast.paymentError"]);
    }
  }

  async function handleDeleteLoan() {
    try {
      await deleteLoanM.mutateAsync(id);
      show(t["loanDetails.toast.loanDeleted"]);
      router.push("/loans");
    } catch {
      show(t["loanDetails.toast.paymentError"]);
    }
  }

  async function handleSendReminder() {
    try {
      const res = await sendReminderM.mutateAsync(id);
      show(
        res.delivered
          ? t["loanDetails.toast.reminderSent"]
          : t["loanDetails.toast.reminderQueued"],
      );
      setReminderOpen(false);
    } catch {
      show(t["loanDetails.toast.paymentError"]);
    }
  }

  return (
    <section className="flex w-full flex-col gap-6 p-6">
      {/* Back link — kept on its own row so it never wraps the
          page header. */}
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/loans"
          className="inline-flex items-center gap-2 text-helper font-medium text-muted hover:text-text"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t["loanDetails.backToLoans"]}
        </Link>
        <StatusChip status={loan.status} />
      </header>

      <PageHeader
        title={loan.friend.name}
        subtitle={
          loan.note
            ? loan.note
            : `${t["loanDetails.dueDate"]}: ${formatDate(loan.dueDate, { lang, numeralMode: numMode })}`
        }
      />

      {/* Summary */}
      <SummaryCard
        loan={loan}
        paid={paid}
        balance={balance}
        progress={progress}
        isPaid={isPaid}
        isPartial={isPartial}
        overdueBy={overdueBy}
        daysToDue={remainingDays}
        t={t}
        lang={lang}
      />

      {/* Actions */}
      <ActionsBar
        isPaid={isPaid}
        onRecordPayment={() => {
          setPaymentOpenCount((n) => n + 1);
          setPaymentOpen(true);
        }}
        onMarkFullyPaid={handleMarkFullyPaid}
        onReschedule={() => {
          setRescheduleOpenCount((n) => n + 1);
          setRescheduleOpen(true);
        }}
        onSendReminder={() => setReminderOpen(true)}
        onEdit={() => router.push(`/loans/${loan.id}/edit`)}
        onDelete={() => setDeleteOpen(true)}
        t={t}
      />

      {/* Two columns: notes + reminder history */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PrivateNotesCard note={loan.note} t={t} />
        <ReminderHistoryCard loan={loan} t={t} lang={lang} />
      </div>

      {/* Payment history */}
      <PaymentHistoryCard
        loan={loan}
        onAdd={() => {
          setPaymentOpenCount((n) => n + 1);
          setPaymentOpen(true);
        }}
        onDelete={(id) => {
          setDeletePaymentCount((n) => n + 1);
          setDeletingPaymentId(id);
        }}
        t={t}
        lang={lang}
      />

      {/* Reschedule history */}
      {loan.rescheduleHistory.length > 0 ? (
        <RescheduleHistoryCard loan={loan} t={t} lang={lang} />
      ) : null}

      {/* Timeline */}
      <Timeline loan={loan} t={t} lang={lang} />

      {/* Modals — keyed by an open counter so each remount starts from a
          fresh state without needing a setState-in-effect reset. */}
      <PaymentModal
        key={`pay-${paymentOpenCount}`}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        loan={loan}
        onSubmit={handleRecordPayment}
        t={t}
        lang={lang}
      />
      <RescheduleModal
        key={`res-${rescheduleOpenCount}`}
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        loan={loan}
        today={today}
        onSubmit={handleReschedule}
        t={t}
        lang={lang}
      />
      <ReminderConfirmModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        friendName={loan.friend.name}
        onConfirm={handleSendReminder}
        t={t}
      />

      {/* Delete payment confirm */}
      <Modal
        key={`del-pay-${deletePaymentCount}`}
        open={deletingPaymentId !== null}
        onClose={() => setDeletingPaymentId(null)}
        title={t["loanDetails.deletePaymentTitle"]}
        description={
          deletingPaymentId
            ? t["loanDetails.deletePaymentBody"](
                formatMoney(
                  loan.payments.find((p) => p.id === deletingPaymentId)?.amount ??
                    0,
                ),
              )
            : ""
        }
        primaryLabel={t["common.delete"]}
        secondaryLabel={t["loanDetails.keepLoan"]}
        onPrimary={() => handleDeletePayment(deletingPaymentId!)}
        onSecondary={() => setDeletingPaymentId(null)}
      />

      {/* Delete loan confirm */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t["loanDetails.deleteTitle"](loan.friend.name)}
        description={t["loanDetails.deleteBody"](
          loan.friend.name,
          formatMoney(loan.amount),
        )}
        primaryLabel={t["common.delete"]}
        secondaryLabel={t["loanDetails.keepLoan"]}
        onPrimary={handleDeleteLoan}
        onSecondary={() => setDeleteOpen(false)}
      />
    </section>
  );
}

/* ----------------------------------------------------------------
 * Sub-components
 * ---------------------------------------------------------------- */

function StatusChip({ status }: { status: LoanStatus }) {
  const { t } = useT();
  const map: Record<LoanStatus, string> = {
    Paid: "bg-status-paid-bg text-status-paid-text",
    Pending: "bg-status-pending-bg text-status-pending-text",
    Overdue: "bg-status-overdue-bg text-status-overdue-text",
  };
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-badge font-semibold",
        map[status],
      ].join(" ")}
    >
      <span className="size-1.5 rounded-pill bg-current" aria-hidden />
      {statusLabel(status, t)}
    </span>
  );
}

function statusLabel(
  status: LoanStatus,
  t: ReturnType<typeof useT>["t"],
): string {
  if (status === "Paid") return t["ui.reports.status.paid"];
  if (status === "Pending") return t["ui.reports.status.pending"];
  return t["ui.reports.status.overdue"];
}

function SummaryCard({
  loan,
  paid,
  balance,
  progress,
  isPaid,
  isPartial,
  overdueBy,
  daysToDue,
  t,
  lang,
}: {
  loan: Loan;
  paid: number;
  balance: number;
  progress: number;
  isPaid: boolean;
  isPartial: boolean;
  overdueBy: number;
  daysToDue: number;
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
}) {
  const numMode = "latin";
  return (
    <div
      data-node-id="10:5533"
      className="flex w-full flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex items-center gap-3">
        <Avatar name={loan.friend.name} />
        <div className="flex flex-col gap-0.5">
          <p className="text-card-heading font-semibold text-text">
            {loan.friend.name}
          </p>
          <p className="text-helper font-normal text-muted">
            {loan.friend.phone ? `+880 ${loan.friend.phone}` : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <p className="tabular text-price font-semibold text-text">
          {formatMoney(loan.amount, numMode)}
        </p>
        {isPartial ? (
          <p className="tabular text-helper font-normal text-muted">
            {t["ui.loansList.partial"](
              formatMoney(paid, numMode),
              formatMoney(loan.amount, numMode),
            )}
          </p>
        ) : null}
      </div>

      {/* Progress bar (only meaningful when partial) */}
      {isPartial ? (
        <div className="flex flex-col gap-1.5">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label={t["loanDetails.paid"](formatMoney(paid, numMode))}
            className="h-2 w-full overflow-hidden rounded-pill bg-brand-50"
          >
            <div
              className="h-full rounded-pill bg-brand-600"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-helper font-normal text-muted">
            {t["loanDetails.remaining"](formatMoney(balance, numMode))}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1 text-body font-normal text-text">
        <div className="flex flex-wrap items-center gap-2 text-muted">
          <Calendar className="size-4" aria-hidden />
          <span className="text-helper font-medium text-muted">
            {t["loanDetails.dueDate"]}
          </span>
          <span className="text-body font-normal text-text">
            {formatDate(loan.dueDate, { lang, numeralMode: numMode })}
          </span>
          {loan.rescheduleHistory.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-brand-50 px-2 py-0.5 text-eyebrow font-semibold text-brand-600">
              <Clock className="size-3" aria-hidden />
              {t["ui.loansList.rescheduled"]}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-muted">
          <HandCoins className="size-4" aria-hidden />
          <span className="text-helper font-medium text-muted">
            {t["loanDetails.givenDate"]}
          </span>
          <span className="text-body font-normal text-text">
            {formatDate(loan.dateGiven, { lang, numeralMode: numMode })}
          </span>
        </div>
        {isPaid ? (
          <p className="text-helper font-normal text-status-paid-text">
            {t["loanDetails.timelinePaid"](
              formatDate(
                loan.paidAt?.slice(0, 10) ?? loan.dueDate,
                { lang, numeralMode: numMode },
              ),
            )}
          </p>
        ) : overdueBy > 0 ? (
          <p className="text-helper font-normal text-status-overdue-text">
            {t["ui.loanDetails.overdueBy"](overdueBy)}
          </p>
        ) : (
          <p className="text-helper font-normal text-muted">
            {t["ui.loanDetails.dueIn"](daysToDue)}
          </p>
        )}
      </div>
    </div>
  );
}

function ActionsBar({
  isPaid,
  onRecordPayment,
  onMarkFullyPaid,
  onReschedule,
  onSendReminder,
  onEdit,
  onDelete,
  t,
}: {
  isPaid: boolean;
  onRecordPayment: () => void;
  onMarkFullyPaid: () => void;
  onReschedule: () => void;
  onSendReminder: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="primary"
        onClick={onRecordPayment}
        disabled={isPaid}
        icon={<HandCoins className="size-[18px]" aria-hidden />}
      >
        {t["loanDetails.recordPayment"]}
      </Button>
      <Button
        variant="secondary"
        onClick={onMarkFullyPaid}
        disabled={isPaid}
        icon={<CircleCheck className="size-[18px]" aria-hidden />}
      >
        {t["loanDetails.markFullyPaid"]}
      </Button>
      <Button
        variant="secondary"
        onClick={onReschedule}
        disabled={isPaid}
        icon={<Calendar className="size-[18px]" aria-hidden />}
      >
        {t["loanDetails.reschedule"]}
      </Button>
      <Button
        variant="secondary"
        onClick={onSendReminder}
        icon={<Send className="size-[18px]" aria-hidden />}
      >
        {t["loanDetails.sendReminder"]}
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onEdit}
          icon={<Pencil className="size-[18px]" aria-hidden />}
        >
          {t["loanDetails.edit"]}
        </Button>
        <Button
          variant="ghost"
          onClick={onDelete}
          icon={<Trash2 className="size-[18px]" aria-hidden />}
        >
          {t["loanDetails.delete"]}
        </Button>
      </div>
    </div>
  );
}

function PrivateNotesCard({
  note,
  t,
}: {
  note?: string;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card">
      <p className="text-helper font-medium text-muted">
        {t["loanDetails.privateNotes"]}
      </p>
      <p className="text-body font-normal text-text">
        {note && note.trim().length > 0 ? note : "—"}
      </p>
    </div>
  );
}

function ReminderHistoryCard({
  loan,
  t,
  lang,
}: {
  loan: Loan;
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
}) {
  const items = useMemo(() => {
    if (loan.reminders.sms || loan.reminders.email) {
      return [
        {
          id: `${loan.id}-r-sms`,
          channel: "SMS" as const,
          sentAt: `${loan.dueDate}T10:00:00.000Z`,
          tone: loan.tone,
        },
        {
          id: `${loan.id}-r-email`,
          channel: "Email" as const,
          sentAt: `${loan.dueDate}T10:00:00.000Z`,
          tone: loan.tone,
        },
      ];
    }
    return [];
  }, [loan]);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
      <p className="text-helper font-medium text-muted">
        {t["loanDetails.reminderScheduled"]}
      </p>
      {items.length === 0 ? (
        <p className="text-body font-normal text-placeholder">—</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-input border border-border bg-bg px-3 py-2"
            >
              {it.channel === "SMS" ? (
                <MessageSquare className="size-4 text-muted" aria-hidden />
              ) : (
                <Mail className="size-4 text-muted" aria-hidden />
              )}
              <div className="flex-1 text-body font-normal text-text">
                {it.channel === "SMS" ? t["ui.method.sms"] : t["ui.method.email"]} · {t[("ui.method.tone." + it.tone.toLowerCase()) as "ui.method.tone.friendly" | "ui.method.tone.neutral" | "ui.method.tone.firm"]}
              </div>
              <p className="text-helper font-normal text-muted">
                {formatDate(it.sentAt.slice(0, 10), { lang })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PaymentHistoryCard({
  loan,
  onAdd,
  onDelete,
  t,
  lang,
}: {
  loan: Loan;
  onAdd: () => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
}) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-helper font-medium text-muted">
          {t["loanDetails.paymentHistory"]}
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="text-helper font-semibold text-brand-600 hover:underline"
        >
          + {t["loanDetails.recordPayment"]}
        </button>
      </div>
      {loan.payments.length === 0 ? (
        <p className="rounded-input border border-dashed border-border bg-bg p-4 text-center text-body font-normal text-muted">
          {t["loanDetails.paymentHistoryEmpty"]}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {loan.payments
            .slice()
            .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
            .map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-input border border-border bg-bg px-4 py-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand-600">
                  <HandCoins className="size-4" aria-hidden />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-body font-medium text-text">
                    {formatMoney(p.amount)} · {methodLabel(p.method, t)}
                  </p>
                  <p className="text-helper font-normal text-muted">
                    {formatDate(p.date, { lang, numeralMode: "latin" })}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t["common.delete"]}
                  onClick={() => onDelete(p.id)}
                  className="rounded-pill p-2 text-muted hover:bg-status-overdue-bg hover:text-status-overdue-text"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function RescheduleHistoryCard({
  loan,
  t,
  lang,
}: {
  loan: Loan;
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
}) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
      <p className="text-helper font-medium text-muted">
        {t["loanDetails.rescheduleHistory"]}
      </p>
      <ul className="flex flex-col gap-2">
        {loan.rescheduleHistory
          .slice()
          .sort((a, b) => (a.changedAt < b.changedAt ? 1 : a.changedAt > b.changedAt ? -1 : 0))
          .map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-input border border-border bg-bg px-4 py-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand-600">
                <Clock className="size-4" aria-hidden />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-body font-medium text-text">
                  {t["ui.loanDetails.timelineReschedule"](
                    formatDate(r.from, { lang, numeralMode: "latin" }),
                    formatDate(r.to, { lang, numeralMode: "latin" }),
                  )}
                </p>
                <p className="text-helper font-normal text-muted">
                  {formatDate(r.changedAt.slice(0, 10), {
                    lang,
                    numeralMode: "latin",
                  })}
                  {r.reason ? ` · ${r.reason}` : ""}
                </p>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

function Timeline({
  loan,
  t,
  lang,
}: {
  loan: Loan;
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
}) {
  type Event = {
    state: "Completed" | "Current" | "Upcoming";
    title: string;
    description: string;
  };
  const events: Event[] = [];
  events.push({
    state: "Completed",
    title: t["loanDetails.loanGiven"](
      formatMoney(loan.amount),
      loan.friend.name,
      formatDate(loan.dateGiven, { lang }),
    ),
    description: "",
  });
  for (const p of loan.payments) {
    events.push({
      state: "Completed",
      title: t["loanDetails.timelinePayment"](
        formatMoney(p.amount),
        formatDate(p.date, { lang }),
      ),
      description: p.method,
    });
  }
  for (const r of loan.rescheduleHistory) {
    events.push({
      state: "Completed",
      title: t["loanDetails.timelineReschedule"](
        formatDate(r.from, { lang }),
        formatDate(r.to, { lang }),
      ),
      description: r.reason ?? "",
    });
  }
  if (loan.reminders.sms || loan.reminders.email) {
    events.push({
      state: loan.status === "Paid" ? "Completed" : "Current",
      title: t["loanDetails.reminderScheduled"],
      description: t["ui.timelineReminderDescription"](
        [
          loan.reminders.sms ? t["ui.method.sms"] : "",
          loan.reminders.email ? t["ui.method.email"] : "",
        ].filter(Boolean),
      ),
    });
  }
  if (loan.status === "Paid") {
    events.push({
      state: "Completed",
      title: t["loanDetails.timelinePaid"](
        formatDate(loan.paidAt?.slice(0, 10) ?? loan.dueDate, { lang }),
      ),
      description: "",
    });
  } else {
    events.push({
      state: "Upcoming",
      title: t["loanDetails.timelineUpcoming"](
        formatDate(loan.dueDate, { lang }),
      ),
      description: "",
    });
  }
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
      <p className="text-helper font-medium text-muted">
        {t["loanDetails.timeline"]}
      </p>
      <ol className="flex flex-col gap-3">
        {events.map((e, i) => (
          <li key={i}>
            <TimelineItem
              state={e.state}
              title={e.title}
              description={e.description}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Modals
 * ---------------------------------------------------------------- */

function PaymentModal({
  open,
  onClose,
  loan,
  onSubmit,
  t,
}: {
  open: boolean;
  onClose: () => void;
  loan: Loan;
  onSubmit: (args: {
    amount: number;
    date: string;
    method: PaymentMethod;
    note?: string;
  }) => void;
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
}) {
  const today = useToday();
  const balance = remainingAmount(loan);
  // The parent passes a `key` that changes on each open, so this
  // component remounts with fresh initial state every time. No
  // setState-in-effect reset is needed.
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<Date>(today);
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [note, setNote] = useState<string>("");
  const [touched, setTouched] = useState(false);

  const amountNumber = Number(amount);
  const valid =
    amount.trim().length > 0 &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    amountNumber <= balance &&
    !!date;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow={t["loanDetails.recordPayment"]}
      title={t["payment.title"]}
      description={t["payment.remaining"](formatMoney(balance))}
      primaryLabel={t["payment.save"]}
      secondaryLabel={t["common.cancel"]}
      onPrimary={() => {
        if (!valid) {
          setTouched(true);
          return;
        }
        onSubmit({
          amount: amountNumber,
          date: toIsoDate(date),
          method,
          note: note.trim() || undefined,
        });
      }}
      primaryDisabled={!valid}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="payment-amount"
            className="text-helper font-medium text-text"
          >
            {t["payment.amount"]}
          </label>
          <div className="flex items-center gap-2 rounded-input border border-border bg-surface px-3 focus-within:border-brand-600">
            <span className="text-body font-medium text-muted">৳</span>
            <input
              id="payment-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={() => setTouched(true)}
              className="h-[44px] w-full bg-transparent text-body font-normal text-text outline-none"
            />
          </div>
          {touched && (!amount || amountNumber <= 0) ? (
            <p className="text-helper font-normal text-status-overdue-text">
              {t["validation.amountPositive"]}
            </p>
          ) : touched && amountNumber > balance ? (
            <p className="text-helper font-normal text-status-overdue-text">
              {t["validation.amountExceedsRemaining"](formatMoney(balance))}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-helper font-medium text-text">
            {t["payment.method"]}
          </label>
          <div className="flex flex-wrap gap-2">
            {METHOD_OPTIONS.map((m) => (
              <Chip
                key={m}
                selected={method === m}
                onClick={() => setMethod(m)}
              >
                {methodLabel(m, t)}
              </Chip>
            ))}
          </div>
        </div>

        <DatePicker
          label={t["payment.date"]}
          value={date}
          onChange={(d) => {
            setDate(d);
            setTouched(true);
          }}
        />

        <Textarea
          label={t["payment.note"]}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>
    </Dialog>
  );
}

function RescheduleModal({
  open,
  onClose,
  loan,
  today,
  onSubmit,
  t,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  loan: Loan;
  today: Date;
  onSubmit: (args: { to: string; reason?: string }) => void;
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
}) {
  const tomorrow = addDaysTo(today, 1);
  // The parent passes a `key` that changes on each open, so this
  // component remounts with fresh initial state every time. No
  // setState-in-effect reset is needed.
  const [to, setTo] = useState<Date>(tomorrow);
  const [reason, setReason] = useState<string>("");
  const [notify, setNotify] = useState<boolean>(true);
  const [touched, setTouched] = useState(false);

  const valid = to.getTime() > today.getTime();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow={t["loanDetails.reschedule"]}
      title={t["reschedule.title"]}
      primaryLabel={t["reschedule.save"]}
      secondaryLabel={t["common.cancel"]}
      onPrimary={() => {
        if (!valid) {
          setTouched(true);
          return;
        }
        onSubmit({ to: toIsoDate(to), reason: reason.trim() || undefined });
      }}
      primaryDisabled={!valid}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-helper font-normal text-muted">
          <span>{t["reschedule.currentDue"]}:</span>
          <span className="text-body font-medium text-text">
            {formatDate(loan.dueDate, { lang })}
          </span>
        </div>
        <DatePicker
          label={t["reschedule.newDue"]}
          value={to}
          onChange={(d) => {
            setTo(d);
            setTouched(true);
          }}
        />
        {touched && !valid ? (
          <p className="text-helper font-normal text-status-overdue-text">
            {t["validation.dueFuture"]}
          </p>
        ) : null}
        <Textarea
          label={t["reschedule.reason"]}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder={t["reschedule.reasonPlaceholder"]}
        />
        <label className="flex items-start gap-2 text-body font-normal text-text">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 size-4 accent-[#0e7c5a]"
          />
          <span>{t["reschedule.notifyFriend"]}</span>
        </label>
      </div>
    </Dialog>
  );
}

function ReminderConfirmModal({
  open,
  onClose,
  friendName,
  onConfirm,
  t,
}: {
  open: boolean;
  onClose: () => void;
  friendName: string;
  onConfirm: () => void;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow={t["loanDetails.sendReminder"]}
      title={`${t["loanDetails.sendReminder"]} — ${friendName}`}
      description={t["loanDetails.toast.reminderSent"]}
      primaryLabel={t["loanDetails.sendReminder"]}
      secondaryLabel={t["common.cancel"]}
      onPrimary={onConfirm}
    />
  );
}

/* ----------------------------------------------------------------
 * 404
 * ---------------------------------------------------------------- */

function NotFound({
  onBack,
  onAddLoan,
}: {
  onBack: () => void;
  onAddLoan: () => void;
}) {
  const { t } = useT();
  return (
    <section className="flex w-full flex-col items-center gap-6 p-6">
      <p className="text-h1 font-medium text-text">{t["ui.loanDetails.notFound"]}</p>
      <p className="text-body font-normal text-muted">
        {t["ui.loanDetails.notFoundBody"]}
      </p>
      <div className="flex gap-3">
        <Button onClick={onBack}>{t["loanDetails.backToLoans"]}</Button>
        <Button variant="secondary" onClick={onAddLoan}>
          {t["ui.addANewLoan"]}
        </Button>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDaysTo(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + days);
  return next;
}

function methodLabel(
  m: PaymentMethod,
  t: ReturnType<typeof useT>["t"],
): string {
  const map: Record<PaymentMethod, string> = {
    Cash: t["ui.payment.method.cash"],
    bKash: t["ui.payment.method.bkash"],
    Nagad: t["ui.payment.method.nagad"],
    Bank: t["ui.payment.method.bank"],
    Other: t["ui.payment.method.other"],
  };
  return map[m];
}

