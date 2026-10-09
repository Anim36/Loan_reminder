// /api/reminders/history — paginated reminder log.
//
// Each row includes the loan id, friend name, loan amount,
// channel, scheduled time, sent time (nullable) and status.
// The `stats` block is for the filtered set: total, delivered
// (=DELIVERED or SENT with `sentAt` set), failed (=FAILED).

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";
import { formatPhone } from "@/lib/phone";
import { roundTaka } from "@/lib/money";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  channel: z
    .union([z.enum(["SMS", "Email"]), z.literal("")])
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  status: z
    .union(
      [
        z.enum(["QUEUED", "SENT", "DELIVERED", "FAILED", "SKIPPED"]),
        z.literal(""),
      ],
    )
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  sort: z
    .union([z.enum(["date"]), z.literal("")])
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "date")),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    query: querySchema,
    handler: async ({ user, query }) => {
      const where: Record<string, unknown> = {
        loan: { userId: user.id, deletedAt: null },
      };
      if (query.channel) where.channel = query.channel;
      if (query.status) where.status = query.status;
      if (query.q) {
        // Search by friend name. The relation has no direct
        // `name`, so we filter through a nested `loan.friend.name`
        // contains.
        (where.loan as Record<string, unknown>).friend = {
          name: { contains: query.q, mode: "insensitive" },
        };
      }

      // Sort by createdAt desc (the spec's `sort: date`).
      const orderBy = { createdAt: "desc" as const };

      const [logs, total] = await Promise.all([
        prisma.reminderLog.findMany({
          where,
          orderBy,
          take: query.pageSize,
          skip: (query.page - 1) * query.pageSize,
          include: {
            loan: {
              select: {
                id: true,
                amount: true,
                friend: { select: { name: true, phone: true } },
              },
            },
          },
        }),
        prisma.reminderLog.count({ where }),
      ]);

      // Stats for the filtered set.
      const grouped = await prisma.reminderLog.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      });
      const totalCount = grouped.reduce((s, g) => s + g._count._all, 0);
      const delivered = grouped
        .filter((g) => g.status === "DELIVERED" || g.status === "SENT")
        .reduce((s, g) => s + g._count._all, 0);
      const failed = grouped
        .filter((g) => g.status === "FAILED")
        .reduce((s, g) => s + g._count._all, 0);

      const data = logs.map((r) => ({
        id: r.id,
        loanId: r.loanId,
        friendName: r.loan.friend.name,
        friendPhone: r.loan.friend.phone ? formatPhone(r.loan.friend.phone, "e164") : null,
        amount: roundTaka(r.loan.amount),
        channel: r.channel,
        scheduledFor: r.scheduledFor.toISOString(),
        sentAt: r.sentAt?.toISOString() ?? null,
        status: r.status,
        error: r.error,
      }));

      return {
        data,
        meta: { page: query.page, pageSize: query.pageSize, total },
        stats: { total: totalCount, delivered, failed },
      };
    },
  });
}
