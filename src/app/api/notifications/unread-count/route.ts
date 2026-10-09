// /api/notifications/unread-count — cheap count for the bell
// badge. Backed by the `(userId, readAt)` index so the query
// is an index scan, not a full table read.

import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    handler: async ({ user }) => {
      const count = await prisma.notification.count({
        where: { userId: user.id, readAt: null },
      });
      return { count };
    },
    // Scalar count — return the raw `{ count: N }` body so the
    // service reads `.count` (no `.data` hop). This matches the
    // shape the rest of the B5 frontend expects.
    listMode: true,
  });
}
