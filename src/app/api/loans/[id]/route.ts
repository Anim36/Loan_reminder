// /api/loans/[id] — get, patch, soft-delete.
//
// `GET`    — full loan DTO.
// `PATCH`  — partial update of the loan *and* the friend's name /
//            email. Changing `dueDate` is rejected; the reschedule
//            endpoint is the only way to move a due date.
// `DELETE` — soft delete (sets `deletedAt`). Returns 204. The
//            `/restore` endpoint undoes this within 24h.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import { todayInDhaka } from "@/lib/dates";
import { toLoanDto } from "@/lib/api/loanDto";
import { getLoanForUser, loanWithDetailsInclude } from "@/server/loans";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(40) });

const reminderTimingSchema = z.enum([
  "3_days_before",
  "on_due_date",
  "every_2_days_after",
]);

const patchBodySchema = z
  .object({
    amount: z.number().positive("amount_too_small").max(1_000_000_000, "amount_too_large").optional(),
    givenDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "given_date_invalid")
      .optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "due_date_invalid")
      .optional(),
    note: z.string().trim().max(2_000).nullable().optional(),
    smsEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    reminderTimings: z.array(reminderTimingSchema).min(1).max(8).optional(),
    tone: z.enum(["Friendly", "Neutral", "Firm"]).optional(),
    messageLanguage: z.enum(["en", "bn"]).optional(),
    consentConfirmed: z.boolean().optional(),
    friend: z
      .object({
        name: z.string().trim().min(1).max(120).optional(),
        email: z.string().trim().email().max(254).nullable().optional(),
      })
      .optional(),
  })
  .strict()
  // `dueDate` changes are intentionally routed through
  // `/reschedule` so the audit trail is consistent.
  .refine((b) => b.dueDate === undefined, {
    message: "due_date_change_not_allowed",
    path: ["dueDate"],
  });

/* ---- GET --------------------------------------------------------- */

export async function GET(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      handler: async ({ user, params }) => {
        const row = await getLoanForUser(user.id, params.id);
        return toLoanDto(row, todayInDhaka());
      },
    },
    next.params,
  );
}

/* ---- PATCH ------------------------------------------------------- */

export async function PATCH(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      body: patchBodySchema,
      handler: async ({ user, params, body }) => {
        const { parseDateOnly } = await import("@/lib/dates");
        const { takaToPoisha } = await import("@/lib/money");

        // Build the loan patch.
        const data: Record<string, unknown> = {};
        if (body.amount !== undefined) data.amount = takaToPoisha(body.amount);
        if (body.givenDate !== undefined) {
          const d = parseDateOnly(body.givenDate);
          if (!d) throw apiErrors.unprocessable("given_date_invalid", "given_date_invalid");
          data.givenDate = d;
        }
        if (body.note !== undefined) data.note = body.note;
        if (body.smsEnabled !== undefined) data.smsEnabled = body.smsEnabled;
        if (body.emailEnabled !== undefined) data.emailEnabled = body.emailEnabled;
        if (body.reminderTimings !== undefined) data.reminderTimings = { list: body.reminderTimings };
        if (body.tone !== undefined) data.tone = body.tone;
        if (body.messageLanguage !== undefined) data.messageLanguage = body.messageLanguage;
        if (body.consentConfirmed !== undefined) data.consentConfirmed = body.consentConfirmed;

        await prisma.$transaction(async (tx) => {
          if (Object.keys(data).length > 0) {
            // 404-on-other-user is enforced by scoping through the
            // friend row count first.
            const owned = await tx.loan.count({ where: { id: params.id, userId: user.id, deletedAt: null } });
            if (owned === 0) throw apiErrors.notFound("loan_not_found", "loan_not_found");
            await tx.loan.update({ where: { id: params.id }, data });
          }
          if (body.friend) {
            const loan = await tx.loan.findFirst({
              where: { id: params.id, userId: user.id, deletedAt: null },
              select: { friendId: true },
            });
            if (!loan) throw apiErrors.notFound("loan_not_found", "loan_not_found");
            const friendData: Record<string, unknown> = {};
            if (body.friend.name !== undefined) friendData.name = body.friend.name;
            if (body.friend.email !== undefined) friendData.email = body.friend.email;
            if (Object.keys(friendData).length > 0) {
              await tx.friend.update({ where: { id: loan.friendId }, data: friendData });
            }
          }
        });

        const full = await prisma.loan.findUnique({
          where: { id: params.id },
          include: loanWithDetailsInclude,
        });
        if (!full) throw apiErrors.notFound("loan_not_found", "loan_not_found");
        return toLoanDto(full as never, todayInDhaka());
      },
    },
    next.params,
  );
}

/* ---- DELETE ------------------------------------------------------ */

export async function DELETE(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      handler: async ({ user, params }) => {
        const owned = await prisma.loan.findFirst({
          where: { id: params.id, userId: user.id, deletedAt: null },
          select: { id: true },
        });
        if (!owned) throw apiErrors.notFound("loan_not_found", "loan_not_found");
        await prisma.loan.update({
          where: { id: params.id },
          data: { deletedAt: new Date() },
        });
        return null;
      },
    },
    next.params,
  ).then((res) => {
    // 204 No Content for the delete path.
    if (res.ok && res.status === 200) {
      return new Response(null, { status: 204 });
    }
    return res;
  });
}
