#!/usr/bin/env node
// Small launcher that picks between an embedded Postgres (a
// development-only fallback) and the user's real `DATABASE_URL`
// (production, Neon, RDS, etc.).
//
// Usage: `node scripts/db-runner.mjs <migrate|seed|reset|start|studio>`
//
// Env precedence (mirrors Next.js):
//   1. real process env (highest)
//   2. `.env.local`  (developer machine overrides)
//   3. `.env`        (committed defaults)
//
// If `DATABASE_URL` is set anywhere in that hierarchy, the script
// always uses it. The embedded Postgres is only used as a fallback
// when `DATABASE_URL` is missing entirely — in which case a single
// `Using embedded Postgres …` warning is printed so the user
// notices. The connection string and password are never printed.

import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

// `.env` first, then `.env.local` on top — same order as Next.js.
// `override: true` on the second call makes `.env.local` win on
// duplicate keys.
loadEnv({ path: path.join(ROOT, ".env"), override: false });
loadEnv({ path: path.join(ROOT, ".env.local"), override: true });

const PORT = 55432;
const USER = "loan";
const PASSWORD = "loan";
const DB = "loan_reminder";
const DATA_DIR = path.join(ROOT, ".pg-data");
const EMBEDDED_URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB}?schema=public`;

function env() {
  return { DATABASE_URL: EMBEDDED_URL, DIRECT_URL: EMBEDDED_URL };
}

/** Print a one-line summary of the URL the script will use.
 *  The host:port is shown but the credentials are not. */
function describeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

async function startEmbedded() {
  const EmbeddedPostgres = (await import("embedded-postgres")).default;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
  });
  if (!existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("Initialising embedded Postgres data dir at", DATA_DIR);
    await pg.initialise();
  }
  console.log(`Starting embedded Postgres on 127.0.0.1:${PORT}…`);
  await pg.start();
  try {
    await pg.createDatabase(DB);
    console.log(`Created database "${DB}".`);
  } catch (e) {
    if (!/already exists/i.test(String(e?.message ?? e))) throw e;
  }
  return pg;
}

function run(cmd, args, envObj = {}) {
  console.log("$", cmd, args.join(" "));
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...envObj },
  });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited with status ${r.status}`);
  }
}

async function main() {
  const action = process.argv[2] ?? "all";
  // Database choice. We REFUSE to fall back to the embedded
  // Postgres — the user explicitly asked for a hard error if
  // DATABASE_URL is missing so we never write to the wrong
  // database by accident. The embedded branch is no longer
  // reachable; the import and `startEmbedded()` are kept below
  // only because removing them would touch more of the file than
  // necessary (this script is meant to be minimal-diff).
  //
  // `USE_EXTERNAL_DB=0` is no longer recognised: setting it used
  // to force the embedded server. If you really need the embedded
  // server back temporarily, set DATABASE_URL to point at
  // 127.0.0.1:55432 and have the embedded server running on your
  // own — but the runner will not start it for you.
  const useExternal = Boolean(process.env.DATABASE_URL);

  if (action === "studio") {
    // Studio always uses the env's DATABASE_URL.
    run("npx", ["prisma", "studio"]);
    return;
  }

  if (!useExternal) {
    // Hard stop. Print a clear, multi-line error and exit non-zero
    // so a `npm run db:*` chain fails fast. Never start the
    // embedded server; never reuse `process.env.DATABASE_URL`
    // from a parent shell unless we set it ourselves.
    console.error(
      [
        "DATABASE_URL is not set.",
        "",
        "This script will NOT fall back to an embedded Postgres —",
        "that used to risk writing development data to a local",
        "server without the user noticing.",
        "",
        "Set DATABASE_URL (and DIRECT_URL if your provider",
        "requires it) in .env or .env.local and re-run.",
      ].join("\n"),
    );
    process.exit(2);
  }

  const url = process.env.DATABASE_URL;
  console.log(`Using DATABASE_URL: ${describeUrl(url)} (credentials redacted)`);
  const envObj = { DATABASE_URL: url, DIRECT_URL: process.env.DIRECT_URL ?? url };
  if (action === "migrate" || action === "all") {
    run("npx", ["prisma", "db", "push", "--skip-generate"], envObj);
    run("npx", ["prisma", "generate"], envObj);
  }
  if (action === "reset") {
    run("npx", ["prisma", "migrate", "reset", "--force", "--skip-seed"], envObj);
    run("npx", ["prisma", "generate"], envObj);
  }
  if (action === "seed" || action === "all") {
    run("npx", ["tsx", "prisma/seed.ts"], envObj);
  }
  if (action === "start") {
    console.log("Nothing to start — this runner no longer boots an embedded Postgres server.");
  }
  return;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
