// Unit tests for the B4 service wrappers other than loanService
// (friendService, notificationService, settingsService,
// reportService, reminderService).
//
// Each test pins the same rule the api-client tests cover:
//
//   1. The api-client returns the wire body as-is. Services read
//      `.data` exactly once for single-resource endpoints and
//      `.data` (the array) + `.meta` (page info) for list
//      endpoints.
//   2. 204 returns `null`; the service must not try to parse a
//      body that doesn't exist.
//   3. 401 / 404 / 422 surface as `ApiError` with the server's
//      stable `code` so the UI can translate the error.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";
import { getFriend, getFriends, getFriendDetail } from "@/services/friendService";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
} from "@/services/notificationService";
import {
  getPreferences,
  getProfile,
  getUserSettings,
  updatePreferences,
  updateProfile,
} from "@/services/settingsService";
import { computeReport, downloadReportCsv } from "@/services/reportService";
import { getReminderSettings, getReminderHistoryPaged } from "@/services/reminderService";

/* ---- fetch mock (shared) -------------------------------------------- */

interface MockResponse {
  status: number;
  body?: string | object | null;
  headers?: Record<string, string>;
}

function makeMockFetch(
  responses: Array<MockResponse | ((url: string, init: RequestInit) => MockResponse)>,
): { fn: typeof fetch; calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    const reqInit: RequestInit = init ?? {};
    calls.push({ url, init: reqInit });
    const r = responses[i++];
    const resolved = typeof r === "function" ? r(url, reqInit) : r;
    const headers = new Headers(resolved?.headers ?? {});
    if (
      resolved?.body !== undefined &&
      resolved?.body !== null &&
      resolved?.body !== ""
    ) {
      headers.set(
        "Content-Type",
        typeof resolved.body === "string" ? "text/plain" : "application/json",
      );
    }
    return new Response(
      resolved?.body === null || resolved?.body === undefined
        ? null
        : typeof resolved.body === "string"
          ? resolved.body
          : JSON.stringify(resolved.body),
      { status: resolved?.status ?? 200, headers },
    );
  }) as unknown as typeof fetch;
  return { fn, calls };
}

function installWindow() {
  const fakeWindow = {
    location: {
      origin: "http://localhost",
      pathname: "/",
      search: "",
      href: "http://localhost/",
      assign: () => {},
    },
  };
  (globalThis as { window: unknown }).window = fakeWindow;
}

function restoreWindow() {
  delete (globalThis as { window?: unknown }).window;
}

/* ---- fixtures -------------------------------------------------------- */

const friendListItem = {
  id: "f-1",
  name: "Rafi",
  phone: "+8801711234567",
  email: null,
  loanCount: 3,
  totalLent: 12000,
  totalRepaid: 4000,
  outstanding: 8000,
  worstStatus: "Pending" as const,
};

const friendDetail = {
  friend: { id: "f-1", name: "Rafi", phone: "+8801711234567", email: null },
  totals: {
    loanCount: 3,
    totalLent: 12000,
    totalRepaid: 4000,
    outstanding: 8000,
    worstStatus: "Pending" as const,
  },
  loans: [],
  reminderHistory: [],
};

const notification = {
  id: "n-1",
  type: "loan-paid",
  titleKey: "notif.paid",
  params: [5000],
  loanId: "loan-1",
  readAt: null,
  createdAt: "2026-10-01T09:00:00.000Z",
};

const profile = {
  id: "u-1",
  email: "ayesha@example.com",
  name: "Ayesha",
  phone: "+8801712345678",
  image: null,
};

const preferences = {
  language: "en",
  theme: "light",
  banglaNumerals: false,
  notifications: {
    emailOnPaid: true,
    emailOnOverdue: true,
    weeklySummary: false,
  },
};

const reports = {
  range: "6m" as const,
  startDate: "2026-04-01",
  totals: { totalLent: 12000, totalReceived: 4000, outstanding: 8000 },
  summary: { onTimeRate: 0.6, counts: { Pending: 2, Overdue: 1, Paid: 1 } },
  statusBreakdown: { Pending: 2, Overdue: 1, Paid: 1 },
  monthly: [],
  topBorrowers: [],
  friendReliability: [],
  averageDaysToRepay: 5,
  upcomingDueThisWeek: [],
};

const reminderSettings = {
  defaultTone: "Friendly",
  defaultTimings: {
    sms: true,
    email: true,
    threeDaysBefore: true,
    onDueDate: true,
    everyTwoDaysAfterOverdue: true,
  },
  smsEnabled: true,
  emailEnabled: true,
  messageLanguage: "en" as const,
  templates: {},
};

const reminderLog = {
  id: "l-1",
  loanId: "loan-1",
  friendName: "Rafi",
  amount: 5000,
  channel: "sms" as const,
  scheduledFor: "2026-10-01T09:00:00.000Z",
  sentAt: "2026-10-01T09:00:00.000Z",
  status: "Delivered" as const,
};

/* ---- tests ----------------------------------------------------------- */

describe("friendService — list + detail read the { data, … } envelope", () => {
  let originalFetch: typeof fetch | undefined;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installWindow();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("getFriends returns the mapped friend rows from the list envelope", async () => {
    const mock = makeMockFetch([
      {
        status: 200,
        body: {
          data: [friendListItem],
          meta: { page: 1, pageSize: 20, total: 1 },
        },
      },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getFriends();
    expect(out).toHaveLength(1);
    expect(out[0].friend.name).toBe("Rafi");
    expect(out[0].loanCount).toBe(3);
    expect(mock.calls[0].url).toBe("http://localhost/api/friends");
  });

  it("getFriend returns the summary fields from the single-resource envelope", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: friendDetail } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getFriend("f-1");
    expect(out?.friend.id).toBe("f-1");
    expect(out?.loanCount).toBe(3);
    expect(mock.calls[0].url).toBe("http://localhost/api/friends/f-1");
  });

  it("getFriendDetail returns the full detail shape", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: friendDetail } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getFriendDetail("f-1");
    expect(out?.totals.loanCount).toBe(3);
    expect(out?.friend.name).toBe("Rafi");
  });

  it("getFriend (404) → undefined (no crash)", async () => {
    const mock = makeMockFetch([
      { status: 404, body: { error: { code: "friend_not_found", message: "friend_not_found" } } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getFriend("missing");
    expect(out).toBeUndefined();
  });
});

describe("notificationService — list + unread count + mark-read (204)", () => {
  let originalFetch: typeof fetch | undefined;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installWindow();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("getNotifications returns the mapped list (reads .data)", async () => {
    const mock = makeMockFetch([
      {
        status: 200,
        body: {
          data: [notification],
          meta: { page: 1, pageSize: 20, total: 1 },
        },
      },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getNotifications();
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("n-1");
  });

  it("getUnreadCount returns the { count: N } body (not an envelope)", async () => {
    const mock = makeMockFetch([{ status: 200, body: { count: 4 } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getUnreadCount();
    expect(out).toBe(4);
    expect(mock.calls[0].url).toBe("http://localhost/api/notifications/unread-count");
  });

  it("markRead (204) returns void", async () => {
    const mock = makeMockFetch([{ status: 204, body: null }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    await expect(markRead("n-1")).resolves.toBeUndefined();
    expect(mock.calls[0].url).toBe("http://localhost/api/notifications/n-1/read");
  });

  it("markAllRead (204) returns void", async () => {
    const mock = makeMockFetch([{ status: 204, body: null }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    await expect(markAllRead()).resolves.toBeUndefined();
    expect(mock.calls[0].url).toBe("http://localhost/api/notifications/read-all");
  });
});

describe("settingsService — profile + preferences read the { data } envelope", () => {
  let originalFetch: typeof fetch | undefined;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installWindow();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("getUserSettings calls /profile and /preferences in parallel and maps both", async () => {
    const mock = makeMockFetch([
      { status: 200, body: { data: profile } },
      { status: 200, body: { data: preferences } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getUserSettings();
    expect(out.profile.email).toBe("ayesha@example.com");
    expect(out.preferences.language).toBe("en");
    expect(out.preferences.notifications.emailOnPaid).toBe(true);
    expect(mock.calls[0].url).toBe("http://localhost/api/settings/profile");
    expect(mock.calls[1].url).toBe("http://localhost/api/settings/preferences");
  });

  it("getProfile reads the profile DTO from the envelope", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: profile } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getProfile();
    expect(out.email).toBe("ayesha@example.com");
  });

  it("getPreferences reads the preferences DTO from the envelope", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: preferences } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getPreferences();
    expect(out.language).toBe("en");
    expect(out.banglaNumerals).toBe(false);
  });

  it("updateProfile PATCH { data: ApiProfile } returns mapped profile", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: profile } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await updateProfile({ name: "Ayesha", phone: null });
    expect(out.name).toBe("Ayesha");
    expect(mock.calls[0].url).toBe("http://localhost/api/settings/profile");
  });

  it("updatePreferences PATCH { data: ApiPreferences } returns mapped preferences", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: preferences } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await updatePreferences({ banglaNumerals: true });
    expect(out.banglaNumerals).toBe(false);
    expect(mock.calls[0].url).toBe("http://localhost/api/settings/preferences");
  });

  it("updatePreferences re-throws a 422 with field errors (translated upstream)", async () => {
    const mock = makeMockFetch([
      {
        status: 422,
        body: {
          error: {
            code: "validation_error",
            message: "validation_error",
            fields: { theme: ["theme_invalid"] },
          },
        },
      },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    await expect(updatePreferences({ theme: "neon" as unknown as "light" })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("reportService — single resource + blob export", () => {
  let originalFetch: typeof fetch | undefined;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installWindow();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("computeReport returns the mapped snapshot from the envelope", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: reports } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await computeReport("6m");
    // UI `ReportsMapped` exposes `totalLent` flat (not
    // `totals.lent`) — the snapshot is consumed directly by
    // the Reports page so the mapper keeps the top-level
    // fields. The server gives `0..1`; we expose `0..100`.
    expect(out.totalLent).toBe(12000);
    expect(out.totalReceived).toBe(4000);
    expect(out.outstanding).toBe(8000);
    expect(out.onTimeRate).toBe(60);
    expect(mock.calls[0].url).toContain("/api/reports");
    expect(mock.calls[0].url).toContain("range=6m");
  });

  it("downloadReportCsv fetches the binary CSV with the right URL", async () => {
    const csv = "id,name,amount\n1,Rafi,5000\n";
    const mock = makeMockFetch([
      { status: 200, body: csv, headers: { "Content-Type": "text/csv" } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    // `downloadReportCsv` reads `URL.createObjectURL` and
    // touches `document.body` after the fetch resolves, so it
    // can't run in a pure-node test environment. We stub the
    // DOM bits it touches (`document.createElement`,
    // `document.body.appendChild` / `removeChild`, and the
    // anchor's `click`) so the function can run end-to-end.
    const create = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test" as string);
    const origAppend = (globalThis as { document?: unknown }).document;
    (globalThis as { document: unknown }).document = {
      body: {
        appendChild: () => {
          /* no-op */
        },
        removeChild: () => {
          /* no-op */
        },
      },
      createElement: () => ({
        href: "",
        set download(_v: string) {
          /* no-op */
        },
        click: () => {
          /* no-op */
        },
        remove: () => {
          /* no-op */
        },
      }),
    };
    try {
      await downloadReportCsv("3m");
    } finally {
      create.mockRestore();
      (globalThis as { document: unknown }).document = origAppend;
    }
    expect(mock.calls[0].url).toContain("/api/reports/export.csv");
    expect(mock.calls[0].url).toContain("range=3m");
  });
});

describe("reminderService — settings + history list", () => {
  let originalFetch: typeof fetch | undefined;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installWindow();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("getReminderSettings reads the settings DTO from the envelope", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: reminderSettings } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getReminderSettings();
    // The wire shape stores `defaultTone`; the UI shape stores
    // `tone`. The service normalises wire → UI so the read
    // field is `tone` (and the wire value "Friendly" matches
    // the default).
    expect(out.tone).toBe("Friendly");
    expect(out.messageLanguage).toBe("en");
  });

  it("getReminderHistoryPaged reads .data + .meta + .stats off the envelope", async () => {
    const mock = makeMockFetch([
      {
        status: 200,
        body: {
          data: [reminderLog],
          meta: { page: 1, pageSize: 20, total: 1 },
          stats: { total: 1, delivered: 1, failed: 0 },
        },
      },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getReminderHistoryPaged();
    expect(out.items).toHaveLength(1);
    expect(out.total).toBe(1);
    expect(out.stats).toEqual({ total: 1, delivered: 1, failed: 0 });
  });
});
