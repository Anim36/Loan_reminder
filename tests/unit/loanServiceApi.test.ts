// Unit tests for the B4 loanService wrappers that sit on top of
// the api-client. We mock `global.fetch` and verify that:
//
//   1. The single-resource POST / PATCH / DELETE / POST-restore /
//      POST-reschedule / POST-pay-in-full all return a mapped UI
//      `Loan`. The api-client returns the wire body as-is, the
//      service reads `.data` exactly once, and the mapper turns
//      the DTO into the UI shape.
//   2. 204 DELETE → no JSON parse, no thrown error.
//   3. The list GET returns the flat `{ data, meta }` shape (the
//      route uses `listMode: true` on the server). The service
//      reads `.data` (the array) and `.meta` (page info).
//   4. The api-client error path is honoured: 422 / 404 / 401
//      errors surface as `ApiError` and the service does not
//      swallow them. 404 maps to `undefined` for the read paths.
//
// Together with the `apiClient.test.ts` cases, these tests pin
// down the "api-client returns the raw body, services read .data
// exactly once" rule.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";
import {
  addPayment,
  createLoan,
  deleteLoan,
  deletePayment,
  getLoan,
  getLoans,
  getLoansPaged,
  markFullyPaid,
  rescheduleLoan,
  restoreLoan,
  sendReminderNow,
  updateLoan,
} from "@/services/loanService";
import type { Loan } from "@/types/loan";

/* ---- fetch mock (same shape as apiClient.test.ts) ------------------- */

interface MockResponse {
  status: number;
  body?: string | object | null;
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
    const headers = new Headers();
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

/* ---- shared fixtures ----------------------------------------------- */

const baseLoan = {
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

function expectUiLoan(loan: Loan) {
  expect(loan.id).toBe("loan-1");
  expect(loan.dateGiven).toBe("2026-09-20");
  expect(loan.dueDate).toBe("2026-10-05");
  expect(loan.reminders.sms).toBe(true);
  expect(loan.consent).toBe(true);
}

/* ---- tests --------------------------------------------------------- */

describe("loanService — single-resource mutations return a mapped UI Loan", () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installWindow();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("createLoan (201 { data: ApiLoan }) → mapped Loan", async () => {
    const mock = makeMockFetch([{ status: 201, body: { data: baseLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await createLoan({
      friend: { name: "Rafi", phone: "1711234567" },
      amount: 5000,
      dateGiven: "2026-09-20",
      dueDate: "2026-10-05",
      tone: "Friendly",
      reminders: { sms: true, email: false },
      consent: true,
    });
    expectUiLoan(out);
    expect(mock.calls[0].url).toBe("http://localhost/api/loans");
  });

  it("updateLoan (200 { data: ApiLoan }) → mapped Loan", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: baseLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await updateLoan("loan-1", { amount: 6000 });
    expect(out).toBeDefined();
    expectUiLoan(out!);
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1");
  });

  it("addPayment (200 { data: ApiLoan }) → mapped Loan", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: baseLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await addPayment("loan-1", { amount: 1000, date: "2026-10-01", method: "Cash" });
    expect(out).toBeDefined();
    expectUiLoan(out!);
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1/payments");
  });

  it("deletePayment (200 { data: ApiLoan }) → mapped Loan", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: baseLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await deletePayment("loan-1", "p-1");
    expect(out).toBeDefined();
    expectUiLoan(out!);
    expect(mock.calls[0].url).toBe(
      "http://localhost/api/loans/loan-1/payments/p-1",
    );
  });

  it("markFullyPaid (200 { data: ApiLoan }) → mapped Loan", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: baseLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await markFullyPaid("loan-1");
    expect(out).toBeDefined();
    expectUiLoan(out!);
    expect(mock.calls[0].url).toBe(
      "http://localhost/api/loans/loan-1/pay-in-full",
    );
  });

  it("rescheduleLoan (200 { data: ApiLoan }) → mapped Loan", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: baseLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await rescheduleLoan("loan-1", { to: "2026-10-20" });
    expect(out).toBeDefined();
    expectUiLoan(out!);
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1/reschedule");
  });

  it("restoreLoan (200 { data: ApiLoan }) → mapped Loan", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: baseLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await restoreLoan("loan-1");
    expect(out).toBeDefined();
    expectUiLoan(out!);
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1/restore");
  });

  it("getLoan (200 { data: ApiLoan }) → mapped Loan", async () => {
    const mock = makeMockFetch([{ status: 200, body: { data: baseLoan } }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getLoan("loan-1");
    expect(out).toBeDefined();
    expectUiLoan(out!);
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1");
  });

  it("getLoan (404) → undefined (no crash)", async () => {
    const mock = makeMockFetch([
      { status: 404, body: { error: { code: "loan_not_found", message: "loan_not_found" } } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getLoan("missing");
    expect(out).toBeUndefined();
  });

  it("deleteLoan (204) returns void (no JSON parse)", async () => {
    const mock = makeMockFetch([{ status: 204, body: null }]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    await expect(deleteLoan("loan-1")).resolves.toBeUndefined();
    expect(mock.calls[0].url).toBe("http://localhost/api/loans/loan-1");
  });

  it("sendReminderNow (200 { data: { queuedLogIds, delivered } }) → typed result", async () => {
    const mock = makeMockFetch([
      { status: 200, body: { data: { queuedLogIds: ["r-1"], delivered: true } } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await sendReminderNow("loan-1");
    expect(out.queuedLogIds).toEqual(["r-1"]);
    expect(out.delivered).toBe(true);
  });
});

describe("loanService — list endpoint uses the flat { data, meta } wire body", () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installWindow();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("getLoans → array of mapped Loans (reads .data off the flat list envelope)", async () => {
    const mock = makeMockFetch([
      {
        status: 200,
        body: {
          data: [baseLoan],
          meta: { page: 1, pageSize: 20, total: 1 },
        },
      },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getLoans();
    expect(out).toHaveLength(1);
    expectUiLoan(out[0]);
  });

  it("getLoansPaged → returns full pagination info (page, pageSize, total)", async () => {
    const mock = makeMockFetch([
      {
        status: 200,
        body: {
          data: [baseLoan],
          meta: { page: 2, pageSize: 5, total: 12 },
        },
      },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    const out = await getLoansPaged({ page: 2, pageSize: 5 });
    expect(out.loans).toHaveLength(1);
    expect(out.page).toBe(2);
    expect(out.pageSize).toBe(5);
    expect(out.total).toBe(12);
  });

  it("getLoansPaged → throws on a malformed response (no .data array)", async () => {
    const mock = makeMockFetch([
      // Wrong shape — the service should refuse, not crash on
      // `res.data.map`.
      { status: 200, body: { foo: "bar" } },
    ]);
    globalThis.fetch = mock.fn as unknown as typeof fetch;
    await expect(getLoansPaged()).rejects.toBeInstanceOf(ApiError);
  });
});

describe("loanService — surfaces ApiError with code + fields", () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installWindow();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    restoreWindow();
  });

  it("createLoan re-throws a 422 with field errors", async () => {
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
    let caught: unknown;
    try {
      await createLoan({
        friend: { name: "Rafi", phone: "1" },
        amount: 0,
        dateGiven: "2026-09-20",
        dueDate: "2026-10-05",
        tone: "Friendly",
        reminders: { sms: true, email: false },
        consent: true,
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    const e = caught as ApiError;
    expect(e.status).toBe(422);
    expect(e.code).toBe("validation_error");
    expect(e.fields).toEqual({ amount: ["amount_too_small"] });
  });
});
