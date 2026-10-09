"use client";

// Loans list page.
// Figma frames: Loans (10:4167 / 10:4306) and Empty loans (10:4557 /
// 10:4609).
//
// Layout summary:
//   1. Header — title + count + Add loan primary CTA
//   2. Search bar (sticky)
//   3. Status filter chips
//   4. Desktop table | Mobile stacked cards
//
// Data: subscribes to the loans store via `useLoans()`. The
// `loansByStatus` array already has each loan's `status` derived
// against `useToday()`. Status badges read from that.
//
// Per-row copy now also includes the partial-paid progress text and a
// small "Rescheduled" pill when the loan has a reschedule history.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Clock,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useLoans } from "@/services/use-loans";
import {
  amountPaid,
  deleteLoan as deleteLoanSvc,
  markAsPaid,
  remainingAmount,
} from "@/services/loanService";
import {
  Avatar,
  Chip,
  EmptyState,
  Input,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { useToday } from "@/lib/use-today";
import { daysBetween, formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useUserSettings } from "@/services/use-user-settings";
import { PageHeader } from "@/components/layout/page-header";
import type { Loan } from "@/types";

const STATUS_FILTERS = ["All", "Pending", "Overdue", "Paid"] as const;
type Filter = (typeof STATUS_FILTERS)[number];

export default function LoansPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const today = useToday();
  const { settings } = useUserSettings();
  const numeralMode = settings.banglaNumerals ? "bn" : "latin";
  const { loansByStatus, ready } = useLoans();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return loansByStatus
      .filter((l) => {
        if (filter === "All") return true;
        return l.status === filter;
      })
      .filter((l) =>
        q.length === 0 ? true : l.friend.name.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const ka = a.status === "Overdue" ? 0 : a.status === "Pending" ? 1 : 2;
        const kb = b.status === "Overdue" ? 0 : b.status === "Pending" ? 1 : 2;
        if (ka !== kb) return ka - kb;
        return a.dueDate < b.dueDate ? -1 : 1;
      });
  }, [filter, loansByStatus, query]);

  const isEmpty = loansByStatus.length === 0;
  const filteredEmpty = !isEmpty && visible.length === 0;

  return (
    <section
      data-node-id="10:4167/10:4306"
      className="flex w-full flex-col gap-6 p-6"
    >
      {/* Header */}
      <PageHeader
        title={t["loans.title"]}
        subtitle={t["ui.loansList.count"](loansByStatus.length)}
        action={
          <Link
            href="/loans/new"
            className="inline-flex items-center gap-1.5 self-start rounded-pill bg-brand-600 px-4 py-2 text-helper font-semibold text-white hover:bg-[#176348] md:self-auto"
          >
            <Plus className="size-4" aria-hidden />
            {t["ui.loansList.addLoan"]}
          </Link>
        }
      />

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            id="loan-search"
            label=""
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t["loans.searchPlaceholder"]}
            className="pl-10"
          />
        </div>
        <div className="flex items-start gap-2" role="tablist">
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f}
              selected={filter === f}
              onClick={() => setFilter(f)}
              role="tab"
              aria-selected={filter === f}
            >
              {chipLabel(f, t)}
            </Chip>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3">
        {isEmpty ? (
          <div className="rounded-card border border-border bg-surface p-6 shadow-card">
            <EmptyState
              type="Loans"
              onAddLoan={() => router.push("/loans/new")}
            />
          </div>
        ) : filteredEmpty ? (
          <div className="rounded-card border border-border bg-surface p-6 text-center text-muted text-helper">
            {t["common.empty"]}
          </div>
        ) : (
          <>
            <DesktopTable
              loans={visible}
              today={today}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              numeralMode={numeralMode}
              lang={lang}
              t={t}
            />
            <MobileCards
              loans={visible}
              today={today}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              numeralMode={numeralMode}
              lang={lang}
              t={t}
            />
          </>
        )}
      </div>

      {!ready ? <span className="sr-only">{t["ui.loadingLoans"]}</span> : null}
    </section>
  );
}

/* ----------------------------------------------------------------
 * Desktop table
 * ---------------------------------------------------------------- */

function DesktopTable({
  loans,
  today,
  openMenuId,
  setOpenMenuId,
  numeralMode,
  lang,
  t,
}: {
  loans: Loan[];
  today: Date;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  numeralMode: "latin" | "bn";
  lang: "en" | "bn";
  t: ReturnType<typeof useT>["t"];
}) {
  const toast = useToast();

  return (
    <div
      data-node-id="10:4226"
      className="hidden md:block rounded-card border border-border bg-surface overflow-hidden"
    >
      <div
        data-node-id="10:4227"
        className="grid grid-cols-[1.2fr_160px_124px_180px_120px_40px] items-center gap-4 bg-[#f6f7f3] px-6 h-12 font-medium text-eyebrow text-muted leading-6 overflow-clip"
      >
        <span>{t["ui.loansList.table.friend"]}</span>
        <span>{t["ui.loansList.table.amount"]}</span>
        <span>{t["ui.loansList.table.dateGiven"]}</span>
        <span>{t["ui.loansList.table.dueDate"]}</span>
        <span>{t["ui.loansList.table.status"]}</span>
        <span aria-hidden="true"></span>
      </div>

      {loans.map((loan, idx) => {
        const isOverdue = loan.status === "Overdue";
        const overdueBy = isOverdue
          ? daysBetween(new Date(loan.dueDate), today)
          : 0;
        const paid = amountPaid(loan);
        const balance = remainingAmount(loan);
        const isPaid = balance === 0;
        const isPartial = !isPaid && paid > 0;
        const isRescheduled = loan.rescheduleHistory.length > 0;
        return (
          <div
            key={loan.id}
            data-node-id="10:4242/10:4250/10:4258/10:4266"
            className={[
              "relative grid grid-cols-[1.2fr_160px_124px_180px_120px_40px] items-center gap-4 px-6 h-[82px] overflow-clip",
              idx === loans.length - 1 ? "" : "border-b border-border",
            ].join(" ")}
          >
            <Link
              href={`/loans/${loan.id}`}
              className="flex flex-1 min-w-0 items-center gap-3"
            >
              <Avatar name={loan.friend.name} />
              <span className="font-medium text-body text-text truncate">
                {loan.friend.name}
              </span>
            </Link>
            <div className="flex flex-col gap-0.5">
              <span className="tabular font-medium text-body text-text">
                {formatMoney(loan.amount, numeralMode)}
              </span>
              {isPartial ? (
                <span className="tabular font-normal text-helper text-muted">
                  {t["ui.loansList.partial"](
                    formatMoney(paid, numeralMode),
                    formatMoney(loan.amount, numeralMode),
                  )}
                </span>
              ) : null}
            </div>
            <span className="font-normal text-helper text-muted">
              {formatDate(loan.dateGiven, { lang, numeralMode })}
            </span>
            <div className="font-normal text-badge text-text leading-6">
              <div className="flex items-center gap-2">
                <p>{formatDate(loan.dueDate, { lang, numeralMode })}</p>
                {isRescheduled ? (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-brand-50 px-2 py-0.5 text-eyebrow font-semibold text-brand-600">
                    <Clock className="size-3" aria-hidden />
                    {t["ui.loansList.rescheduled"]}
                  </span>
                ) : null}
              </div>
              {isOverdue ? (
                <p className="text-status-overdue-text">
                  {t["ui.loansList.overdueBy"](overdueBy)}
                </p>
              ) : !isPaid ? (
                <p className="text-muted">
                  {t["ui.loansList.dueIn"](daysBetween(today, new Date(loan.dueDate)))}
                </p>
              ) : null}
            </div>
            <div>
              <StatusBadge status={loan.status} />
            </div>
            <RowMenu
              loan={loan}
              open={openMenuId === loan.id}
              setOpen={(v) => setOpenMenuId(v ? loan.id : null)}
              onMarkAsPaid={() => {
                markAsPaid(loan.id).then(() => toast.show(t["loanDetails.toast.markedPaid"]));
                setOpenMenuId(null);
              }}
              onDelete={() => {
                deleteLoanSvc(loan.id).then(() => toast.show(t["loanDetails.toast.loanDeleted"]));
                setOpenMenuId(null);
              }}
              t={t}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------
 * Mobile stacked cards
 * ---------------------------------------------------------------- */

function MobileCards({
  loans,
  today,
  openMenuId,
  setOpenMenuId,
  numeralMode,
  lang,
  t,
}: {
  loans: Loan[];
  today: Date;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  numeralMode: "latin" | "bn";
  lang: "en" | "bn";
  t: ReturnType<typeof useT>["t"];
}) {
  const toast = useToast();
  return (
    <ul
      data-node-id="10:4306"
      className="flex flex-col gap-3 md:hidden"
    >
      {loans.map((loan) => {
        const isOverdue = loan.status === "Overdue";
        const overdueBy = isOverdue
          ? daysBetween(new Date(loan.dueDate), today)
          : 0;
        const paid = amountPaid(loan);
        const balance = remainingAmount(loan);
        const isPaid = balance === 0;
        const isPartial = !isPaid && paid > 0;
        const isRescheduled = loan.rescheduleHistory.length > 0;
        return (
          <li
            key={loan.id}
            className="relative rounded-card border border-border bg-surface p-4 shadow-card"
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/loans/${loan.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar name={loan.friend.name} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-body text-text">
                    {loan.friend.name}
                  </span>
                  <span className="truncate font-normal text-helper text-muted">
                    {formatDate(loan.dueDate, { lang, numeralMode })}
                    {isRescheduled ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-pill bg-brand-50 px-2 py-0.5 text-eyebrow font-semibold text-brand-600">
                        <Clock className="size-3" aria-hidden />
                        {t["ui.loansList.rescheduled"]}
                      </span>
                    ) : null}
                  </span>
                </div>
              </Link>
              <div className="flex flex-col items-end gap-0.5">
                <span className="tabular font-medium text-body text-text">
                  {formatMoney(loan.amount, numeralMode)}
                </span>
                {isPartial ? (
                  <span className="tabular font-normal text-helper text-muted">
                    {t["loans.partial"](
                      formatMoney(paid, numeralMode),
                      formatMoney(loan.amount, numeralMode),
                    )}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <StatusBadge status={loan.status} />
              <div className="flex items-center gap-3">
                <span className="font-normal text-helper text-muted">
                  {formatDate(loan.dateGiven, { lang, numeralMode })}
                </span>
                <RowMenu
                  loan={loan}
                  open={openMenuId === loan.id}
                  setOpen={(v) => setOpenMenuId(v ? loan.id : null)}
                  onMarkAsPaid={() => {
                    markAsPaid(loan.id).then(() => toast.show(t["loanDetails.toast.markedPaid"]));
                    setOpenMenuId(null);
                  }}
                  onDelete={() => {
                    deleteLoanSvc(loan.id).then(() => toast.show(t["loanDetails.toast.loanDeleted"]));
                    setOpenMenuId(null);
                  }}
                  t={t}
                />
              </div>
            </div>
            {isOverdue ? (
              <p className="mt-2 font-normal text-badge text-status-overdue-text">
                {t["ui.loansList.overdueBy"](overdueBy)}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/* ----------------------------------------------------------------
 * Per-row "..." menu
 * ---------------------------------------------------------------- */

function RowMenu({
  loan,
  open,
  setOpen,
  onMarkAsPaid,
  onDelete,
  t,
}: {
  loan: Loan;
  open: boolean;
  setOpen: (v: boolean) => void;
  onMarkAsPaid: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        aria-label={t["ui.loansList.menuAria"]}
        onClick={() => setOpen(!open)}
        className="rounded-pill p-2 text-muted hover:bg-brand-50 hover:text-brand-600"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-input border border-border bg-surface shadow-overlay"
          role="menu"
        >
          <Link
            href={`/loans/${loan.id}`}
            className="block px-4 py-2 text-helper font-medium text-text hover:bg-brand-50 hover:text-brand-600"
            role="menuitem"
          >
            {t["ui.loansList.menu.view"]}
          </Link>
          <Link
            href={`/loans/${loan.id}/edit`}
            className="block px-4 py-2 text-helper font-medium text-text hover:bg-brand-50 hover:text-brand-600"
            role="menuitem"
          >
            {t["ui.loansList.menu.edit"]}
          </Link>
          {loan.status !== "Paid" ? (
            <button
              type="button"
              onClick={onMarkAsPaid}
              className="block w-full px-4 py-2 text-left text-helper font-medium text-text hover:bg-brand-50 hover:text-brand-600"
              role="menuitem"
            >
              {t["ui.loansList.menu.markPaid"]}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-helper font-medium text-status-overdue-text hover:bg-status-overdue-bg"
            role="menuitem"
          >
            <Trash2 className="size-3" aria-hidden />
            {t["ui.loansList.menu.delete"]}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function chipLabel(
  f: Filter,
  t: ReturnType<typeof useT>["t"],
): string {
  const key = `ui.loansList.chip.${f.toLowerCase()}` as const;
  const v = t[key as keyof typeof t];
  if (typeof v === "string") return v;
  return f;
}
