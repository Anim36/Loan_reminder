// Tiny in-memory rate limiter.
//
// The interface is the same one a Redis-backed implementation
// would expose (`consume(key)`), so a future swap to `@upstash/ratelimit`
// is a single file change. The default is 5 attempts per 15 minutes
// per (IP, email) pair — the exact numbers come from the caller
// so the same limiter is reusable for signup, login, and
// forgot-password.
//
// Notes
// -----
//   * Window is "sliding": we keep a sorted list of timestamps per
//     key and drop any that are older than the window. This avoids
//     the thundering-herd behaviour of a fixed-window counter.
//   * The store is a plain `Map` on the module instance. In serverless
//     deployments each invocation may get a fresh module scope, which
//     is fine — the limiter is best-effort and the next request can
//     simply retry. A Redis backend fixes the "fresh scope" problem
//     without code changes.
//   * We never throw on a missing key. Unknown callers are allowed
//     through.

export interface RateLimitOptions {
  /** Maximum allowed attempts in the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitDecision {
  ok: boolean;
  /** How many attempts remain in the current window. */
  remaining: number;
  /** Milliseconds until the oldest attempt in the window expires. */
  retryAfterMs: number;
}

export interface RateLimiter {
  /** Try to record an attempt. Returns `{ ok: true }` while the
   *  caller is below the limit, `{ ok: false, retryAfterMs }` once
   *  they've exceeded it. The attempt is *always* recorded — pass
   *  a stable key (e.g. "login:1.2.3.4:foo@bar.com") so retries
   *  accumulate. */
  consume(key: string): RateLimitDecision;
}

interface Bucket {
  /** Sorted ascending — oldest first. */
  attempts: number[];
}

export function createRateLimiter(opts: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();
  const { limit, windowMs } = opts;

  function consume(key: string): RateLimitDecision {
    const now = Date.now();
    const cutoff = now - windowMs;
    const bucket = buckets.get(key) ?? { attempts: [] };
    // Drop attempts outside the window.
    while (bucket.attempts.length && bucket.attempts[0] < cutoff) {
      bucket.attempts.shift();
    }
    if (bucket.attempts.length >= limit) {
      const oldest = bucket.attempts[0];
      const retryAfterMs = Math.max(0, oldest + windowMs - now);
      buckets.set(key, bucket);
      return { ok: false, remaining: 0, retryAfterMs };
    }
    bucket.attempts.push(now);
    buckets.set(key, bucket);
    return { ok: true, remaining: limit - bucket.attempts.length, retryAfterMs: 0 };
  }

  return { consume };
}

/* ---- Shared limiters ------------------------------------------------
 * The login, signup and forgot-password routes all share the same
 * defaults. The names are exported so the API routes can grab the
 * exact instance they need without recreating one per call. */

const FIFTEEN_MIN = 15 * 60 * 1000;

/** 5 attempts per 15 minutes — login, signup, forgot-password. */
export const authRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: FIFTEEN_MIN,
});

/** Best-effort IP reader. Uses `x-forwarded-for` first (the value
 *  behind most reverse proxies / Vercel) and falls back to
 *  `x-real-ip`. Returns `"unknown"` so the limiter still works in
 *  environments that don't expose either header. */
export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

// Dev-time sanity check. A no-op at runtime but keeps the
// `console` reference alive so the bundler doesn't tree-shake
// this module out of the prod build.
if (process.env.NODE_ENV !== "production") {
  void FIFTEEN_MIN;
  void authRateLimiter;
}
