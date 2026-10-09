// /api/loans/[id]/payments — record a payment.
//
// Concurrency
// -----------
// The handler runs inside `prisma.$transaction` with a
// serialisable isolation level. Before writing, it re-reads the
// loan's payments and recomputes `remaining`. If the new payment
// would exceed the remaining balance, the whole transaction
// aborts and the route returns 422 `payment_overflow`. The
// serialisable level is what stops a second concurrent request
// from observing the same pre-payment state and committing a
// second over-balance write.
//
// Notifications
// -------------
// Two records are created when the payment completes:
//   - "payment-recorded" with the new remaining balance
//   - "loan-fully-paid" if the remaining hits 0
// Both are written inside the same transaction so the user
// never sees a paid-loan without its "fully paid" notification.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import { parseDateOnly, todayInDhaka } from "@/lib/dates";
import { takaToPoisha, poishaToTaka, roundTaka } from "@/lib/money";
import { toLoanDto } from "@/lib/api/loanDto";
import { loanWithDetailsInclude } from "@/server/loans";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(40) });

const bodySchema = z.object({
  amount: z.number().positive("amount_too_small").max(1_000_000_000, "amount_too_large"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "payment_date_future"),
  method: z.enum(["Cash", "bKash", "Nagad", "Bank", "Other"]).default("Other"),
  note: z.string().trim().max(2_000).optional(),
});

export async function POST(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      body: bodySchema,
      handler: async ({ user, params, body }) => {
        const paymentDate = parseDateOnly(body.date);
        if (!paymentDate) {
          throw apiErrors.unprocessable("payment_date_future", "payment_date_future");
        }

        const tdy = todayInDhaka();
        if (paymentDate > tdy) {
          throw apiErrors.unprocessable("payment_date_future", "payment_date_future");
        }

        const amountPoisha = takaToPoisha(body.amount);

        const updated = await prisma.$transaction(
          async (tx) => {
            const loan = await tx.loan.findFirst({
              where: { id: params.id, userId: user.id, deletedAt: null },
              include: {
                payments: { select: { amount: true } },
                friend: { select: { id: true, name: true } },
              },
            });
            if (!loan) throw apiErrors.notFound("loan_not_found", "loan_not_found");

            if (paymentDate < loan.givenDate) {
              throw apiErrors.unprocessable("payment_date_before_given", "payment_date_before_given");
            }

            const paidSoFar = loan.payments.reduce((s, p) => s + p.amount, 0);
            const remaining = Math.max(0, loan.amount - paidSoFar);
            if (amountPoisha > remaining) {
              throw apiErrors.unprocessable("payment_overflow", "payment_overflow");
            }

            const newRemainingPoisha = remaining - amountPoisha;
            const willBeFullyPaid = newRemainingPoisha === 0;
            const paymentTs = new Date(body.date + "T10:00:00.000Z");

            await tx.payment.create({
              data: {
                loanId: loan.id,
                amount: amountPoisha,
                date: paymentDate,
                method: body.method,
                note: body.note ?? null,
                createdAt: paymentTs,
              },
            });

            // Set / clear `paidAt` based on the new remaining.
            if (willBeFullyPaid && !loan.paidAt) {
              await tx.loan.update({
                where: { id: loan.id },
                data: { paidAt: paymentTs },
              });
            }

            // Create notifications. The "fully paid" notification
            // is created *in addition* to the "payment recorded"
            // one, so the feed has a clear "final" entry.
            await tx.notification.create({
              data: {
                userId: user.id,
                type: "payment-recorded",
                titleKey: "notif.payment",
                params: {
                  name: loan.friend.name,
                  amount: roundTaka(amountPoisha),
                  remaining: roundTaka(newRemainingPoisha),
                },
                loanId: loan.id,
              },
            });
            if (willBeFullyPaid) {
              await tx.notification.create({
                data: {
                  userId: user.id,
                  type: "loan-paid",
                  titleKey: "notif.paymentFully",
                  params: { name: loan.friend.name, amount: roundTaka(amountPoisha) },
                  loanId: loan.id,
                },
              });
            }

            const fresh = await tx.loan.findUnique({
              where: { id: loan.id },
              include: loanWithDetailsInclude,
            });
            if (!fresh) throw apiErrors.notFound("loan_not_found", "loan_not_found");
            return fresh;
          },
          { isolationLevel: "Serializable" },
        );

        return toLoanDto(updated as never, tdy);
      },
    },
    next.params,
  );
}

// Suppress unused-import linter for taka→poisha helpers not used
// directly in this file.
void poishaToTaka;
