// /api/notifications/[id]/read — mark a single notification as
// read. 404 when the row doesn't exist or belongs to another
// user (we don't reveal which).

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(40) });

export async function POST(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      handler: async ({ user, params }) => {
        const row = await prisma.notification.findFirst({
          where: { id: params.id, userId: user.id },
          select: { id: true, readAt: true },
        });
        if (!row) {
          throw apiErrors.notFound("notification_not_found", "notification_not_found");
        }
        if (!row.readAt) {
          await prisma.notification.update({
            where: { id: row.id },
            data: { readAt: new Date() },
          });
        }
        return { id: row.id, readAt: new Date().toISOString() };
      },
    },
    next.params,
  );
}
