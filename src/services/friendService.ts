// Friends service — B3/B4 API-backed.
//
// The list is paginated and search-filtered server-side. The
// detail page reads `/api/friends/:id`, which also returns the
// friend's loan DTOs and the last 20 reminder logs.

import { ApiError, apiGet } from "@/lib/api-client";
import type { Loan, ReminderChannel } from "@/types/loan";
import type {
  ApiFriendListResponse,
  ApiFriendDetail as ApiFriendDetailWire,
} from "@/lib/api/api-types";
import {
  mapFriendDetail,
  mapFriendListItem,
  type FriendListRow,
  type FriendDetailMapped,
} from "@/lib/api/mappers";

export type { FriendListRow, FriendDetailMapped };

export type FriendSummary = FriendListRow;

export interface FriendListFilters {
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function getFriends(
  filters: FriendListFilters = {},
): Promise<FriendSummary[]> {
  const query: Record<string, string | number> = {};
  if (filters.q) query.q = filters.q;
  if (filters.page) query.page = filters.page;
  if (filters.pageSize) query.pageSize = filters.pageSize;
  const res = await apiGet<ApiFriendListResponse>("/friends", { query });
  return res.data.map(mapFriendListItem);
}

export async function getFriend(
  id: string,
): Promise<FriendSummary | undefined> {
  try {
    // api-client returns the full envelope `{ data: ApiFriendDetail }`.
    // Read `.data` exactly once.
    const res = await apiGet<{ data: ApiFriendDetailWire }>(`/friends/${encodeURIComponent(id)}`);
    const mapped = mapFriendDetail(res.data);
    return {
      friend: mapped.friend,
      loanCount: mapped.totals.loanCount,
      totalLent: mapped.totals.totalLent,
      totalRepaid: mapped.totals.totalRepaid,
      outstanding: mapped.totals.outstanding,
      worstStatus: mapped.totals.worstStatus,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

/** Returns the full friend detail (totals + loan DTOs + reminder
 *  log entries). The detail page calls this once and renders
 *  from the result. */
export async function getFriendDetail(
  id: string,
): Promise<FriendDetailMapped | undefined> {
  try {
    // api-client returns the full envelope `{ data: ApiFriendDetail }`.
    const res = await apiGet<{ data: ApiFriendDetailWire }>(
      `/friends/${encodeURIComponent(id)}`,
    );
    return mapFriendDetail(res.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

/** Loans attached to one friend, sorted by `dueDate` desc. */
export async function getFriendLoans(id: string): Promise<Loan[]> {
  const detail = await getFriendDetail(id);
  if (!detail) return [];
  return detail.loans
    .slice()
    .sort((a, b) =>
      a.dueDate < b.dueDate ? 1 : a.dueDate > b.dueDate ? -1 : 0,
    );
}

export interface FriendReminderHistoryItem {
  id: string;
  loanId: string;
  friendName: string;
  amount: number;
  channel: ReminderChannel;
  sentAt: string;
  status: "Delivered" | "Failed";
}

/** Reminders sent to one friend across every loan. Built from
 *  the friend detail's `reminderHistory` block. */
export async function getFriendReminderHistory(
  id: string,
): Promise<FriendReminderHistoryItem[]> {
  const detail = await getFriendDetail(id);
  if (!detail) return [];
  return detail.reminderHistory.map((r) => ({
    id: r.id,
    loanId: r.loanId,
    friendName: r.friendName,
    amount: r.amount,
    channel: r.channel,
    sentAt: r.sentAt ?? r.scheduledFor,
    status: r.status,
  }));
}
