// Vitest config.
//
// Test layout:
//   tests/unit/         — pure unit tests (always run)
//   tests/integration/  — tests that hit a database, only
//                         active when TEST_DATABASE_URL is set.
//
// Both directories are always discovered; the integration tests
// self-skip when the env var is missing. The `test:integration`
// npm script is a convenience for CI which sets the env.

import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
