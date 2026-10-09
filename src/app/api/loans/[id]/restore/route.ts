// /api/loans/[id]/restore — undo a soft delete within 24 hours.
//
// Powers the "delete with undo" toast on the loans list.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import { todayInDhaka } from "@/lib/dates";
import { toLoanDto } from "@/lib/api/loanDto";
import { loanWithDetailsInclude } from "@/server/loans";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(40) });

const RESTORE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      handler: async ({ user, params }) => {
        const loan = await prisma.loan.findFirst({
          where: { id: params.id, userId: user.id, deletedAt: { not: null } },
          select: { id: true, deletedAt: true },
        });
        if (!loan) throw apiErrors.notFound("loan_not_found", "loan_not_found");
        if (!loan.deletedAt) {
          // Already restored. Idempotent — return the loan.
        } else if (Date.now() - loan.deletedAt.getTime() > RESTORE_WINDOW_MS) {
          throw apiErrors.conflict("restore_window_expired", "restore_window_expired");
        }
        await prisma.loan.update({
          where: { id: params.id },
          data: { deletedAt: null },
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
