// Read-only Neon probe for the demo user's loans, focused on
// duplicates created by the earlier failed-retries today.
//
// Counts first (no PII), then a detailed list of suspect rows
// (id suffix, friend name, amount, createdAt). NOTHING is
// deleted; the script is a SELECT-only audit.
//
// We connect via the live `DATABASE_URL` (Neon) by reading
// `.env.local` and `.env` in that order. Connection details
// are never printed.

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();
loadEnv({ path: path.join(ROOT, ".env"), override: false });
loadEnv({ path: path.join(ROOT, ".env.local"), override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in .env / .env.local");
  process.exit(1);
}
const u = new URL(url);
console.log(
  "connecting to",
  `${u.protocol}//${u.username}@${u.hostname}${u.pathname}?sslmode=…`,
);

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.findUnique({
    where: { email: "ayesha@example.com" },
    select: { id: true, email: true, name: true },
  });
  if (!demo) {
    console.error("demo user not found");
    process.exit(1);
  }
  console.log("demo user id:", demo.id, "name:", demo.name);

  // Counts (no PII).
  const [users, friends, loans, payments, notifications, softDeletedLoans] =
    await Promise.all([
      prisma.user.count(),
      prisma.friend.count({ where: { userId: demo.id } }),
      prisma.loan.count({ where: { userId: demo.id, deletedAt: null } }),
      prisma.payment.count({
        where: { loan: { userId: demo.id, deletedAt: null } },
      }),
      prisma.notification.count({ where: { userId: demo.id } }),
      prisma.loan.count({ where: { userId: demo.id, deletedAt: { not: null } } }),
    ]);
  console.log("counts: users=%d friends=%d loans=%d payments=%d notifications=%d (soft-deleted loans=%d)",
    users, friends, loans, payments, notifications, softDeletedLoans,
  );

  // Today's window: today in UTC. We pick midnight-to-now so
  // the script always reflects the current day regardless of
  // timezone.
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  console.log("day window (UTC):", startOfDay.toISOString(), "→", now.toISOString());

  const todayLoans = await prisma.loan.findMany({
    where: {
      userId: demo.id,
      createdAt: { gte: startOfDay, lte: now },
    },
    select: {
      id: true,
      amount: true,
      givenDate: true,
      createdAt: true,
      deletedAt: true,
      friend: { select: { id: true, name: true, phone: true } },
      payments: { select: { id: true, amount: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log("loans created today:", todayLoans.length);

  // Group by (friendId, amount, givenDate) — anything appearing
  // 2+ times is a likely duplicate.
  const groups = new Map();
  for (const l of todayLoans) {
    const key = `${l.friend.id}|${l.amount}|${l.givenDate.toISOString().slice(0, 10)}`;
    const list = groups.get(key) ?? [];
    list.push(l);
    groups.set(key, list);
  }
  const dupes = [...groups.entries()].filter(([, v]) => v.length > 1);
  console.log("duplicate groups (friend + amount + givenDate):", dupes.length);

  for (const [, rows] of dupes) {
    console.log(
      "  friend=%s amount=%d given=%s count=%d",
      rows[0].friend.name,
      rows[0].amount,
      rows[0].givenDate.toISOString().slice(0, 10),
      rows.length,
    );
    for (const r of rows) {
      console.log(
        "    id=%s friend=%s amount=%d created=%s deleted=%s",
        r.id,
        r.friend.name,
        r.amount,
        r.createdAt.toISOString(),
        r.deletedAt ? "yes" : "no",
      );
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
