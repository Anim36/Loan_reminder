// /api/reports — aggregations for the Reports screen.
//
// One `findMany` for the user's loans in the range, one
// `findMany` for the friends. All grouping is in
// `src/lib/reports.ts`. The query is `force-dynamic`; cache
// headers are not set yet.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";
import { todayInDhaka } from "@/lib/dates";
import { computeReport, rangeStart, type ReportRange } from "@/lib/reports";

export const dynamic = "force-dynamic";

const rangeSchema = z
  .union([
    z.literal("3m"),
    z.literal("6m"),
    z.literal("12m"),
    z.literal("all"),
    z.literal(""),
  ])
  .optional()
  .transform((v) => (v && v.length > 0 ? (v as ReportRange) : "6m"));

const querySchema = z.object({
  range: rangeSchema,
});

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    query: querySchema,
    handler: async ({ user, query }) => {
      const today = todayInDhaka();
      const start = rangeStart(query.range, today);

      // One query for loans in range, one for friends. We
      // include `payments` on the loan so the report
      // doesn't have to do N+1 lookups.
      const [loans, friends] = await Promise.all([
        prisma.loan.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
            ...(start ? { dueDate: { gte: start } } : {}),
          },
          orderBy: { dueDate: "asc" },
          select: {
            id: true,
            amount: true,
            dueDate: true,
            paidAt: true,
            givenDate: true,
            deletedAt: true,
            friendId: true,
            payments: {
              select: { amount: true, date: true, createdAt: true },
              orderBy: { date: "asc" },
            },
          },
        }),
        prisma.friend.findMany({
          where: { userId: user.id },
          select: { id: true, name: true },
        }),
      ]);

      return computeReport(
        loans.map((l) => ({
          id: l.id,
          amount: l.amount,
          dueDate: l.dueDate,
          paidAt: l.paidAt,
          givenDate: l.givenDate,
          deletedAt: l.deletedAt,
          friendId: l.friendId,
          payments: l.payments,
        })),
        friends,
        query.range,
        today,
      );
    },
  });
}
