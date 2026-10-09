// Barrel export for @/services.
//
// Re-export from the underlying modules (rather than re-export
// "*") so call sites stay tree-shakeable. The B3/B4 migration
// rewired each service to the API; the public names are kept
// identical so pages, hooks, and tests don't have to change.

export {
  addPayment,
  amountPaid,
  createLoan,
  deleteLoan,
  deletePayment,
  deriveStatus,
  getLoan,
  getLoans,
  getLoansPaged,
  markAsPaid,
  markFullyPaid,
  remapStatuses,
  remainingAmount,
  rescheduleLoan,
  restoreLoan,
  sendReminderNow,
  updateLoan,
} from "./loanService";
export { useLoans } from "./use-loans";
export { useLoansQuery } from "./useQueries";

export {
  buildLoanHistory,
  getReminderHistory,
  getReminderHistoryPaged,
  getReminderSettings,
  normalizeSettings,
  saveReminderSettings,
  setTone,
  updateChannels,
  updateMessageLanguage,
  updateTemplate,
} from "./reminderService";
export { SEED as REMINDER_SEED } from "./reminderService";
export type {
  ChannelDefaults,
  LocalizedTemplates,
  ReminderHistoryItem,
  ReminderHistoryResponse,
  ReminderHistoryFilters,
  ReminderSettings,
  ToneTemplates,
} from "./reminderService";
export type { Tone } from "@/types/loan";
export { useReminderSettings } from "./use-reminder-settings";

export {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  notifyDueDateUpdated,
  notifyLoanCreated,
  notifyLoanPaid,
  notifyPaymentRecorded,
  notifyReminderSent,
  translateNotification,
} from "./notificationService";
export type {
  Notification,
  NotificationKind,
  NotificationMessageKey,
} from "./notificationService";
export { useNotifications } from "./use-notifications";

export {
  changePassword,
  deleteAccount,
  getPreferences,
  getProfile,
  getUserSettings,
  saveUserSettings,
  SEED as USER_SETTINGS_SEED,
  updateBanglaNumerals,
  updateNotificationPrefs,
  updatePreferences,
  updateProfile,
  updateTheme,
} from "./settingsService";
export type {
  NotificationPrefs,
  ThemeChoice,
  UserSettings,
} from "./settingsService";
export { useUserSettings } from "./use-user-settings";

export {
  AuthError,
  signIn,
  signOut,
  signUp,
  forgotPassword,
  resetPassword,
} from "./authService";

export {
  getFriend,
  getFriendDetail,
  getFriendLoans,
  getFriendReminderHistory,
  getFriends,
} from "./friendService";
export type { FriendListRow as FriendSummary, FriendDetailMapped } from "./friendService";

export {
  computeReport,
  downloadReportCsv,
  formatCsv,
  type ReportRange,
  type ReportSnapshot,
} from "./reportService";
export type { MonthlyBucket, ReliabilityRow, UpcomingDue } from "./reportService";
