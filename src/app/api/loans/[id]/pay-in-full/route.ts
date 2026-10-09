// /api/loans/[id]/pay-in-full — record a payment for the full
// remaining balance.
//
// 409 if the loan is already paid. Date defaults to today in
// Asia/Dhaka; method defaults to Cash. The body is optional.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import { todayInDhaka } from "@/lib/dates";
import { roundTaka } from "@/lib/money";
import { toLoanDto } from "@/lib/api/loanDto";
import { loanWithDetailsInclude } from "@/server/loans";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(40) });

const bodySchema = z.object({
  method: z.enum(["Cash", "bKash", "Nagad", "Bank", "Other"]).default("Cash"),
  note: z.string().trim().max(2_000).optional(),
});

export async function POST(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      body: bodySchema.optional(),
      handler: async ({ user, params, body }) => {
        const today = todayInDhaka();

        const result = await prisma.$transaction(
          async (tx) => {
            const loan = await tx.loan.findFirst({
              where: { id: params.id, userId: user.id, deletedAt: null },
              include: {
                payments: { select: { amount: true } },
                friend: { select: { id: true, name: true } },
              },
            });
            if (!loan) throw apiErrors.notFound("loan_not_found", "loan_not_found");

            const paidSoFar = loan.payments.reduce((s, p) => s + p.amount, 0);
            const remaining = loan.amount - paidSoFar;
            if (remaining <= 0) {
              throw apiErrors.conflict("loan_already_paid", "loan_already_paid");
            }

            const paymentTs = new Date();
            await tx.payment.create({
              data: {
                loanId: loan.id,
                amount: remaining,
                date: today,
                method: body?.method ?? "Cash",
                note: body?.note ?? null,
                createdAt: paymentTs,
              },
            });
            if (!loan.paidAt) {
              await tx.loan.update({ where: { id: loan.id }, data: { paidAt: paymentTs } });
            }
            await tx.notification.create({
              data: {
                userId: user.id,
                type: "loan-paid",
                titleKey: "notif.paymentFully",
                params: { name: loan.friend.name, amount: roundTaka(remaining) },
                loanId: loan.id,
              },
            });
            const full = await tx.loan.findUnique({
              where: { id: loan.id },
              include: loanWithDetailsInclude,
            });
            if (!full) throw apiErrors.notFound("loan_not_found", "loan_not_found");
            return full;
          },
          { isolationLevel: "Serializable" },
        );

        return toLoanDto(result as never, today);
      },
    },
    next.params,
  );
}
