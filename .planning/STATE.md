---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Awaiting next milestone
stopped_at: Phase 6 context gathered
last_updated: "2026-08-10T02:46:24.166Z"
last_activity: 2026-08-26 — Quick task: package renamed to alamo-windshield-landing-page
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 47
  completed_plans: 46
  percent: 83
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** Users can enter their VIN, instantly see a windshield replacement estimate for their specific vehicle, and book an appointment — removing friction from getting a quote.
**Current focus:** Milestone complete

## Current Position

Phase: Milestone v1.0 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-08-10 — Milestone v1.0 completed and archived

## Performance Metrics

**Velocity:**

- Total plans completed: 46
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 04 | 12 | - | - |
| 05 | 9 | - | - |
| 06 | 7 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Setup: Use `@supabase/ssr` (not deprecated `@supabase/auth-helpers-nextjs`) for all server-side auth
- Setup: Enable RLS on every table at migration time — never defer
- Auth: Use `supabase.auth.getUser()` in middleware (never `getSession()`) — CVE-2025-29927
- VIN: All NHTSA calls through a Route Handler proxy with 6-second timeout + manual fallback
- Booking: Store appointment times as `DATE` + `TIME` columns (not `TIMESTAMPTZ`) to avoid timezone math
- Pricing: Hardcode formula values in `lib/pricing.ts` for v1; `pricing_config` table is a v2 concern
- Admin (Phase 05): `auth.users` IS the admin list (D-05) — no separate roles table in v1
- Admin (Phase 05): `/admin/login` sits OUTSIDE the `(dashboard)` route group so no authenticated chrome can render on it (D-14)
- Admin (Phase 05): middleware is the single owner of the `/admin/*` guard — layouts deliberately do NOT duplicate the redirect, to avoid two enforcement points drifting apart
- Admin (Phase 05): dashboard reads use the RLS-respecting cookie client; only `admin-users-actions.ts` uses the service-role client, and only for `auth.admin.*` calls that require it

### Pending Todos

None yet.

### Blockers/Concerns

- ~~Phase 03 UAT gaps~~ **RESOLVED 2026-08-05.** `03-UAT.md` is `status: complete` — 14 passed, 0 issues, 1 blocked. Both gaps closed and human-verified: the manual-path headline (`c3eb37f`) and the short-viewport card clipping (`2be9a5e` + `0c697f5` + `b31e578`). Phase 03 verification is `status: passed` (12/12).
- **Component-test infrastructure is still deferred.** Two regression tests are specified but unwritten: 03-09 Task 2 (headline/price move together) and an equivalent for the 03-10 clipping fix. Both need `@testing-library/react`, `jsdom` and `@vitejs/plugin-react` — this project has zero component-test infra and all 33 tests are pure-function. Until that decision is made, both behaviours are protected by manual UAT only.
- ~~No Supabase project and no `.env.local` exist~~ **RESOLVED 2026-08-06** (Phase 05 plan 05-01). `.env.local` is present at the repo root with all three keys — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (presence verified by name only; no values read or logged). The live project was already proved in Phase 04's `04-02-SUMMARY.md` with dated HTTP-status and Postgres-error-code evidence. The last remaining gap — zero `auth.users` rows — was closed in 05-01: **count is now 1**, created by the owner in the dashboard for project ref `kyhvgskeihtccylpdkas`. Consequence for 05-09: with exactly 1 admin, D-10's last-admin guard will correctly refuse to remove it, so success criterion 5's removal must be exercised against a second account created via `/admin/users` in 05-08.
- **The D-10 last-admin guard is race-narrowed, NOT race-free.** `removeUserAction` re-reads the admin count immediately before `deleteUser()` (commit `95c459b`, review WR-01), but the Supabase Admin API is not transactional across calls and `auth.users` has no `CHECK`/`TRIGGER` preventing zero rows. Two admins removing each other within the gap between two adjacent API calls can still reach zero admins — recoverable only from the Supabase dashboard under D-08. **Do not describe the D-10 guards as race-free**, and if the admin list ever moves to a table we control, add a DB-level constraint and delete the re-check. A regression test for guard *ordering* is blocked on the deferred component-test infrastructure (review IN-02).
- **`05-PATTERNS.md`'s form pattern is incomplete for redirecting Server Actions.** `BookingForm.tsx` and `ContactForm.tsx` dispatch `formAction(formData)` bare inside react-hook-form's `handleSubmit`, and `05-PATTERNS.md` prescribes copying them. That is safe **only** because `createBooking`/`createContact` return state and never redirect. `loginAction` was the first action in this repo to call `redirect()`, and the bare dispatch made a **successful** login throw `Application error: a client-side exception has occurred` (console: *"An async function with useActionState was called outside of a transition"*) — React cannot drive `redirect()` through the router outside a transition. Fixed in `680656a` by wrapping the dispatch in `startTransition` and merging both pending flags. **Any future form whose action redirects must do the same**; add the caveat to `05-PATTERNS.md` when next edited. Found by human UAT during 05-05's checkpoint — curl-based checks never exercise the authenticated success path.
- ~~**Analytics `event_type` literals need Phase 06 reconciliation.**~~ **RESOLVED 2026-08-07** (plan 06-01). `dashboard-queries.ts` now imports `ANALYTICS_EVENTS` from `src/lib/analytics/events.ts` instead of declaring private consts. A producer/consumer mismatch is now a compile error rather than a silently empty chart. Repo-wide grep confirms no event-type string literal survives outside `events.ts`/`events.test.ts`.

- ~~**Phase 06 runtime verification is HALF DONE**~~ **RESOLVED 2026-08-07.** All four event types confirmed landing in `analytics_events` by direct service-role query. **D-15 (the highest-risk check) PASSES** — the same VIN submitted twice produced two `vin_search` rows, proving BOTH success branches fire (fresh NHTSA decode at `route.ts:156` and `vin_cache` early-return at `route.ts:71`), verified independently via the browser and via curl. D-14 passes (invalid VIN writes no row) and D-04 passes (exactly four event types, no fifth). See `06-05-SUMMARY.md` §"VERIFICATION COMPLETED".

- ~~**Three Phase 06 checks remain unexercised**~~ **ALL THREE RESOLVED 2026-08-07** by invoking the real Server Actions against the live database and diffing table state against a captured baseline. See `06-HUMAN-UAT.md` (`status: complete`, 3/3 passed). (1) **D-11 honeypot PASS** — `createContact` with a non-empty honeypot returned `status: success` (the intended bot-fooling response) and wrote nothing to either `analytics_events` or `contacts`; rejection is at `contact-actions.ts:37`, before any DB call. (2) **D-11 duplicate booking PASS** — `createBooking` against the occupied slot 2026-08-08 10:30 returned non-success and wrote nothing. (3) **NULL-session exclusion PASS** — a real `page_view` row with `session_id = NULL` was inserted; with 5 rows (4 with a session, 1 NULL) the distinct count evaluated to 2, so the NULL row is neither counted as its own visitor nor collapsed into a phantom one. Probe row deleted.

- **Phase 06 review WARNINGS still open** (recorded, not blockers — no fix planned): **WR-01** no length constraint on the client-supplied `session_id`; **WR-03** `PageViewTracker` sets its sessionStorage dedupe marker *before* confirming the insert succeeded, so an ad-blocker permanently suppresses tracking for that path+tab; **WR-04** `track-browser-event.ts:43` discards the `{ error }` value entirely, so PostgREST-level failures are invisible even internally (separable from D-12, which governs *console output*); **WR-06** the misleading `booking-actions.ts:88-92` comment. Full detail in `06-REVIEW.md`.

- **Test data left in the live database from Phase 06 verification:** 1 `contacts` row and **1 `bookings` row occupying a real appointment slot** — remove that booking when convenient. Plus a handful of `analytics_events` rows.

- ~~**THREE CRITICAL defects found by code review of Phase 06**~~ **ALL THREE RESOLVED 2026-08-07** (plan 06-07). Fixes verified independently: the full static gate (`tsc`, `vitest` 132/132 across 14 files, `lint`, `build`) passes under **both** `TZ=UTC` and `TZ=America/Chicago`. The new day-key tests were confirmed to FAIL against the previous logic (a 23:00 Chicago visit on Aug 7 was attributed to Aug 8 by both old code paths under UTC), so they are genuine regression tests. `src/lib/analytics/business-day.ts`'s `businessDayKey()` is now the **single** day definition for the analytics path — do not reintroduce `createdAt.slice(0, 10)` or `format(new Date(ts), 'yyyy-MM-dd')` there. Visitors reads now carry an explicit window + `.order()` + `.limit(VISITOR_ROWS_LIMIT)`, and **saturating the limit surfaces as `{ ok: false }` plus a `console.error`** rather than a silently truncated count. **Note the deliberate semantic change: the Visitors card now counts the trailing `ANALYTICS_WINDOW_DAYS` window, NOT all time** — an all-time count cannot be bounded safely against `max_rows`. Original findings, for reference:
  1. **CR-01 — Visitors metrics silently truncate at 1000 rows.** `supabase/config.toml:18` sets `max_rows = 1000`. PostgREST enforces this server-side and returns **HTTP 200 with a truncated body**, so `.error` is null and the existing error guard never fires. `getSummaryTotals` (`dashboard-queries.ts:95`) has NO time filter and NO limit, so once 1000 lifetime `page_view` rows exist (~200 sessions at 5 views each) the Total Visitors card **freezes permanently**. `getVisitorSeries` has no `.order()`, so its truncated subset is nondeterministic — whole days vanish from the chart at random. This produces exactly the "plausible-but-wrong number" the `{ ok: false }` design exists to prevent.
  2. **CR-02 — Two day-key definitions on one data path.** `getVisitorSeries` dedupes with `createdAt.slice(0, 10)` (**UTC** day) while `bucketByDay` buckets with `format(new Date(ts), 'yyyy-MM-dd')` (**host-local** day), and the business day is America/Chicago — three definitions total. Verified under `TZ=UTC`: a session spanning UTC midnight gets two distinct dedupe keys, **reintroducing the exact double-count inflation plan 06-06 set out to fix**.
  3. **CR-03 — `getServerNow()` has a 5-hour skew on Vercel.** `dashboard-queries.ts:236` feeds Chicago wall-clock parts into `new Date(y, m-1, d, h, m)`, which interprets them in the **host** zone. Its own docstring claims to avoid this anti-pattern; it reintroduces it. Masked locally only because the dev machine is Chicago-set.
  **Deferred durable fix for CR-01:** a Postgres RPC doing `count(distinct session_id)` server-side (`SECURITY INVOKER` to preserve RLS) would remove the `max_rows` ceiling entirely and allow an all-time count again. Deliberately not done — it is a schema change beyond the fix's scope.

  **Discovered while fixing CR-02:** `date-fns`'s `addDays`/`subDays` use host-local `setDate`/`getDate` internally — the same class of bug one level deeper. `bucket-by-day.ts` no longer depends on `date-fns` for day arithmetic. Do not reintroduce it on the analytics path.

- **Phase 06 review WARNING carried forward:** `PageViewTracker` sets its sessionStorage dedupe marker **unconditionally, before confirming the insert succeeded**. An ad-blocker blocking the Supabase host (likely for anything named "analytics") permanently suppresses tracking for that path+tab. Related: `trackBrowserEvent` never destructures `error`, so PostgREST-level failures resolve normally and are invisible even internally — this is separable from decision D-12, which governs *console output*, not discarding the error value.

- **Pre-existing Phase 04 defect surfaced during Phase 06 review (out of scope, not fixed):** `booking-actions.ts:88-92` — a comment asserts "Never read `vehicleDesc` from `formData`" directly above `formData.get('serverVehicleDesc')`. Renaming the key does not make the value server-derived; it bypasses Zod validation entirely. The comment actively misleads.

- **Debugging note: reproduce through the app's real client path before declaring a live-infrastructure defect.** During 06-05 verification a raw-`fetch` probe returned `42501 new row violates row-level security policy`, briefly reported as an RLS defect. It was not: `pg_policies` confirms `public_insert_analytics` (INSERT, role `public`, `WITH CHECK (true)`) is intact, and the identical insert via `@supabase/supabase-js` with the anon key succeeds. The probe was malformed.

- **The Visitors KPI counts distinct browser SESSIONS, not unique people** (plan 06-06, D-08 superseded). A new tab, or the same person returning later, counts again. Rows with `session_id IS NULL` (pre-migration, or visitors whose `sessionStorage` is unavailable) are deliberately EXCLUDED from the count — undercounting, never inflating. **No downstream copy may describe this card as unique visitors.** The NULL-exclusion path is unit-tested but was never exercised against real NULL rows in the live table.

- **This project has a working Supabase CLI migration path — do not hand-paste DDL.** `npx supabase projects list` reports `"linked":true` for `kyhvgskeihtccylpdkas`, and `npx supabase db push --linked` applies migrations in seconds. During 06-06 the operator was routed to the Supabase SQL editor three times without this being checked first; the migration never reached the database until the CLI was used. Check the CLI before asking for manual SQL.
- ~~Stale dev servers / worktrees polluting lint~~ **RESOLVED 2026-08-05.** Killed 3 orphaned Next.js dev servers (ports 3000/3001/3010) and removed all 6 residual worktree directories. Repo-wide `npm run lint` now exits 0 (the ~17k "problems" were stale worktree build output). Dev server is now on the canonical **port 3000**.
- Three orphaned branches remain: `worktree-agent-a17ca78d803571f55`, `worktree-agent-a5c9189c6c6eacb4b`, `worktree-agent-a98f3e38c59ae673e`. The latter two carry commits not on master, but they are superseded duplicate attempts at plans 03-03 and 03-04 — every deliverable (`pricing.ts`, `pricing.test.ts`, `vin.ts`, `vin.test.ts`, `vin-cache.ts`, `supabase/admin.ts`) and both SUMMARY files are confirmed present on master. Left in place rather than force-deleted; safe to `git branch -D` when convenient.
- `workflow.auto_advance` was set to `false` on 2026-08-05 to keep a run scoped to Phase 03. Restore to `true` if chained execution is wanted again.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260805-i19 | Fix double scrollbar on snap-scroll home page | 2026-08-05 | b728ef3 | [260805-i19-fix-double-scrollbar-on-snap-scroll-home](./quick/260805-i19-fix-double-scrollbar-on-snap-scroll-home/) |
| 260809-f01 | Wire NEXT_PUBLIC_SITE_URL into metadataBase + Open Graph (was declared but unused) | 2026-08-09 | 1231c7f | — (fast) |
| 260809-f02 | Swap home background images: hero → windshield technician, estimate → SUV | 2026-08-09 | 8465a6c | — (fast) |
| 260809-f03 | Fix snap-scroll lock on estimate section (overscroll-contain captured the wheel) | 2026-08-09 | 862f4c4 | — (fast) |
| 260809-f04 | Enlarge and center the booking calendar (sm-gated --cell-size override) | 2026-08-09 | 7e14151 | — (fast) |
| 20260826 | Collapse the /admin sidebar behind a hamburger drawer on mobile | 2026-08-26 | 0da1d25 | [20260826-admin-mobile-sidebar](./quick/20260826-admin-mobile-sidebar/) |
| 20260826 | Add a Home link to the admin nav (targets /, not a /home route) | 2026-08-26 | b9100f4 | [20260826-admin-home-link](./quick/20260826-admin-home-link/) |
| 20260826 | Rename 32 component files to kebab-case, rewrite 44 imports | 2026-08-26 | 37c3fcc | [20260826-kebab-case-filenames](./quick/20260826-kebab-case-filenames/) |
| 20260826 | Rename npm package nextjs-scaffold -> alamo-windshield-landing-page | 2026-08-26 | d5ee18e | [20260826-rename-package](./quick/20260826-rename-package/) |

## Session Continuity

Last session: 2026-08-07T15:55:45.677Z
Stopped at: Phase 6 context gathered
Resume file: .planning/phases/06-analytics/06-CONTEXT.md

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
