Figma file key: 57Swiq5hGpHTzsg3hVgmlR
URL pattern: https://www.figma.com/design/57Swiq5hGpHTzsg3hVgmlR/?node-id=<id with dash instead of colon>

Node IDs (desktop / mobile):
Landing: 10:3495 / 10:3603
Sign up: 10:3712 / 10:3753
Log in: 10:3794 / 10:3831
Dashboard: 10:3868 / 10:4024
Empty dashboard: 10:4431 / 10:4497
Dark dashboard: 10:4654 / 10:4810
Loans: 10:4167 / 10:4306
Empty loans: 10:4557 / 10:4609
Add a loan: 10:4953 / 10:5070
Add a loan field states: 10:5409 (desktop only)
Add a loan date picker open: 10:5468 (desktop only, may have access error)
Edit a loan: 10:5180 / 10:5298
Loan details: 10:5531 / 10:5672
Loan details delete modal: 10:5805 / 10:5830
Loan details empty history: 10:5855 / 10:5878
Reminder settings Friendly: 10:5901 / 10:6064
Reminder settings Neutral: 10:6220 / 10:6264
Reminder settings Firm: 10:6308 / 10:6352
Feedback states: 10:6396 / 10:6451
UI library (components): 10:6506

## Pages built without Figma frames

These routes were added without a dedicated Figma frame. Layout was
matched by reusing the rhythm from the closest existing frame
(Loans / Loan details / Reminder settings Friendly / Log in / Empty
loans), the design tokens in `@theme inline` (globals.css), and the
shared primitives in `src/components/ui/`.

| Route                         | Notes                                                              |
| ---                           | ---                                                               |
| `/settings`                   | Profile / Appearance / Notifications / Security / Account.       |
| `/forgot-password`            | Centered auth card, email-only, success + Resend.                 |
| `/reset-password`             | Token-aware reset, success + Log in.                             |
| `/reminders/history`          | 3 stat cards + filters + desktop table + mobile cards.           |
| `/friends`                    | Aggregated friends (derived from loans).                         |
| `/friends/[id]`               | Friend header + 3 SummaryCards + their loans + reminder history. |
| `/notifications`              | Today / Yesterday / Earlier feed; click marks read + navigates.  |
| `/terms`                      | Marketing route group, Server Component, metadata.                |
| `/privacy`                    | Marketing route group, Server Component, metadata.                |
| `/reports`                    | Range selector + 4 SummaryCards + SVG lent-vs-received chart + status breakdown + top borrowers + reliability + upcoming due + CSV export. |
| `/loans/[id]`                 | Rewrote with progress bar, payment history, reschedule history, timeline, Record payment / Mark fully paid / Reschedule / Edit modals. (The original page existed; this expansion is unframed.) |
| `/loans/[id]/edit`            | Per-loan "Message language" override (English / বাংলা / default). |

## Features built without Figma frames

These features were layered on top of the Figma-backed routes. None
has a dedicated Figma frame; everything matches the closest existing
frame's rhythm and the design tokens in `globals.css`.

- **Notification dropdown** (TopBar, `notification-bell.tsx`).
  Desktop popover + mobile full-width sheet. 5 latest items, unread
  count badge (9+), Mark-all-read, View-all, outside-click / ESC /
  route-change close, live count via `useNotifications()`.
- **Partial payments + payment history**. `Loan` now carries
  `payments: Payment[]`; `amountPaid` / `remainingAmount` are derived.
  `LoanService` migrated saved loans to v2 (with synthetic full
  payment for `Paid` rows). The Loan details page exposes Record
  payment / Mark fully paid, progress bar, payment history card with
  delete + undo, dashboard "Total received" card, and a partial-paid
  caption in the loans list.
- **Due-date reschedule**. Loan details Reschedule modal persists to
  `rescheduleHistory`, recalculates status and "X days remaining",
  reschedules the reminder schedule, emits a `due-date-updated`
  notification, and shows a Rescheduled clock indicator in the loans
  list.
- **Bangla templates + language switch**. `src/lib/i18n` ships a typed
  English / Bangla dictionary, a `LanguageProvider` with
  localStorage + cookie persistence, an SSR-safe pre-paint script
  that sets `<html lang>` before hydration, and a `useT()` hook.
  Settings → Appearance has a language switcher and a "Use Bangla
  numerals" toggle (independent of UI language). The TopBar and
  landing nav carry a compact language switcher. Reminder messages
  have a separate Message language setting (per-loan override on the
  loan form + global default on `/reminders`) and the SMS preview
  shows a Unicode-aware char / segment counter (160 per segment for
  Latin, 70 for Bangla Unicode SMS).
- **Reports page** (`/reports`). Range selector (3m / 6m / 12m /
  all), 4 SummaryCards, accessible SVG grouped bar chart for
  Lent-vs-Received with a hidden `<table>` alternative, status
  breakdown bars, Top borrowers list linking to `/friends/[id]`,
  Average time to repay + Friend reliability list, Upcoming due this
  week card, empty state, skeleton loading, and a CSV export of the
  loans in the selected range. All derived in `reportService` from
  loans + payments.

## Pages

### Pages built without Figma frames

| Route | Summary |
| --- | --- |
| `/reports` | Range selector + 4 SummaryCards + SVG lent-vs-received chart + status breakdown + top borrowers + reliability + upcoming + CSV export. |
| `app/(app)/loans/[id]` | The loan details expansion: PaymentModal + payment history, RescheduleModal + reschedule history, extended Timeline, partial-paid progress bar. |

## Features

### Features built without Figma frames

- **Fonts — single family for the whole app**. Replaced the original
  Inter (UI) and Playfair Display (headings) with **DM Sans** as the
  only font family, loaded via `next/font/google` with weights 400 /
  500 / 600, the latin subset, and `display: swap`. Instrument Serif
  was removed; Noto Serif Bengali was removed. The Bangla fallback
  (`Noto Sans Bengali`, bengali subset, weights 400/500/600/700) is
  preserved so the ৳ glyph and the Bangla script render correctly
  under the same DM Sans weight. The `--font-sans` and `--font-display`
  tokens (and the matching Tailwind `font-sans` and `font-display`
  utility classes) keep the same names and resolve to the same DM Sans
  stack, so no component was renamed. Form controls (`button`, `input`,
  `textarea`, `select`, `option`, `optgroup`, `label`) and SVG
  `<text>` inherit the body font via a base rule in `globals.css`, so
  the date-picker popover, SMS / email preview, notification panel,
  and reports chart all match the rest of the page. Heading sizes
  (`text-display`, `text-h1`, `text-h2`, `text-price`) are reduced by
  ~4px from the previous Instrument Serif values, given a tight
  `-0.02em` letter-spacing and a 1.15–1.2 line-height, and rendered
  with `font-semibold` (600) for the weight hierarchy. Figma frames
  still show the old fonts; the implementation in this repo is the
  source of truth for the live design.
- **Persistent top navbar** on every logged-in page. The Figma frames
  for the Top bar (Dashboard 10:3888 desktop / 10:4026 mobile) and the
  UI library Top bar (10:6506) define the height, border, padding
  and right-side tool order; the existing `TopBar` is the same node.
  80px desktop / 72px mobile, 1px border-bottom, sticky at the top
  (`z-20`), surface background with `bg-surface/95 backdrop-blur-sm`.
  Left side: a single DM Sans (font-semibold) title (e.g. "Dashboard",
  "Notifications", "Add a loan") or a "Loans / Rafi" breadcrumb for
  nested routes (`/loans/[id]`, `/loans/[id]/edit`, `/friends/[id]`).
  The breadcrumb current segment is resolved from the live
  `useLoans()` snapshot so it updates as data changes. On mobile a
  32×32 brand mark sits to the left of the page title. Right side,
  exact order: notification bell (live unread count, 9+ badge,
  layout-shift-safe because the badge is absolutely positioned and
  the button is a fixed 36px) → Sun/Moon theme toggle (mounted
  check prevents hydration mismatch, Moon in light / Sun in dark) →
  segmented language switch (`EN | বাং`) → avatar "A" dropdown
  with a name + email header, links to Settings, Reminder history,
  Reports, a divider, and a destructive "Log out" action. The
  dropdown supports Arrow / Home / End / Tab / Escape, returns
  focus to the trigger on close, and closes on outside click and
  route change. Search field lives in the bar too, hidden below
  the `lg` (1024px) breakpoint. The marketing nav (landing, terms,
  privacy) carries the same theme toggle and language switch but
  keeps the "Log in" / "Get Started" CTAs and no bell or avatar.
  The four auth pages get a small `AuthToolbar` in the top-right
  corner with the same theme toggle and language switch. The
  Bottom tab bar on mobile and the desktop Sidebar are unchanged.
## Typography scale

A single shared type scale for the whole app. Every page, card, form
field, table cell, button, chip, badge, modal, chart, and brand
mark reads from one of these tokens — there are no ad-hoc
	ext-[..px], ont-bold, 	ext-2xl ... 	ext-5xl, or inline
ontSize styles anywhere in the source. The tokens are defined
in src/app/globals.css under @theme inline and re-declared for
< 640px viewports at the bottom of the file so headings step down
on mobile while body / helper / label / badge / eyebrow stay
constant.

The shared page header is <PageHeader> in
src/components/layout/page-header.tsx — props eyebrow?, 	itle,
subtitle?, ction?. The shared card title is <CardHeading> and
the form-field label is <FieldLabel>, both in
src/components/layout/text.tsx.

| Token              | Desktop | Mobile (<640px) | Weight | Line-height | Letter-spacing | Used for                                                    |
| ---                | ---     | ---             | ---    | ---         | ---            | ---                                                         |
| 	ext-display     | 56px    | 36px            | 600    | 1.1         | -0.02em        | Landing hero H1 (only).                                     |
| 	ext-h1          | 32px    | 28px            | 600    | 1.2         | -0.02em        | Every logged-in page H1 (<PageHeader> title).             |
| 	ext-section-h2  | 36px    | 28px            | 600    | 1.2         | -0.02em        | Landing section H2 (Features, How it works, Final invite). |
| 	ext-auth-heading| 28px    | 24px            | 600    | 1.2         | -0.02em        | Login, Signup, Forgot, Reset card H1.                       |
| 	ext-legal-h1    | 36px    | 28px            | 600    | 1.2         | -0.02em        | Terms / Privacy H1.                                         |
| 	ext-price       | 40px    | 32px            | 600    | 1.2         | -0.02em        | Large loan amount on Loan details.                          |
| 	ext-summary     | 26px    | 24px            | 600    | 1.4         | -0.01em        | SummaryCard number; tabular-nums.                            |
| 	ext-card-heading| 18px    | 17px            | 600    | 1.4         |                | Card / panel heading (Profile, Appearance, Payment history, top borrowers, friend reliability, chart cards). |
| 	ext-list-title  | 17px    | 16px            | 600    | 1.4         |                | List group heading (e.g. "Recent loans", "Loans" on friend page). |
| 	ext-modal-heading| 20px   | 20px            | 600    | 1.3         |                | Dialog / modal title.                                       |
| 	ext-nav         | 17px    | 17px            | 600    | 1.5         |                | TopBar page title, brand wordmark, sidebar nav.             |
| 	ext-subtitle    | 15px    | 14px            | 400    | 1.5         |                | Page subhead (under H1), auth subtitle, landing hero body. |
| 	ext-body        | 14px    | 14px            | 400    | 1.5         |                | Body, input / select / textarea value, table cell, button default copy. |
| 	ext-label       | 13px    | 13px            | 500    | 1.5         |                | Form field label (above inputs), segmented control, sidebar nav item. Always <= input value. |
| 	ext-helper      | 12px    | 12px            | 400    | 1.5         |                | Helper / caption / error text, table head, secondary actions. |
| 	ext-eyebrow     | 11px    | 11px            | 500    | 1.5         | +0.08em uppercase | Eyebrow / overline (date, "Your account, your way").       |
| 	ext-badge       | 11px    | 11px            | 500    | 1.5         |                | Badge / chip / status pill, bottom-tab label, notification unread dot. |
| 	ext-chart       | 11px    | 11px            | 400    | 1.4         |                | Reports SVG axis ticks, legends. Muted. Tabular numerals.   |
| 	ext-tooltip     | 12px    | 12px            | 400    | 1.4         |                | Reports chart tooltip copy.                                 |
| 	ext-legal-body  | 15px    | 15px            | 400    | 1.7         |                | Terms / Privacy body text.                                  |

The .eyebrow utility class bundles 	ext-eyebrow with
	ext-transform: uppercase and color: var(--muted). The
.chart-text and .chart-tooltip helpers expose the chart tick /
tooltip tokens as plain CSS classes for SVG <text> to inherit.

Button text uses 13px / weight 600 by default — it is rendered
through the Button component's own ont-semibold text-label
classes rather than a dedicated token, since it never changes
inside a screen.

Bangla text: --font-sans resolves to ar(--font-dm-sans),
var(--font-noto-bengali), ui-sans-serif, system-ui, sans-serif,
so the Bengali fallback (Noto Sans Bengali, loaded via 
ext/font
in pp/layout.tsx) takes over for the ৳ glyph and the full
Bangla script. Headings (line-height 1.2 desktop, 1.3 mobile in
the type-scale tokens) and body (line-height 1.5) are within the
Bangla-safe range; long Bangla titles wrap and don't clip at
390px.

## Reports chart

The Reports "Lent vs received" chart is rendered with a
ResizeObserver (in src/app/(app)/reports/page.tsx —
MonthlyChart) that measures the actual pixel width of the chart
container, then renders the SVG at that exact pixel width. There
is no iewBox, so ontSize: 11 is a literal 11px on screen —
the text does not scale with the container. Y-axis tick labels
are abbreviated to ৳10k / ৳22k / ৳33k (see
ormatMoneyShort in src/lib/format.ts); the left padding is
48px so the abbreviated labels never clip. X-axis labels are
short month names (May, Jun, ...) with the year appended only
on the first bucket of a new year (and the full May 2026 /
৳12,500 shown in the SVG <title> element so a hover tooltip
or accessibility label reads the complete value). The
"theme/font" tokens used by the chart are 	ext-chart for ticks
and legend (11px muted) and 	ext-tooltip for the hover label
(12px).
