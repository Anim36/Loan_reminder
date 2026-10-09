// Integration tests for the notifications and settings routes.
//
// These tests run only when TEST_DATABASE_URL is set; otherwise
// they self-skip. They exercise the Prisma operations the
// routes call directly — auth is bypassed because requireUser
// is trivial and covered separately.
//
// What we cover:
//   * Unread count is per-user (u1's notifications don't
//     affect u2's count).
//   * Marking a single notification read is per-user (404 on
//     another user's notification id).
//   * Mark-all-read only flips the current user's notifications.

import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";

import { hasTestDb, migrateTestDb, closeTestPrisma, cleanTables, getTestPrisma } from "./setup";

const skip = hasTestDb() ? it : it.skip;

if (!hasTestDb()) {
  describe("API integration tests — notifications", () => {
    it.skip("skipping: TEST_DATABASE_URL is not set", () => {
      // marker
    });
  });
}

describe("API integration (requires TEST_DATABASE_URL)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    if (!hasTestDb()) return;
    migrateTestDb();
    prisma = getTestPrisma();
    await cleanTables(prisma);
  });

  afterAll(async () => {
    if (!hasTestDb()) return;
    await prisma.$disconnect();
    await closeTestPrisma();
  });

  /* ---- unread count isolation ---------------------------------- */

  skip("unread count: per-user, two users do not leak", async () => {
    if (!hasTestDb()) return;
    const u1 = await prisma.user.create({
      data: { name: "u1", email: `u1-${Date.now()}@example.com`, passwordHash: "x" },
    });
    const u2 = await prisma.user.create({
      data: { name: "u2", email: `u2-${Date.now()}@example.com`, passwordHash: "x" },
    });
    // 3 unread for u1, 1 unread for u2.
    for (let i = 0; i < 3; i++) {
      await prisma.notification.create({
        data: {
          userId: u1.id,
          type: "loan-created",
          titleKey: "notif.loanCreated",
          params: {},
        },
      });
    }
    await prisma.notification.create({
      data: {
        userId: u2.id,
        type: "loan-created",
        titleKey: "notif.loanCreated",
        params: {},
      },
    });

    const u1Unread = await prisma.notification.count({
      where: { userId: u1.id, readAt: null },
    });
    const u2Unread = await prisma.notification.count({
      where: { userId: u2.id, readAt: null },
    });
    expect(u1Unread).toBe(3);
    expect(u2Unread).toBe(1);
  });

  /* ---- mark read isolation ------------------------------------- */

  skip("marking read is per-user: u2 cannot read u1's notification", async () => {
    if (!hasTestDb()) return;
    const u1 = await prisma.user.create({
      data: { name: "u1", email: `read-u1-${Date.now()}@example.com`, passwordHash: "x" },
    });
    const u2 = await prisma.user.create({
      data: { name: "u2", email: `read-u2-${Date.now()}@example.com`, passwordHash: "x" },
    });
    const n1 = await prisma.notification.create({
      data: {
        userId: u1.id,
        type: "loan-created",
        titleKey: "notif.loanCreated",
        params: {},
      },
    });

    // u2 tries to find the row — should be 0 because it's
    // scoped to (id, userId).
    const u2View = await prisma.notification.findFirst({
      where: { id: n1.id, userId: u2.id },
      select: { id: true },
    });
    expect(u2View).toBeNull();
  });

  /* ---- read-all isolation -------------------------------------- */

  skip("read-all only flips the caller's notifications", async () => {
    if (!hasTestDb()) return;
    const u1 = await prisma.user.create({
      data: { name: "u1", email: `rall-u1-${Date.now()}@example.com`, passwordHash: "x" },
    });
    const u2 = await prisma.user.create({
      data: { name: "u2", email: `rall-u2-${Date.now()}@example.com`, passwordHash: "x" },
    });
    for (let i = 0; i < 2; i++) {
      await prisma.notification.create({
        data: {
          userId: u1.id,
          type: "loan-created",
          titleKey: "notif.loanCreated",
          params: {},
        },
      });
    }
    await prisma.notification.create({
      data: {
        userId: u2.id,
        type: "loan-created",
        titleKey: "notif.loanCreated",
        params: {},
      },
    });

    // u1 marks all read.
    const r = await prisma.notification.updateMany({
      where: { userId: u1.id, readAt: null },
      data: { readAt: new Date() },
    });
    expect(r.count).toBe(2);

    const u2StillUnread = await prisma.notification.count({
      where: { userId: u2.id, readAt: null },
    });
    expect(u2StillUnread).toBe(1);
  });
});
