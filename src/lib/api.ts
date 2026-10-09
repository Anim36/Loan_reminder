// Typed fetch wrapper for the future backend.
//
// All HTTP access in the app goes through this module. Service files
// (loanService, reminderService, authService) call the helpers below
// instead of touching `fetch` directly, so a single change here propagates
// to every request.
//
// Features:
//   - Base URL from `NEXT_PUBLIC_API_URL` (no trailing slash enforced).
//   - Bearer auth token attached to every request when present
//     (see `setAuthToken` / `getAuthToken` in `@/lib/auth`).
//   - JSON request bodies + JSON response decoding.
//   - Custom `ApiError` class with the HTTP status, a server-supplied
//     code, and the parsed body so the UI can render specific messages.
//   - Optional `AbortSignal` and `Idempotency-Key` (POST/PUT/PATCH only).
//   - 30s default timeout; configurable per call.
//
// SSR-safe: nothing here touches `window` at module scope. The auth
// helpers do, but only when called from a client component.

import { getAuthToken } from "./auth";

/** Base URL for the backend, read once from the build-time env. */
const RAW_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Strip a trailing slash so path concatenation is predictable. */
const API_BASE = RAW_BASE.replace(/\/+$/, "");

/** True when an API base URL has been configured. Service files use this
 *  to decide whether to call the network or fall back to localStorage. */
export const API_ENABLED = API_BASE.length > 0;

const DEFAULT_TIMEOUT_MS = 30_000;

/** HTTP methods we care about. */
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Per-request options. */
export interface RequestOptions {
  /** Bearer token to attach; falls back to the global token store. */
  authToken?: string | null;
  /** Extra request headers to merge in. */
  headers?: Record<string, string>;
  /** Query string parameters; values are `string | number | boolean | undefined`. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** AbortController signal. */
  signal?: AbortSignal;
  /** Per-request timeout in ms. Defaults to 30s. */
  timeoutMs?: number;
  /** Idempotency key for unsafe writes (POST/PUT/PATCH). */
  idempotencyKey?: string;
  /** Skip JSON decoding on success (returns `undefined`). */
  raw?: boolean;
  /** Skip sending the body (some PATCH/DELETE endpoints expect no body). */
  noBody?: boolean;
}

/** Shape of an error body the backend is expected to return. */
export interface ApiErrorBody {
  /** Machine-readable code, e.g. "loan_not_found". */
  code?: string;
  /** Human-readable message safe to display to the end user. */
  message?: string;
  /** Optional field-level details (zod / joi / class-validator style). */
  details?: Record<string, string>;
  /** Free-form additional data. */
  [key: string]: unknown;
}

/**
 * Thrown for every non-2xx response. Carries the parsed body so the UI
 * can pull `code` and `message` without re-parsing.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: Record<string, string> | undefined;
  readonly body: ApiErrorBody | null;

  constructor(
    message: string,
    status: number,
    body: ApiErrorBody | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code;
    this.details = body?.details;
    this.body = body;
  }
}

/** Build a `?key=value&…` string, skipping undefined / null / empty. */
function buildQuery(
  query: RequestOptions["query"],
): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(
      `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    );
  }
  return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

/** Compose a final URL from the base + path. Throws if `path` is absolute. */
function buildUrl(path: string, query: RequestOptions["query"]): string {
  if (/^https?:\/\//i.test(path)) {
    // Absolute URL — skip the base.
    return path + buildQuery(query);
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE + cleanPath + buildQuery(query);
}

/** Best-effort JSON parse; returns null when the body isn't JSON. */
async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Decide whether a status code is "ok" (2xx, no throw). */
function isOk(status: number): boolean {
  return status >= 200 && status < 300;
}

/** Build the standard set of request headers. */
function buildHeaders(
  method: Method,
  body: unknown,
  opts: RequestOptions,
): Headers {
  const headers = new Headers();
  // `fetch` will set this for FormData; for JSON we set it explicitly.
  if (body !== undefined && !(body instanceof FormData) && !opts.noBody) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  const token = opts.authToken ?? getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (opts.idempotencyKey && method !== "GET" && method !== "DELETE") {
    headers.set("Idempotency-Key", opts.idempotencyKey);
  }
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) {
      headers.set(k, v);
    }
  }
  return headers;
}

/** Internal: the actual `fetch` call with timeout + abort wiring. */
async function performRequest(
  method: Method,
  path: string,
  body: unknown,
  opts: RequestOptions,
): Promise<Response> {
  if (!API_ENABLED) {
    throw new ApiError(
      "API base URL is not configured (NEXT_PUBLIC_API_URL is empty).",
      0,
      null,
    );
  }
  const url = buildUrl(path, opts.query);
  const headers = buildHeaders(method, body, opts);
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // If the caller already gave us a signal, abort our internal controller
  // when theirs fires.
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort());
  }
  try {
    return await fetch(url, {
      method,
      headers,
      body:
        body === undefined || opts.noBody
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      signal: controller.signal,
      // Always opt out of Next.js's fetch cache; this is per-user data.
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Core `request` function. Use the `apiGet / apiPost / …` helpers below
 * instead of calling this directly unless you need a custom method.
 */
export async function request<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await performRequest(method, path, body, opts);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request was aborted", 0, null);
    }
    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiError(message, 0, null);
  }
  if (isOk(res.status)) {
    if (opts.raw) return undefined as T;
    const parsed = await safeJson(res);
    return (parsed ?? (undefined as T)) as T;
  }
  // Non-2xx — build a structured error.
  const parsed = (await safeJson(res)) as ApiErrorBody | null;
  const message =
    (parsed && typeof parsed.message === "string" && parsed.message) ||
    `${res.status} ${res.statusText}`.trim() ||
    "Request failed";
  throw new ApiError(message, res.status, parsed);
}

/* ---- Convenience helpers ---------------------------------------------- */

export const apiGet = <T = unknown>(path: string, opts?: RequestOptions) =>
  request<T>("GET", path, undefined, opts);

export const apiDelete = <T = unknown>(path: string, opts?: RequestOptions) =>
  request<T>("DELETE", path, undefined, opts);

export const apiPost = <T = unknown>(
  path: string,
  body?: unknown,
  opts?: RequestOptions,
) => request<T>("POST", path, body, opts);

export const apiPut = <T = unknown>(
  path: string,
  body?: unknown,
  opts?: RequestOptions,
) => request<T>("PUT", path, body, opts);

export const apiPatch = <T = unknown>(
  path: string,
  body?: unknown,
  opts?: RequestOptions,
) => request<T>("PATCH", path, body, opts);
