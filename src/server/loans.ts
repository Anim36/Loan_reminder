// Loan ownership helpers.
//
// The API contract is that accessing another user's loan returns
// 404, not 403 — we don't even reveal that the row exists. This
// file is the single place every loan-scoped route goes through
// for that lookup. The query selects everything `toLoanDto`
// needs, so the route can pass the result straight through.

import { prisma } from "@/lib/db";
import { apiErrors } from "@/server/api";
import type { PrismaLoanForDto } from "@/lib/api/loanDto";

/** Common Prisma `include` for the loan-with-payments shape the
 *  DTO consumes. */
export const loanWithDetailsInclude = {
  friend: {
    select: { id: true, name: true, phone: true, email: true },
  },
  payments: {
    select: {
      id: true,
      amount: true,
      date: true,
      method: true,
      note: true,
      createdAt: true,
    },
    orderBy: { date: "asc" as const },
  },
  rescheduleEntries: {
    select: {
      id: true,
      fromDate: true,
      toDate: true,
      reason: true,
      notifyFriend: true,
      changedAt: true,
    },
    orderBy: { changedAt: "asc" as const },
  },
};

/** Fetch a single loan, scoped to the user. Throws an `ApiError`
 *  404 when the loan doesn't exist or belongs to someone else. */
export async function getLoanForUser(
  userId: string,
  loanId: string,
): Promise<PrismaLoanForDto> {
  const row = await prisma.loan.findFirst({
    where: { id: loanId, userId },
    include: loanWithDetailsInclude,
  });
  if (!row) throw apiErrors.notFound("loan_not_found", "loan_not_found");
  return row as unknown as PrismaLoanForDto;
}

/** Fetch a single loan *including* soft-deleted rows, scoped to
 *  the user. Used by `/restore` so we can reject a restore that
 *  has passed the 24h window. */
export async function getLoanForUserIncludingDeleted(
  userId: string,
  loanId: string,
): Promise<PrismaLoanForDto & { deletedAt: Date | null }> {
  const row = await prisma.loan.findFirst({
    where: { id: loanId, userId },
    include: loanWithDetailsInclude,
  });
  if (!row) throw apiErrors.notFound("loan_not_found", "loan_not_found");
  return row as unknown as PrismaLoanForDto & { deletedAt: Date | null };
}
