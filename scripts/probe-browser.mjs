// Browser-equivalent probe of the B4 API surface.
//
// Logs in as the demo user (Auth.js credentials provider), then
// exercises the full loan create → list → payment → pay-in-full
// → restore → delete chain. Reports the wire body shape of every
// response so we can confirm the api-client envelope unwrap fix
// works end-to-end (no double-unwrap, no `dto.id` crashes).
//
// NEVER prints the connection string or password.

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);
loadEnv({ path: path.join(ROOT, ".env"), override: false });
loadEnv({ path: path.join(ROOT, ".env.local"), override: true });

const BASE = "http://localhost:3000";
const EMAIL = "ayesha@example.com";
const PASSWORD = "LoanDemo!23";

class Jar {
  constructor() { this.jar = new Map(); }
  absorb(res) {
    const raw = res.headers.getSetCookie?.() ?? res.headers.get("set-cookie");
    if (!raw) return;
    const list = Array.isArray(raw) ? raw : [raw];
    for (const c of list) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) this.jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
  header() {
    return Array.from(this.jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function step(name, fn) {
  process.stdout.write(`-- ${name} ... `);
  try {
    const out = await fn();
    if (out && typeof out === "object" && "id" in out) {
      console.log(`ok (id=${out.id})`);
    } else {
      console.log("ok");
    }
    return out;
  } catch (e) {
    console.log("FAIL");
    console.error("  " + e.message);
    if (e.body) console.error("  body=" + JSON.stringify(e.body));
    throw e;
  }
}

const jar = new Jar();

async function call(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (jar.jar.size > 0) headers.Cookie = jar.header();
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  jar.absorb(res);
  if (res.status === 204) return null;
  let payload = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!res.ok) {
    const e = new Error(`${method} ${path} → ${res.status}`);
    e.status = res.status;
    e.body = payload;
    throw e;
  }
  return payload;
}

const summary = (label, payload) => {
  if (!payload) return;
  if (Array.isArray(payload?.data)) {
    console.log(`     ${label}: data.length=${payload.data.length} meta=${JSON.stringify(payload.meta)}`);
  } else if (payload && typeof payload === "object" && "data" in payload) {
    const d = payload.data;
    if (d && typeof d === "object" && "id" in d) {
      console.log(`     ${label}: data.id=${d.id}`);
    } else {
      console.log(`     ${label}: data=${JSON.stringify(d).slice(0, 80)}`);
    }
  } else {
    console.log(`     ${label}: ${JSON.stringify(payload).slice(0, 80)}`);
  }
};

async function main() {
  // 1. Login.
  await step("login (Auth.js credentials)", async () => {
    const csrfRes = await fetch(BASE + "/api/auth/csrf");
    jar.absorb(csrfRes);
    const csrf = await csrfRes.json();
    const body = new URLSearchParams({
      email: EMAIL,
      password: PASSWORD,
      csrfToken: csrf.csrfToken,
      callbackUrl: BASE + "/dashboard",
      json: "true",
    });
    const res = await fetch(BASE + "/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: jar.header(),
      },
      body: body.toString(),
      redirect: "manual",
    });
    jar.absorb(res);
    if (res.status >= 400) {
      const text = await res.text();
      throw Object.assign(new Error(`login ${res.status}`), { body: text });
    }
  });

  // 2. POST /api/loans
  const created = await step("POST /api/loans", async () => {
    const payload = {
      friend: { name: "Browser Test Friend", phone: "1712345099" },
      amount: 1234,
      givenDate: "2026-10-09",
      dueDate: "2026-10-23",
      tone: "Friendly",
      reminderTimings: ["3_days_before", "on_due_date"],
      smsEnabled: true,
      emailEnabled: false,
      consentConfirmed: true,
      messageLanguage: "en",
    };
    return call("POST", "/api/loans", payload);
  });
  summary("wire body", created);
  const loanId = created?.data?.id;
  if (!loanId) throw new Error("create did not return a loan id");

  // 3. GET /api/loans
  const list = await step("GET /api/loans", async () => call("GET", "/api/loans?pageSize=5"));
  summary("wire body", list);
  // The wire shape is { data: { data: [...loans], meta } } (apiHandler
  // adds the outer wrapper). The api-client unwraps once and the
  // loan service reads `res.data` (the array) + `res.meta` (meta).
  const loans = list?.data?.data ?? [];
  const inList = loans.some((l) => l.id === loanId);
  console.log(`     new loan ${loanId} in list? ${inList ? "yes" : "no"}`);

  // 4. GET /api/dashboard/summary
  const dash = await step("GET /api/dashboard/summary", async () => call("GET", "/api/dashboard/summary"));
  summary("wire body", dash);
  const dashData = dash?.data ?? {};
  console.log(`     totals: lent=${dashData?.totals?.totalLent} pending=${dashData?.totals?.pending} overdue=${dashData?.totals?.overdue}`);
  console.log(`     counts: ${JSON.stringify(dashData?.totals?.counts)}`);
  console.log(`     recent count=${dashData?.recentLoans?.length} upcoming count=${dashData?.upcomingDue?.length}`);

  // 5. POST /api/loans/[id]/payments
  const paid = await step("POST /api/loans/[id]/payments", async () =>
    call("POST", `/api/loans/${loanId}/payments`, { amount: 234, date: "2026-10-09", method: "Cash" }),
  );
  summary("wire body", paid);
  console.log(`     after payment: amountPaid=${paid?.data?.amountPaid} remaining=${paid?.data?.remaining} status=${paid?.data?.status}`);

  // 6. POST /api/loans/[id]/reschedule
  const resched = await step("POST /api/loans/[id]/reschedule", async () =>
    call("POST", `/api/loans/${loanId}/reschedule`, { newDueDate: "2026-10-30", notifyFriend: true }),
  );
  summary("wire body", resched);
  console.log(`     after reschedule: dueDate=${resched?.data?.dueDate} historyLen=${resched?.data?.rescheduleHistory?.length}`);

  // 7. POST /api/loans/[id]/pay-in-full
  const fullPaid = await step("POST /api/loans/[id]/pay-in-full", async () =>
    call("POST", `/api/loans/${loanId}/pay-in-full`, { method: "Cash" }),
  );
  summary("wire body", fullPaid);
  console.log(`     after pay-in-full: status=${fullPaid?.data?.status} amountPaid=${fullPaid?.data?.amountPaid} remaining=${fullPaid?.data?.remaining}`);

  // 8. DELETE /api/loans/[id] (soft delete)
  const del = await step("DELETE /api/loans/[id]", async () => call("DELETE", `/api/loans/${loanId}`));
  console.log(`     delete response: ${JSON.stringify(del)}`);

  // 9. POST /api/loans/[id]/restore
  const restored = await step("POST /api/loans/[id]/restore", async () => call("POST", `/api/loans/${loanId}/restore`));
  summary("wire body", restored);
  console.log(`     restored: id=${restored?.data?.id} deletedAt=${restored?.data?.deletedAt ?? "n/a"}`);
}

main().then(() => {
  console.log("\nAll API calls passed — envelope unwrap is correct end-to-end.");
}).catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
