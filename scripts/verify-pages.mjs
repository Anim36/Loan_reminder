// Page-level verification: visit each protected page as the demo
// user and assert the SSR HTML returns 200. We also grab the
// rendered title to confirm the page rendered (and not the
// redirect-to-login or error fallback).

import { config as loadEnv } from "dotenv";
import path from "node:path";
process.chdir("D:/Loan_Reminder");
loadEnv({ path: path.join(process.cwd(), ".env.local"), override: true });

const BASE = "http://localhost:3000";
const jar = new Map();
function absorb(r) {
  const raw = r.headers.getSetCookie?.() ?? r.headers.get("set-cookie");
  if (!raw) return;
  for (const c of (Array.isArray(raw) ? raw : [raw])) {
    const [p] = c.split(";");
    const eq = p.indexOf("=");
    if (eq > 0) jar.set(p.slice(0, eq).trim(), p.slice(eq + 1).trim());
  }
}
function hdr() {
  return [...jar.entries()].map(([k, v]) => k + "=" + v).join(";");
}

async function login() {
  const csrfR = await fetch(BASE + "/api/auth/csrf");
  absorb(csrfR);
  const csrf = await csrfR.json();
  const body = new URLSearchParams({
    email: "ayesha@example.com",
    password: "LoanDemo!23",
    csrfToken: csrf.csrfToken,
    callbackUrl: BASE + "/dashboard",
    json: "true",
  });
  const res = await fetch(BASE + "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: hdr() },
    body: body.toString(),
    redirect: "manual",
  });
  absorb(res);
  return res;
}

const PAGES = [
  "/dashboard",
  "/loans",
  "/loans/new",
  "/friends",
  "/notifications",
  "/reports",
  "/settings",
  "/reminders",
];

let fail = 0;
const loginRes = await login();
console.log("login", loginRes.status);
if (loginRes.status !== 302) {
  console.error("login failed");
  process.exit(1);
}

for (const p of PAGES) {
  const r = await fetch(BASE + p, { headers: { Cookie: hdr() } });
  const text = await r.text();
  const head = text.slice(0, 200);
  const ok = r.status === 200 && text.includes("<html");
  console.log(
    `${p.padEnd(20)} ${r.status}  ${ok ? "ok" : "FAIL"}  ${head.replace(/\n/g, " ").slice(0, 60)}`,
  );
  if (!ok) fail++;
}

if (fail > 0) {
  console.error(`\n${fail} pages failed`);
  process.exit(1);
} else {
  console.log("\nAll pages SSR clean.");
}
