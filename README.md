# Loan Reminder

A friendly lending companion for friends and family. Track loans you have
given out, schedule reminders, and keep a clear record of who owes you
what — all from a single dashboard.

This repository ships the **frontend** (Next.js App Router + React 19).
Every piece of data the UI consumes flows through `src/services` so the
app can run in one of two modes:

- **Prototype mode** — `NEXT_PUBLIC_API_URL` is empty. The services keep
  data in `localStorage` and return the demo seeds on first load. No
  server required.
- **Live mode** — `NEXT_PUBLIC_API_URL` points at a real backend. The
  same service functions hit the HTTP endpoints described in
  [API contract](#api-contract).

The two modes are interchangeable: a single env variable swap moves the
app from one to the other.

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure

Copy the example env file and fill in your backend URL when you have one:

```bash
cp .env.example .env.local
```

Leave `NEXT_PUBLIC_API_URL=` blank to run in prototype mode.

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
    ui/                    # Atomic UI primitives (button, input, chip…)
    layout/                # Sidebar, TopBar, BottomTabBar
    forms/                 # Shared LoanForm
    auth/                  # AuthCard used by /login and /signup
    marketing/             # Landing-page sections
  services/                # Data access — every page imports from here
    loanService.ts
    reminderService.ts
    authService.ts
    use-loans.ts           # Client hook over loanService
    use-reminder-settings.ts
    index.ts
  types/                   # Shared TS types (Loan, Friend, Reminder…)
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
UI component ──▶ @/services/loanService (async) ──▶ @/lib/api (fetch)
                                                      │
                                                      ▼
                                          Backend OR localStorage
                                                      │
                                                      ▼
                                            use-loans hook re-renders
```

Every service function is `async` and returns typed data. UI code is
identical in both modes; only the env variable changes.

---

## The fetch wrapper (`src/lib/api.ts`)

Single point of contact with the backend. Highlights:

- Reads `NEXT_PUBLIC_API_URL` once at module load; trims a trailing
  slash. When the variable is empty, `API_ENABLED` is `false` and every
  service falls back to its local store.
- Attaches `Authorization: Bearer <token>` from `src/lib/auth.ts` to
  every request (set by `authService.signIn` / `signUp`).
- Sends `Content-Type: application/json` and `Accept: application/json`
  on every JSON request/response.
- Sends `Idempotency-Key` for non-GET / non-DELETE writes when the
  caller provides one.
- 30 second default timeout, cancelable via the standard
  `AbortSignal` you pass in the options bag.
- Throws `ApiError` (extends `Error`) with `status`, `code`, `details`,
  and the parsed body for any non-2xx response.

Convenience helpers:

| Helper    | Method   | Notes                                     |
| --------- | -------- | ----------------------------------------- |
| `apiGet`    | GET      | `apiGet<T>(path, opts?)`                    |
| `apiPost`   | POST     | `apiPost<T>(path, body?, opts?)`            |
| `apiPut`    | PUT      | `apiPut<T>(path, body?, opts?)`             |
| `apiPatch`  | PATCH     | `apiPatch<T>(path, body?, opts?)`           |
| `apiDelete` | DELETE   | `apiDelete<T>(path, opts?)`                 |
| `request`   | any      | Low-level escape hatch                     |

---

## API contract

This is the HTTP contract the backend is expected to expose. Paths are
relative to `NEXT_PUBLIC_API_URL`. All bodies are JSON. All requests
with bodies are `Content-Type: application/json`. Every successful
response is JSON unless noted.

Errors follow a uniform shape so the UI can pull `message`, `details`,
and a machine-readable `code`:

```jsonc
{
  "code": "loan_not_found",      // optional, machine-readable
  "message": "Loan 42 not found", // safe to display to the user
  "details": { "field": "msg" }  // optional, zod-style field map
}
```

### Auth

| Method | Path             | Auth | Request body                  | Response (200)                                  |
| -------- | ---------------- | ---- | ----------------------------- | --------------------------------------------- |
| `POST`   | `/auth/register` | —    | `{ name, email, password }`    | `{ token: string, user: AuthUser }`            |
| `POST`   | `/auth/login`    | —    | `{ email, password }`          | `{ token: string, user: AuthUser }`            |
| `POST`   | `/auth/logout`   | ✅   | `{}` *(or no body)*             | `204 No Content`                                |
| `GET`    | `/auth/me`       | ✅   | —                             | `AuthUser`                                     |

`AuthUser`:

```ts
interface AuthUser {
  id: string;
  email: string;
  name?: string;
}
```

The token returned by `/auth/login` and `/auth/register` is sent on
every subsequent request as `Authorization: Bearer <token>`. The
frontend stores it in `localStorage` under
`loan-reminder:auth-token:v1`.

### Loans

| Method  | Path                       | Auth | Request body                        | Response (200)                       |
| -------- | -------------------------- | ---- | ----------------------------------- | ------------------------------------ |
| `GET`    | `/loans`                   | ✅   | —                                   | `Loan[]`                              |
| `GET`    | `/loans/:id`               | ✅   | —                                   | `Loan`                                |
| `POST`   | `/loans`                   | ✅   | `CreateLoanBody` *(see below)*        | `Loan` *(server-assigned id, status, timestamps)* |
| `PATCH`  | `/loans/:id`               | ✅   | `Partial<UpdateLoanBody>`           | `Loan`                                |
| `DELETE` | `/loans/:id`               | ✅   | —                                   | `204 No Content`                     |
| `POST`   | `/loans/:id/pay`           | ✅   | `{}` *(or no body)*                  | `Loan` *(status flipped to "Paid", `paidAt` set)* |

#### Loan shape

```ts
interface Loan {
  id: string;
  friend: Friend;
  amount: number;             // BDT (৳)
  dateGiven: string;         // ISO date  YYYY-MM-DD
  dueDate: string;           // ISO date  YYYY-MM-DD
  tone: "Friendly" | "Neutral" | "Firm";
  reminders: { sms: boolean; email: boolean };
  note?: string;
  consent: boolean;
  status: "Paid" | "Pending" | "Overdue";
  paidAt?: string;           // ISO timestamp
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}

interface Friend {
  id: string;
  name: string;
  /** National digits only — the "+880" prefix is implied. */
  phone?: string;
  email?: string;
}
```

`CreateLoanBody` is `Loan` minus `id`, `status`, `createdAt`,
`updatedAt` (the server fills these in). `updateLoan` is a PATCH so any
subset of fields is acceptable.

`status` is server-computed: a loan is `Overdue` when `dueDate < today`
and `status !== "Paid"`, `Pending` while not yet paid and not yet
overdue, and `Paid` after `/loans/:id/pay` (or any PATCH that sets
`status: "Paid"`). Clients should treat the server value as canonical.

#### Validation (suggested)

The frontend validates with zod before sending. The backend should
mirror the same rules so the error messages stay in sync:

- `friend.name` — required, non-empty.
- `friend.phone` — when present, must match `^1[3-9]\d{8}$`
  (national digits; the `+880` prefix is added by the UI).
- `friend.email` — when present, must be RFC-5322 valid.
- `amount` — must be `> 0`.
- `dueDate` — must be strictly after `dateGiven`.

Field errors should be returned as `details: { phone: "..." }`.

### Reminder settings

| Method | Path                            | Auth | Request body               | Response (200)       |
| ------ | ------------------------------- | ---- | -------------------------- | -------------------- |
| `GET`    | `/settings`                   | ✅   | —                          | `ReminderSettings`   |
| `PUT`    | `/settings`                   | ✅   | `ReminderSettings`          | `ReminderSettings`   |
| `PATCH`  | `/settings/tone`               | ✅   | `{ tone: Tone }`            | `ReminderSettings`   |
| `PATCH`  | `/settings/templates/:tone`    | ✅   | `Partial<ToneTemplates>`    | `ReminderSettings`   |
| `PATCH`  | `/settings/channels`           | ✅   | `Partial<ChannelDefaults>`   | `ReminderSettings`   |

```ts
type Tone = "Friendly" | "Neutral" | "Firm";

interface ToneTemplates {
  sms: string;
  emailSubject: string;
  email: string;
}

interface ChannelDefaults {
  sms: boolean;
  email: boolean;
  threeDaysBefore: boolean;
  onDueDate: boolean;
  everyTwoDaysAfterOverdue: boolean;
}

interface ReminderSettings {
  tone: Tone;
  templates: Record<Tone, ToneTemplates>;
  channels: ChannelDefaults;
}
```

`/settings` returns `404` when the user has no settings row yet — the
frontend treats that as "use defaults".

### Reminders (sent)

Reserved for the upcoming reminder-delivery surface. The current UI
shows a static "Reminder history" list driven by `Loan.reminders`. When
the backend starts scheduling real sends, the following endpoints will
back that history list:

| Method | Path                              | Auth | Request body | Response (200) |
| ------ | --------------------------------- | ---- | ------------ | -------------- |
| `GET`    | `/loans/:id/reminders`           | ✅   | —            | `Reminder[]`   |
| `POST`   | `/loans/:id/reminders` *(send now)* | ✅   | `{ tone?, channels? }` | `Reminder` |

```ts
interface Reminder {
  id: string;
  loanId: string;
  scheduledFor: string;     // ISO timestamp
  sentAt?: string;          // ISO timestamp
  tone: Tone;
  channel: "SMS" | "Email";
  status: "Scheduled" | "Sent" | "Failed";
}
```

### Error envelope

All non-2xx responses must return `ApiErrorBody`:

```ts
interface ApiErrorBody {
  code?: string;                       // e.g. "loan_not_found"
  message?: string;                    // user-safe message
  details?: Record<string, string>;    // optional field errors
}
```

The frontend's `ApiError` class exposes `status`, `code`, `details`,
and `body` so call sites can render per-field errors.

---

## CORS & auth headers

The backend must allow:

- `Origin` matching the deployed frontend (configure per environment).
- `Methods`: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- `Headers`: `Authorization, Content-Type, Accept, Idempotency-Key`.
- `Credentials`: optional — the token is sent in `Authorization`, not a
  cookie, so CORS does not need `credentials: true`.

Preflight (`OPTIONS`) responses must include the same headers and a
`max-age` of at least 600 seconds.

---

## Notes for future work

- `src/services/loanService.ts` currently handles "create / update /
  delete" by writing to `localStorage`. The API call shape is already
  in place; turning it on is a one-line `process.env` flip.
- `Idempotency-Key` is set when the UI retries a POST/PUT/PATCH after a
  network blip. The backend should honour the standard: the same key +
  same body returns the same response; the same key + a different body
  returns `409 Conflict`.
- `useLoans` (`src/services/use-loans.ts`) subscribes to a `loans:change`
  event today. When wired to a live API it can keep the same contract by
  re-fetching after every mutation instead of reading from
  `localStorage`.