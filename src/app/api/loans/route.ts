// /api/loans — list and create.
//
// `GET`  — list the caller's non-soft-deleted loans, with filters
//          and pagination. Excludes soft-deleted rows.
// `POST` — create a new loan (and its friend, if necessary).
//
// Status filter
// -------------
// Status is *derived* (Paid | Pending | Overdue) on the server, not
// stored. The query selects the columns we need (id, amount,
// dueDate, deletedAt) plus a `payments.sum` aggregate, then the
// handler filters in memory before pagination. The dataset per
// user is small (a few hundred loans max) so the in-memory pass is
// cheap and avoids the awkward Prisma query needed to express the
// "Paid" case in SQL.

import type { NextRequest } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import { parseDateOnly, todayInDhaka } from "@/lib/dates";
import { deriveStatus } from "@/lib/loanStatus";
import { toLoanDto } from "@/lib/api/loanDto";
import { normalisePhone } from "@/lib/phone";
import { takaToPoisha } from "@/lib/money";

export const dynamic = "force-dynamic";

/* ---- Query schema (zod) ----------------------------------------- */

const STATUS = ["Paid", "Pending", "Overdue"] as const;
const SORT_FIELDS = ["dueDate", "amount", "createdAt"] as const;
const ORDER = ["asc", "desc"] as const;

const listQuerySchema = z
  .object({
    status: z
      .union([z.enum(STATUS), z.literal("")])
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    q: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    sort: z
      .union([z.enum(SORT_FIELDS), z.literal("")])
      .optional()
      .transform((v) => (v && v.length > 0 ? v : "dueDate")),
    order: z
      .union([z.enum(ORDER), z.literal("")])
      .optional()
      .transform((v) => (v && v.length > 0 ? v : "desc")),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "given_date_invalid")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "due_date_invalid")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  });

/* ---- GET --------------------------------------------------------- */

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    query: listQuerySchema,
    handler: async ({ user, query }) => {
      // The dataset is small enough to load fully and filter
      // in-memory. We still exclude soft-deleted rows here so the
      // list count is honest.
      const rows = await prisma.loan.findMany({
        where: { userId: user.id, deletedAt: null },
        include: {
          friend: { select: { id: true, name: true, phone: true, email: true } },
          payments: { select: { id: true, amount: true, date: true, method: true, note: true, createdAt: true } },
          rescheduleEntries: {
            select: { id: true, fromDate: true, toDate: true, reason: true, notifyFriend: true, changedAt: true },
          },
        },
      });

      const today = todayInDhaka();
      const q = query.q?.toLowerCase();

      // Filter by status (derived), free-text search and due-date
      // range. Then sort. Then paginate.
      const filtered = rows.filter((row) => {
        if (query.status) {
          const paymentsForDerive = row.payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            date: p.date.toISOString().slice(0, 10),
            method: p.method as "Cash" | "bKash" | "Nagad" | "Bank" | "Other",
            note: p.note ?? undefined,
          }));
          const status = deriveStatus(
            { amount: row.amount, dueDate: row.dueDate.toISOString().slice(0, 10) },
            paymentsForDerive,
            today,
          );
          if (status !== query.status) return false;
        }
        if (q) {
          const name = row.friend.name.toLowerCase();
          const phone = (row.friend.phone ?? "").toLowerCase();
          if (!name.includes(q) && !phone.includes(q)) return false;
        }
        if (query.from) {
          const from = new Date(query.from + "T00:00:00.000Z");
          if (row.dueDate < from) return false;
        }
        if (query.to) {
          const to = new Date(query.to + "T00:00:00.000Z");
          if (row.dueDate > to) return false;
        }
        return true;
      });

      filtered.sort((a, b) => {
        let cmp = 0;
        if (query.sort === "amount") cmp = a.amount - b.amount;
        else if (query.sort === "createdAt") cmp = a.createdAt.getTime() - b.createdAt.getTime();
        else cmp = a.dueDate.getTime() - b.dueDate.getTime();
        return query.order === "asc" ? cmp : -cmp;
      });

      const total = filtered.length;
      const start = (query.page - 1) * query.pageSize;
      const slice = filtered.slice(start, start + query.pageSize);
      const data = slice.map((row) => toLoanDto(row as never, today));

      return {
        data,
        meta: { page: query.page, pageSize: query.pageSize, total },
      };
    },
    listMode: true,
  });
}

/* ---- POST -------------------------------------------------------- */

const reminderTimingSchema = z.enum([
  "3_days_before",
  "on_due_date",
  "every_2_days_after",
]);

const toneSchema = z.enum(["Friendly", "Neutral", "Firm"]);
const messageLanguageSchema = z.enum(["en", "bn"]);

const createBodySchema = z
  .object({
    friend: z.object({
      name: z.string().trim().min(1, "amount_invalid").max(120),
      phone: z.string().trim().min(1, "phone_invalid").max(40),
      email: z.string().trim().email("amount_invalid").max(254).optional(),
    }),
    amount: z.number().positive("amount_too_small").max(1_000_000_000, "amount_too_large"),
    givenDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "given_date_invalid"),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "due_date_invalid"),
    note: z.string().trim().max(2_000).optional(),
    smsEnabled: z.boolean().default(true),
    emailEnabled: z.boolean().default(false),
    reminderTimings: z
      .array(reminderTimingSchema)
      .min(1, "timing_invalid")
      .max(8),
    tone: toneSchema.default("Friendly"),
    messageLanguage: messageLanguageSchema.default("en"),
    consentConfirmed: z.boolean(),
  }).refine((b) => b.consentConfirmed === true, {
    message: "consent_required",
    path: ["consentConfirmed"],
  });

export async function POST(req: NextRequest) {
  return apiHandler(req, {
    body: createBodySchema,
    handler: async ({ user, body }) => {
      // Validate dates and cross-field rules.
      const given = parseDateOnly(body.givenDate);
      if (!given) throw apiErrors.unprocessable("given_date_invalid", "given_date_invalid");
      const due = parseDateOnly(body.dueDate);
      if (!due) throw apiErrors.unprocessable("due_date_invalid", "due_date_invalid");
      if (due < given) {
        throw apiErrors.unprocessable("due_before_given", "due_before_given");
      }

      // Normalise phone (importing here keeps the import list small).
      const phoneE164 = normalisePhone(body.friend.phone);
      if (!phoneE164) {
        throw apiErrors.unprocessable("phone_invalid", "phone_invalid");
      }

      // Friend reuse by phone (case-insensitive is a no-op for
      // digits). If no match, create with a random optOutToken.
      const existingFriend = await prisma.friend.findFirst({
        where: { userId: user.id, phone: phoneE164 },
        select: { id: true, name: true, phone: true, email: true },
      });
      const friend = existingFriend
        ? await prisma.friend.update({
            where: { id: existingFriend.id },
            data: {
              // Keep the newer name if the user changed it;
              // never overwrite the phone on update.
              name: body.friend.name || existingFriend.name,
              email: body.friend.email ?? existingFriend.email ?? null,
            },
            select: { id: true, name: true, phone: true, email: true },
          })
        : await prisma.friend.create({
            data: {
              userId: user.id,
              name: body.friend.name,
              phone: phoneE164,
              email: body.friend.email ?? null,
              optOutToken: randomBytes(24).toString("hex"),
            },
            select: { id: true, name: true, phone: true, email: true },
          });

      const amountPoisha = takaToPoisha(body.amount);

      // Create the loan + a "loan created" notification in one
      // transaction so the user never sees one without the other.
      const created = await prisma.$transaction(async (tx) => {
        const loan = await tx.loan.create({
          data: {
            userId: user.id,
            friendId: friend.id,
            amount: amountPoisha,
            givenDate: given,
            dueDate: due,
            note: body.note ?? null,
            smsEnabled: body.smsEnabled,
            emailEnabled: body.emailEnabled,
            reminderTimings: { list: body.reminderTimings },
            tone: body.tone,
            messageLanguage: body.messageLanguage,
            consentConfirmed: body.consentConfirmed,
          },
        });
        await tx.notification.create({
          data: {
            userId: user.id,
            type: "loan-created",
            titleKey: "notif.loanCreated",
            params: { name: friend.name, amount: body.amount },
            loanId: loan.id,
          },
        });
        return loan;
      });

      // Re-read with all the joins the DTO needs.
      const full = await prisma.loan.findUnique({
        where: { id: created.id },
        include: {
          friend: { select: { id: true, name: true, phone: true, email: true } },
          payments: { select: { id: true, amount: true, date: true, method: true, note: true, createdAt: true } },
          rescheduleEntries: {
            select: { id: true, fromDate: true, toDate: true, reason: true, notifyFriend: true, changedAt: true },
          },
        },
      });
      if (!full) throw apiErrors.notFound("loan_not_found", "loan_not_found");

      return toLoanDto(full as never, todayInDhaka());
    },
    successStatus: 201,
  });
}
