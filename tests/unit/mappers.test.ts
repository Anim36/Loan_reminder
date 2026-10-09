import { describe, it, expect } from "vitest";
import {
  MalformedLoanError,
  mapApiLoan,
  mapApiNotification,
  mapApiDashboardLoan,
  mapDashboardSummary,
  mapFriendListItem,
  mapFriendDetail,
  mapReminderHistoryItem,
  mapReminderSettings,
  mapReports,
  mapPreferences,
  mapProfile,
  mapUnreadCount,
} from "@/lib/api/mappers";
import type {
  ApiLoan,
  ApiFriend,
  ApiPayment,
  ApiRescheduleEntry,
  ApiFriendListItem,
  ApiFriendDetail,
  ApiNotification,
  ApiDashboardSummary,
  ApiReminderHistoryItem,
  ApiReminderSettings,
  ApiReports,
  ApiProfile,
  ApiPreferences,
  ApiUnreadCount,
} from "@/lib/api/api-types";

const friend: ApiFriend = {
  id: "f-1",
  name: "Rafi",
  phone: "+8801711234567",
  email: "rafi@example.com",
};

const payment: ApiPayment = {
  id: "p-1",
  amount: 1500,
  date: "2026-09-30",
  method: "bKash",
  note: "first",
  createdAt: "2026-09-30T10:00:00.000Z",
};

const reschedule: ApiRescheduleEntry = {
  id: "r-1",
  from: "2026-10-05",
  to: "2026-10-15",
  reason: "friend asked",
  changedAt: "2026-10-04T10:00:00.000Z",
};

const baseLoan: ApiLoan = {
  id: "loan-1",
  friend,
  amount: 5000,
  amountPaid: 1500,
  remaining: 3500,
  status: "Pending",
  givenDate: "2026-09-20",
  dueDate: "2026-10-05",
  daysRemaining: 3,
  note: "groceries",
  smsEnabled: true,
  emailEnabled: false,
  reminderTimings: ["3_days_before", "on_due_date"],
  tone: "Friendly",
  messageLanguage: "en",
  consentConfirmed: true,
  paidAt: undefined,
  payments: [payment],
  rescheduleHistory: [reschedule],
  rescheduled: true,
  createdAt: "2026-09-20T09:00:00.000Z",
  updatedAt: "2026-09-20T09:00:00.000Z",
};

describe("mapApiLoan", () => {
  it("renames givenDate → dateGiven and smsEnabled → reminders.sms", () => {
    const out = mapApiLoan(baseLoan);
    expect(out.dateGiven).toBe(baseLoan.givenDate);
    expect(out.dueDate).toBe(baseLoan.dueDate);
    expect(out.reminders.sms).toBe(true);
    expect(out.reminders.email).toBe(false);
    expect(out.consent).toBe(true);
    expect(out.amount).toBe(5000);
  });

  it("strips the +880 prefix from friend.phone for UI display", () => {
    const out = mapApiLoan(baseLoan);
    expect(out.friend.phone).toBe("1711234567");
  });

  it("keeps friend.phone when the wire field is already a BD body", () => {
    const loan: ApiLoan = {
      ...baseLoan,
      friend: { ...friend, phone: "1711234567" },
    };
    expect(mapApiLoan(loan).friend.phone).toBe("1711234567");
  });

  it("falls back to undefined when friend has no phone", () => {
    const loan: ApiLoan = { ...baseLoan, friend: { ...friend, phone: undefined } };
    expect(mapApiLoan(loan).friend.phone).toBeUndefined();
  });

  it("copies server-derived amountPaid, remaining, and daysRemaining through", () => {
    const out = mapApiLoan(baseLoan) as ReturnType<typeof mapApiLoan> & {
      amountPaid: number;
      remaining: number;
      daysRemaining: number;
    };
    expect(out.amountPaid).toBe(1500);
    expect(out.remaining).toBe(3500);
    expect(out.daysRemaining).toBe(3);
  });

  it("maps payments and reschedule entries losslessly", () => {
    const out = mapApiLoan(baseLoan);
    expect(out.payments[0].id).toBe("p-1");
    expect(out.payments[0].method).toBe("bKash");
    expect(out.rescheduleHistory[0].from).toBe("2026-10-05");
  });
});

describe("mapApiDashboardLoan", () => {
  it("returns a UI Loan (alias of mapApiLoan)", () => {
    const out = mapApiDashboardLoan(baseLoan);
    expect(out.id).toBe("loan-1");
    expect(out.friend.name).toBe("Rafi");
  });
});

describe("mapFriendListItem", () => {
  it("flattens friend + totals into the UI row", () => {
    const dto: ApiFriendListItem = {
      id: "f-2",
      name: "Tuli",
      phone: "1710000000",
      email: null,
      loanCount: 3,
      totalLent: 9000,
      totalRepaid: 3000,
      outstanding: 6000,
      worstStatus: "Overdue",
    };
    const out = mapFriendListItem(dto);
    expect(out.friend.name).toBe("Tuli");
    expect(out.friend.phone).toBe("1710000000");
    expect(out.outstanding).toBe(6000);
    expect(out.worstStatus).toBe("Overdue");
  });

  it("treats a null phone as undefined", () => {
    const dto: ApiFriendListItem = {
      id: "f-3",
      name: "A",
      phone: null,
      email: null,
      loanCount: 0,
      totalLent: 0,
      totalRepaid: 0,
      outstanding: 0,
      worstStatus: "Paid",
    };
    const out = mapFriendListItem(dto);
    expect(out.friend.phone).toBeUndefined();
    expect(out.friend.email).toBeUndefined();
  });
});

describe("mapFriendDetail", () => {
  it("threads friend + totals + loans + reminder history", () => {
    const dto: ApiFriendDetail = {
      friend: { id: "f-1", name: "Rafi", phone: "1711234567", email: null },
      totals: {
        loanCount: 1,
        totalLent: 5000,
        totalRepaid: 1500,
        outstanding: 3500,
        worstStatus: "Pending",
      },
      loans: [baseLoan],
      reminderHistory: [
        {
          id: "rh-1",
          loanId: "loan-1",
          friendName: "Rafi",
          amount: 5000,
          channel: "SMS",
          scheduledFor: "2026-10-04T10:00:00.000Z",
          sentAt: "2026-10-04T10:00:05.000Z",
          status: "DELIVERED",
          error: null,
        },
      ],
    };
    const out = mapFriendDetail(dto);
    expect(out.friend.name).toBe("Rafi");
    expect(out.totals.outstanding).toBe(3500);
    expect(out.loans[0].id).toBe("loan-1");
    expect(out.reminderHistory[0].status).toBe("Delivered");
  });
});

describe("mapApiNotification", () => {
  it("treats null readAt as unread", () => {
    const dto: ApiNotification = {
      id: "n-1",
      type: "loan-created",
      titleKey: "notif.loanCreated",
      params: { name: "Rafi", amount: 5000 },
      loanId: "loan-1",
      readAt: null,
      createdAt: "2026-09-20T10:00:00.000Z",
    };
    const out = mapApiNotification(dto);
    expect(out.unread).toBe(true);
    expect(out.loanId).toBe("loan-1");
    expect(out.href).toBe("/loans/loan-1");
    expect(out.messageKey).toBe("notif.loanCreated");
    expect(out.messageParams).toEqual(["Rafi", 5000]);
  });

  it("treats a non-null readAt as read", () => {
    const dto: ApiNotification = {
      id: "n-2",
      type: "reminder-sent",
      titleKey: "notif.reminderSent",
      params: null,
      loanId: null,
      readAt: "2026-09-20T10:05:00.000Z",
      createdAt: "2026-09-20T10:00:00.000Z",
    };
    const out = mapApiNotification(dto);
    expect(out.unread).toBe(false);
    expect(out.href).toBe("/notifications");
  });
});

describe("mapUnreadCount", () => {
  it("passes count through", () => {
    const dto: ApiUnreadCount = { count: 4 };
    expect(mapUnreadCount(dto)).toBe(4);
  });
});

describe("mapDashboardSummary", () => {
  it("threads totals + recent + upcoming through", () => {
    const dto: ApiDashboardSummary = {
      totals: {
        totalLent: 10000,
        totalReceived: 4000,
        pending: 5000,
        overdue: 1000,
        counts: { Paid: 1, Pending: 2, Overdue: 1 },
      },
      recentLoans: [baseLoan],
      upcomingDue: [baseLoan],
    };
    const out = mapDashboardSummary(dto);
    expect(out.totals.totalLent).toBe(10000);
    expect(out.totals.counts.Paid).toBe(1);
    expect(out.recentLoans[0].id).toBe("loan-1");
    expect(out.upcomingDue[0].id).toBe("loan-1");
  });
});

describe("mapReminderHistoryItem", () => {
  it("squashes SENT + DELIVERED into Delivered", () => {
    const sent: ApiReminderHistoryItem = {
      id: "h-1",
      loanId: "loan-1",
      friendName: "Rafi",
      friendPhone: "1711234567",
      amount: 5000,
      channel: "SMS",
      scheduledFor: "2026-10-04T10:00:00.000Z",
      sentAt: "2026-10-04T10:00:01.000Z",
      status: "SENT",
      error: null,
    };
    const delivered: ApiReminderHistoryItem = { ...sent, status: "DELIVERED" };
    expect(mapReminderHistoryItem(sent).status).toBe("Delivered");
    expect(mapReminderHistoryItem(delivered).status).toBe("Delivered");
  });

  it("maps FAILED to Failed", () => {
    const failed: ApiReminderHistoryItem = {
      id: "h-1",
      loanId: "loan-1",
      friendName: "Rafi",
      friendPhone: null,
      amount: 0,
      channel: "Email",
      scheduledFor: "2026-10-04T10:00:00.000Z",
      sentAt: null,
      status: "FAILED",
      error: "smtp 550",
    };
    const out = mapReminderHistoryItem(failed);
    expect(out.status).toBe("Failed");
    expect(out.sentAt).toBe("2026-10-04T10:00:00.000Z");
    expect(out.error).toBe("smtp 550");
  });
});

describe("mapReminderSettings", () => {
  it("expands defaultTimings into channels flags", () => {
    const dto: ApiReminderSettings = {
      defaultTone: "Neutral",
      defaultTimings: {
        sms: true,
        email: false,
        threeDaysBefore: true,
        onDueDate: true,
        everyTwoDaysAfterOverdue: false,
      },
      smsEnabled: true,
      emailEnabled: false,
      messageLanguage: "bn",
      templates: {
        Friendly: {
          en: { sms: "x", emailSubject: "x", emailBody: "x" },
          bn: { sms: "x", emailSubject: "x", emailBody: "x" },
        },
        Neutral: {
          en: { sms: "x", emailSubject: "x", emailBody: "x" },
          bn: { sms: "x", emailSubject: "x", emailBody: "x" },
        },
        Firm: {
          en: { sms: "x", emailSubject: "x", emailBody: "x" },
          bn: { sms: "x", emailSubject: "x", emailBody: "x" },
        },
      },
    };
    const out = mapReminderSettings(dto);
    expect(out.tone).toBe("Neutral");
    expect(out.channels.sms).toBe(true);
    expect(out.channels.email).toBe(false);
    expect(out.channels.threeDaysBefore).toBe(true);
    expect(out.channels.onDueDate).toBe(true);
    expect(out.channels.everyTwoDaysAfterOverdue).toBe(false);
    expect(out.messageLanguage).toBe("bn");
  });
});

describe("mapReports", () => {
  it("rounds onTimeRate to a 0..100 integer and maps server buckets to UI labels", () => {
    const dto: ApiReports = {
      range: "6m",
      startDate: "2026-04-01",
      totals: { totalLent: 10_000, totalReceived: 4_000, outstanding: 6_000 },
      summary: {
        onTimeRate: 0.83,
        counts: { Paid: 1, Pending: 2, Overdue: 0 },
      },
      statusBreakdown: { Paid: 1, Pending: 2, Overdue: 0 },
      monthly: [{ key: "2026-09", label: "Sep", lent: 5_000, received: 2_000 }],
      topBorrowers: [
        { friendId: "f-1", name: "Rafi", outstanding: 6_000, loans: 3 },
      ],
      friendReliability: [
        {
          friendId: "f-1",
          name: "Rafi",
          loanCount: 3,
          onTimeCount: 3,
          onTimeRate: 1,
          label: "always_on_time",
        },
        {
          friendId: "f-2",
          name: "Tuli",
          loanCount: 5,
          onTimeCount: 2,
          onTimeRate: 0.4,
          label: "often_late",
        },
        {
          friendId: "f-3",
          name: "New",
          loanCount: 1,
          onTimeCount: 0,
          onTimeRate: 0,
          label: "insufficient_data",
        },
      ],
      averageDaysToRepay: 12,
      upcomingDueThisWeek: [
        {
          loanId: "loan-1",
          friendId: "f-1",
          friendName: "Rafi",
          amount: 5_000,
          remaining: 3_500,
          dueDate: "2026-10-05",
          daysRemaining: 3,
        },
      ],
    };
    const out = mapReports(dto);
    expect(out.onTimeRate).toBe(83);
    expect(out.reliability[0].bucket).toBe("always");
    expect(out.reliability[1].bucket).toBe("often");
    expect(out.reliability[2].bucket).toBe("sometimes");
    expect(out.upcoming[0].amount).toBe(3_500);
    expect(out.avgRepayDays).toBe(12);
  });
});

describe("mapProfile / mapPreferences", () => {
  it("threads profile through", () => {
    const dto: ApiProfile = {
      id: "u-1",
      email: "u@example.com",
      name: "U",
      phone: "+8801710000000",
      image: null,
    };
    const out = mapProfile(dto);
    expect(out.email).toBe("u@example.com");
    expect(out.phone).toBe("+8801710000000");
  });

  it("threads preferences through", () => {
    const dto: ApiPreferences = {
      language: "bn",
      theme: "dark",
      banglaNumerals: true,
      notifications: { emailOnPaid: false, emailOnOverdue: true, weeklySummary: true },
    };
    const out = mapPreferences(dto);
    expect(out.language).toBe("bn");
    expect(out.theme).toBe("dark");
    expect(out.banglaNumerals).toBe(true);
    expect(out.notifications.emailOnPaid).toBe(false);
  });
});

describe("mapApiLoan — defensive guard", () => {
  it("throws MalformedLoanError when the dto is null", () => {
    expect(() => mapApiLoan(null as unknown as ApiLoan)).toThrow(MalformedLoanError);
  });

  it("throws MalformedLoanError when the dto is undefined", () => {
    expect(() => mapApiLoan(undefined as unknown as ApiLoan)).toThrow(MalformedLoanError);
  });

  it("throws MalformedLoanError when the dto has no id (the original crash)", () => {
    // The crash from the user's report was a 201 POST that returned
    // { data, meta } and the service treated the envelope as the
    // loan. After the fix the api-client unwraps once, but the
    // guard is a backstop in case a future regression sneaks
    // through.
    const broken = { friend: baseLoan.friend, amount: 5000, amountPaid: 0, remaining: 5000 } as unknown as ApiLoan;
    expect(() => mapApiLoan(broken)).toThrow(MalformedLoanError);
  });

  it("throws MalformedLoanError when the dto is an empty object", () => {
    expect(() => mapApiLoan({} as ApiLoan)).toThrow(MalformedLoanError);
  });
});
