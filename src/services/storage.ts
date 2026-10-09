// Storage helpers shared by every localStorage-backed service.
//
// Every service stores data that may have changed shape in a previous
// release. The contract here:
//
//   1. `safeJsonParse` — try/catch around JSON.parse, never throws.
//      Returns `null` on any failure (bad JSON, non-object, array, etc).
//   2. `normalizeAndPersist` — call a `normalize` function on the parsed
//      object. The normalizer must return a fully-populated value of
//      the new shape (deep-merged with the service's SEED) or `null` if
//      the data can't be salvaged. When the result was repaired, the
//      helper writes the migrated value back to localStorage under the
//      same key so subsequent reads are fast.
//   3. `useStableRaw` — read the raw storage value, parsed and
//      normalized, cached by the raw string. Re-uses the same
//      reference unless the raw string changes. Prevents the
//      "getSnapshot should be cached" warning from useSyncExternalStore.
//
// All helpers are SSR-safe — they no-op when `window` is undefined.

/** Returns true on the client. */
export function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/** Safe JSON.parse wrapper. Returns `null` on any failure. */
export function safeJsonParse<T = unknown>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || parsed === undefined) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Read, parse, and normalize a value from localStorage. If the
 * normalizer returns a value that differs from the raw parsed value
 * (e.g. fields were repaired, defaults were filled, or the shape was
 * upgraded), the migrated value is written back so the next read is
 * a no-op.
 *
 * @param storageKey  The localStorage key.
 * @param normalize   `(raw: unknown) => T | null`. The normalizer
 *                    receives the parsed JSON (already type-erased) and
 *                    must return either a fully-populated `T` or
 *                    `null` (in which case the caller falls back to
 *                    its own seed).
 * @param isEqual     `(a: T, b: T) => boolean` — defaults to `===`
 *                    which works for primitive values and stable
 *                    references. For object values, pass a deep
 *                    comparison or a "did we change anything" flag.
 * @returns The normalized value, or `null` if the data couldn't be
 *          salvaged.
 */
export function readAndNormalize<T>(
  storageKey: string,
  normalize: (raw: unknown) => T | null,
  isEqual: (a: T, b: T) => boolean = (a, b) => a === b,
): T | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(storageKey);
  const parsed = safeJsonParse<unknown>(raw);
  if (parsed === null) return null;
  const normalized = normalize(parsed);
  if (normalized === null) return null;
  // Persist the migrated form if anything changed.
  if (!isEqual(normalized, parsed as T)) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(normalized));
    } catch {
      // Ignore — storage may be unavailable in private mode.
    }
  }
  return normalized;
}

/**
 * Cached-snapshot helper for `useSyncExternalStore.getSnapshot`.
 *
 * The function returns the same reference until the raw storage value
 * changes. Callers should pass the same `key` and a `read` callback
 * that re-parses only when the raw string actually differs. When the
 * caller invalidates the cache (e.g. after a write) it should call
 * `invalidateSnapshotCache(key)`.
 */
const SNAPSHOT_CACHE = new Map<string, { raw: string | null; value: unknown }>();

export function readSnapshot<T>(key: string, read: (raw: string | null) => T): T {
  if (!hasWindow()) return read(null);
  const raw = window.localStorage.getItem(key);
  const cached = SNAPSHOT_CACHE.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  const value = read(raw);
  SNAPSHOT_CACHE.set(key, { raw, value });
  return value;
}

export function invalidateSnapshotCache(key: string): void {
  SNAPSHOT_CACHE.delete(key);
}

/** Currently active snapshot keys — useful for tests and debugging. */
export function listSnapshotCacheKeys(): string[] {
  return Array.from(SNAPSHOT_CACHE.keys());
}
