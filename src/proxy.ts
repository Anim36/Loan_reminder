// Next.js 16 proxy.
//
// Next 16 renamed the middleware convention from `middleware.ts`
// to `proxy.ts`; the signature is otherwise the same as the
// previous `middleware.ts` API. The export is the `proxy`
// function (instead of `middleware`).
//
// What this does
// --------------
//   * Every request for an `(app)` route (the logged-in shell) is
//     checked for a valid session cookie. If the session is
//     missing, the user is redirected to `/login` with a
//     `callbackUrl` query so they land back on the page they
//     were trying to reach.
//   * Every request for an `(auth)` route (login / signup /
//     forgot / reset) is checked for an existing session. A
//     signed-in user is bounced to `/dashboard` so the login
//     page is never shown to someone who's already logged in.
//   * The matcher excludes `_next`, static assets, the public
//     marketing routes, the API (so Auth.js's own handlers can
//     run), and anything inside `public/`. The proxy only runs
//     on the page routes we care about.
//
// We do **not** call `auth()` here to read the session. The
// `auth.js` cookie is httpOnly + sameSite=lax, and Next 16
// strips the cookie before the proxy runs in some setups; we
// only check for the cookie's presence and let the protected
// page itself call `auth()` to verify. A full session check
// adds a DB round-trip per request, which the App Router's
// per-page `auth()` already does for the layouts that need it.

import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAMES = [
  "auth.session-token",
  "__Secure-auth.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

function hasSessionCookie(req: NextRequest): boolean {
  for (const name of SESSION_COOKIE_NAMES) {
    if (req.cookies.get(name)?.value) return true;
  }
  return false;
}

export function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const loggedIn = hasSessionCookie(req);

  // Auth pages (login / signup / forgot / reset). Bounce
  // signed-in users to the dashboard.
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    if (loggedIn) {
      const dest = nextUrl.searchParams.get("callbackUrl") || "/dashboard";
      // Same-origin redirect so we don't open a phishing vector.
      const safe = dest.startsWith("/") ? dest : "/dashboard";
      return NextResponse.redirect(new URL(safe, nextUrl));
    }
    return NextResponse.next();
  }

  // App pages — everything under (app). Unauthenticated users
  // get a `callbackUrl` so the login page can return them.
  // The App Router treats a route group `(app)` as just a path
  // prefix, so there's no URL segment to match against; we
  // use the explicit allow-list of protected paths instead.
  const protectedPaths = [
    "/dashboard",
    "/loans",
    "/friends",
    "/reminders",
    "/notifications",
    "/reports",
    "/settings",
  ];
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtected && !loggedIn) {
    const url = new URL("/login", nextUrl);
    // Avoid the `?callbackUrl=` being lost on a sign-out round
    // trip; keep the original pathname + query.
    const search = nextUrl.search || "";
    url.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/* ---- Matcher --------------------------------------------------------
 * Limit the proxy to the page routes we actually want to
 * guard. Static assets, _next internals, the marketing site,
 * and the API auth handlers are all excluded so they can run
 * un-intercepted.
 *
 * Note: Next 16 also added a `unstable_allowDynamic` option
 * but the matcher below is enough for our needs. */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     *  - /api/* (Auth.js + our own endpoints)
     *  - /_next/static, /_next/image
     *  - favicon.ico, /robots.txt, /sitemap.xml
     *  - /assets/*, /public/*, /file.svg, /globe.svg, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
