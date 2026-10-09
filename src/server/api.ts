// Shared API route helper.
//
// `apiHandler` is the only thing the route files need to import.
// It does, in order:
//
//   1. `requireUser()` — returns 401 if the session is missing.
//   2. Zod-parse the request — params, query, body. Anything that
//      fails is mapped to 422 with the offending field paths.
//   3. Hand the parsed input to the route function.
//   4. Wrap thrown errors:
//        * `ApiError`          — uses the status + code the route chose
//        * `ZodError`          — 422 (defensive; we zod-parse up front)
//        * `Prisma.PrismaClientKnownRequestError` (P2002, P2025)
//                             — 409 / 404 with a stable code
//        * `DomainError`       — a small base class for the
//                                 "business rule rejected this" cases
//                                 (4xx, stable code)
//        * anything else       — 500 with a generic message;
//                                 the original error is logged with
//                                 masked PII.
//
// Response envelopes:
//   { data: T }                                on success
//   { error: { code, message, fields? } }      on failure
//
// `message` is always a stable string the frontend can map to a
// dictionary key — never a final English sentence.

import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { Prisma } from "@prisma/client";

import { requireUser, type RequiredUser } from "@/server/auth-helpers";
import { maskPhone } from "@/lib/phone";

/* ---- Public envelope types ---------------------------------------- */

export type ApiSuccess<T> = { data: T };
export type ApiFailure = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/* ---- Error class -------------------------------------------------- */

/** A 4xx error thrown by a route handler. */
export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string[]>;
  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Convenience constructors for the common 4xx cases. */
export const apiErrors = {
  badRequest: (code: string, message: string, fields?: Record<string, string[]>) =>
    new ApiError(400, code, message, fields),
  unauthorized: (code = "unauthorized", message = "auth.required") =>
    new ApiError(401, code, message),
  notFound: (code = "not_found", message = "not_found") =>
    new ApiError(404, code, message),
  conflict: (code: string, message: string) =>
    new ApiError(409, code, message),
  unprocessable: (
    code: string,
    message: string,
    fields?: Record<string, string[]>,
  ) => new ApiError(422, code, message, fields),
  rateLimited: (retryAfterMs: number, message = "rate_limited") =>
    new ApiError(429, message, message, undefined),
};

/* ---- Per-request context ----------------------------------------- */

export interface ApiContext {
  user: RequiredUser;
  req: NextRequest;
  /** URL params from a dynamic segment (e.g. `[id]`). Empty for
   *  segment-less routes. */
  params: Record<string, string>;
}

/* ---- Handler options --------------------------------------------- */

export interface ApiHandlerOptions<
  TParams extends ZodTypeAny,
  TQuery extends ZodTypeAny,
  TBody extends ZodTypeAny,
> {
  /** Zod schema for the dynamic-segment params. Pass `z.object({})`
   *  if the route has no dynamic segments. */
  params?: TParams;
  /** Zod schema for the URL query string. Pass `z.object({})` for
   *  no query. The parsed value is the *raw* object — callers
   *  coerce strings to numbers / booleans themselves. */
  query?: TQuery;
  /** Zod schema for the JSON body. Skip to indicate the route
   *  has no body. */
  body?: TBody;
  /** Status code for success responses. Defaults to 200. */
  successStatus?: number;
  /**
   * When `true`, the handler's return value is written to the
   * response body as-is. The standard B4 success envelope
   * (`{ data: T }`) is **not** added. This is intended for
   * list endpoints whose payload already carries the data
   * key (e.g. `{ data: [...loans], meta: {...} }`); services
   * then read `.data` for the array and `.meta` for the page
   * info in a single, consistent hop — same as the
   * single-resource endpoints, which already use
   * `{ data: DTO }`. Default is `false` (the envelope is
   * applied).
   */
  listMode?: boolean;
  /** The route function. Receives the parsed input and the
   *  per-request context. */
  handler: (args: {
    user: RequiredUser;
    req: NextRequest;
    params: z.infer<TParams>;
    query: z.infer<TQuery>;
    body: z.infer<TBody>;
  }) => Promise<unknown> | unknown;
}

/* ---- zod input coercion ----------------------------------------- */

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw apiErrors.badRequest("invalid_json", "invalid_json");
  }
}

function readQuery(req: NextRequest): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const url = new URL(req.url);
  for (const [k, v] of url.searchParams) {
    out[k] = v;
  }
  return out;
}

/** Coerce a Zod schema's input to its output type. The default
 *  Zod parse of a `Record<string, string | string[]>` against a
 *  schema that wants numbers / booleans needs this step. */
function parseQuery<S extends ZodTypeAny>(schema: S, raw: Record<string, string | string[]>): z.infer<S> {
  // `z.coerce.*` already handles string→number / string→boolean in
  // the schema, so we just pass the raw object through. The
  // caller can do its own refinement for missing keys.
  return schema.parse(raw) as z.infer<S>;
}

/* ---- Error mapping ---------------------------------------------- */

function toFailureResponse(err: unknown): NextResponse<ApiFailure> {
  if (err instanceof ApiError) {
    return NextResponse.json<ApiFailure>(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.fields ? { fields: err.fields } : {}),
        },
      },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    // Defensive — the wrapper zod-parses up front. If we get
    // here, a nested schema failed during handler execution.
    return NextResponse.json<ApiFailure>(
      { error: { code: "validation_error", message: "validation_error", fields: zodFieldMap(err) } },
      { status: 422 },
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json<ApiFailure>(
        { error: { code: "conflict", message: "unique_violation" } },
        { status: 409 },
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json<ApiFailure>(
        { error: { code: "not_found", message: "not_found" } },
        { status: 404 },
      );
    }
  }
  // Unknown — log with masked PII, return a generic envelope.
  logUnknownError(err);
  return NextResponse.json<ApiFailure>(
    { error: { code: "server_error", message: "server_error" } },
    { status: 500 },
  );
}

function zodFieldMap(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join(".") || "_root";
    (out[path] ??= []).push(issue.message);
  }
  return out;
}

/** Best-effort log of an unknown error. Phone numbers in any
 *  `e164` shape are masked; raw request bodies / notes are
 *  truncated. */
function logUnknownError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  // The mask regex catches +8801712345678 and 8801712345678.
  const masked = message
    .replace(/\+?8801[3-9]\d{8}/g, (m) => maskPhone(m.startsWith("+") ? m : `+${m}`))
    .slice(0, 500);
  // server-only log
  console.error("[api] unhandled error:", masked, err instanceof Error ? err.stack?.split("\n").slice(0, 5).join("\n") : "");
}

/* ---- The wrapper ----------------------------------------------- */

export async function apiHandler<
  TParams extends ZodTypeAny,
  TQuery extends ZodTypeAny,
  TBody extends ZodTypeAny,
>(
  req: NextRequest,
  opts: ApiHandlerOptions<TParams, TQuery, TBody>,
  /** Next 15 dynamic-segment params, awaited. Optional for routes
   *  without dynamic segments. */
  nextParams?: Promise<Record<string, string>>,
): Promise<NextResponse<ApiSuccess<unknown> | ApiFailure>> {
  // 1. Auth
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response as NextResponse<ApiFailure>;
  }
  const user = auth.user;

  try {
    // 2. Zod-parse params / query / body
    const paramsObj = (nextParams ? await nextParams : {}) as Record<string, string>;
    const params = opts.params
      ? (opts.params.parse(paramsObj) as z.infer<TParams>)
      : ({} as z.infer<TParams>);

    const query = opts.query
      ? (parseQuery(opts.query, readQuery(req)) as z.infer<TQuery>)
      : ({} as z.infer<TQuery>);

    const body = opts.body
      ? (opts.body.parse(await readJson(req)) as z.infer<TBody>)
      : (undefined as unknown as z.infer<TBody>);

    // 3. Hand off
    const result = await opts.handler({ user, req, params, query, body });
    if (opts.listMode) {
      // List endpoints return their own shape
      // (`{ data: [...], meta: {...} }` or `{ data: [...], stats, meta }`)
      // and we serialise it as-is so the client can read `.data`
      // (the array) and `.meta` / `.stats` (the page info) in a
      // single hop, identical to the single-resource reads.
      return NextResponse.json(result, { status: opts.successStatus ?? 200 }) as NextResponse<
        ApiFailure | ApiSuccess<unknown>
      >;
    }
    return NextResponse.json<ApiSuccess<unknown>>(
      { data: result },
      { status: opts.successStatus ?? 200 },
    );
  } catch (err) {
    return toFailureResponse(err);
  }
}
