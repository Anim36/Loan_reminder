// Barrel export for @/services.
//
// Keep this file in sync with the public surface every service module
// exposes. Re-export from the underlying modules (rather than re-export
// "*") so call sites stay tree-shakeable.

export {
  addPayment,
  amountPaid,
  createLoan,
  deleteLoan,
  deletePayment,
  deriveStatus,
  getLoan,
  getLoans,
  markAsPaid,
  markFullyPaid,
  remapStatuses,
  remainingAmount,
  rescheduleLoan,
  updateLoan,
} from "./loanService";
export { useLoans } from "./use-loans";

export {
  buildLoanHistory,
  FRIENDLY_SMS,
  FIRM_SMS,
  getLoanReminderHistory,
  getReminderHistory,
  getReminderSettings,
  NEUTRAL_SMS,
  saveReminderSettings,
  SEED as REMINDER_SEED,
  setTone,
  updateChannels,
  updateMessageLanguage,
  updateTemplate,
} from "./reminderService";
export type {
  ChannelDefaults,
  LocalizedTemplates,
  ReminderHistoryItem,
  ReminderSettings,
  ToneTemplates,
} from "./reminderService";
export type { Tone } from "@/types/loan";
export { useReminderSettings } from "./use-reminder-settings";

export {
  createNotification,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  notifyLoanCreated,
  notifyLoanPaid,
  notifyReminderSent,
  notifyPaymentRecorded,
  notifyDueDateUpdated,
  subscribeNotifications,
  translateNotification,
} from "./notificationService";
export type { Notification, NotificationKind } from "./notificationService";
export { useNotifications } from "./use-notifications";

export {
  changePassword,
  deleteAccount,
  getUserSettings,
  saveUserSettings,
  SEED as USER_SETTINGS_SEED,
  subscribeUserSettings,
  updateBanglaNumerals,
  updateNotificationPrefs,
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
  forgotPassword,
  getSession,
  isAuthenticated,
  onAuthChange,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "./authService";
export type { AuthUser } from "./authService";

export {
  getFriend,
  getFriendLoans,
  getFriendReminderHistory,
  getFriends,
} from "./friendService";
export type { FriendSummary } from "./friendService";

export {
  computeReport,
  formatCsv,
  type ReportRange,
  type ReportSnapshot,
} from "./reportService";
