// B5 verification: hit every B4 endpoint as the demo user and
// assert the response shape is what the api-client expects.
// Also creates a friend + a loan + a payment so we can confirm
// the post-mutation envelope shape.

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

const jar = new Map();
function absorb(res) {
  const raw = res.headers.getSetCookie?.() ?? res.headers.get("set-cookie");
  if (!raw) return;
  const list = Array.isArray(raw) ? raw : [raw];
  for (const c of list) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}
function header() {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function jget(url) {
  const r = await fetch(BASE + url, { headers: { Cookie: header() } });
  absorb(r);
  return r;
}
async function jpost(url, body) {
  const r = await fetch(BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: header() },
    body: JSON.stringify(body),
  });
  absorb(r);
  return r;
}
async function jpatch(url, body) {
  const r = await fetch(BASE + url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: header() },
    body: JSON.stringify(body),
  });
  absorb(r);
  return r;
}
async function jdelete(url) {
  const r = await fetch(BASE + url, {
    method: "DELETE",
    headers: { Cookie: header() },
  });
  absorb(r);
  return r;
}

function assert(cond, msg) {
  if (!cond) {
    console.error("  FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("  ok  :", msg);
  }
}

async function login() {
  const csrfRes = await fetch(BASE + "/api/auth/csrf");
  absorb(csrfRes);
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
      Cookie: header(),
    },
    body: body.toString(),
    redirect: "manual",
  });
  absorb(res);
  return res;
}

console.log("== Auth ==");
const loginRes = await login();
assert(loginRes.status === 302, `login → 302 (got ${loginRes.status})`);

console.log("== Reads ==");
{
  const r = await jget("/api/loans");
  const body = await r.json();
  assert(r.status === 200, `/api/loans → 200 (got ${r.status})`);
  assert(Array.isArray(body.data), `/api/loans has data[] (array)`);
  assert(typeof body.meta?.total === "number", `/api/loans has meta.total`);
}
{
  const r = await jget("/api/dashboard/summary");
  const body = await r.json();
  assert(r.status === 200, `/api/dashboard/summary → 200 (got ${r.status})`);
  assert(typeof body.data?.totals?.totalLent === "number", `dashboard has data.totals.totalLent`);
}
{
  const r = await jget("/api/friends");
  const body = await r.json();
  assert(r.status === 200, `/api/friends → 200 (got ${r.status})`);
  assert(Array.isArray(body.data), `/api/friends has data[]`);
}
{
  const r = await jget("/api/notifications");
  const body = await r.json();
  assert(r.status === 200, `/api/notifications → 200 (got ${r.status})`);
  assert(Array.isArray(body.data), `/api/notifications has data[]`);
}
{
  const r = await jget("/api/notifications/unread-count");
  const body = await r.json();
  assert(r.status === 200, `/api/notifications/unread-count → 200`);
  assert(typeof body.count === "number", `unread-count has count`);
}
{
  const r = await jget("/api/settings/profile");
  const body = await r.json();
  assert(r.status === 200, `/api/settings/profile → 200`);
  assert(typeof body.data?.email === "string", `profile.data.email is string`);
}
{
  const r = await jget("/api/settings/preferences");
  const body = await r.json();
  assert(r.status === 200, `/api/settings/preferences → 200`);
  assert(typeof body.data?.language === "string", `preferences.data.language is string`);
}
{
  const r = await jget("/api/reminders/settings");
  const body = await r.json();
  assert(r.status === 200, `/api/reminders/settings → 200`);
  assert(body.data, `reminders.data exists`);
}
{
  const r = await jget("/api/reminders/history?pageSize=5");
  const body = await r.json();
  assert(r.status === 200, `/api/reminders/history → 200`);
  assert(Array.isArray(body.data), `reminders/history has data[]`);
  assert(body.stats, `reminders/history has stats`);
}
{
  const r = await jget("/api/reports?range=6m");
  const body = await r.json();
  assert(r.status === 200, `/api/reports → 200`);
  // The wire body is `{ data: { summary, monthly, … } }` —
  // the mapper unwraps `summary.totalLent` into the UI's
  // top-level `totalLent`. The mapper is unit-tested in
  // `mappers.test.ts` and verified in the browser below.
  assert(typeof body.data?.summary?.onTimeRate === "number", `reports.data.summary.onTimeRate is number`);
}

console.log("== PATCH profile / preferences ==");
{
  const r = await jpatch("/api/settings/preferences", { banglaNumerals: false });
  const body = await r.json();
  assert(r.status === 200, `PATCH /api/settings/preferences → 200`);
  assert(typeof body.data?.language === "string", `preferences patch returns data.language`);
}

console.log("== Create loan (inline friend) + payment ==");
let loanId;
{
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const r = await jpost("/api/loans", {
    friend: { name: "B5 Verify Friend", phone: "+8801712345999" },
    amount: 1000,
    givenDate: today,
    dueDate: due,
    smsEnabled: false,
    emailEnabled: false,
    reminderTimings: ["3_days_before", "on_due_date"],
    tone: "Friendly",
    messageLanguage: "en",
    consentConfirmed: true,
  });
  const body = await r.json();
  assert(r.status === 201, `POST /api/loans → 201 (got ${r.status})`);
  assert(typeof body.data?.id === "string", `loan.data.id is string`);
  loanId = body.data?.id;
}
if (loanId) {
  const r = await jpost(`/api/loans/${loanId}/payments`, {
    amount: 500,
    date: new Date().toISOString().slice(0, 10),
    method: "Cash",
  });
  const body = await r.json();
  assert(r.status === 200, `POST /api/loans/:id/payments → 200 (got ${r.status})`);
  assert(typeof body.data?.id === "string", `payment result is a loan DTO`);
  // 204 DELETE works:
  const del = await jdelete(`/api/loans/${loanId}`);
  assert(del.status === 204, `DELETE /api/loans/:id → 204 (got ${del.status})`);
  const text = await del.text();
  assert(text === "", `DELETE body is empty (got ${JSON.stringify(text).slice(0, 50)})`);
  // 404 DELETE on the already-soft-deleted loan:
  const del2 = await jdelete(`/api/loans/${loanId}`);
  assert(del2.status === 404, `DELETE again → 404 (got ${del2.status})`);
}

console.log("== Errors ==");
{
  const r = await jpost("/api/loans", { amount: -1 });
  assert(r.status === 422, `bad POST /api/loans → 422 (got ${r.status})`);
  const body = await r.json();
  assert(body.error?.code, `error has code (${body.error?.code})`);
}
{
  const r = await jget("/api/loans/missing");
  assert(r.status === 404, `GET /api/loans/missing → 404 (got ${r.status})`);
}

console.log("\nDone.");
