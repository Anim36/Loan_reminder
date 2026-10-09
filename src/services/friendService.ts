// Friend aggregation layer.
//
// Friends are derived from the existing loan list (grouped by
// `friend.id`). There is no separate friends collection in the backend;
// the page reads loans and computes per-friend roll-ups. This keeps the
// data model honest and means "add a friend" in the prototype is just
// "add a loan".
//
// All exports are `async` so the call sites never branch on which
// backend is configured. SSR-safe: nothing here touches `window` at
// module scope.

import { getLoans } from "./loanService";
import { getLoanReminderHistory } from "./reminderService";
import type { Friend, Loan, LoanStatus, ReminderChannel } from "@/types";

export interface FriendSummary {
  friend: Friend;
  /** Number of loans attached to this friend. */
  loanCount: number;
  /** Total amount lent to this friend across all loans. */
  totalLent: number;
  /** Total amount repaid (sum of paid loans). */
  totalRepaid: number;
  /** Outstanding amount (sum of non-paid loans). */
  outstanding: number;
  /** Worst current status across the friend's loans: Overdue > Pending > Paid. */
  worstStatus: LoanStatus;
  /** Reminders enabled for any loan? */
  hasReminders: boolean;
  /** Last activity date (ISO) — used to sort "recent" lists. */
  lastActivity: string;
}

function worstOf(statuses: LoanStatus[]): LoanStatus {
  if (statuses.some((s) => s === "Overdue")) return "Overdue";
  if (statuses.some((s) => s === "Pending")) return "Pending";
  return "Paid";
}

function lastDate(loans: Loan[]): string {
  return loans.reduce((acc, l) => {
    const candidate = l.updatedAt || l.dateGiven;
    return candidate > acc ? candidate : acc;
  }, "1970-01-01");
}

function hasAnyReminders(loans: Loan[]): boolean {
  return loans.some((l) => l.reminders?.sms || l.reminders?.email);
}

/** Aggregate every friend (one row per unique `friend.id`). */
export async function getFriends(): Promise<FriendSummary[]> {
  const loans = await getLoans();
  const groups = new Map<string, Loan[]>();
  for (const loan of loans) {
    const list = groups.get(loan.friend.id) ?? [];
    list.push(loan);
    groups.set(loan.friend.id, list);
  }
  const out: FriendSummary[] = [];
  for (const [id, group] of groups) {
    const friend = group[0].friend;
    let totalLent = 0;
    let totalRepaid = 0;
    let outstanding = 0;
    const statuses: LoanStatus[] = [];
    for (const loan of group) {
      totalLent += loan.amount;
      if (loan.status === "Paid") totalRepaid += loan.amount;
      else outstanding += loan.amount;
      statuses.push(loan.status);
    }
    out.push({
      friend: { ...friend, id },
      loanCount: group.length,
      totalLent,
      totalRepaid,
      outstanding,
      worstStatus: worstOf(statuses),
      hasReminders: hasAnyReminders(group),
      lastActivity: lastDate(group),
    });
  }
  // Most-recent first.
  out.sort((a, b) => (a.lastActivity > b.lastActivity ? -1 : a.lastActivity < b.lastActivity ? 1 : 0));
  return out;
}

/** One friend by id, or `undefined` when missing. */
export async function getFriend(id: string): Promise<FriendSummary | undefined> {
  const all = await getFriends();
  return all.find((f) => f.friend.id === id);
}

/** Loans attached to one friend (chronological, descending). */
export async function getFriendLoans(id: string): Promise<Loan[]> {
  const loans = await getLoans();
  return loans
    .filter((l) => l.friend.id === id)
    .sort((a, b) => (a.dateGiven > b.dateGiven ? -1 : a.dateGiven < b.dateGiven ? 1 : 0));
}

/** Reminders sent to one friend across every loan they have. */
export async function getFriendReminderHistory(
  id: string,
): Promise<Array<{
  id: string;
  loanId: string;
  friendName: string;
  amount: number;
  channel: ReminderChannel;
  sentAt: string;
  status: "Delivered" | "Failed";
}>> {
  const friendLoans = await getFriendLoans(id);
  const out: Array<{
    id: string;
    loanId: string;
    friendName: string;
    amount: number;
    channel: ReminderChannel;
    sentAt: string;
    status: "Delivered" | "Failed";
  }> = [];
  for (const loan of friendLoans) {
    const history = await getLoanReminderHistory(loan.id);
    for (const r of history) {
      out.push({ ...r, friendName: loan.friend.name, amount: loan.amount });
    }
  }
  // Most-recent first.
  out.sort((a, b) => (a.sentAt > b.sentAt ? -1 : a.sentAt < b.sentAt ? 1 : 0));
  return out;
}