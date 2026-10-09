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

---

## API reference (B4)

The REST API is implemented as Next.js Route Handlers under
`src/app/api`. Every endpoint is JSON-in / JSON-out, every
protected endpoint calls `requireUser()` first (401 if missing),
and every read is scoped by the session's `userId` — accessing
another user's row returns **404** (not 403) so the existence of
the row is never revealed.

The frontend is **not** wired to these endpoints yet (it stays in
`localStorage` mode until B5); this section documents the
contract so the B5 work can land in one pass.

### Conventions

- **Money.** The API speaks **taka** (number, up to 2 decimal
  places). The database stores **poisha** (Int). Conversion is
  the responsibility of `src/lib/money.ts`; never multiply or
  divide by 100 anywhere else.
- **Dates.** Date-only fields (`givenDate`, `dueDate`,
  `paymentDate`) are surfaced as `"YYYY-MM-DD"` strings.
  Timestamps (`createdAt`, `paidAt`, `sentAt`, `scheduledFor`)
  are ISO-8601 strings.
- **Timezone.** Business "today" is **Asia/Dhaka**, not server
  UTC. The helper `src/lib/dates.ts: todayInDhaka()` is the
  single source of truth.
- **Status.** `Paid | Pending | Overdue` is **derived on the
  server** (see `src/lib/loanStatus.ts`). The DB never stores it.
- **Error envelope.** All non-2xx responses use
  `{ error: { code, message, fields? } }`. `message` is a
  stable string the frontend can map to a dictionary key — not
  final English text. The dictionary entries live under
  `errors.api.*` in `src/lib/i18n/en.ts` and `bn.ts`.
- **Money rounding.** Taka is rounded to 2 decimal places at
  the boundary; poisha is an integer.

### Response shapes

```ts
// Success
{ "data": T }

// Failure
{
  "error": {
    "code": "loan_not_found",
    "message": "loan_not_found",   // i18n key (errors.api.*)
    "fields": { "amount": ["amount_too_small"] }   // optional
  }
}
```

### The `Loan` DTO

Every loan response uses the same shape:

```ts
{
  id: string;
  friend: { id, name, phone?, email? };
  amount: number;        // taka
  amountPaid: number;    // taka
  remaining: number;     // taka
  status: "Paid" | "Pending" | "Overdue";
  givenDate: string;     // YYYY-MM-DD
  dueDate: string;       // YYYY-MM-DD
  daysRemaining: number; // negative when overdue
  note?: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  reminderTimings: ("3_days_before" | "on_due_date" | "every_2_days_after")[];
  tone: "Friendly" | "Neutral" | "Firm";
  messageLanguage: "en" | "bn";
  consentConfirmed: boolean;
  paidAt?: string;       // ISO
  payments: Array<{
    id, amount (taka), date (YYYY-MM-DD),
    method: "Cash"|"bKash"|"Nagad"|"Bank"|"Other",
    note?, createdAt (ISO)
  }>;
  rescheduleHistory: Array<{
    id, from, to, reason?, changedAt
  }>;
  rescheduled: boolean;
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}
```

### Endpoints

| Method | Path                                  | Description                          |
| ------ | ------------------------------------- | ------------------------------------ |
| GET    | `/api/loans`                          | List loans (filter, sort, paginate)  |
| POST   | `/api/loans`                          | Create a loan (and a friend if new)  |
| GET    | `/api/loans/[id]`                     | Fetch a single loan                  |
| PATCH  | `/api/loans/[id]`                     | Partial update (no `dueDate`)        |
| DELETE | `/api/loans/[id]`                     | Soft delete                          |
| POST   | `/api/loans/[id]/restore`             | Undo soft delete (within 24h)        |
| POST   | `/api/loans/[id]/payments`            | Record a payment                     |
| DELETE | `/api/loans/[id]/payments/[paymentId]`| Remove a payment                     |
| POST   | `/api/loans/[id]/pay-in-full`         | Mark loan fully paid                 |
| POST   | `/api/loans/[id]/reschedule`          | Move the due date                    |
| POST   | `/api/loans/[id]/remind`              | Queue a one-off reminder (B6 sends)  |
| GET    | `/api/friends`                        | List friends (derived from loans)    |
| GET    | `/api/friends/[id]`                   | Friend + totals + loans + logs       |
| GET    | `/api/reminders/history`              | Reminder log + stats                 |
| GET    | `/api/reminders/settings`             | Read the reminder settings           |
| PUT    | `/api/reminders/settings`             | Replace / merge the reminder settings|
| GET    | `/api/dashboard/summary`              | Aggregates for the home page         |
| GET    | `/api/reports`                        | Reports aggregations                 |
| GET    | `/api/reports/export.csv`             | Download a CSV of the loans          |
| GET    | `/api/notifications`                  | List notifications (paginated)       |
| GET    | `/api/notifications/unread-count`     | Cheap unread count                   |
| POST   | `/api/notifications/read-all`         | Mark every notification read         |
| POST   | `/api/notifications/[id]/read`        | Mark a single notification read      |
| GET    | `/api/settings/profile`               | Get the user's profile               |
| PATCH  | `/api/settings/profile`               | Update name / phone / image          |
| GET    | `/api/settings/preferences`           | Get preferences + notification flags |
| PATCH  | `/api/settings/preferences`           | Update preferences + notification flags |
| POST   | `/api/settings/password`              | Change the password (existing route) |
| PATCH  | `/api/auth/me`                        | Legacy single-field patch (B4)       |

---

#### `GET /api/loans`

Query parameters:

| Name      | Type / values                                       | Default   |
| --------- | --------------------------------------------------- | --------- |
| `status`  | `Paid` \| `Pending` \| `Overdue`                    | (all)     |
| `q`       | free text (matches friend name or phone)            | —         |
| `sort`    | `dueDate` \| `amount` \| `createdAt`                | `dueDate` |
| `order`   | `asc` \| `desc`                                     | `desc`    |
| `from`    | YYYY-MM-DD (lower bound on `dueDate`)               | —         |
| `to`      | YYYY-MM-DD (upper bound on `dueDate`)               | —         |
| `page`    | integer ≥ 1                                         | `1`       |
| `pageSize`| integer 1–100                                       | `20`      |

> **Status filtering is in-memory.** The list endpoint loads
> every non-soft-deleted row (with payment sums) and filters on
> the derived status. This is documented in the route file and
> keeps the SQL simple; the dataset per user is small enough
> that the in-memory pass is cheap.

Response:

```json
{
  "data": [Loan, …],
  "meta": { "page": 1, "pageSize": 20, "total": 47 }
}
```

#### `POST /api/loans`

Body:

```json
{
  "friend": { "name": "Tanvir", "phone": "01712345678", "email": "t@example.com" },
  "amount": 5000,
  "givenDate": "2026-10-01",
  "dueDate":   "2026-10-15",
  "note": "Books",
  "smsEnabled": true,
  "emailEnabled": false,
  "reminderTimings": ["3_days_before", "on_due_date"],
  "tone": "Friendly",
  "messageLanguage": "en",
  "consentConfirmed": true
}
```

Rules:
- `amount` > 0 (poisha ≤ 1e11).
- `dueDate` ≥ `givenDate`.
- `phone` is normalised to `+8801XXXXXXXXX`. Local
  (`01XXXXXXXXX`), `+880…` and `880…` are all accepted.
- `consentConfirmed` must be `true` (422 otherwise).
- The friend is **reused by phone** if the user already has one
  with the same number; otherwise a new one is created with a
  random `optOutToken`.
- Returns **201** with the new loan DTO.

Errors: `400 invalid_json`, `422 validation_error` (with
`fields`), `422 phone_invalid`, `422 given_date_invalid`,
`422 due_date_invalid`, `422 due_before_given`,
`422 consent_required`, `422 timing_invalid`, `401 unauthorized`.

#### `GET /api/loans/[id]`

Returns the loan DTO. `404 loan_not_found` when the row doesn't
exist or belongs to another user.

#### `PATCH /api/loans/[id]`

Partial update of loan fields and the friend's name / email.
**`dueDate` is rejected** — use `/reschedule` so the audit trail
is consistent (`422 due_date_change_not_allowed`).

Body keys: `amount`, `givenDate`, `note`, `smsEnabled`,
`emailEnabled`, `reminderTimings`, `tone`, `messageLanguage`,
`consentConfirmed`, `friend: { name?, email? }`.

#### `DELETE /api/loans/[id]`

Soft delete. Sets `deletedAt = now()`. Returns **204** with no
body. Restorable via `/restore` for 24 hours.

#### `POST /api/loans/[id]/restore`

Undoes a soft delete. Idempotent (no error if the loan is
already restored). `409 restore_window_expired` if more than 24
hours have passed since `deletedAt`.

#### `POST /api/loans/[id]/payments`

Body:

```json
{ "amount": 1000, "date": "2026-10-04", "method": "Cash", "note": "partial" }
```

Rules:
- `amount` > 0 and ≤ remaining (poisha check).
- `date` not in the future, not before `givenDate`.
- `method` ∈ `Cash | bKash | Nagad | Bank | Other`.
- Transactional: re-checks `remaining` inside a `Serializable`
  transaction; a second concurrent payment is rejected with
  `422 payment_overflow`.
- Sets `paidAt` when `remaining` hits 0; clears it when a
  payment is removed.

Notifications created inside the same transaction:
- `notif.payment` (always)
- `notif.paymentFully` (when fully paid)

Returns the updated loan DTO.

#### `DELETE /api/loans/[id]/payments/[paymentId]`

Removes a payment, recomputes `paidAt`, returns the updated
loan DTO. `404 payment_not_found` if the payment doesn't belong
to the loan.

#### `POST /api/loans/[id]/pay-in-full`

Body (optional): `{ "method": "Cash", "note": "settled" }`.
`method` defaults to `Cash`. Date defaults to today in
Asia/Dhaka. `409 loan_already_paid` if the loan is already paid.

#### `POST /api/loans/[id]/reschedule`

Body:

```json
{ "newDueDate": "2026-12-15", "reason": "asked for more time", "notifyFriend": true }
```

Rules:
- `newDueDate` must be **after today** (Asia/Dhaka) and
  **different from the current due date**.
- Transactional: inserts a `RescheduleEntry`, updates
  `dueDate`, marks every `QUEUED` `ReminderLog` row for the
  loan as `SKIPPED` (reason: `"rescheduled"`), creates a
  `notif.dueDateUpdated` notification.

#### `POST /api/loans/[id]/remind`

Validates the loan (not paid, consent confirmed, friend not
opted out, at least one channel enabled) and creates `QUEUED`
`ReminderLog` rows. **No SMS / email is sent** — that's B6.

Cooldown: 1 reminder per channel per loan per 6 hours. Violations
return `409 reminder_cooldown`. The `dedupeKey` is
`${loanId}:${channel}:${epochMinutes}` and is unique in the
schema; same-minute collisions are silently de-duplicated.

Response: the created log rows.

#### `GET /api/friends`

Derived from the user's `Friend` rows, joined to their (live)
loans.

Query: `q` (name / phone), `page`, `pageSize`.

Response rows: `id`, `name`, `phone?`, `email?`, `loanCount`,
`totalLent`, `totalRepaid`, `outstanding`, `worstStatus`
(`Overdue > Pending > Paid`). Sorted by name (case-insensitive).

#### `GET /api/friends/[id]`

Friend + totals + their loans (as full DTOs) + the 20 most
recent `ReminderLog` rows for the friend's loans. `404
friend_not_found` for other users' rows.

#### `GET /api/reminders/history`

Query: `channel` (`SMS` | `Email`), `status` (one of the
`ReminderStatus` enum), `q` (friend name), `sort=date` (only
option), `page`, `pageSize`.

Response:

```json
{
  "data": [
    { "id", "loanId", "friendName", "friendPhone?",
      "amount", "channel", "scheduledFor", "sentAt",
      "status", "error" }
  ],
  "meta": { "page", "pageSize", "total" },
  "stats": { "total", "delivered", "failed" }
}
```

#### `GET /api/dashboard/summary`

```json
{
  "totals": {
    "totalLent", "totalReceived", "pending", "overdue",
    "counts": { "Paid", "Pending", "Overdue" }
  },
  "recentLoans": [Loan × 5],
  "upcomingDue": [Loan]   // due within the next 7 days, asc
}
```

Excludes soft-deleted loans. Taka amounts rounded to 2 dp.

### Error codes

Every `error.code` the API can return. The `message` field
mirrors the code in most cases, but is always an `errors.api.*`
dictionary key the frontend can translate.

| HTTP | `code`                          | When                                         |
| ---- | ------------------------------- | -------------------------------------------- |
| 400  | `invalid_json`                  | Malformed body                               |
| 401  | `unauthorized`                  | No session                                   |
| 404  | `loan_not_found`                | Loan missing or owned by another user        |
| 404  | `friend_not_found`              | Friend missing or owned by another user      |
| 404  | `payment_not_found`             | Payment not on this loan                     |
| 409  | `conflict`                      | Unique-key violation                         |
| 409  | `loan_already_paid`             | `pay-in-full` on a paid loan                 |
| 409  | `restore_window_expired`        | Restore > 24h after soft delete              |
| 409  | `reminder_cooldown`             | Reminder within 6h cooldown                  |
| 422  | `validation_error`              | Zod validation failed (with `fields`)        |
| 422  | `phone_invalid`                 | Bad BD mobile number                         |
| 422  | `given_date_invalid`            | Bad / impossible `givenDate`                 |
| 422  | `due_date_invalid`              | Bad / impossible `dueDate`                   |
| 422  | `due_before_given`              | `dueDate` < `givenDate`                      |
| 422  | `due_not_after_today`           | Reschedule to past/today                     |
| 422  | `due_date_unchanged`            | Reschedule to the same date                  |
| 422  | `due_date_change_not_allowed`   | PATCH tried to change `dueDate`              |
| 422  | `consent_required`              | `consentConfirmed` ≠ true                    |
| 422  | `no_channel_enabled`            | `/remind` with no channels on                |
| 422  | `friend_opted_out`              | Friend has `optedOutAt` set                  |
| 422  | `amount_too_small` / `_too_large` | Amount out of range                        |
| 422  | `payment_overflow`              | Payment > remaining                          |
| 422  | `payment_date_future`           | Payment date in the future                   |
| 422  | `payment_date_before_given`     | Payment date before loan's `givenDate`       |
| 422  | `method_invalid` / `tone_invalid` / `language_invalid` / `timing_invalid` | Bad enum     |
| 429  | `rate_limited`                  | Too many requests                            |
| 500  | `server_error`                  | Anything unexpected; details logged          |

### Testing the API

Vitest covers both pure logic and DB-backed behaviour:

- **`npm run test`** — runs only the unit tests (always
  green). The integration suite is **excluded** so contributors
  without a test database never see a red run.
- **`npm run test:integration`** — runs the integration
  suite. By default the tests are skipped (no
  `TEST_DATABASE_URL` set). Set the env var to point at a
  real database to enable them.

**Setting up a Neon test branch** (the recommended way to run
the integration suite):

1. In the [Neon console](https://console.neon.tech), open your
   project and click **Branches** → **Create Branch**. Name it
   e.g. `test`. Neon provisions an isolated Postgres with the
   same schema as the primary branch.
2. On the new branch's dashboard, copy the **Connection
   string** (it looks like
   `postgresql://user:pwd@ep-…us-east-1.aws.neon.tech/neondb?sslmode=require`).
3. In `.env.local` (which is gitignored), add:
   ```env
   TEST_DATABASE_URL=postgresql://user:pwd@ep-…/neondb?sslmode=require
   ```
   The schema is the same as production, so the URL doesn't
   need a `&schema=…` suffix.
4. Run `npm run test:integration`. The suite will apply
   pending Prisma migrations to the branch's database
   (`prisma migrate deploy`) before the tests start.

The branch is yours to drop, reset, or recreate at any time —
nothing in production touches it.

**Per-test isolation.** Each test creates its own `User` and
`Friend` rows (no shared IDs) and tears them down implicitly
through the migration step. Running the suite back-to-back is
safe.

**What the suite covers** (when `TEST_DATABASE_URL` is set):

- Status derivation (boundary on the due date in Asia/Dhaka)
- Payment limit + concurrency (over-balance rejected)
- Pay-in-full sets `paidAt` and creates a `notif.paymentFully`
- Reschedule rules (past / same / future), QUEUED logs marked
  `SKIPPED` with `error="rescheduled"`
- Soft delete + 24h restore window
- Friend reuse by phone
- Phone normalisation
- Ownership isolation between two users (404 on others' ids)
- Pagination + filters
- Dashboard summary totals

**Without a database** the suite skips with a clear log line
(`tests/integration/loans.test.ts (11 tests | 11 skipped)`).

#### `GET /api/settings/profile`

Returns the user's profile (name, email, phone, image).

#### `PATCH /api/settings/profile`

Partial update. Body keys: `name` (2–80), `phone` (BD
mobile; normalised to `+8801XXXXXXXXX`; `""` clears the
field), `image` (URL; `""` clears the field).

Returns the updated profile.

#### `GET /api/settings/preferences`

```json
{
  "language": "en" | "bn",
  "theme": "light" | "dark" | "system",
  "banglaNumerals": false,
  "notifications": {
    "emailOnPaid": true,
    "emailOnOverdue": true,
    "weeklySummary": false
  }
}
```

#### `PATCH /api/settings/preferences`

Partial update of the same shape. Send any subset of:
`language`, `theme`, `banglaNumerals`, `notifications: { emailOnPaid, emailOnOverdue, weeklySummary }`. Returns the merged record.

#### Settings — split of responsibility

| Route                            | Owns                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `GET/PATCH /api/settings/profile`     | `name`, `phone` (BD-normalised), `image` (URL or null)                                 |
| `GET/PATCH /api/settings/preferences` | `language`, `theme`, `banglaNumerals`, `emailOnPaid`, `emailOnOverdue`, `weeklySummary` |
| `POST /api/settings/password`         | Password change (bump `tokenVersion`) — unchanged                                      |
| `PATCH /api/auth/me`                  | Legacy single-patch endpoint used by the current Settings page. Backed by the same columns; the two new routes are the B5-target shape. B5 will drop this. |

---

#### `GET /api/reminders/settings`

Returns the fully-populated `ReminderSettings` record:

```json
{
  "__v": 2,
  "tone": "Friendly" | "Neutral" | "Firm",
  "messageLanguage": "en" | "bn",
  "templates": {
    "Friendly": { "en": { "sms", "emailSubject", "emailBody" }, "bn": { … } },
    "Neutral":  { "en": { … }, "bn": { … } },
    "Firm":     { "en": { … }, "bn": { … } }
  },
  "channels": {
    "sms": true, "email": true,
    "threeDaysBefore": true, "onDueDate": true, "everyTwoDaysAfterOverdue": true
  }
}
```

If the user has no `ReminderSettings` row yet, the route
creates one with all defaults and returns it.

#### `PUT /api/reminders/settings`

Body is a partial of the GET shape. Cells not in the body
are left alone; cells in the body are merged on top of the
current record. Templates are validated *after* the merge,
so a previously-stored bad value can also be cleaned up by
sending the corrected cell.

Validation:

- **Placeholders.** Only `{friend_name}`, `{amount}`,
  `{due_date}`, `{my_name}` are allowed. Anything else
  produces `422 validation_error` with a per-field
  `fields` map (`unknown_placeholder:<list>`).
- **Max lengths.** SMS ≤ 600, email subject ≤ 150, email
  body ≤ 5,000. Violations produce
  `422 validation_error` (`template_too_long`).

Returns the merged record on success.

---

#### `GET /api/notifications`

Query: `unread` (`true` / `false`; both optional), `page`
(default 1), `pageSize` (default 20, max 100).

Response: `{ data: Notification[], meta: { page, pageSize, total } }`.
Newest first. Each item has:

```json
{ "id", "type", "titleKey", "params", "loanId",
  "readAt" (ISO or null), "createdAt" (ISO) }
```

The `unread=true` filter uses the
`(userId, readAt)` index, so the count and the list are
both O(matches) regardless of total notifications.

#### `GET /api/notifications/unread-count`

```json
{ "count": 3 }
```

Backed by the `(userId, readAt)` index.

#### `POST /api/notifications/[id]/read`

Marks a single notification read. `404
notification_not_found` when the row doesn't exist or
belongs to another user. Idempotent.

#### `POST /api/notifications/read-all`

Marks every unread notification read. Returns
`{ "updated": N }` where N is the number of rows that
flipped. Idempotent.

---

#### `GET /api/reports`

Query: `range` (`3m` | `6m` | `12m` | `all`, default `6m`).

Response:

```json
{
  "summary": {
    "totalLent", "totalReceived", "outstanding",
    "onTimeRate",   // 0..1
    "counts": { "Paid", "Pending", "Overdue" }
  },
  "monthly": [
    { "month": "2026-04", "lent", "received" }
  ],
  "statusBreakdown": { "Paid", "Pending", "Overdue" },
  "topBorrowers": [
    { "friendId", "name", "outstanding" }
  ],
  "averageDaysToRepay": 1.5,  // null when no paid loans
  "friendReliability": [
    { "friendId", "name", "loanCount", "onTimeCount", "onTimeRate", "label" }
  ],
  "upcomingDueThisWeek": [
    { "loanId", "friendId", "friendName", "amount", "remaining", "dueDate", "daysRemaining" }
  ]
}
```

**Definitions** (documented in `src/lib/reports.ts`):

- **On-time rate** = `(paid loans with paidAt ≤ dueDate) / (paid loans)`. `paidAt` and `dueDate` are compared in Asia/Dhaka. Returns 1 when there are no paid loans (vacuous truth). Documented in code.
- **Average days to repay** = mean of `(paidAt − dueDate)` in whole days. Positive = late, negative = early. `null` when there are no paid loans.
- **Friend reliability** (minimum 2 paid loans before a label is assigned):
  - `always_on_time` — ≥ 80% of their loans paid on time
  - `often_late` — ≤ 30% paid on time
  - `sometimes_late` — in between
  - `insufficient_data` — fewer than 2 paid loans
- **Monthly series** — bucketed by Asia/Dhaka month (`YYYY-MM`). Months in the range with no data are zero-filled.
- **Top borrowers** — up to 5 friends, ordered by `sum(remaining)` of their non-Paid loans.
- **Upcoming due this week** — Pending / Overdue loans with `dueDate` in `[today, today+7]`. Sorted by `dueDate` asc.

One `findMany` for the loans in range, one for the
friends. Grouping is in `src/lib/reports.ts`. No N+1.

Excludes soft-deleted loans throughout.

#### `GET /api/reports/export.csv?range=…`

CSV download of the loans in range. Columns:

```
Friend, Amount (BDT), Paid (BDT), Remaining (BDT), Status, Given, Due
```

- `text/csv; charset=utf-8`, `content-disposition: attachment; filename="loans-<range>-<YYYY-MM-DD>.csv"`, `cache-control: no-store`.
- UTF-8 BOM so Excel renders Bangla names correctly.
- **Formula-injection guard.** Cells starting with `=`, `+`, `-`, `@`, TAB, or CR are prefixed with `'`. The cell is then also wrapped in `"` so the value reads as text in every spreadsheet. See `src/lib/csv.ts`.
- RFC 4180 quoting (commas, quotes, CR, LF).

---

### Error codes (additions since B4)

| HTTP | `code`                       | When                                                |
| ---- | ---------------------------- | --------------------------------------------------- |
| 400  | `empty_patch`                | PATCH / PUT body has no recognised fields           |
| 404  | `notification_not_found`     | `/api/notifications/[id]/read` on a foreign id      |
| 422  | `validation_error` (with `fields`)| Zod failure. `fields` keys include `templates.Friendly.en.sms` etc.; values are i18n keys (`unknown_placeholder:<list>`, `template_too_long`) |

All B3 / B4 codes continue to apply; see the B4 table for
the full list.

### Notes for the B5 frontend wiring

- The API loan DTO uses different field names from the
  localStorage `Loan` type in `src/types/loan.ts` (e.g.
  `givenDate` vs `dateGiven`, `smsEnabled` vs `reminders.sms`,
  `consentConfirmed` vs `consent`). When wiring B5, add a
  DTO → domain mapper in the service layer — do not mutate
  `@/types/loan.ts`.
- `error.message` is an `errors.api.*` key. The i18n
  dictionaries already have entries for every code the API
  can return.
- All endpoints are `force-dynamic`; cache headers are not
  set yet. Add `Cache-Control: no-store` in the wrapper if
  the frontend needs it.