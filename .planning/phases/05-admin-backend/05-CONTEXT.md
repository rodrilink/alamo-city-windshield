# Phase 5: Admin Backend - Context

**Gathered:** 2026-08-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Authenticated admins can log in at `/admin/login`, land on a protected `/admin` dashboard showing
summary cards, time-series charts, a recent-contacts table and an upcoming-appointments table, and
manage admin accounts from `/admin/users`.

Delivers: the login form and logout (AUTH-01, AUTH-02, AUTH-05), the `(admin)` layout shell, the
dashboard with 4 cards + 3 charts + 2 tables (ADMIN-01..07), and add/remove admin users
(USER-01..04).

Already delivered by Phase 1 — verify, do not rebuild: **AUTH-03 and AUTH-04 are implemented** in
`src/lib/supabase/middleware.ts` (route guard using `getUser()`, with `/admin/login` excluded from
the redirect). **USER-04 is satisfied** by `src/lib/supabase/admin.ts` (`server-only` +
non-`NEXT_PUBLIC_` service-role key).

Does NOT deliver: firing analytics events (Phase 6, ANLY-02..06 — this phase only *reads*
`analytics_events`), mutating bookings or contacts from the dashboard (read-only tables, D-15),
password reset (deferred), any database migration (D-06 removes the need for one), or admin-editable
pricing (V2-04).

</domain>

<decisions>
## Implementation Decisions

### Chart and card data sources

- **D-01:** **Build the real `analytics_events` query layer now and render an honest empty state.**
  The charts (ADMIN-02/03/04) query the real table over the real window; because Phase 6 has not
  wired event tracking yet, they will return zero rows and must render a "No data yet — event
  tracking arrives in Phase 6" empty state rather than a broken axis or a blank box.
  - *Why not seed data:* synthetic rows in `analytics_events` would have to be remembered and deleted
    before launch, and a dashboard that silently shows fabricated traffic is worse than one that
    honestly shows none.
  - *Payoff:* Phase 6 lights these charts up with **no changes to chart code** — it only adds the
    writes.
- **D-02:** **Card totals are mixed-source, and no card ever shows a fabricated number.** Contacts
  and bookings count real rows from the `contacts` and `bookings` tables (these have real data from
  Phase 4 today). Visitors and VIN searches count `analytics_events` rows and will read `0` with a
  subtle "tracking starts Phase 6" hint.
  - *Why not one uniform source:* reading all four from `analytics_events` would show "0 bookings"
    while the `bookings` table actually holds rows — which reads as a bug, not as pending work.
- **D-03:** **Window is the last 30 days in daily buckets.** No range picker. Both the window length
  and the bucket granularity go in **named constants** so they can be tuned without touching query
  logic.
- **D-04:** **Dashboard data is fetched in Server Components querying Supabase directly** with the
  cookie-based SSR server client (`src/lib/supabase/server.ts`), so RLS applies as the logged-in
  admin. Plain serializable data is passed down to chart components.
  - Chart components themselves **must be Client Components** (`'use client'`) — Recharts needs the
    DOM.
  - *Why not Route Handlers:* Phase 3's `/api/vin` and `/api/estimate` were **public** GETs consumed
    by client-side forms. The dashboard is server-rendered behind auth; an HTTP hop to our own
    process buys nothing and adds a second auth surface.
  - *Why not Server Actions:* Phase 4's D-13 chose Server Actions for **writes**. Using them for the
    initial read means rendering an empty shell and filling it in — strictly worse than querying
    during render. Server Actions remain correct for this phase's *mutations* (add/remove user).

### Who counts as an admin

- **D-05:** **`auth.users` IS the admin list.** Every Supabase Auth user is a full admin. USER-01
  lists them through the service-role Admin API (`auth.admin.listUsers()`).
  - *Safe because there is no public signup path anywhere in the application.* The only ways to
    create an `auth.users` row are an existing admin using `/admin/users` or the owner using the
    Supabase dashboard (Phase 1 D-12).
  - This resolves the open question Phase 1 D-10 deliberately left for later ("plus a custom
    `profiles` or `admin_roles` table **if roles are needed**"). Roles are not needed at v1.
- **D-06:** **This phase adds NO database migration.** D-05 means no roles table; the existing RLS
  policies (`USING (auth.role() = 'authenticated')` on `bookings`, `contacts`, `analytics_events`)
  already grant exactly the access the dashboard needs, unchanged. Planning should not schedule
  schema work.
- **D-07:** The user list shows **email, created date, and last sign-in** — all three come free in
  the `listUsers()` response with no extra queries. Last sign-in is the field that makes removal
  decisions possible ("which of these accounts is stale?").
- **D-08:** **No password-reset / forgot-password flow.** AUTH-01..05 name only login and logout, and
  reset requires Supabase SMTP configuration plus an email template, neither of which exists in this
  project. Recovery path: another admin recreates the account, or the owner resets it in the Supabase
  dashboard. Captured as a deferred idea.
- **D-09:** **Successful login always redirects to `/admin`.** One fixed destination.
  - *Deliberately rejected:* honoring a `?redirectTo=` param. The value is attacker-controllable and
    would need same-origin `/admin/*` validation to avoid an open redirect — real code and a real
    test, for a two-page admin area.

### User management safety rails

- **D-10:** **Both a self-delete guard and a last-admin guard, enforced server-side in the Server
  Action** — not merely hidden in the UI.
  - Refuse when the target user id equals the caller's own id: "you cannot remove your own account".
  - Refuse when only one admin account exists: "at least one admin must remain".
  - *Why both:* with D-05, deleting a user IS deleting an admin, and there is no public signup — so
    removing the last account locks everyone out of the dashboard, recoverable only through the
    Supabase dashboard. These two comparisons close both routes to that state.
- **D-11:** **Removal requires a confirmation dialog that names the email** — e.g. "Remove
  admin@example.com? They will immediately lose access." Destructive, irreversible, and there is no
  undo.
  - ⚠ **No shadcn `dialog` / `alert-dialog` primitive exists** in `src/components/ui/` — one must be
    generated. See the new-dependencies note below.
- **D-12:** **Add-user validation is Zod `min(8)` plus a matching confirm-password field**, with
  Supabase's own password policy as the server-side backstop. Follows the established Phase 4
  `react-hook-form` + `zod` + `@hookform/resolvers` + shadcn `Form` pattern.
  - The created password is **shown to the admin once on success**, because there is no email
    delivery to send it (same constraint as D-08).
- **D-13:** **User management lives at a dedicated `/admin/users` route** holding the list, the
  add-user form, and per-row remove.
  - *Why not a section of the dashboard:* it would put destructive account actions on the same long
    page as read-only analytics, and a tall page is exactly what caused the short-viewport clipping
    bug in 03-UAT test 14.

### Admin shell and tables

- **D-14:** **The `(admin)` route group gets its own `layout.tsx` with a sidebar** (Dashboard, Users),
  the signed-in admin's email, and the logout button (AUTH-05). This realizes Phase 1 D-17's stated
  intent: "`src/app/(admin)/admin/` — admin dashboard with sidebar layout".
  - **The login page must NOT be inside that layout** — it has no session, so a sidebar showing the
    user's email and a logout button is nonsense there. Structure the route group so
    `/admin/login` renders outside the authenticated shell.
  - *Why not reuse the public `TopNav` + `Footer`:* those are marketing chrome. A customer phone CTA
    and a San Antonio service-area footer are noise on an internal tool, and neither offers a natural
    home for logout or a Users link. Note `(public)/layout.tsx` is a bare passthrough and each public
    page composes its own chrome — the `(admin)` layout is therefore a genuine layout, not a
    duplicate of an existing one.
- **D-15:** **ADMIN-06 and ADMIN-07 tables are read-only.** No row actions. Both requirements say
  "table of…" and no requirement in this phase mentions acting on a row. The phase already carries
  auth + charts + user management.
  - Booking status transitions (`pending` → `confirmed` → `completed`) were considered and
    **deliberately deferred** — see Deferred Ideas.
- **D-16:** **Bounded queries with limits in named constants.** Contacts: newest-first, limit 10.
  Appointments: `appt_date >= today`, soonest-first, limit 10. No pagination.
  - Note the appointments filter is **forward-looking** and is deliberately *not* the charts' 30-day
    backward window (D-03) — applying a past window to "upcoming appointments" would show the
    opposite of what the requirement asks for.
- **D-17:** Appointment rows show **date, time, name, phone, `vehicle_desc`, and status** — enough to
  make the confirmation call without opening Supabase. This consumes the denormalized `vehicle_desc`
  column exactly as Phase 4's D-12 intended: **no VIN re-decoding and no NHTSA calls from an internal
  page.**

### Claude's Discretion

- Chart type per metric (area vs bar vs line) and whether zero-activity days are gap-filled to keep a
  continuous x-axis — standard Recharts/shadcn Chart practice is fine. Note that with D-01 every day
  is currently a zero day, so the empty state, not the interpolation, is what actually gets exercised.
- Whether aggregation into daily buckets happens in SQL or in JS after the fetch.
- Sidebar styling and collapse behavior; card and table layout; whether the add-user form is inline
  or inside a dialog.
- Login error-message wording. Phase 3's D-17/D-18 and Phase 4's D-10 established that different
  failure causes get visibly different UI — apply the same principle here: a wrong password and an
  unreachable Supabase are different problems and should not share one message. Credential errors
  should stay generic (do not reveal whether an email exists).
- Exact user-facing strings. Follow the established copy-module pattern (`ESTIMATE_COPY`,
  `BOOKING_COPY`, `CONTACT_COPY` in `src/lib/constants.ts`) with an `ADMIN_COPY` block.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 5: Admin Backend" — the goal, the 16 requirement IDs, and the 5
  success criteria this phase is measured against
- `.planning/REQUIREMENTS.md` — AUTH-01..05, ADMIN-01..07, USER-01..04 in full; also V2-04
  (admin-editable pricing, out of scope) and the Out-of-Scope table

### Auth — already implemented, verify rather than rebuild
- `src/lib/supabase/middleware.ts` — **AUTH-03 and AUTH-04 already live here.** Uses
  `supabase.auth.getUser()` (never `getSession()` — CVE-2025-29927, pinned by an inline comment),
  guards `/admin/*`, and excludes `/admin/login` to avoid the infinite redirect. Also silently
  passes through when Supabase env vars are absent — relevant to the blocker below.
- `src/middleware.ts` — the matcher that mounts the above on all non-asset routes
- `src/lib/supabase/server.ts` — cookie-based SSR server client; the one D-04 uses for dashboard reads
- `src/lib/supabase/admin.ts` — service-role client. `import 'server-only'`, hard-fails on a missing
  key, and its header comment documents the `NEXT_PUBLIC_` prohibition. **USER-04 is satisfied by
  this file**; use it for the `auth.admin.*` calls in USER-01/02/03.
- `src/app/(admin)/admin/login/page.tsx` — a placeholder reading "Login form will be implemented in
  Phase 5". Gets replaced wholesale.

### Database schema (already exists — no migration this phase, per D-06)
- `supabase/migrations/20260412000000_initial_schema.sql` — `bookings`, `contacts`,
  `analytics_events`, `vin_cache`. All read policies this phase needs are
  `USING (auth.role() = 'authenticated')`. Column names matter for the queries:
  - `contacts`: `created_at`, `name`, `last_name`, `phone`, `address`, `vin`, `message`, `honeypot`
  - `analytics_events`: `created_at`, `event_type`, `page`, `vin`, `metadata` (JSONB)
  - `bookings`: `appt_date` DATE + `appt_time` TIME, `status`, `vin`, `vehicle_desc`, `service_type`
  - ⚠ Never pushed to a live database — see the blocker below.

### Prior-phase decisions that constrain this phase
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-10 (left the roles-table question to this phase;
  resolved by D-05), D-12 (first admin created by hand in the Supabase dashboard), D-13 (RLS policy
  matrix), D-17 (`(admin)` route group with sidebar layout — realized by D-14), D-21 (service-role key
  must never be `NEXT_PUBLIC_`), D-22 (`getUser()` in middleware)
- `.planning/phases/04-booking-contact/04-CONTEXT.md` — **D-12** (`vehicle_desc` was denormalized
  *specifically* so this phase's bookings table need not re-decode VINs — D-17 consumes it), D-13
  (Server Actions for writes), D-10 (distinct failure screens per cause), D-20 (per-page chrome; no
  snap-scroll on non-home routes)
- `.planning/phases/03-vin-estimate/03-CONTEXT.md` — D-15 (derived values computed server-side, never
  client-supplied), D-17/D-18 (a fixable failure must never be disguised as a permanent one)
- `.planning/phases/03-vin-estimate/03-UAT.md` — test 14 documents the short-viewport clipping bug
  that D-13 and D-16 are shaped to avoid repeating

### Established conventions
- `src/lib/constants.ts` — `BUSINESS`, `NAV_LINKS` (already contains the `/admin` link), and the
  `ESTIMATE_COPY` / `BOOKING_COPY` / `CONTACT_COPY` copy-module pattern to follow with `ADMIN_COPY`
- `src/lib/contact/contact-actions.ts` and `src/lib/booking/booking-actions.ts` — the Server Action
  shape to mirror for the add/remove-user mutations
- `src/lib/contact/contact-schema.ts` and `src/lib/booking/booking-schema.ts` — the Zod schema shape
  (and their `.test.ts` siblings, the established unit-test pattern) to mirror for the add-user form

### External references (read at implementation time)
- shadcn/ui Chart docs — the `ChartContainer` / `ChartTooltip` / `ChartLegend` wrapper over Recharts
- Supabase Auth Admin API — `auth.admin.listUsers()`, `createUser()`, `deleteUser()` (service-role only)
- Supabase `signInWithPassword` / `signOut` via `@supabase/ssr`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/supabase/middleware.ts`**: the route guard is done. AUTH-03/AUTH-04 need verification,
  not implementation. Do not rewrite it; the `getUser()` choice and the login-page exclusion are both
  load-bearing and comment-pinned.
- **`src/lib/supabase/admin.ts`**: exactly the client USER-01/02/03 need for `auth.admin.*`. Already
  `server-only` and already hard-fails on a missing key.
- **`src/lib/supabase/server.ts`**: the RLS-respecting client for D-04's dashboard reads.
- **Form stack**: `react-hook-form` ^7.84, `zod` ^4.4, `@hookform/resolvers` ^5.7 and
  `src/components/ui/form.tsx` are all installed and used by Phase 4's two forms. The login form and
  the add-user form follow the same pattern with no new dependencies.
- **`src/components/ui/`**: `button`, `card`, `form`, `label`, `separator`, `sheet` exist. `card` is
  the ADMIN-05 summary cards. `sheet` may serve a mobile sidebar. **No `table`, no `dialog`/
  `alert-dialog`, and no `chart`** — see new dependencies.
- **`vehicle_desc` on `bookings`**: populated by Phase 4 for this exact table (04-CONTEXT D-12).

### Established Patterns
- **Per-page chrome, except here.** `(public)/layout.tsx` is a bare passthrough and each public page
  composes its own `TopNav` + `Footer` (quick task 260805-i19). The `(admin)` group has **no layout
  file at all** today — D-14 adds the first real one. This is not a contradiction of D-20: that
  decision was about not forcing *marketing* chrome through a layout.
- **`server-only` fencing** for anything touching secrets or pricing (`admin.ts`, `pricing.ts`).
- **Copy in constants** (`ESTIMATE_COPY` / `BOOKING_COPY` / `CONTACT_COPY`).
- **Distinct failure screens per cause** — Phase 3 D-17/D-18, Phase 4 D-10.
- **Unit tests are pure-function only.** All 33 tests are `vitest` against non-React modules; there
  is **zero component-test infrastructure** (no `@testing-library/react`, no `jsdom`). Testable logic
  in this phase (date bucketing, the last-admin guard predicate, Zod schemas) should be extracted into
  pure modules so it can be covered the same way. UI behavior stays on manual UAT.

### Integration Points
- `/admin/login` placeholder page → replaced by the real login form.
- New `(admin)` layout wraps `/admin` and `/admin/users`, but must exclude `/admin/login`.
- `NAV_LINKS` already points at `/admin`; the public nav needs no change.
- Dashboard reads `contacts`, `bookings`, and `analytics_events` — all three tables already exist
  with the right policies.
- **Phase 6 depends on D-01:** it adds the `analytics_events` writes that make these charts show
  data. Whatever query and bucketing contract this phase builds is the contract Phase 6 fills.

</code_context>

<specifics>
## Specific Ideas

- No card is allowed to display a fabricated number — a `0` with a "tracking starts Phase 6" hint is
  preferred over a plausible-looking invented figure.
- The removal confirmation must name the actual email address, not say "this user".
- The appointments table should carry enough to make the phone confirmation call without opening
  Supabase — that is the whole point of including `phone` and `vehicle_desc`.
- The generated password is displayed once on success, because there is no email to send it to.

</specifics>

<deferred>
## Deferred Ideas

- **Booking status transitions from the dashboard** (`pending` → `confirmed` → `completed`).
  Genuinely useful, since Phase 4's D-12 writes every booking as `pending` and confirmation happens
  by phone — so the status column never changes today. Rejected here as a new capability beyond
  ADMIN-07: it needs its own Server Action, RLS write path, and tests. Strong candidate for a
  follow-up phase.
- **Contact row actions** — mark contacted, add internal notes. Same reasoning; `contacts` has an
  unused `message` column and no notes column.
- **Manual slot blocking / blackout dates by the shop owner** — carried over from Phase 4's deferred
  list, which pointed at "the admin work in Phase 5". Still out of scope: it is a booking-availability
  capability, not an admin-reporting one, and would need `BUSINESS.hours` to gain per-date overrides.
- **Password reset / forgot-password flow** (D-08) — needs Supabase SMTP plus an email template.
- **An admin setting another admin's password** — cheap given the Admin API is already in use, but it
  lets any admin silently take over another's account. Not without a role distinction.
- **Roles beyond "admin"** (e.g. a staff role that can read bookings but not manage users) — D-05
  deliberately declines the roles table. This is where it would be added.
- **Chart date-range picker** (7 / 30 / 90 days) — D-03 fixes 30 days in a constant; the constant is
  the seam if this is revisited.
- **Pagination / search on the dashboard tables** — D-16 caps both at 10 rows. Becomes worth doing
  once real volume accumulates.
- **Admin-editable pricing** — V2-04, explicitly a v2 requirement.

### Reviewed Todos (not folded)
- **`calendar-sizing-centering.md`** (cosmetic, from Phase 4 UAT) — not folded. It targets
  `src/components/booking/BookingCalendar.tsx` and `/book`, which are public booking-flow files
  outside this phase's `(admin)` scope. Best handled as a quick task.
- **`requirements-traceability-stale.md`** (docs, info) — not folded. Every row in
  `.planning/REQUIREMENTS.md`'s traceability table reads `Pending`, including Phases 1–4 which are
  verified complete; `gsd-sdk query phase.complete` returns `requirements_updated: false` for this
  project. It is project-wide tooling/docs drift, not Phase 5 work, and **Phase 5 will inherit the
  same problem** when it completes. Worth fixing at the mechanism level rather than backfilling.

</deferred>

---

## ⚠ New dependencies required — needs owner approval

This phase **cannot be built with the current dependency set.** Verified against `package.json` on
2026-08-06:

| Package / file | Why | Status |
|---|---|---|
| `recharts` | ADMIN-02/03/04 require charts. `PROJECT.md` names shadcn/ui Chart, which wraps Recharts. Let the shadcn CLI pick the version to avoid a v2/v3 mismatch with the chart primitive. | **not installed** |
| `src/components/ui/chart.tsx` | The shadcn Chart primitive (`ChartContainer`, `ChartTooltip`, `ChartLegend`). | **does not exist** |
| `src/components/ui/dialog.tsx` or `alert-alert-dialog.tsx` | D-11's removal confirmation. | **does not exist** |
| `src/components/ui/table.tsx` | ADMIN-06/07 tables. Optional — plain semantic `<table>` with Tailwind would also do. | **does not exist** |

This project has an established **blocking package-approval gate**: Phase 3's `03-01-PLAN.md` and
Phase 4's `04-01-PLAN.md` each existed solely to clear new packages with the owner before any install
ran. **Planning should open Phase 5 with the same gate**, before any task that imports Recharts.

Note this repo's shadcn primitives wrap **`@base-ui/react` 1.3.0, not Radix** — Base UI uses a
`render` prop where Radix uses `asChild`. Verify each generated primitive matches the local
convention rather than pasting Radix-oriented docs. Also note `react-day-picker` is at **^10.0.1**
here, not the v9 that `PROJECT.md` recommends — treat `PROJECT.md`'s version table as advisory and
`package.json` as the truth.

No other new dependencies are anticipated: the form stack is installed, and D-04 uses built-in Server
Components plus Server Actions rather than a data-fetching library.

---

## ⚠ Blocker affecting this phase

**No Supabase project and no `.env.local` exist.** Carried forward from Phase 4's context and still
listed in `STATE.md` Blockers. Phase 4's plan `04-02-PLAN.md` was the `[BLOCKING]` provisioning step —
**planning must confirm whether it actually ran**, since Phase 4's UAT was verified "against the live
database", which suggests it did.

If it did not: **every success criterion in this phase requires a live auth database.** Login is
impossible without real Supabase Auth, and `src/lib/supabase/middleware.ts` *silently skips auth
entirely* when the env vars are absent (an intentional dev-convenience escape hatch) — meaning
`/admin/*` would appear unprotected locally and success criterion 1 could not be verified at all.
Additionally, D-05 requires at least one `auth.users` row to exist, created by hand in the Supabase
dashboard per Phase 1 D-12.

---

*Phase: 05-admin-backend*
*Context gathered: 2026-08-06*
