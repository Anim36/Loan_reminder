# Loan Reminder

A friendly lending companion for friends and family. Track loans you have
given out, schedule reminders, and keep a clear record of who owes you
what â€” all from a single dashboard.

This repository ships the **full app** (Next.js App Router + React 19 + Auth.js v5 + Prisma + PostgreSQL). Authentication, user preferences, and rate limiting are all real; no separate backend service is required.
Every piece of data the UI consumes flows through `src/services`.

- **Loans / friends / reminders / notifications** are still stored in
  the browser's `localStorage` for the prototype; wiring them to the
  database is a follow-up.
- **Auth, profile, language, theme, and the Bangla-numerals flag** are
  stored in the database via `User` and `Account` rows (see
  [Authentication](#authentication)).

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure

Copy the example env file and fill in the values you need:

```bash
cp .env.example .env.local
```

The required keys for a working dev setup are:

| Variable                       | Purpose                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | PostgreSQL connection string used by Prisma. `db:start` sets up an embedded instance on port 55432.  |
| `DIRECT_URL`                   | Non-pooled connection for `prisma migrate deploy` / `prisma db seed`. Same value as `DATABASE_URL` is fine. |
| `AUTH_SECRET`                  | Random 32-byte secret for signing Auth.js JWTs. Generate with `openssl rand -base64 32`.             |
| `AUTH_URL`                     | Canonical site URL (no trailing slash). Defaults to `http://localhost:3000` if empty.                 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional. Leave both empty to hide the "Continue with Google" button.                       |
| `RESEND_API_KEY`               | Optional. When set, password-reset emails go through Resend. When empty, the reset link is logged to the server console. |
| `EMAIL_FROM`                   | Sender address (must be a verified Resend sender).                                                  |
| `SMS_PROVIDER`                 | `mock` to skip network calls; future: `bulksms`, `twilio`.                                          |

`AUTH_SECRET` is required in production; Auth.js will refuse to start
without it. `.env.example` ships with a placeholder for development.

### 3. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

### 4. Build / lint

```bash
npm run build   # production build (runs typecheck)
npm run lint    # eslint
npm run start   # serve the production build
```

### 5. Database (Prisma + Postgres)

The app ships with a real database layer (Prisma + PostgreSQL).
The dev workflow uses an embedded Postgres on `127.0.0.1:55432`
and seeds a demo user on first run:

```bash
npm run db:start    # leave this terminal open - embedded Postgres
npm run db:migrate  # in another terminal - pushes the schema
npm run db:seed     # inserts the demo data (Ayesha + 6 friends + loans)
```

For production, point `DATABASE_URL` (and optionally `DIRECT_URL`) at
a managed Postgres instance and run the same scripts; `db:start` is
a no-op when `DATABASE_URL` is set in `.env.local`.

### 6. Demo account (development only)

`npm run db:seed` creates a single demo user:

| Field    | Value                |
| -------- | -------------------- |
| Email    | `ayesha@example.com` |
| Password | `LoanDemo!23`        |

> WARNING: This is a **development-only** credential. The password
> is hard-coded in `prisma/seed.ts` and must never be reused in
> production. Change it (or remove the seed user entirely) before
> shipping.

The seed is idempotent: it only deletes rows owned by the demo
user, so re-running `npm run db:seed` will not wipe any real
users that have signed up. If you want a clean slate, use
`npm run db:reset` (this **deletes every row in the database**
— only run it on a local dev database).

---

## Folder structure

```
src/
  app/                     # Next.js App Router routes
    (app)/                 # Authenticated app shell (sidebar + topbar)
      dashboard/
      loans/
        [id]/             # Loan detail, edit
        new/
      reminders/
      settings/
    (auth)/                # Login / signup (centered card)
    (marketing)/           # Landing page
    layout.tsx             # Root layout (html, body, providers)
    providers.tsx          # Theme + toast providers
    globals.css            # Tailwind layers + design tokens
    error.tsx              # Global error boundary
    not-found.tsx          # 404
    loading.tsx            # Global loading skeleton
  components/
    ui/                    # Atomic UI primitives (button, input, chipâ€¦)
    layout/                # Sidebar, TopBar, BottomTabBar
    forms/                 # Shared LoanForm
    auth/                  # AuthCard used by /login and /signup
    marketing/             # Landing-page sections
  services/                # Data access â€” every page imports from here
    loanService.ts
    reminderService.ts
    authService.ts
    use-loans.ts           # Client hook over loanService
    use-reminder-settings.ts
    index.ts
  types/                   # Shared TS types (Loan, Friend, Reminderâ€¦)
  data/                    # Seed data (used in prototype mode)
  lib/                     # Pure helpers
    api.ts                 # Typed fetch wrapper (see below)
    auth.ts                # Auth-token store
    format.ts              # Money / number formatters
    cn.ts                  # Class-name utility
public/                    # Static assets
.env.example               # Copy to .env.local
next.config.ts
tsconfig.json
tailwind config is in src/app/globals.css (Tailwind v4 inline theme).
```

### How data flows

```
UI component â”€â”€â–¶ @/services/*Service (async)
                       â”‚
                       â”œâ”€â–▶ /api/auth/*      â†’ Postgres (Auth.js + Prisma)
                       â””â”€â–▶ @/lib/storage    â†’ localStorage (loans, friends,
                                              reminders, notifications)
                                  â”‚
                                  â–¼
                            use-* hook re-renders
```

Every service function is `async` and returns typed data. UI code is
identical across services â”€ the only thing that changes is which
storage adapter the service uses.
See [Authentication](#authentication) for the real auth / profile / preferences
wiring.

---

## Authentication

Auth is wired with [Auth.js (NextAuth) v5](https://authjs.dev) and the
[Prisma adapter](https://authjs.dev/getting-started/adapters/prisma).
Everything lives in this repo â€” there is no separate auth service.

### Strategy

- **Session strategy: JWT** (`src/server/auth.ts`). The Credentials
  provider requires the JWT strategy in v5 (the database strategy
  only supports OAuth providers). The Prisma adapter is still used
  for the `User` / `Account` / `Session` / `VerificationToken` tables
  so OAuth flows get full account linking. The JWT is signed with
  `AUTH_SECRET` and stored in a `httpOnly`, `sameSite=lax` cookie
  (`__Secure-authjs.session-token` in production,
  `authjs.session-token` locally).
- **Two providers**:
  - **Credentials** (email + password) â€” always registered.
    Passwords are hashed with `bcryptjs` at cost 12. The
    `authorize` callback runs a throwaway `bcrypt.compare` against a
    dummy hash when the user does not exist so missing-user and
    wrong-password timings stay comparable.
  - **Google OAuth** â€” only registered when **both**
    `AUTH_GOOGLE_ID` *and* `AUTH_GOOGLE_SECRET` are set. The login
    page also calls `/api/auth/google-enabled` on mount and hides
    the "Continue with Google" button when the endpoint returns
    `false`, so we never show an option the server cannot honour.
- **Token invalidation on password change.** Every time the password
  is updated (Settings > Security, or the forgot-password flow),
  `User.tokenVersion` is incremented. The `jwt` callback re-reads
  the row on every request; if the JWT's `tokenVersion` lags the
  DB, the token is dropped and the user is silently signed out.
  This is the JWT analogue of "log out everywhere".
- **Cookies** are `httpOnly` + `sameSite=lax` + `secure` in
  production. Auth.js's defaults are overridden explicitly so a
  future library upgrade cannot accidentally relax them.

### Rate limiting

Login, signup, forgot-password, and reset-password are throttled by
`src/server/rate-limit.ts` â€” a small in-memory sliding-window limiter
(`5 attempts per 15 minutes`, keyed by `action:ip:email`). The
limiter is a single `Map` so a Redis swap is a one-file change. A
429 response is translated to the dictionary key `auth.rateLimited`.

### Auth API routes

All routes are JSON, return `{ ok: true, ... }` on success, and a
`{ ok: false, error: "<code>", retryAfterMs? }` on failure.

| Method | Path                              | Purpose                                                   |
| ------ | --------------------------------- | --------------------------------------------------------- |
| POST   | `/api/auth/signup`                | Create user + default `ReminderSettings` row + auto sign-in. Zod-validates `{ name, email, password }`. |
| POST   | `/api/auth/[...nextauth]`         | Auth.js's own handlers (sign-in, sign-out, callback).     |
| GET    | `/api/auth/google-enabled`        | `{ enabled: boolean }`. Login/signup pages hide the button when this returns `false`. |
| POST   | `/api/auth/forgot-password`       | Always returns `{ ok: true }` (no enumeration). Emails a single-use reset link when the account exists; only the SHA-256 hash is stored in `PasswordResetToken`. |
| POST   | `/api/auth/reset-password`        | Validates the token, hashes the new password, marks the token used, bumps `User.tokenVersion`. |
| PATCH  | `/api/auth/me`                    | Update the signed-in user (`name`, `phone`, `language`, `theme`, `banglaNumerals`). All fields optional. |
| POST   | `/api/settings/password`          | Change password (current + new). Bumps `User.tokenVersion` on success. |
| POST   | `/api/settings/delete-account`    | Delete every row owned by the user in a single transaction, then sign out. |

### Shared helpers

- `requireUser()` (`src/server/auth-helpers.ts`) is the single
  entry point every protected API route uses. It calls `auth()`,
  returns the user (id, email, name, image, language, theme,
  banglaNumerals, tokenVersion) on success, or a
  `NextResponse(401)` so the caller can `return auth.response` in
  one line.
- `useSessionUser()` (`src/hooks/use-session-user.ts`) is the
  matching client-side helper. It wraps `next-auth/react`'s
  `useSession`, normalises the shape, and returns the avatar
  initial ready for `<Avatar name={...} />`.

### Routing

`src/proxy.ts` is a Next 16 `proxy.ts` (the renamed `middleware`).
It runs before every page render and:

- Redirects unauthenticated users away from `/dashboard`, `/loans`,
  `/friends`, `/reminders`, `/notifications`, `/reports`, `/settings`
  â†’ `/login?callbackUrl=<original>`.
- Redirects already-signed-in users away from `/login`, `/signup`,
  `/forgot-password`, `/reset-password` â†’ `/dashboard` (or the
  `callbackUrl` if it is a same-origin path).
- Leaves marketing, legal, and `/api/*` alone.

The proxy checks for the presence of an auth cookie only â€” it does
not verify the JWT. Full verification happens in the `(app)/layout`
and every protected API route via `requireUser()`.

### Security notes

- Failed login and the "user does not exist" path both run
  `bcrypt.compare` against a real or dummy hash, so the timing
  difference between "email found" and "email not found" is in the
  noise.
- Email addresses are normalised (trim + lowercase) on every
  write and read; the column is `UNIQUE` on the normalised form.
- Passwords are never logged, never printed, and never returned
  in any response. The reset token is emailed in plaintext but
  only its SHA-256 hash is stored, with a 30-minute TTL.
- "Logged out everywhere" is achieved by bumping
  `User.tokenVersion` (one column increment, no session table
  maintenance).