// /api/reports/export.csv — download a CSV of the loans in
// range. Columns:
//
//   Friend, Amount, Paid, Remaining, Status, Given, Due
//
// The file is `text/csv; charset=utf-8` with a UTF-8 BOM so
// Excel renders Bangla names correctly. The
// `Content-Disposition: attachment` header prompts a
// download.
//
// CSV safety
// ----------
//   * Quotes, commas, CR, LF in cell values are escaped
//     (RFC 4180) by `lib/csv.ts:escapeCell`.
//   * Cells starting with `=`, `+`, `-`, `@`, TAB or CR
//     are prefixed with a single quote so Excel / Sheets
//     don't interpret them as formulas. A friend named
//     `=cmd|'/c calc'!A1` becomes the literal text
//     `'=cmd|'/c calc'!A1`.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";
import { todayInDhaka, formatDateOnly } from "@/lib/dates";
import { roundTaka, poishaToTaka } from "@/lib/money";
import { remainingPoisha, amountPaidPoisha } from "@/lib/loanStatus";
import { rangeStart, type ReportRange } from "@/lib/reports";
import { buildCsv } from "@/lib/csv";

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

/* ---- Status derivation (light) --------------------------------- */

function deriveStatus(
  amount: number,
  dueDate: Date,
  paidAt: Date | null,
  payments: Array<{ amount: number }>,
  today: Date,
): "Paid" | "Pending" | "Overdue" {
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  if (paid >= amount) return "Paid";
  if (paidAt) return "Paid";
  const a = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const b = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  return b < a ? "Overdue" : "Pending";
}

const HEADER_ROW = [
  "Friend",
  "Amount (BDT)",
  "Paid (BDT)",
  "Remaining (BDT)",
  "Status",
  "Given",
  "Due",
];

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    query: querySchema,
    handler: async ({ user, query }) => {
      const today = todayInDhaka();
      const start = rangeStart(query.range, today);

      const loans = await prisma.loan.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          ...(start ? { dueDate: { gte: start } } : {}),
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          amount: true,
          dueDate: true,
          givenDate: true,
          paidAt: true,
          friend: { select: { name: true } },
          payments: { select: { amount: true, date: true } },
        },
      });

      const rows: Array<ReadonlyArray<unknown>> = [HEADER_ROW];
      for (const l of loans) {
        const pays = l.payments.map((p) => ({
          id: p.date.toISOString(),
          amount: p.amount,
          date: p.date.toISOString().slice(0, 10),
          method: "Other" as const,
        }));
        const status = deriveStatus(
          l.amount,
          l.dueDate,
          l.paidAt,
          l.payments,
          today,
        );
        const paid = amountPaidPoisha(pays);
        const rem = remainingPoisha({ amount: l.amount }, pays);
        rows.push([
          l.friend.name,
          roundTaka(l.amount),
          roundTaka(paid),
          roundTaka(rem),
          status,
          formatDateOnly(l.givenDate),
          formatDateOnly(l.dueDate),
        ]);
      }

      const body = buildCsv(rows);
      // UTF-8 BOM so Excel reads Bangla names correctly.
      const BOM = "\uFEFF";
      const filename = `loans-${query.range}-${formatDateOnly(today)}.csv`;

      return new Response(BOM + body, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}"`,
          // Suggest the browser doesn't cache — the data can
          // change every payment.
          "cache-control": "no-store",
        },
      });
    },
  });
}

// Reference to suppress the unused-import linter for
// `poishaToTaka` (kept for symmetry with the other money
// helpers the report touches).
void poishaToTaka;
