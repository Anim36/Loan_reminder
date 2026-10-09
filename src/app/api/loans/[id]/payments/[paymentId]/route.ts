// /api/loans/[id]/payments/[paymentId] — delete a payment.
//
// Recomputes `paidAt` after the row is gone: clears it when the
// loan is no longer fully paid, leaves it alone otherwise.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import { todayInDhaka } from "@/lib/dates";
import { toLoanDto } from "@/lib/api/loanDto";
import { loanWithDetailsInclude } from "@/server/loans";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().min(1).max(40),
  paymentId: z.string().min(1).max(40),
});

export async function DELETE(req: NextRequest, next: { params: Promise<{ id: string; paymentId: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      handler: async ({ user, params }) => {
        const result = await prisma.$transaction(async (tx) => {
          const loan = await tx.loan.findFirst({
            where: { id: params.id, userId: user.id, deletedAt: null },
            select: { id: true },
          });
          if (!loan) throw apiErrors.notFound("loan_not_found", "loan_not_found");

          const payment = await tx.payment.findFirst({
            where: { id: params.paymentId, loanId: loan.id },
            select: { id: true },
          });
          if (!payment) {
            throw apiErrors.notFound("payment_not_found", "payment_not_found");
          }
          await tx.payment.delete({ where: { id: payment.id } });

          // Recompute paidAt.
          const after = await tx.payment.aggregate({
            where: { loanId: loan.id },
            _sum: { amount: true },
          });
          const paidSoFar = after._sum.amount ?? 0;
          const fresh = await tx.loan.findUnique({ where: { id: loan.id } });
          if (!fresh) throw apiErrors.notFound("loan_not_found", "loan_not_found");
          if (paidSoFar < fresh.amount && fresh.paidAt) {
            await tx.loan.update({ where: { id: loan.id }, data: { paidAt: null } });
          } else if (paidSoFar >= fresh.amount && !fresh.paidAt) {
            await tx.loan.update({ where: { id: loan.id }, data: { paidAt: new Date() } });
          }

          const full = await tx.loan.findUnique({
            where: { id: loan.id },
            include: loanWithDetailsInclude,
          });
          if (!full) throw apiErrors.notFound("loan_not_found", "loan_not_found");
          return full;
        });

        return toLoanDto(result as never, todayInDhaka());
      },
    },
    next.params,
  );
}
