// /api/dashboard/summary — aggregates for the home page.
//
// Excludes soft-deleted loans.

import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";
import { todayInDhaka, daysBetween } from "@/lib/dates";
import { deriveStatus, remainingPoisha, amountPaidPoisha } from "@/lib/loanStatus";
import { toLoanDto } from "@/lib/api/loanDto";
import { roundTaka } from "@/lib/money";
import type { LoanStatus } from "@/types/loan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    handler: async ({ user }) => {
      const today = todayInDhaka();

      const loans = await prisma.loan.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          friend: { select: { id: true, name: true, phone: true, email: true } },
          payments: { select: { id: true, amount: true, date: true, method: true, note: true, createdAt: true } },
          rescheduleEntries: {
            select: { id: true, fromDate: true, toDate: true, reason: true, notifyFriend: true, changedAt: true },
          },
        },
      });

      let totalLent = 0;
      let totalReceived = 0;
      let pending = 0;
      let overdue = 0;
      const counts: Record<LoanStatus, number> = { Paid: 0, Pending: 0, Overdue: 0 };
      const upcoming: Array<ReturnType<typeof toLoanDto>> = [];
      const recent: Array<ReturnType<typeof toLoanDto>> = [];

      for (const loan of loans) {
        const paymentsForDerive = loan.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          date: p.date.toISOString().slice(0, 10),
          method: "Other" as const,
        }));
        const status = deriveStatus({ amount: loan.amount, dueDate: loan.dueDate.toISOString().slice(0, 10) }, paymentsForDerive, today);
        const rem = remainingPoisha({ amount: loan.amount }, paymentsForDerive);
        const paid = amountPaidPoisha(paymentsForDerive);
        totalLent += loan.amount;
        totalReceived += paid;
        if (status === "Pending") pending += rem;
        else if (status === "Overdue") overdue += rem;
        counts[status]++;

        if (status !== "Paid") {
          const days = daysBetween(today, loan.dueDate);
          if (days >= 0 && days <= 7) {
            upcoming.push(toLoanDto(loan as never, today));
          }
        }
      }

      // Recent (top 5 by createdAt desc).
      recent.push(...loans.slice(0, 5).map((l) => toLoanDto(l as never, today)));

      // Upcoming (sorted by due date asc).
      upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      return {
        totals: {
          totalLent: roundTaka(totalLent),
          totalReceived: roundTaka(totalReceived),
          pending: roundTaka(pending),
          overdue: roundTaka(overdue),
          counts,
        },
        recentLoans: recent,
        upcomingDue: upcoming,
      };
    },
  });
}
