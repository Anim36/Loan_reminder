// Same-origin REST client for the B3/B4 API.
//
// All HTTP access in the app goes through this module. Service
// files (loanService, friendService, …) call the helpers below
// instead of touching `fetch` directly, so a single change here
// propagates to every request.
//
// Single rule for success responses
// ---------------------------------
// The api-client returns the **raw response body**, untouched.
// Every B4 success body carries the data under `.data`; services
// read it exactly once. The two shapes we expect are:
//
//   1. Single-resource  →  `{ data: T }`            (apiHandler)
//   2. List             →  `{ data: [...], meta }`  (apiHandler, listMode)
//
// Services that need the resource or the array read `.data`.
// Services that need page info read `.meta`. There is no
// double-unwrap: a single `.data` hop is all the list code
// needs because `listMode: true` on the server flattens the
// outer envelope for list endpoints.
//
// 204 No Content → `null` (the body is empty by definition, and
// `safeJson` returns `null` when there's no text).
//
// Non-envelope success bodies (e.g. `{ count: N }` from
// `/api/notifications/unread-count` or `{ ok: true }` from
// `/api/auth/me`) are returned as-is.
//
// Failure envelope
// ----------------
// The B4 failure envelope is `{ error: { code, message, fields? } }`.
// We strip the outer `error` wrapper so `ApiError.code` and
// `ApiError.fields` are populated from the server's error object
// directly. This is the only place a partial unwrap happens, and
// it never reaches the success path.
//
// Other features
// --------------
//   - Paths are auto-prefixed with `/api` (e.g. `apiGet("/loans")`
//     becomes a request to `/api/loans`). Absolute URLs and
//     paths that already start with `/api/` are left alone, so
//     tests can point at a different host.
//   - JSON request bodies + JSON response decoding.
//   - `credentials: "include"` on every request so the Auth.js
//     session cookie is forwarded to the B4 route handlers.
//   - Custom `ApiError` class with the HTTP status, a
//     server-supplied stable `code`, optional `fields` (zod field
//     errors), and the parsed body so the UI can render specific
//     messages.
//   - 30s default timeout; configurable per call.
//   - On `401`, the client redirects to `/login?callbackUrl=...`
//     once per page-load (so a React-Query background refetch
//     after expiry lands on the login page without spamming the
//     history).
//
// SSR-safe: nothing here touches `window` at module scope. The
// 401 redirect runs only when `window` is present.

/* ---- Public types ------------------------------------------------- */

export interface ApiErrorBody {
  /** Machine-readable code, e.g. "loan_not_found". Maps to
   *  `errors.api.*` dictionary keys. */
  code?: string;
  /** Human-readable message; usually a stable dictionary key the
   *  frontend maps through i18n. Never a final English sentence. */
  message?: string;
  /** Optional field-level details (zod / joi / class-validator). */
  fields?: Record<string, string[]>;
  /** Free-form additional data. */
  [key: string]: unknown;
}

/** Thrown for every non-2xx response. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly fields: Record<string, string[]> | undefined;
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
    this.fields = body?.fields;
    this.body = body;
  }
}

export interface RequestOptions {
  /** Extra request headers to merge in. */
  headers?: Record<string, string>;
  /** Query string parameters. */
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
  /** Internal: override the base URL (for tests). */
  baseUrl?: string;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/* ---- Internals ---------------------------------------------------- */

const DEFAULT_TIMEOUT_MS = 30_000;

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

function buildUrl(path: string, query: RequestOptions["query"], baseUrl?: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path + buildQuery(query);
  }
  // Auto-prefix the B4 route prefix. Services write paths like
  // `/loans` and the api-client turns that into `/api/loans`.
  // Absolute URLs, the `/api` root, and paths that already start
  // with `/api/` are passed through so tests can point at a
  // different host and the auth/me-style routes still resolve.
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath =
    cleanPath === "/api" || cleanPath.startsWith("/api/")
      ? cleanPath
      : `/api${cleanPath}`;
  const base = baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  return base + apiPath + buildQuery(query);
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isOk(status: number): boolean {
  return status >= 200 && status < 300;
}

function buildHeaders(
  method: Method,
  body: unknown,
  opts: RequestOptions,
): Headers {
  const headers = new Headers();
  if (body !== undefined && !(body instanceof FormData) && !opts.noBody) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
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

/* ---- 401 redirect dedupe ------------------------------------------ */

// A `401` is special — it usually means the session expired. We
// redirect to /login once per page-load so a background refetch
// after expiry doesn't push a second history entry.

let lastRedirectAt = 0;

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastRedirectAt < 2_000) return;
  lastRedirectAt = now;
  const here = window.location.pathname + window.location.search;
  const target = here.startsWith("/login") ? "/login" : `/login?callbackUrl=${encodeURIComponent(here)}`;
  window.location.assign(target);
}

/* ---- The core request -------------------------------------------- */

export async function request<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, opts.query, opts.baseUrl);
  const headers = buildHeaders(method, body, opts);
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort());
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body:
        body === undefined || opts.noBody
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      signal: controller.signal,
      credentials: "include",
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request was aborted", 0, null);
    }
    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiError(message, 0, null);
  } finally {
    clearTimeout(timer);
  }

  if (isOk(res.status)) {
    if (opts.raw) return undefined as T;
    // 204 → empty body → `null`. Any other success is returned
    // as the raw JSON body (list envelopes, single-resource
    // envelopes, and legacy `{ ok: true }` bodies all pass
    // through unchanged). Services unwrap with `.data` exactly
    // once — see the file header for the rule.
    return (await safeJson(res)) as T;
  }

  // Non-2xx — build a structured error. The B4 failure envelope is
  // `{ error: { code, message, fields? } }`; we strip the wrapper so
  // `ApiError.code` / `ApiError.fields` are populated from the
  // server's error object directly.
  const parsed = (await safeJson(res)) as ApiErrorBody | null;
  const inner =
    parsed && typeof parsed === "object" && "error" in parsed
      ? ((parsed as { error?: ApiErrorBody }).error ?? null)
      : parsed;
  const message =
    (inner && typeof inner.message === "string" && inner.message) ||
    `${res.status} ${res.statusText}`.trim() ||
    "Request failed";

  if (res.status === 401) {
    // Redirect to /login unless we are already there. We still throw
    // the error so the calling code can stop rendering.
    redirectToLogin();
  }

  throw new ApiError(message, res.status, inner);
}

/* ---- Convenience helpers ----------------------------------------- */

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

/* ---- Blob download helper ---------------------------------------- */

/** Fetch a binary response (e.g. the CSV export). */
export async function apiGetBlob(
  path: string,
  opts?: RequestOptions,
): Promise<Blob> {
  const url = buildUrl(path, opts?.query, opts?.baseUrl);
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (opts?.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort());
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/csv" },
      signal: controller.signal,
      credentials: "include",
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
  if (!isOk(res.status)) {
    const text = await res.text();
    let parsed: ApiErrorBody | null = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as ApiErrorBody;
      } catch {
        parsed = null;
      }
    }
    if (res.status === 401) redirectToLogin();
    const inner =
      parsed && typeof parsed === "object" && "error" in parsed
        ? ((parsed as { error?: ApiErrorBody }).error ?? null)
        : parsed;
    throw new ApiError(
      inner?.message ?? `Export failed (${res.status})`,
      res.status,
      inner,
    );
  }
  return res.blob();
}
