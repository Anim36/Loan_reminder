// Settings — delete account — POST /api/settings/delete-account.
//
// Deletes every row owned by the user in a single transaction,
// then signs the session out. The schema is set up with
// `onDelete: Cascade` on the user FK for every child table, so
// a single `user.delete` would suffice — we still call them
// out explicitly so the SQL is reviewable in the audit log.
//
// The client follows this call with `signOut()` from
// `next-auth/react`, which clears the cookie. The server
// response is just `{ ok: true }`.

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/server/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.reminderLog.deleteMany({ where: { loan: { userId } } }),
    prisma.payment.deleteMany({ where: { loan: { userId } } }),
    prisma.rescheduleEntry.deleteMany({
      where: { loan: { userId } },
    }),
    prisma.loan.deleteMany({ where: { userId } }),
    prisma.friend.deleteMany({ where: { userId } }),
    prisma.reminderSettings.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
