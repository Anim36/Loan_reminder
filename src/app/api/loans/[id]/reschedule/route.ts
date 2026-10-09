// /api/loans/[id]/reschedule — move the due date forward.
//
// Rules
// -----
//   * `newDueDate` must be in the future (Asia/Dhaka today) and
//     different from the current one.
//   * The change is recorded in `reschedule_entries` and a
//     notification is created.
//   * Any `QUEUED` `ReminderLog` rows scheduled for this loan are
//     moved to `SKIPPED` with the reason "rescheduled". The
//     reminder engine in B6 regenerates the schedule from the
//     new timings.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import { formatDateOnly, parseDateOnly, todayInDhaka } from "@/lib/dates";
import { toLoanDto } from "@/lib/api/loanDto";
import { loanWithDetailsInclude } from "@/server/loans";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(40) });

const bodySchema = z.object({
  newDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "due_date_invalid"),
  reason: z.string().trim().max(2_000).optional(),
  notifyFriend: z.boolean().default(true),
});

export async function POST(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      body: bodySchema,
      handler: async ({ user, params, body }) => {
        const newDue = parseDateOnly(body.newDueDate);
        if (!newDue) {
          throw apiErrors.unprocessable("due_date_invalid", "due_date_invalid");
        }
        const today = todayInDhaka();
        if (newDue <= today) {
          throw apiErrors.unprocessable("due_not_after_today", "due_not_after_today");
        }

        const result = await prisma.$transaction(async (tx) => {
          const loan = await tx.loan.findFirst({
            where: { id: params.id, userId: user.id, deletedAt: null },
            include: { friend: { select: { name: true } } },
          });
          if (!loan) throw apiErrors.notFound("loan_not_found", "loan_not_found");

          // Reject "no-op" reschedules so we never pollute the
          // audit trail with empty entries.
          if (formatDateOnly(loan.dueDate) === body.newDueDate) {
            throw apiErrors.unprocessable("due_date_unchanged", "due_date_unchanged");
          }

          await tx.rescheduleEntry.create({
            data: {
              loanId: loan.id,
              fromDate: loan.dueDate,
              toDate: newDue,
              reason: body.reason ?? null,
              notifyFriend: body.notifyFriend,
            },
          });
          await tx.loan.update({
            where: { id: loan.id },
            data: { dueDate: newDue },
          });

          // Mark every QUEUED log as SKIPPED. The reminder engine
          // regenerates the schedule from the new due date.
          await tx.reminderLog.updateMany({
            where: { loanId: loan.id, status: "QUEUED" },
            data: { status: "SKIPPED", error: "rescheduled" },
          });

          await tx.notification.create({
            data: {
              userId: user.id,
              type: "due-date-updated",
              titleKey: "notif.dueDateUpdated",
              params: {
                name: loan.friend.name,
                from: formatDateOnly(loan.dueDate),
                to: body.newDueDate,
              },
              loanId: loan.id,
            },
          });

          const full = await tx.loan.findUnique({
            where: { id: loan.id },
            include: loanWithDetailsInclude,
          });
          if (!full) throw apiErrors.notFound("loan_not_found", "loan_not_found");
          return full;
        });

        return toLoanDto(result as never, today);
      },
    },
    next.params,
  );
}
