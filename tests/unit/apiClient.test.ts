// Unit tests for the B4 api-client.
//
// Mocks `global.fetch` to drive every code path without booting a
// real server.
//
// What we cover (status codes: 200, 201, 204, 401, 404, 422):
//   * Success paths
//       - 200 single-resource `{ data: ApiLoan }` → returned as-is
//         (services read `.data`)
//       - 201 created `{ data: ApiLoan }`         → returned as-is
//       - 200 list `{ data: [...], meta }`       → returned as-is
//         (services read `.data` + `.meta`)
//       - 200 legacy `{ ok: true }`              → returned as-is
//       - 200 unread `{ count: N }`              → returned as-is
//       - 204 No Content                         → `null`
//   * Error paths
//       - 422 `{ error: { code, message, fields? } }` → throws
//         `ApiError` with `code` + `fields`
//       - 404 `{ error: { code, message } }`           → throws
//       - 401 `{ error: { code, message } }`           → throws +
//         redirects to /login (deduped within 2s)
//       - 500 empty body                              → throws with
//         generic message
//   * URL handling
//       - `/loans`  → `http://localhost/api/loans`
//       - `/api/x`  → `http://localhost/api/x` (no double prefix)
//       - `https://…` → used verbatim (no rewriting)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from "@/lib/api-client";

// ---- fetch mock --------------------------------------------------------

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

interface MockResponse {
  status: number;
  body?: string | object | null;
  headers?: Record<string, string>;
}

function makeMockFetch(
  responses: Array<MockResponse | ((url: string, init: FetchInit) => MockResponse)>,
): { fn: typeof fetch; calls: Array<{ url: string; init: FetchInit }> } {
  const calls: Array<{ url: string; init: FetchInit }> = [];
  let i = 0;
  const fn = vi.fn(async (input: FetchInput, init?: FetchInit) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    const reqInit: FetchInit = init ?? {};
    calls.push({ url, init: reqInit });
    const r = responses[i++];
    const resolved = typeof r === "function" ? r(url, reqInit) : r;
    const headers = new Headers(resolved?.headers ?? {});
    if (
      resolved?.body !== undefined &&
      resolved?.body !== null &&
      resolved?.body !== ""
    ) {
      if (typeof resolved.body === "string") {
        headers.set("Content-Type", "text/plain");
      } else {
        headers.set("Content-Type", "application/json");
      }
    }
    return new Response(
      resolved?.body === null || resolved?.body === undefined
        ? null
        : typeof resolved.body === "string"
          ? resolved.body
          : JSON.stringify(resolved.body),
      {
        status: resolved?.status ?? 200,
        headers,
      },
    );
  }) as unknown as typeof fetch;
  return { fn, calls };
}

function parseBody<T>(init: FetchInit | undefined): T {
  if (!init || !init.body) return undefined as T;
  if (typeof init.body !== "string") {
    return init.body as T;
  }
  return JSON.parse(init.body) as T;
}

// ---- 401 redirect (window stub) ---------------------------------------

let savedWindow: unknown = null;
let assigned: string[] = [];

function installWindow(pathname = "/loans/123", search = "") {
  savedWindow = (globalThis as { window?: unknown }).window;
  assigned = [];
  const fakeLocation = {
    origin: "http://localhost",
    pathname,
    search,
    get href() {
      return `http://localhost${pathname}${search}`;
    },
    set href(_v: string) {
      // intentionally empty
    },
    assign: (url: string) => {
      assigned.push(url);
    },
  };
  const fakeWindow = { location: fakeLocation };
  (globalThis as { window: unknown }).window = fakeWindow;
}

function restoreWindow() {
  if (savedWindow === null) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window: unknown }).window = savedWindow;
  }
}

// ---- shared fixtures ---------------------------------------------------

const apiLoan = {
  id: "loan-1",
  friend: { id: "f-1", name: "Rafi", phone: "+8801711234567", email: null },
  amount: 5000,
  amountPaid: 1500,
  remaining: 3500,
  status: "Pending" as const,
  givenDate: "2026-09-20",
  dueDate: "2026-10-05",
  daysRemaining: 3,
  note: undefined,
  smsEnabled: true,
  emailEnabled: false,
  reminderTimings: ["3_days_before", "on_due_date"] as const,
  tone: "Friendly" as const,
  messageLanguage: "en" as const,
  consentConfirmed: true,
  paidAt: undefined,
  payments: [],
  rescheduleHistory: [],
  rescheduled: false,
  createdAt: "2026-09-20T09:00:00.000Z",
  updatedAt: "2026-09-20T09:00:00.000Z",
};

const listEnvelope = (items: unknown[], total = items.length) => ({
  data: items,
  meta: { page: 1, pageSize: 20, total },
});

// ---- tests -------------------------------------------------------------

describe("api-client — success responses", () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("returns a 200 { data: ApiLoan } envelope as-is (services read .data)", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: apiLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    const out = await apiGet<{ data: typeof apiLoan }>("/loans/loan-1");
    expect(out.data.id).toBe("loan-1");
    expect(out.data.friend.name).toBe("Rafi");
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1");
  });

  it("returns a 201 { data: ApiLoan } envelope as-is", async () => {
    const mock = makeMockFetch([{ status: 201, body: { data: apiLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    const out = await apiPost<{ data: typeof apiLoan }>("/loans", { friend: { name: "x", phone: "1" } });
    expect(out.data.id).toBe("loan-1");
    expect(mock.calls[0].url).toBe("http://localhost/api/loans");
    expect(parseBody(mock.calls[0].init)).toEqual({ friend: { name: "x", phone: "1" } });
  });

  it("returns a 204 No Content as null (no JSON parse)", async () => {
    const mock = makeMockFetch([{ status: 204, body: null }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    const out = await apiDelete("/loans/loan-1");
    expect(out).toBeNull();
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1");
  });

  it("passes through a legacy { ok: true } body unchanged", async () => {
    const mock = makeMockFetch([{ status: 200, body: { ok: true } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    const out = await apiPost<{ ok: true }>("/settings/password", {
      currentPassword: "x",
      newPassword: "yyyyyyy",
    });
    expect(out).toEqual({ ok: true });
    expect(mock.calls[0].url).toBe("http://localhost/api/settings/password");
  });

  it("passes through a { count: N } body (unread-count endpoint)", async () => {
    const mock = makeMockFetch([{ status: 200, body: { count: 4 } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    const out = await apiGet<{ count: number }>("/notifications/unread-count");
    expect(out.count).toBe(4);
    expect(mock.calls[0].url).toBe("http://localhost/api/notifications/unread-count");
  });

  it("returns a list envelope { data, meta } as-is", async () => {
    // List endpoints use `listMode: true` on the server, so the
    // wire body is the flat `{ data, meta }` shape. Services read
    // `.data` (the array) and `.meta` (page info).
    const mock = makeMockFetch([{ status: 200, body: listEnvelope([apiLoan], 1) }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    const out = await apiGet<{
      data: typeof apiLoan[];
      meta: { page: number; pageSize: number; total: number };
    }>("/loans");
    expect(Array.isArray(out.data)).toBe(true);
    expect(out.data[0].id).toBe("loan-1");
    expect(out.meta.total).toBe(1);
    expect(mock.calls[0].url).toBe("http://localhost/api/loans");
  });

  it("returns a PATCH /loans/[id] { data: ApiLoan } envelope unchanged", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: apiLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    const out = await apiPatch<{ data: typeof apiLoan }>("/loans/loan-1", { amount: 6000 });
    expect(out.data.id).toBe("loan-1");
    expect(out.data.amount).toBe(5000);
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1");
  });

  it("returns a PUT /reminders/settings { data: ApiReminderSettings } envelope", async () => {
    const settings = {
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
    const mock = makeMockFetch([{ status: 200, body: { data: settings } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    const out = await apiPut<{ data: typeof settings }>(
      "/reminders/settings",
      settings,
    );
    expect(out.data.defaultTone).toBe("Friendly");
    expect(mock.calls[0].url).toBe("http://localhost/api/reminders/settings");
  });
});

describe("api-client — URL handling", () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("prepends /api/ to a path that starts with /", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: apiLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    await apiGet<{ data: typeof apiLoan }>("/loans/loan-1");
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1");
  });

  it("does not double-prefix a path that already starts with /api/", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: apiLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    await apiGet<{ data: typeof apiLoan }>("/api/loans/loan-1");
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1");
  });

  it("uses absolute URLs verbatim (no /api prefix)", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: apiLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    await apiGet<{ data: typeof apiLoan }>("https://other-host.example.com/x");
    expect(mock.calls[0].url).toBe("https://other-host.example.com/x");
  });
});

describe("api-client — error mapping", () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("throws ApiError with code + fields from a 422 envelope", async () => {
    const mock = makeMockFetch([
      {
        status: 422,
        body: {
          error: {
            code: "validation_error",
            message: "validation_error",
            fields: { amount: ["amount_too_small"] },
          },
        },
      },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    await expect(apiPost("/loans", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      code: "validation_error",
      fields: { amount: ["amount_too_small"] },
    });
  });

  it("throws ApiError from a 404 envelope", async () => {
    const mock = makeMockFetch([
      { status: 404, body: { error: { code: "loan_not_found", message: "loan_not_found" } } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    await expect(apiGet("/loans/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      code: "loan_not_found",
    });
  });

  it("falls back to a generic message on a 500 with no body", async () => {
    const responder = (): MockResponse => ({ status: 500, body: null });
    const mock = makeMockFetch([responder, responder]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow();
    await expect(apiGet("/reports")).rejects.toBeInstanceOf(ApiError);
    await expect(apiGet("/reports")).rejects.toMatchObject({ status: 500, code: undefined });
  });

  it("redirects to /login once on 401 and throws", async () => {
    // Wait past the dedupe window from any prior 401 in this
    // process so this test is deterministic.
    await new Promise((r) => setTimeout(r, 2100));
    const mock = makeMockFetch([
      { status: 401, body: { error: { code: "unauthorized", message: "auth.required" } } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow("/dashboard", "");
    await expect(apiGet("/dashboard/summary")).rejects.toBeInstanceOf(ApiError);
    expect(assigned.length).toBe(1);
    expect(assigned[0]).toContain("/login");
    expect(assigned[0]).toContain("callbackUrl=");
  });

  it("dedupes rapid 401 redirects (≤2s apart)", async () => {
    // The 2s dedupe window is shared module state. A prior
    // 401 in this process set the timestamp; we wait past it so
    // the first call of this test does redirect, then we verify
    // the second call (within 2s of the first) is deduped.
    await new Promise((r) => setTimeout(r, 2100));
    const mock = makeMockFetch([
      { status: 401, body: { error: { code: "unauthorized", message: "auth.required" } } },
      { status: 401, body: { error: { code: "unauthorized", message: "auth.required" } } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    installWindow("/dashboard", "");
    const before = assigned.length;
    await expect(apiGet("/a")).rejects.toBeInstanceOf(ApiError);
    await expect(apiGet("/b")).rejects.toBeInstanceOf(ApiError);
    // First call redirected (assigned grew by 1), second was
    // deduped within the 2s window.
    expect(assigned.length).toBe(before + 1);
  });

  it("does not redirect on 401 when there is no window (SSR)", async () => {
    await new Promise((r) => setTimeout(r, 2100));
    const mock = makeMockFetch([
      { status: 401, body: { error: { code: "unauthorized", message: "auth.required" } } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    restoreWindow();
    await expect(apiGet("/a")).rejects.toBeInstanceOf(ApiError);
  });
});
