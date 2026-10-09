// /api/friends/[id] — single friend.
//
// 404 if the friend is not owned by the caller.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import { todayInDhaka } from "@/lib/dates";
import { deriveStatus, remainingPoisha, amountPaidPoisha } from "@/lib/loanStatus";
import { formatPhone } from "@/lib/phone";
import { roundTaka } from "@/lib/money";
import { toLoanDto } from "@/lib/api/loanDto";
import { loanWithDetailsInclude } from "@/server/loans";
import type { LoanStatus } from "@/types/loan";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(40) });

function worstOf(statuses: LoanStatus[]): LoanStatus {
  if (statuses.some((s) => s === "Overdue")) return "Overdue";
  if (statuses.some((s) => s === "Pending")) return "Pending";
  return "Paid";
}

export async function GET(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      handler: async ({ user, params }) => {
        const today = todayInDhaka();
        const friend = await prisma.friend.findFirst({
          where: { id: params.id, userId: user.id },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            loans: {
              where: { deletedAt: null },
              orderBy: { dueDate: "desc" },
              include: loanWithDetailsInclude,
            },
          },
        });
        if (!friend) throw apiErrors.notFound("friend_not_found", "friend_not_found");

        let totalLent = 0;
        let totalRepaid = 0;
        let outstanding = 0;
        const statuses: LoanStatus[] = [];
        const loanDtos = friend.loans.map((l) => toLoanDto(l as never, today));
        for (const loan of friend.loans) {
          totalLent += loan.amount;
          const paid = amountPaidPoisha(
            loan.payments.map((p) => ({
              id: p.id,
              amount: p.amount,
              date: p.date.toISOString().slice(0, 10),
              method: "Other" as const,
            })),
          );
          const rem = remainingPoisha(
            { amount: loan.amount },
            loan.payments.map((p) => ({
              id: p.id,
              amount: p.amount,
              date: p.date.toISOString().slice(0, 10),
              method: "Other" as const,
            })),
          );
          totalRepaid += paid;
          outstanding += rem;
          statuses.push(deriveStatus({ amount: loan.amount, dueDate: loan.dueDate.toISOString().slice(0, 10) }, loan.payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            date: p.date.toISOString().slice(0, 10),
            method: "Other" as const,
          })), today));
        }

        // Recent reminder logs for this friend's loans.
        const loanIds = friend.loans.map((l) => l.id);
        const recentLogs = await prisma.reminderLog.findMany({
          where: { loanId: { in: loanIds } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
          select: {
            id: true,
            loanId: true,
            channel: true,
            scheduledFor: true,
            sentAt: true,
            status: true,
            error: true,
            createdAt: true,
          },
        });
        const loanById = new Map(friend.loans.map((l) => [l.id, l]));
        const reminderHistory = recentLogs.map((r) => {
          const loan = loanById.get(r.loanId);
          return {
            id: r.id,
            loanId: r.loanId,
            friendName: friend.name,
            amount: roundTaka(loan?.amount ?? 0),
            channel: r.channel,
            scheduledFor: r.scheduledFor.toISOString(),
            sentAt: r.sentAt?.toISOString() ?? null,
            status: r.status,
            error: r.error,
          };
        });

        return {
          friend: {
            id: friend.id,
            name: friend.name,
            phone: friend.phone ? formatPhone(friend.phone, "e164") : null,
            email: friend.email,
          },
          totals: {
            loanCount: friend.loans.length,
            totalLent: roundTaka(totalLent),
            totalRepaid: roundTaka(totalRepaid),
            outstanding: roundTaka(outstanding),
            worstStatus: worstOf(statuses),
          },
          loans: loanDtos,
          reminderHistory,
        };
      },
    },
    next.params,
  );
}
