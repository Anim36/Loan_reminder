// /api/notifications/read-all — mark every unread notification
// as read for the current user. Idempotent. Returns the number
// of rows that flipped from unread → read.

import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return apiHandler(req, {
    handler: async ({ user }) => {
      const result = await prisma.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
      });
      return { updated: result.count };
    },
  });
}
