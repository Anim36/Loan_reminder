// /api/loans/[id]/remind — schedule a one-off reminder.
//
// This is B4-only. The endpoint validates the loan, applies a
// 6-hour-per-channel cooldown, and writes QUEUED `ReminderLog`
// rows. The actual send is owned by B6.
//
// Channels
// --------
// The loan's `smsEnabled` and `emailEnabled` flags pick the
// channels. The endpoint refuses if neither is enabled, the
// loan is paid, the loan is soft-deleted, consent is missing,
// or the friend has opted out. The friend lookup also
// double-checks the phone / email are present so B6 has
// something to send to.
//
// Cooldown
// --------
// A loan can only get one reminder per channel per 6 hours. The
// check is on the most recent log row (any status) for the same
// loan + channel; if it's within the window, the route returns
// 409 with `reminder_cooldown` so the UI can show a friendly
// "try again later" toast.
//
// Deduping
// --------
// Each created `ReminderLog` has a `dedupeKey` of the form
// `${loanId}:${channel}:${epochMinutes}`. The column is unique
// in the schema; collisions on the same minute are silently
// ignored.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import { todayInDhaka } from "@/lib/dates";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(40) });

const bodySchema = z.object({
  /** When the reminder is intended to be sent. Defaults to now. */
  scheduledFor: z
    .string()
    .datetime({ message: "validation_error" })
    .optional(),
}).optional();

const COOLDOWN_MS = 6 * 60 * 60 * 1000;

export async function POST(req: NextRequest, next: { params: Promise<{ id: string }> }) {
  return apiHandler(
    req,
    {
      params: paramsSchema,
      body: bodySchema,
      handler: async ({ user, params, body }) => {
        const loan = await prisma.loan.findFirst({
          where: { id: params.id, userId: user.id, deletedAt: null },
          include: {
            friend: { select: { id: true, phone: true, email: true, optedOutAt: true } },
            payments: { select: { amount: true } },
          },
        });
        if (!loan) throw apiErrors.notFound("loan_not_found", "loan_not_found");
        if (loan.paidAt) {
          throw apiErrors.conflict("loan_already_paid", "loan_already_paid");
        }
        if (!loan.consentConfirmed) {
          throw apiErrors.unprocessable("consent_required", "consent_required");
        }
        if (loan.friend.optedOutAt) {
          throw apiErrors.unprocessable("friend_opted_out", "friend_opted_out");
        }
        if (!loan.smsEnabled && !loan.emailEnabled) {
          throw apiErrors.unprocessable("no_channel_enabled", "no_channel_enabled");
        }

        const channels: Array<"SMS" | "Email"> = [];
        if (loan.smsEnabled) channels.push("SMS");
        if (loan.emailEnabled) channels.push("Email");
        // B6 needs a target — reject when the channel is enabled
        // but the friend has no contact for it.
        if (loan.smsEnabled && !loan.friend.phone) {
          throw apiErrors.unprocessable("phone_invalid", "phone_invalid");
        }
        if (loan.emailEnabled && !loan.friend.email) {
          throw apiErrors.unprocessable("validation_error", "validation_error", {
            friend: ["email_required"],
          });
        }

        const now = body?.scheduledFor ? new Date(body.scheduledFor) : new Date();

        // 6-hour cooldown per channel. Check the latest log for
        // each channel; any status counts (we just refuse to
        // re-schedule while there's already something recent).
        const recent = await prisma.reminderLog.findMany({
          where: { loanId: loan.id, channel: { in: channels } },
          orderBy: { createdAt: "desc" },
          take: channels.length,
          select: { channel: true, createdAt: true },
        });
        const onCooldown = recent.find(
          (r) => r.createdAt.getTime() > Date.now() - COOLDOWN_MS,
        );
        if (onCooldown) {
          throw apiErrors.conflict("reminder_cooldown", "reminder_cooldown");
        }

        const epochMin = Math.floor(now.getTime() / 60_000);
        const created: Array<{
          id: string;
          channel: "SMS" | "Email";
          scheduledFor: string;
          status: "QUEUED";
          dedupeKey: string;
        }> = [];

        // Insert one row per channel. The unique `dedupeKey` may
        // collide on the same minute; we swallow that and read
        // back the existing row.
        for (const channel of channels) {
          const dedupeKey = `${loan.id}:${channel}:${epochMin}`;
          try {
            const row = await prisma.reminderLog.create({
              data: {
                loanId: loan.id,
                channel,
                scheduledFor: now,
                status: "QUEUED",
                dedupeKey,
              },
              select: {
                id: true,
                channel: true,
                scheduledFor: true,
                status: true,
                dedupeKey: true,
              },
            });
            created.push({
              ...row,
              status: "QUEUED",
              scheduledFor: row.scheduledFor.toISOString(),
            });
          } catch (err) {
            if (
              err instanceof Error &&
              "code" in err &&
              (err as { code?: string }).code === "P2002"
            ) {
              const existing = await prisma.reminderLog.findUnique({
                where: { dedupeKey },
                select: {
                  id: true,
                  channel: true,
                  scheduledFor: true,
                  status: true,
                  dedupeKey: true,
                },
              });
              if (existing) {
                created.push({
                  ...existing,
                  status: "QUEUED",
                  scheduledFor: existing.scheduledFor.toISOString(),
                });
              }
            } else {
              throw err;
            }
          }
        }

        // `today` is unused in the response but we keep the
        // DTO mapper import path consistent with sibling routes
        // when the reminder engine later embeds the loan.
        void todayInDhaka;
        return created;
      },
    },
    next.params,
  );
}
