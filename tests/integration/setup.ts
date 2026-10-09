// Integration test harness.
//
// `TEST_DATABASE_URL` resolution order:
//   1. The process env (set by CI or a shell wrapper).
//   2. `.env.local` (developer convenience — we read it
//      directly so `npm run test:integration` works without
//      extra env wiring).
//
// The setup creates a Prisma client scoped to the test
// URL, runs `prisma db push` once (idempotent) to keep the
// schema in sync, and wipes every data table in `beforeAll`
// so each run is isolated.
//
// When neither source provides a URL, every integration test
// `it.skip`s with a clear message. Pure unit tests always run.

import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

let testPrisma: PrismaClient | null = null;
let resolvedTestUrl: string | null = null;

/** Read TEST_DATABASE_URL from the process env, falling back
 *  to `.env.local` (which is gitignored — never read
 *  anything else from there). */
function resolveTestDatabaseUrl(): string | null {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }
  const envLocal = "D:\\Loan_Reminder\\.env.local";
  if (!existsSync(envLocal)) return null;
  const lines = readFileSync(envLocal, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = /^\s*TEST_DATABASE_URL\s*=\s*"?([^"\s#]+)"?/.exec(line);
    if (m) return m[1];
  }
  return null;
}

/** True iff a test database URL is available. */
export function hasTestDb(): boolean {
  return Boolean(resolveTestDatabaseUrl());
}

/** Build a Prisma client pointing at TEST_DATABASE_URL. This
 *  intentionally bypasses the singleton in `src/lib/db.ts` so
 *  the test database can never leak into the dev server. */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    const url = resolveTestDatabaseUrl();
    if (!url) throw new Error("TEST_DATABASE_URL is not set");
    testPrisma = new PrismaClient({ datasourceUrl: url });
    resolvedTestUrl = url;
  }
  return testPrisma;
}

/** Sync the test database schema. Idempotent. Runs
 *  `prisma db push` so we don't need a `migrations/` dir. */
export function migrateTestDb(): void {
  const url = resolveTestDatabaseUrl();
  if (!url) return;
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  execSync("npx prisma db push --skip-generate", { env, stdio: "pipe" });
}

/** Wipe every data table. The order matters: child rows
 *  before parents. We use the safe-but-slow deleteMany path
 *  so the test works against any Postgres without elevated
 *  privileges. */
export async function cleanTables(prisma: PrismaClient): Promise<void> {
  await prisma.reminderLog.deleteMany();
  await prisma.rescheduleEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.friend.deleteMany();
  await prisma.reminderSettings.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
}

/** Cleanup hook. Call in `afterAll`. */
export async function closeTestPrisma(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

export { resolvedTestUrl };
