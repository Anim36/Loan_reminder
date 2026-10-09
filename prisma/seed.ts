// Seed script — populate the database with the same demo data the
// localStorage mode uses (`src/data/loans.ts`). Running this script
// wipes the loans, friends, payments, reschedules, reminder logs and
// notifications tables for the demo user and re-creates them, so it's
// safe to re-run during development.
//
// Run with: `npm run db:seed`
//
// Conventions:
//  - Every monetary amount is stored in *poisha* (BDT × 100).
//  - Dates are date-only (`@db.Date`).
//  - All audit timestamps are UTC `Timestamptz(6)`.
//  - Loan status, `amountPaid`, and `remaining` are derived on read
//    by `lib/loanStatus.ts`; the seed doesn't pre-set them.
//
// Env loading
// -----------
// `tsx prisma/seed.ts` does NOT auto-load `.env` or `.env.local`.
// We load both here (same order as Next.js — `.env.local` on top)
// so the seed targets the same database the running app uses.
// `process.env` values that were already set (e.g. by the parent
// shell or `db-runner.mjs`) still win.

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
loadEnv({ path: path.join(ROOT, ".env"), override: false });
loadEnv({ path: path.join(ROOT, ".env.local"), override: true });

if (process.env.DATABASE_URL) {
  // Show a redacted host:port so the seed log makes it obvious
  // which database is being written to.
  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log(`Seeding against ${u.protocol}//${u.host}${u.pathname} (credentials redacted).`);
  } catch {
    console.log("Seeding against <unparseable DATABASE_URL>.");
  }
} else {
  console.warn("DATABASE_URL is not set — Prisma will fall back to its default. Set it in .env or .env.local.");
}

import { PrismaClient, Prisma, type MessageLanguage, type Tone } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/* ---- Seed constants ----------------------------------------------- */

/** The single demo user. Auth.js / email+password wiring lives
 *  outside the seed, but the `id` is deterministic so a follow-up
 *  sign-in can be linked to this row. */
const USER_ID = "user-ayesha-demo";
const USER_EMAIL = "ayesha@example.com";
const USER_NAME = "Ayesha";
const USER_PHONE = "1712345678";
const USER_LANGUAGE = "en";
const USER_BANGLA_NUMERALS = false;

/**
 * Demo password for the seeded user. Documented in README —
 * this is a **development-only** credential and must never be
 * used in production. The cost factor is 12, matching the
 * signup flow.
 */
const DEMO_PASSWORD = "LoanDemo!23";
const DEMO_PASSWORD_HASH = bcrypt.hashSync(DEMO_PASSWORD, 12);

/** The default reminder templates — copied from
 *  `src/services/reminderService.ts` so the demo matches the
 *  localStorage fallback. */
const TONE_TEMPLATES = {
  Friendly: {
    en: {
      sms: "Hi {friend_name}, just a gentle reminder about the {amount} I lent you, due on {due_date}. Please let me know if you need more time. Thank you! — {my_name}",
      emailSubject: "A reminder about your loan, {friend_name}",
      email: "Hi {friend_name}, just a gentle reminder about the {amount} I lent you, due on {due_date}. Please let me know if you need more time. Thank you! — {my_name}",
    },
    bn: {
      sms: "আসসালামু আলাইকুম {friend_name}, {due_date} তারিখে ফেরত দেওয়ার শর্তে আমি আপনাকে {amount} ধার দিয়েছিলাম, সেই বিষয়ে একটি বিনীত অনুরোধ। প্রয়োজনে আরেকটু সময় লাগলে জানাবেন। ধন্যবাদ — {my_name}",
      emailSubject: "{friend_name}, আপনার ঋণ সম্পর্কে একটি অনুরোধ",
      email: "আসসালামু আলাইকুম {friend_name}, {due_date} তারিখে ফেরত দেওয়ার শর্তে আমি আপনাকে {amount} ধার দিয়েছিলাম, সেই বিষয়ে একটি বিনীত অনুরোধ। প্রয়োজনে আরেকটু সময় লাগলে জানাবেন। ধন্যবাদ — {my_name}",
    },
  },
  Neutral: {
    en: {
      sms: "Hello {friend_name}, this is a reminder that your loan of {amount} is due on {due_date}. Please let me know when you plan to repay. Thank you. — {my_name}",
      emailSubject: "A reminder about your loan, {friend_name}",
      email: "Hello {friend_name}, this is a reminder that your loan of {amount} is due on {due_date}. Please let me know when you plan to repay. Thank you. — {my_name}",
    },
    bn: {
      sms: "প্রিয় {friend_name}, এটি একটি বিনীত অনুরোধ — {due_date} তারিখে আপনার {amount} ঋণ ফেরত দেওয়ার কথা ছিল। কখন পরিশোধ করতে পারবেন জানালে ভালো হয়। ধন্যবাদ — {my_name}",
      emailSubject: "{friend_name}, আপনার ঋণ সম্পর্কে একটি অনুরোধ",
      email: "প্রিয় {friend_name}, এটি একটি বিনীত অনুরোধ — {due_date} তারিখে আপনার {amount} ঋণ ফেরত দেওয়ার কথা ছিল। কখন পরিশোধ করতে পারবেন জানালে ভালো হয়। ধন্যবাদ — {my_name}",
    },
  },
  Firm: {
    en: {
      sms: "Hello {friend_name}, please arrange repayment of {amount} by {due_date}, as agreed. If this is not possible, please contact me so we can agree on a plan. Thank you. — {my_name}",
      emailSubject: "A reminder about your loan, {friend_name}",
      email: "Hello {friend_name}, please arrange repayment of {amount} by {due_date}, as agreed. If this is not possible, please contact me so we can agree on a plan. Thank you. — {my_name}",
    },
    bn: {
      sms: "প্রিয় {friend_name}, আমাদের চুক্তি অনুযায়ী {due_date} তারিখের মধ্যে {amount} পরিশোধ করার কথা ছিল। এই মুহূর্তে সম্ভব না হলে আমাকে জানান, যেন আমরা একটি পরিকল্পনায় একমত হতে পারি। ধন্যবাদ — {my_name}",
      emailSubject: "{friend_name}, আপনার ঋণ সম্পর্কে একটি অনুরোধ",
      email: "প্রিয় {friend_name}, আমাদের চুক্তি অনুযায়ী {due_date} তারিখের মধ্যে {amount} পরিশোধ করার কথা ছিল। এই মুহূর্তে সম্ভব না হলে আমাকে জানান, যেন আমরা একটি পরিকল্পনায় একমত হতে পারি। ধন্যবাদ — {my_name}",
    },
  },
};

/** One friend per loan in the demo. The `id` matches the localStorage
 *  seeds so the prototype and the live mode are byte-identical. */
const FRIENDS = [
  { id: "rafi", name: "Rafi", phone: "1711234567" },
  { id: "tanvir", name: "Tanvir", phone: "1812345678" },
  { id: "nusrat", name: "Nusrat", phone: "1612345678" },
  { id: "sabbir", name: "Sabbir", phone: "1912345678" },
  { id: "mim", name: "Mim", phone: "1512345678" },
  { id: "arif", name: "Arif", phone: "1312345678" },
];

/** Taka × 100 → poisha. Pure function, no float games. */
const t = (taka: number): number => Math.round(taka * 100);

/* ---- Seed entries -------------------------------------------------- */

interface SeedLoan {
  id: string;
  friendId: string;
  amount: number; // taka
  givenDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  note?: string;
  tone: Tone;
  smsEnabled: boolean;
  emailEnabled: boolean;
  messageLanguage: MessageLanguage;
  consentConfirmed: boolean;
  paidAt?: string; // ISO
  payments: Array<{
    id: string;
    amount: number; // taka
    date: string; // YYYY-MM-DD
    method: "Cash" | "bKash" | "Nagad" | "Bank" | "Other";
    note?: string;
  }>;
  rescheduleEntries: Array<{
    id: string;
    fromDate: string;
    toDate: string;
    reason?: string;
    changedAt: string;
  }>;
}

const SEED_LOANS: SeedLoan[] = [
  {
    id: "loan-rafi-2026-09-20",
    friendId: "rafi",
    amount: 5000,
    givenDate: "2026-09-20",
    dueDate: "2026-10-02",
    note: "Covered groceries for the long weekend.",
    tone: "Friendly",
    smsEnabled: true,
    emailEnabled: false,
    messageLanguage: "en",
    consentConfirmed: true,
    payments: [
      {
        id: "pay-rafi-1",
        amount: 2000,
        date: "2026-09-30",
        method: "bKash",
        note: "First installment",
      },
    ],
    rescheduleEntries: [],
  },
  {
    id: "loan-tanvir-2026-09-22",
    friendId: "tanvir",
    amount: 12500,
    givenDate: "2026-09-22",
    dueDate: "2026-10-15",
    note: "Bike repair loan.",
    tone: "Neutral",
    smsEnabled: true,
    emailEnabled: true,
    messageLanguage: "en",
    consentConfirmed: true,
    payments: [],
    rescheduleEntries: [
      {
        id: "res-tanvir-1",
        fromDate: "2026-10-12",
        toDate: "2026-10-15",
        reason: "Friend asked for a few extra days",
        changedAt: "2026-10-05T11:00:00.000Z",
      },
    ],
  },
  {
    id: "loan-nusrat-2026-08-30",
    friendId: "nusrat",
    amount: 3200,
    givenDate: "2026-08-30",
    dueDate: "2026-09-30",
    note: "Books for the semester.",
    tone: "Firm",
    smsEnabled: true,
    emailEnabled: false,
    messageLanguage: "en",
    consentConfirmed: true,
    payments: [],
    rescheduleEntries: [],
  },
  {
    id: "loan-sabbir-2026-09-12",
    friendId: "sabbir",
    amount: 8200,
    givenDate: "2026-09-12",
    dueDate: "2026-10-12",
    tone: "Friendly",
    smsEnabled: false,
    emailEnabled: false,
    messageLanguage: "en",
    consentConfirmed: false,
    payments: [],
    rescheduleEntries: [],
  },
  {
    id: "loan-mim-2026-08-05",
    friendId: "mim",
    amount: 2500,
    givenDate: "2026-08-05",
    dueDate: "2026-09-05",
    note: "Settled one day early.",
    tone: "Friendly",
    smsEnabled: true,
    emailEnabled: false,
    messageLanguage: "en",
    consentConfirmed: true,
    paidAt: "2026-09-04T10:00:00.000Z",
    payments: [
      {
        id: "pay-mim-1",
        amount: 2500,
        date: "2026-09-04",
        method: "Cash",
        note: "Settled one day early",
      },
    ],
    rescheduleEntries: [],
  },
  {
    id: "loan-arif-2026-09-28",
    friendId: "arif",
    amount: 6800,
    givenDate: "2026-09-28",
    dueDate: "2026-10-25",
    note: "Shared Airbnb deposit.",
    tone: "Neutral",
    smsEnabled: true,
    emailEnabled: true,
    messageLanguage: "en",
    consentConfirmed: true,
    payments: [],
    rescheduleEntries: [],
  },
];

interface SeedNotification {
  id: string;
  type: string;
  titleKey: string;
  params: Record<string, unknown>;
  loanId?: string;
  readAt: string | null;
  createdAt: string;
}

const SEED_NOTIFICATIONS: SeedNotification[] = [
  {
    id: "loan-rafi-2026-09-20-n-overdue",
    type: "overdue",
    titleKey: "notif.overdue",
    params: { name: "Rafi", amount: t(5000), due: "2026-10-02" },
    loanId: "loan-rafi-2026-09-20",
    readAt: null,
    createdAt: "2026-10-02T09:00:00.000Z",
  },
  {
    id: "loan-tanvir-2026-09-22-n-reminder",
    type: "reminder-sent",
    titleKey: "notif.reminderSent",
    params: { tone: "neutral", channel: "SMS" },
    loanId: "loan-tanvir-2026-09-22",
    readAt: null,
    createdAt: "2026-10-03T10:00:00.000Z",
  },
  {
    id: "loan-nusrat-2026-08-30-n-overdue",
    type: "overdue",
    titleKey: "notif.overdue",
    params: { name: "Nusrat", amount: t(3200), due: "2026-09-30" },
    loanId: "loan-nusrat-2026-08-30",
    readAt: "2026-10-02T18:00:00.000Z",
    createdAt: "2026-10-02T08:00:00.000Z",
  },
  {
    id: "loan-tanvir-2026-09-22-n-due-soon",
    type: "due-soon",
    titleKey: "notif.dueSoon",
    params: { name: "Tanvir", due: "2026-10-15" },
    loanId: "loan-tanvir-2026-09-22",
    readAt: "2026-10-03T18:00:00.000Z",
    createdAt: "2026-10-01T08:00:00.000Z",
  },
  {
    id: "loan-mim-2026-08-05-n-paid",
    type: "loan-paid",
    titleKey: "notif.paid",
    params: { amount: t(2500) },
    loanId: "loan-mim-2026-08-05",
    readAt: "2026-09-04T18:00:00.000Z",
    createdAt: "2026-09-04T10:30:00.000Z",
  },
  {
    id: "loan-tanvir-2026-09-22-n-created",
    type: "loan-created",
    titleKey: "notif.loanCreated",
    params: { name: "Tanvir", amount: t(5000) },
    loanId: "loan-tanvir-2026-09-22",
    readAt: "2026-09-22T18:00:00.000Z",
    createdAt: "2026-09-22T09:15:00.000Z",
  },
];

/** Reminder log entries. A few "Delivered" rows that the history
 *  page renders. */
interface SeedReminderLog {
  id: string;
  loanId: string;
  channel: "SMS" | "Email";
  scheduledFor: string;
  sentAt: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED";
}

const SEED_REMINDER_LOGS: SeedReminderLog[] = [
  {
    id: "log-rafi-1",
    loanId: "loan-rafi-2026-09-20",
    channel: "SMS",
    scheduledFor: "2026-09-29T10:00:00.000Z",
    sentAt: "2026-09-29T10:00:05.000Z",
    status: "DELIVERED",
  },
  {
    id: "log-tanvir-1",
    loanId: "loan-tanvir-2026-09-22",
    channel: "SMS",
    scheduledFor: "2026-10-12T10:00:00.000Z",
    sentAt: "2026-10-12T10:00:08.000Z",
    status: "DELIVERED",
  },
  {
    id: "log-tanvir-2",
    loanId: "loan-tanvir-2026-09-22",
    channel: "Email",
    scheduledFor: "2026-10-12T10:00:00.000Z",
    sentAt: "2026-10-12T10:00:12.000Z",
    status: "DELIVERED",
  },
  {
    id: "log-mim-1",
    loanId: "loan-mim-2026-08-05",
    channel: "SMS",
    scheduledFor: "2026-09-02T10:00:00.000Z",
    sentAt: "2026-09-02T10:00:04.000Z",
    status: "DELIVERED",
  },
];

/* ---- Main ---------------------------------------------------------- */

async function main(): Promise<void> {
  console.log("Seeding loan-reminder demo data…");

  // Wipe every child table for the demo user, then upsert the user
  // itself. We don't drop the table to avoid surprises if a real
  // user has signed up since the last seed.
  await prisma.notification.deleteMany({ where: { userId: USER_ID } });
  await prisma.reminderLog.deleteMany({
    where: { loan: { userId: USER_ID } },
  });
  await prisma.rescheduleEntry.deleteMany({
    where: { loan: { userId: USER_ID } },
  });
  await prisma.payment.deleteMany({
    where: { loan: { userId: USER_ID } },
  });
  await prisma.loan.deleteMany({ where: { userId: USER_ID } });
  await prisma.friend.deleteMany({ where: { userId: USER_ID } });
  await prisma.reminderSettings.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });

  // User
  await prisma.user.create({
    data: {
      id: USER_ID,
      name: USER_NAME,
      email: USER_EMAIL,
      phone: USER_PHONE,
      // `passwordHash` is what the Auth.js Credentials provider
      // compares against on login. The seed password is a
      // development-only credential (see README.md) — it must
      // never be reused in production.
      passwordHash: DEMO_PASSWORD_HASH,
      language: USER_LANGUAGE as MessageLanguage,
      banglaNumerals: USER_BANGLA_NUMERALS,
      theme: "light",
    },
  });

  // Reminder settings
  await prisma.reminderSettings.create({
    data: {
      userId: USER_ID,
      defaultTone: "Friendly",
      smsEnabled: true,
      emailEnabled: true,
      messageLanguage: "en",
      templates: TONE_TEMPLATES as unknown as Prisma.InputJsonValue,
      defaultTimings: {
        threeDaysBefore: true,
        onDueDate: true,
        everyTwoDaysAfterOverdue: true,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  // Friends
  for (const friend of FRIENDS) {
    await prisma.friend.create({
      data: {
        id: friend.id,
        userId: USER_ID,
        name: friend.name,
        phone: friend.phone,
      },
    });
  }

  // Loans, payments, reschedules
  for (const loan of SEED_LOANS) {
    await prisma.loan.create({
      data: {
        id: loan.id,
        userId: USER_ID,
        friendId: loan.friendId,
        amount: t(loan.amount),
        givenDate: new Date(loan.givenDate),
        dueDate: new Date(loan.dueDate),
        note: loan.note ?? null,
        tone: loan.tone,
        smsEnabled: loan.smsEnabled,
        emailEnabled: loan.emailEnabled,
        messageLanguage: loan.messageLanguage,
        consentConfirmed: loan.consentConfirmed,
        paidAt: loan.paidAt ? new Date(loan.paidAt) : null,
        reminderTimings: {
          threeDaysBefore: true,
          onDueDate: true,
          everyTwoDaysAfterOverdue: true,
        } as unknown as Prisma.InputJsonValue,
        payments: {
          create: loan.payments.map((p) => ({
            id: p.id,
            amount: t(p.amount),
            date: new Date(p.date),
            method: p.method,
            note: p.note ?? null,
          })),
        },
        rescheduleEntries: {
          create: loan.rescheduleEntries.map((r) => ({
            id: r.id,
            fromDate: new Date(r.fromDate),
            toDate: new Date(r.toDate),
            reason: r.reason ?? null,
            changedAt: new Date(r.changedAt),
            notifyFriend: true,
          })),
        },
      },
    });
  }

  // Reminder logs
  for (const log of SEED_REMINDER_LOGS) {
    await prisma.reminderLog.create({
      data: {
        id: log.id,
        loanId: log.loanId,
        channel: log.channel,
        scheduledFor: new Date(log.scheduledFor),
        sentAt: new Date(log.sentAt),
        status: log.status,
        dedupeKey: `${log.loanId}:${log.channel}:${log.scheduledFor}`,
      },
    });
  }

  // Notifications
  for (const n of SEED_NOTIFICATIONS) {
    await prisma.notification.create({
      data: {
        id: n.id,
        userId: USER_ID,
        type: n.type,
        titleKey: n.titleKey,
        params: n.params as unknown as Prisma.InputJsonValue,
        loanId: n.loanId ?? null,
        readAt: n.readAt ? new Date(n.readAt) : null,
        createdAt: new Date(n.createdAt),
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    friends: await prisma.friend.count(),
    loans: await prisma.loan.count(),
    payments: await prisma.payment.count(),
    reschedules: await prisma.rescheduleEntry.count(),
    reminderLogs: await prisma.reminderLog.count(),
    notifications: await prisma.notification.count(),
    settings: await prisma.reminderSettings.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
