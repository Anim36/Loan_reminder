// Prisma client singleton.
//
// Next.js dev mode hot-reloads modules, so a naïve `new PrismaClient()`
// at the top of any file would open a new connection on every
// reload and quickly exhaust the database. We stash the client on
// `globalThis` in development and reuse it across reloads.
//
// In production the module is loaded once per server instance, so the
// `globalThis` dance is a no-op.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
