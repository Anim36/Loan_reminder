"use client";

// React Query hooks for the B3/B4 API.
//
// One query / mutation per route, with stable query keys
// centralised in `@/lib/queryKeys`. Each hook returns the
// values the pages need: `data`, `isLoading`, `isError`,
// `error`, `refetch` for queries; `mutate`, `isPending`,
// `error` for mutations. Pages don't need to know that
// React Query is underneath — they consume plain promises.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { queryKeys, loanMutationInvalidator } from "@/lib/queryKeys";
import type { Loan, PaymentMethod, ReminderChannel, Tone } from "@/types/loan";
import {
  getLoan,
  getLoans,
  getLoansPaged,
  markFullyPaid,
  rescheduleLoan,
  restoreLoan as restoreLoanApi,
  updateLoan as updateLoanApi,
  addPayment as addPaymentApi,
  deletePayment as deletePaymentApi,
  deleteLoan as deleteLoanApi,
  createLoan as createLoanApi,
  sendReminderNow as sendReminderNowApi,
  type LoanListFilters,
  type LoanListResult,
  type CreateLoanBody,
  type UpdateLoanBody,
  type RemindResult,
} from "./loanService";
import {
  getUserSettings,
  updateProfile as updateProfileApi,
  updatePreferences as updatePreferencesApi,
  changePassword as changePasswordApi,
  deleteAccount as deleteAccountApi,
} from "./settingsService";
import {
  getNotifications,
  getUnreadCount,
  markRead as markReadApi,
  markAllRead as markAllReadApi,
} from "./notificationService";
import {
  getReminderHistoryPaged,
  getReminderSettings,
  saveReminderSettings,
  type ReminderHistoryFilters,
  type ReminderHistoryResponse,
  type ReminderSettings as ReminderSettingsWire,
} from "./reminderService";
import { computeReport, downloadReportCsv } from "./reportService";
import { getFriendDetail } from "./friendService";
import type {
  ApiDashboardSummary,
  ApiFriendListResponse,
  ApiLoan,
  ApiNotificationListResponse,
  ApiPreferences,
  ApiProfile,
  ApiUnreadCount,
  ApiReports,
} from "@/lib/api/api-types";
import {
  mapApiNotification,
  mapDashboardSummary,
  mapFriendListItem,
  mapPreferences,
  mapProfile,
  mapReports,
  mapReminderSettings,
  mapUnreadCount,
  type DashboardSummaryMapped,
  type FriendDetailMapped,
  type FriendListRow,
  type PreferencesUi,
  type ProfileUi,
  type ReminderSettingsUi,
  type ReportsMapped,
  type Notification as UiNotification,
} from "@/lib/api/mappers";
import type { UserSettings } from "@/services/settingsService";
import type { MessageLanguage } from "@/types/loan";

/* ===================================================================
 * Loans
 * =================================================================== */

/** Loans list. `ready` is `true` once the first fetch resolves
 *  (success or empty) — false during the initial load AND on
 *  any subsequent refetch, so the page can show a skeleton
 *  without flickering on every background update. The
 *  `isPending` flag is `true` only on the very first load. */
export function useLoansQuery(filters: LoanListFilters = {}) {
  return useQuery<Loan[]>({
    queryKey: queryKeys.loans.list(filters as Record<string, unknown>),
    queryFn: () => getLoans(filters),
  });
}

/** Loans list with pagination meta. The list page uses this when
 *  the user paginates or filters server-side. */
export function useLoansPagedQuery(filters: LoanListFilters = {}) {
  return useQuery<LoanListResult>({
    queryKey: queryKeys.loans.list(filters as Record<string, unknown>),
    queryFn: () => getLoansPaged(filters),
  });
}

/** Single loan detail. */
export function useLoanQuery(id: string | undefined) {
  return useQuery<Loan | undefined>({
    queryKey: queryKeys.loans.byId(id ?? ""),
    enabled: !!id,
    queryFn: () => getLoan(id as string),
  });
}

/** Dashboard summary (totals + recent loans + upcoming). */
export function useDashboardSummaryQuery() {
  return useQuery<DashboardSummaryMapped>({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      // api-client returns the full envelope `{ data: ApiDashboardSummary }`.
      const res = await apiGet<{ data: ApiDashboardSummary }>("/dashboard/summary");
      return mapDashboardSummary(res.data);
    },
  });
}

/* ---- Loan mutations ----------------------------------------------- */

interface CreateLoanVars {
  body: CreateLoanBody;
}
interface CreateLoanResult {
  loan: Loan;
  raw: ApiLoan;
}
export function useCreateLoanMutation(): UseMutationResult<
  CreateLoanResult,
  ApiError,
  CreateLoanVars
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body }: CreateLoanVars) => {
      const loan = await createLoanApi(body);
      // We don't have the raw DTO at this point; the
      // `createLoanApi` returns a UI-shaped `Loan`. Construct a
      // minimal DTO for the in-cache store.
      const raw = loan as unknown as ApiLoan;
      return { loan, raw };
    },
    onSuccess: () => loanMutationInvalidator(qc),
  });
}

interface UpdateLoanVars {
  id: string;
  patch: UpdateLoanBody;
}
export function useUpdateLoanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateLoanVars) => updateLoanApi(id, patch),
    onSuccess: (loan, vars) => {
      if (loan) {
        qc.setQueryData(queryKeys.loans.byId(vars.id), loan);
      }
      loanMutationInvalidator(qc);
    },
  });
}

export function useDeleteLoanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLoanApi(id),
    onSuccess: () => loanMutationInvalidator(qc),
  });
}

export function useRestoreLoanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreLoanApi(id),
    onSuccess: (loan, id) => {
      if (loan) {
        qc.setQueryData(queryKeys.loans.byId(id), loan);
      }
      loanMutationInvalidator(qc);
    },
  });
}

interface AddPaymentVars {
  loanId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  note?: string;
}
export function useAddPaymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, ...rest }: AddPaymentVars) =>
      addPaymentApi(loanId, rest),
    onSuccess: (loan, vars) => {
      if (loan) {
        qc.setQueryData(queryKeys.loans.byId(vars.loanId), loan);
      }
      loanMutationInvalidator(qc);
    },
  });
}

interface DeletePaymentVars {
  loanId: string;
  paymentId: string;
}
export function useDeletePaymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, paymentId }: DeletePaymentVars) =>
      deletePaymentApi(loanId, paymentId),
    onSuccess: (loan, vars) => {
      if (loan) {
        qc.setQueryData(queryKeys.loans.byId(vars.loanId), loan);
      }
      loanMutationInvalidator(qc);
    },
  });
}

export function useMarkFullyPaidMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) => markFullyPaid(loanId),
    onSuccess: (loan, loanId) => {
      if (loan) {
        qc.setQueryData(queryKeys.loans.byId(loanId), loan);
      }
      loanMutationInvalidator(qc);
    },
  });
}

interface RescheduleVars {
  id: string;
  to: string;
  reason?: string;
}
export function useRescheduleLoanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to, reason }: RescheduleVars) =>
      rescheduleLoan(id, { to, reason }),
    onSuccess: (loan, vars) => {
      if (loan) {
        qc.setQueryData(queryKeys.loans.byId(vars.id), loan);
      }
      loanMutationInvalidator(qc);
    },
  });
}

export function useSendReminderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) => sendReminderNowApi(loanId),
    onSuccess: () => {
      // The reminder creates QUEUED log rows; the history list
      // picks them up on the next refetch.
      qc.invalidateQueries({ queryKey: queryKeys.reminders.history() });
    },
  });
}

export type { RemindResult };

/* ===================================================================
 * Friends
 * =================================================================== */

export function useFriendsQuery(filters: { q?: string; page?: number; pageSize?: number } = {}) {
  return useQuery<FriendListRow[]>({
    queryKey: queryKeys.friends.list(filters as Record<string, unknown>),
    queryFn: async () => {
      const raw = await apiGet<ApiFriendListResponse>("/friends", { query: filters });
      return raw.data.map(mapFriendListItem);
    },
  });
}

export function useFriendQuery(id: string | undefined) {
  return useQuery<FriendDetailMapped | undefined>({
    queryKey: queryKeys.friends.byId(id ?? ""),
    enabled: !!id,
    queryFn: () => getFriendDetail(id as string),
  });
}

/* ===================================================================
 * Notifications
 * =================================================================== */

interface NotificationsVars {
  unread?: boolean;
  page?: number;
  pageSize?: number;
}
export function useNotificationsQuery(vars: NotificationsVars = {}) {
  return useQuery<UiNotification[]>({
    queryKey: queryKeys.notifications.list(vars as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiGet<ApiNotificationListResponse>("/notifications", {
        query: {
          ...(vars.unread ? { unread: "true" } : {}),
          ...(vars.page ? { page: vars.page } : {}),
          ...(vars.pageSize ? { pageSize: vars.pageSize } : {}),
        },
      });
      return res.data.map(mapApiNotification);
    },
  });
}

/** Unread count for the bell badge. 30s polling, pauses when
 *  the tab is hidden (pageVisibility auto-pause is on by default
 *  in React Query v5). */
export function useUnreadCountQuery() {
  return useQuery<number>({
    queryKey: queryKeys.notifications.unread(),
    queryFn: async () => {
      const res = await apiGet<ApiUnreadCount>("/notifications/unread-count");
      return mapUnreadCount(res);
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

interface MarkReadVars {
  id: string;
}
export function useMarkReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: MarkReadVars) => markReadApi(id),
    // Optimistic update: bump the unread count down and mark the
    // item read in the list cache so the bell animates without
    // a server round-trip.
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications.all });
      const prev = qc.getQueryData<UiNotification[]>(
        queryKeys.notifications.list({}),
      );
      if (prev) {
        qc.setQueryData<UiNotification[]>(
          queryKeys.notifications.list({}),
          prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
        );
      }
      const prevCount = qc.getQueryData<number>(queryKeys.notifications.unread());
      if (typeof prevCount === "number" && prevCount > 0) {
        qc.setQueryData<number>(
          queryKeys.notifications.unread(),
          prevCount - 1,
        );
      }
      return { prev, prevCount };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.notifications.list({}), ctx.prev);
      }
      if (typeof ctx?.prevCount === "number") {
        qc.setQueryData(queryKeys.notifications.unread(), ctx.prevCount);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllReadApi(),
    onSuccess: () => {
      qc.setQueryData<number>(queryKeys.notifications.unread(), 0);
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export { getNotifications, getUnreadCount };

/* ===================================================================
 * Reminder history
 * =================================================================== */

export function useReminderHistoryQuery(
  filters: ReminderHistoryFilters = {},
) {
  return useQuery<ReminderHistoryResponse>({
    queryKey: queryKeys.reminders.history(filters as Record<string, unknown>),
    queryFn: () => getReminderHistoryPaged(filters),
  });
}

/* ===================================================================
 * Reminder settings
 * =================================================================== */

export function useReminderSettingsQuery() {
  return useQuery<ReminderSettingsUi>({
    queryKey: queryKeys.reminders.settings(),
    queryFn: async () => {
      const dto = await getReminderSettings();
      return mapReminderSettings(
        dto as unknown as Parameters<typeof mapReminderSettings>[0],
      );
    },
  });
}

export function useSaveReminderSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: ReminderSettingsWire) =>
      saveReminderSettings(settings as unknown as Parameters<typeof saveReminderSettings>[0]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders.settings() });
    },
  });
}

/* ===================================================================
 * Settings — profile + preferences
 * =================================================================== */

export function useProfileQuery() {
  return useQuery<ProfileUi>({
    queryKey: queryKeys.settings.profile(),
    queryFn: async () =>
      mapProfile(
        (await apiGet<{ data: ApiProfile }>("/settings/profile")).data,
      ),
  });
}

export function usePreferencesQuery() {
  return useQuery<PreferencesUi>({
    queryKey: queryKeys.settings.preferences(),
    queryFn: async () =>
      mapPreferences(
        (await apiGet<{ data: ApiPreferences }>("/settings/preferences")).data,
      ),
  });
}

export function useUserSettingsQuery() {
  return useQuery<UserSettings>({
    queryKey: ["settings", "user-settings"],
    queryFn: () => getUserSettings(),
  });
}

export function useUpdateProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; phone?: string | null }) =>
      updateProfileApi(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.profile() });
      qc.invalidateQueries({ queryKey: ["settings", "user-settings"] });
    },
  });
}

export function useUpdatePreferencesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      patch: Partial<{
        language: "en" | "bn";
        theme: "light" | "dark" | "system";
        banglaNumerals: boolean;
        emailOnPaid: boolean;
        emailOnOverdue: boolean;
        weeklySummary: boolean;
      }>,
    ) => updatePreferencesApi(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.preferences() });
      qc.invalidateQueries({ queryKey: ["settings", "user-settings"] });
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (vars: { current: string; next: string }) =>
      changePasswordApi(vars),
  });
}

export function useDeleteAccountMutation() {
  return useMutation({
    mutationFn: () => deleteAccountApi(),
  });
}

/* ===================================================================
 * Reports
 * =================================================================== */

export function useReportsQuery(range: "3m" | "6m" | "12m" | "all") {
  return useQuery<ReportsMapped>({
    queryKey: queryKeys.reports.byRange(range),
    queryFn: async () => {
      // api-client returns the full envelope `{ data: ApiReports }`.
      const res = await apiGet<{ data: ApiReports }>("/reports", { query: { range } });
      return mapReports(res.data);
    },
  });
}

export function useExportReportMutation() {
  return useMutation({
    mutationFn: (range: "3m" | "6m" | "12m" | "all") => downloadReportCsv(range),
  });
}

export { computeReport as fetchReport };

/* ---- Suppress unused-import lints (kept for cross-module use) ---- */
export type {
  Loan,
  ReminderChannel,
  Tone,
  MessageLanguage,
};
export { ApiError, apiDelete, apiGet, apiPatch, apiPost };

/* ---- Type-only re-exports so pages keep their existing imports --- */
export type { UseQueryResult, UseMutationResult };
