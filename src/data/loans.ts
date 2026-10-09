// Seed data for the Loan Reminder app.
//
// The dates match the Figma Loans (10:4167) frame, which is set in early
// October 2026. The dashboard and loan list treat `status` as the source
// of truth for the summary cards; the "Overdue by N days" copy on the
// loans page is recomputed against `new Date()` so it stays current
// regardless of the seed dates.

import type { Loan } from "@/types/loan";

// All seeds are timestamped against the dashboard "today" (early Oct 2026)
// so the list view shows a believable mix of statuses.
const SEED_TS = "2026-10-04T09:00:00.000Z";

export const SEED_LOANS: Loan[] = [
  {
    id: "loan-rafi-2026-09-20",
    friend: { id: "rafi", name: "Rafi", phone: "1711234567" },
    amount: 5000,
    dateGiven: "2026-09-20",
    dueDate: "2026-10-02",
    tone: "Friendly",
    reminders: { sms: true, email: false },
    consent: true,
    status: "Overdue",
    note: "Covered groceries for the long weekend.",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
    payments: [
      {
        id: "pay-rafi-1",
        amount: 2000,
        date: "2026-09-30",
        method: "bKash",
        note: "First installment",
      },
    ],
    rescheduleHistory: [],
  },
  {
    id: "loan-tanvir-2026-09-22",
    friend: { id: "tanvir", name: "Tanvir", phone: "1812345678" },
    amount: 12500,
    dateGiven: "2026-09-22",
    dueDate: "2026-10-15",
    tone: "Neutral",
    reminders: { sms: true, email: true },
    consent: true,
    status: "Pending",
    note: "Bike repair loan.",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
    payments: [],
    rescheduleHistory: [
      {
        id: "res-tanvir-1",
        from: "2026-10-12",
        to: "2026-10-15",
        reason: "Friend asked for a few extra days",
        changedAt: "2026-10-05T11:00:00.000Z",
      },
    ],
  },
  {
    id: "loan-nusrat-2026-08-30",
    friend: { id: "nusrat", name: "Nusrat", phone: "1612345678" },
    amount: 3200,
    dateGiven: "2026-08-30",
    dueDate: "2026-09-30",
    tone: "Firm",
    reminders: { sms: true, email: false },
    consent: true,
    status: "Overdue",
    note: "Books for the semester.",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
    payments: [],
    rescheduleHistory: [],
  },
  {
    id: "loan-sabbir-2026-09-12",
    friend: { id: "sabbir", name: "Sabbir", phone: "1912345678" },
    amount: 8200,
    dateGiven: "2026-09-12",
    dueDate: "2026-10-12",
    tone: "Friendly",
    reminders: { sms: false, email: false },
    consent: false,
    status: "Pending",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
    payments: [],
    rescheduleHistory: [],
  },
  {
    id: "loan-mim-2026-08-05",
    friend: { id: "mim", name: "Mim", phone: "1512345678" },
    amount: 2500,
    dateGiven: "2026-08-05",
    dueDate: "2026-09-05",
    tone: "Friendly",
    reminders: { sms: true, email: false },
    consent: true,
    status: "Paid",
    paidAt: "2026-09-04T10:00:00.000Z",
    note: "Settled one day early.",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
    payments: [
      {
        id: "pay-mim-1",
        amount: 2500,
        date: "2026-09-04",
        method: "Cash",
        note: "Settled one day early",
      },
    ],
    rescheduleHistory: [],
  },
  {
    id: "loan-arif-2026-09-28",
    friend: { id: "arif", name: "Arif", phone: "1312345678" },
    amount: 6800,
    dateGiven: "2026-09-28",
    dueDate: "2026-10-25",
    tone: "Neutral",
    reminders: { sms: true, email: true },
    consent: true,
    status: "Pending",
    note: "Shared Airbnb deposit.",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
    payments: [],
    rescheduleHistory: [],
  },
];
