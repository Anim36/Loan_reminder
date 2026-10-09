// /api/friends — list.
//
// Derived from the user's `loans` table (one row per Friend
// row, even if they have no loans yet). Sorted by name
// (case-insensitive). The "worst status" rule is
// Overdue > Pending > Paid, applied across the friend's loans.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";
import { todayInDhaka } from "@/lib/dates";
import { deriveStatus, remainingPoisha, amountPaidPoisha } from "@/lib/loanStatus";
import { formatPhone } from "@/lib/phone";
import { roundTaka } from "@/lib/money";
import type { LoanStatus } from "@/types/loan";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function worstOf(statuses: LoanStatus[]): LoanStatus {
  if (statuses.some((s) => s === "Overdue")) return "Overdue";
  if (statuses.some((s) => s === "Pending")) return "Pending";
  return "Paid";
}

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    query: querySchema,
    handler: async ({ user, query }) => {
      const today = todayInDhaka();
      const q = query.q?.toLowerCase();

      // Friends with no loans still need to appear, so we start
      // from the user's `friends` rows and left-join their loans
      // in JS.
      const friends = await prisma.friend.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          loans: {
            where: { deletedAt: null },
            select: {
              id: true,
              amount: true,
              dueDate: true,
              paidAt: true,
              payments: { select: { amount: true, date: true } },
            },
          },
        },
      });

      const rows = friends
        .filter((f) => {
          if (!q) return true;
          return (
            f.name.toLowerCase().includes(q) ||
            (f.phone ?? "").toLowerCase().includes(q)
          );
        })
        .map((f) => {
          let totalLent = 0;
          let totalRepaid = 0;
          let outstanding = 0;
          const statuses: LoanStatus[] = [];
          for (const loan of f.loans) {
            totalLent += loan.amount;
            const paid = amountPaidPoisha(
              loan.payments.map((p) => ({
                id: p.date.toISOString(),
                amount: p.amount,
                date: p.date.toISOString().slice(0, 10),
                method: "Other" as const,
              })),
            );
            const rem = remainingPoisha(
              { amount: loan.amount },
              loan.payments.map((p) => ({
                id: p.date.toISOString(),
                amount: p.amount,
                date: p.date.toISOString().slice(0, 10),
                method: "Other" as const,
              })),
            );
            totalRepaid += paid;
            outstanding += rem;
            statuses.push(deriveStatus({ amount: loan.amount, dueDate: loan.dueDate.toISOString().slice(0, 10) }, loan.payments.map((p) => ({
              id: p.date.toISOString(),
              amount: p.amount,
              date: p.date.toISOString().slice(0, 10),
              method: "Other" as const,
            })), today));
          }
          return {
            id: f.id,
            name: f.name,
            phone: f.phone ? formatPhone(f.phone, "e164") : null,
            email: f.email,
            loanCount: f.loans.length,
            totalLent: roundTaka(totalLent),
            totalRepaid: roundTaka(totalRepaid),
            outstanding: roundTaka(outstanding),
            worstStatus: worstOf(statuses),
          };
        });

      // Sort by name (case-insensitive).
      rows.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

      const total = rows.length;
      const start = (query.page - 1) * query.pageSize;
      const slice = rows.slice(start, start + query.pageSize);
      return {
        data: slice,
        meta: { page: query.page, pageSize: query.pageSize, total },
      };
    },
    listMode: true,
  });
}
