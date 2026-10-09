// /api/notifications — list.
//
// Newest first. The `unread=true` filter uses the
// `(userId, readAt)` index. Pagination matches the loan
// list shape: `{ data, meta: { page, pageSize, total } }`.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  unread: z
    .union([z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    query: querySchema,
    handler: async ({ user, query }) => {
      const where: Record<string, unknown> = { userId: user.id };
      if (query.unread === true) where.readAt = null;
      if (query.unread === false) where.readAt = { not: null };

      const [rows, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: query.pageSize,
          skip: (query.page - 1) * query.pageSize,
          select: {
            id: true,
            type: true,
            titleKey: true,
            params: true,
            loanId: true,
            readAt: true,
            createdAt: true,
          },
        }),
        prisma.notification.count({ where }),
      ]);

      return {
        data: rows.map((r) => ({
          id: r.id,
          type: r.type,
          titleKey: r.titleKey,
          params: r.params,
          loanId: r.loanId,
          readAt: r.readAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
        meta: { page: query.page, pageSize: query.pageSize, total },
      };
    },
    listMode: true,
  });
}
