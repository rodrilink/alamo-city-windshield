---
phase: 06-analytics
plan: 07
subsystem: analytics
tags: [timezone, postgrest, supabase, date-fns, intl-datetimeformat, dashboard]

# Dependency graph
requires:
  - phase: 06-analytics
    provides: analytics_events schema, session-id dedupe, distinct-session visitors KPI (06-06)
provides:
  - Single America/Chicago business-day key (businessDayKey) used by both dedupe and bucketing
  - Bounded, ordered, saturation-detecting visitors reads (getSummaryTotals, getVisitorSeries)
  - Host-timezone-independent getServerNow / windowStartIso
affects: [06-analytics, any future phase touching dashboard-queries.ts or bucket-by-day.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intl.DateTimeFormat with an explicit timeZone (en-CA locale) for host-independent yyyy-MM-dd day keys"
    - "Fixed-millisecond day stepping (getTime() arithmetic) instead of date-fns addDays/subDays, which use host-local setDate/getDate internally"
    - "Saturation detection: returned-rows === limit is treated as possible truncation and surfaced as { ok: false }, never as a silently short count"

key-files:
  created:
    - src/lib/analytics/business-day.ts
    - src/lib/analytics/business-day.test.ts
  modified:
    - src/lib/analytics/bucket-by-day.ts
    - src/lib/analytics/bucket-by-day.test.ts
    - src/lib/dashboard/dashboard-queries.ts

key-decisions:
  - "getSummaryTotals's visitors count changes from all-time to trailing-ANALYTICS_WINDOW_DAYS-window -- an unbounded all-time count cannot be read safely under max_rows = 1000, documented in SummaryTotals's TSDoc"
  - "date-fns addDays/subDays are avoided on the analytics path entirely (they call Date.prototype.setDate/getDate, which is host-local) -- day-stepping uses fixed 24h millisecond arithmetic instead, exported as MILLISECONDS_PER_DAY from bucket-by-day.ts"
  - "windowStartIso parses businessDayKey's output as UTC midnight rather than Chicago midnight, which makes the .gte bound up to one host-Chicago-offset earlier than exact -- deliberately safe because an earlier bound only widens the window, never excludes an in-window event"

patterns-established:
  - "businessDayKey(instant): string is now the ONE day-key function for the visitors analytics path -- any future code touching analytics_events day attribution must use it, not createdAt.slice(0,10) or format(new Date(ts), ...)"

requirements-completed: [ANLY-01, ANLY-02, ADMIN-02, ADMIN-05]

# Metrics
duration: 12min
completed: 2026-08-07
---

# Phase 6 Plan 07: Gap Closure — Business-Day Key, Bounded Visitors Reads, Host-Independent Clock Summary

**Closed three CRITICAL code-review defects (CR-01/CR-02/CR-03) in the visitors analytics path: one Chicago-day key function replacing three disagreeing day definitions, explicit window+order+limit+saturation-detection on both visitors reads, and a `getServerNow` that no longer reconstructs a skewed instant from wall-clock parts.**

## Performance

- **Duration:** ~12 min (first commit 16:41:45 -05:00, last commit 16:52:53 -05:00)
- **Started:** 2026-08-07T21:41:45Z
- **Completed:** 2026-08-07T21:55:19Z
- **Tasks:** 5 (4 code tasks + this summary)
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- Added `businessDayKey()` — the single `America/Chicago` day-key function, derived via `Intl.DateTimeFormat` with an explicit `timeZone`, host-independent by construction
- Routed `bucketByDay`'s count key AND its axis key through `businessDayKey`, eliminating the host-local/UTC-day mismatch and proving (via test) that the two `Map`s still join correctly (non-zero counts land in the right bucket)
- Bounded both visitors reads (`getSummaryTotals`, `getVisitorSeries`) with the existing `ANALYTICS_WINDOW_DAYS` filter, an explicit `.order('created_at', { ascending: false })`, and `.limit(VISITOR_ROWS_LIMIT)`; saturation (`rows.length >= limit`) now returns `{ ok: false }` with a `console.error` instead of a silently truncated count
- Fixed `getServerNow()` to return `new Date()` directly, removing the `new Date(year, month-1, day, hour, minute)` reconstruction that was interpreted in the host timezone (5-hour skew on a UTC host)
- Fixed `windowStartIso` to derive the window boundary from `businessDayKey` + fixed-millisecond stepping instead of `date-fns`' `startOfDay(subDays(...))`, which reads host-local calendar parts internally

## Task Commits

1. **Task 1: Single business-day key (fixes CR-02)** — `9f19d57` (feat)
2. **Task 2: Route bucketing through the business day (fixes CR-02)** — `df75347` (fix)
3. **Task 3: Bound the visitors reads (fixes CR-01)** — `96d57a7` (fix)
4. **Task 4: Fix getServerNow's host-timezone dependency (fixes CR-03)** — `8f1a7d4` (fix)
5. **Task 5: This summary** — committed alongside this file

## Files Created/Modified

- `src/lib/analytics/business-day.ts` — `businessDayKey(instant)`, the one America/Chicago day-key function for this path
- `src/lib/analytics/business-day.test.ts` — proves host-independence, the UTC-midnight-spanning case, and a DST boundary
- `src/lib/analytics/bucket-by-day.ts` — count key and axis key both use `businessDayKey`; axis walk uses fixed-millisecond stepping (`MILLISECONDS_PER_DAY`, now exported); `date-fns` import removed entirely from this module
- `src/lib/analytics/bucket-by-day.test.ts` — added tests proving correct attribution for the 19:00-23:59 Chicago window under `TZ=UTC`, and that non-zero counts still land correctly (guards the Map-join failure mode)
- `src/lib/dashboard/dashboard-queries.ts` — `VISITOR_ROWS_LIMIT` constant; `getSummaryTotals`'s visitor read gains a window/order/limit/saturation check; `getVisitorSeries` gains order/limit/saturation check and switches its dedupe key to `businessDayKey`; `getServerNow` simplified to `new Date()`; `windowStartIso` rewritten to use `businessDayKey` + millisecond stepping; `SummaryTotals`'s TSDoc documents the all-time → windowed semantic change

## Decisions Made

- **Windowed, not all-time, visitors KPI.** `getSummaryTotals`'s visitors count can no longer be an unbounded all-time count — `max_rows = 1000` makes that unboundable. It now applies the same `ANALYTICS_WINDOW_DAYS` window the chart already uses, so the card and chart describe the same period. Documented in `SummaryTotals`'s TSDoc; no user-facing copy currently claims "all-time" (the label is simply "Visitors" with a Phase-6 tracking-hint subtitle), so no copy correction was needed beyond the TSDoc.
- **Fixed-millisecond day stepping over `date-fns` `addDays`/`subDays`.** Inspected `date-fns`' source (`node_modules/date-fns/addDays.cjs`): it calls `_date.setDate(_date.getDate() + amount)`, which is host-local calendar arithmetic — the exact anti-pattern this plan closes elsewhere. Both `bucketByDay`'s axis walk and `windowStartIso` now step by `MILLISECONDS_PER_DAY` (a plain `getTime()` arithmetic constant, exported from `bucket-by-day.ts`) instead.
- **`windowStartIso` parses the day-key as UTC midnight, not Chicago midnight.** This makes the `.gte` boundary up to one UTC-offset hour earlier than the exact Chicago-midnight instant. This is deliberate and documented in the function's TSDoc: an earlier lower bound only ever widens the window, so it cannot exclude an event that belongs in the window — trading a few hours of "window is very slightly wider than exactly N days" for avoiding a second, more complex host-independent-midnight derivation.
- **`getVisitorSeries`'s per-session-per-day dedupe key switches from `createdAt.slice(0, 10)` (UTC) to `businessDayKey(createdAt)`.** This is the direct fix for CR-02 on the `getVisitorSeries` path — the same key `bucketByDay` now uses, so a session cannot produce two dedupe keys by spanning UTC midnight.

## Deviations from Plan

None — plan executed exactly as written. All five tasks matched their `<action>` blocks; no Rule 1-4 auto-fixes were needed beyond what the plan itself specified (the plan's own action blocks already called for the "auto-fix" behavior — e.g. saturation detection, day-key unification — as the primary deliverable, not as an unplanned deviation).

One implementation refinement not explicitly spelled out in the plan text: the plan's CR-02 fix example (in `06-REVIEW.md`) suggested deriving axis days via `date-fns`, but investigation during Task 2 found that `date-fns`' `addDays`/`subDays` use host-local `setDate`/`getDate` internally — reusing them for the axis walk would have reintroduced a host-timezone dependency into the very fix meant to remove one. Switched to fixed-millisecond stepping instead. This is a faithful implementation of the plan's stated constraint ("no `new Date(y, m, d, ...)` wall-clock reconstruction remains on the analytics path" — success criterion 6) rather than a deviation from it.

## Issues Encountered

None requiring escalation. The `date-fns` host-local-arithmetic finding above was investigated and resolved within Task 2/Task 4 without needing a plan change.

## Findings Addressed (by ID)

### CR-01 — Visitors KPI/chart silent truncation at `max_rows`

**Closed.** Both `getSummaryTotals`'s visitors read and `getVisitorSeries` now carry:
- The existing `ANALYTICS_WINDOW_DAYS` `.gte('created_at', windowStartIso(now))` filter (previously `getSummaryTotals` had NO time filter at all)
- An explicit `.order('created_at', { ascending: false })` (previously `getVisitorSeries` had none, making any PostgREST truncation an arbitrary physical-order subset)
- An explicit `.limit(VISITOR_ROWS_LIMIT)` set to `supabase/config.toml`'s configured `max_rows` (1000)

Saturation (`rows.length >= VISITOR_ROWS_LIMIT`) is detected in both functions and returns `{ ok: false }` with a `console.error` naming the limit and the returned count — never a silently truncated number. **Deliberate semantic change, recorded:** `getSummaryTotals`'s visitors count is now "distinct sessions in the trailing window," not "distinct sessions ever" — documented in `SummaryTotals`'s TSDoc. The durable fix (a Postgres RPC doing `count(distinct session_id)` server-side with `SECURITY INVOKER`, per `06-REVIEW.md`'s suggested migration) is recorded as deliberately deferred in a comment on `VISITOR_ROWS_LIMIT` — it removes the cap entirely by never transferring row data, but is a schema change out of scope for this gap-closure plan.

### CR-02 — Three day definitions on one data path

**Closed.** `businessDayKey()` (`src/lib/analytics/business-day.ts`) is now the single `America/Chicago` day-key function. Both `getVisitorSeries`'s per-session-per-day dedupe key and `bucketByDay`'s count-key/axis-key pair use it exclusively; `createdAt.slice(0, 10)` (UTC) and `format(new Date(ts), 'yyyy-MM-dd')` (host-local) no longer appear anywhere on this path.

**Evidence a UTC-midnight-spanning session counts once:** `business-day.test.ts`'s test `'produces the same key for a UTC-midnight-spanning instant at both ends, proving it counts once'` asserts `businessDayKey('2026-08-07T23:50:00Z') === businessDayKey('2026-08-08T00:10:00Z')` — both resolve to `'2026-08-07'` (18:50 and 19:10 Chicago the same evening). Passes under both `TZ=UTC` and `TZ=America/Chicago`.

**Evidence the chart's Map-join does not silently regress to all-zeros:** `bucket-by-day.test.ts`'s test `'does NOT render an all-zero series when timestamps are present'` asserts that three timestamps spread across the window produce `totalCount === timestamps.length` (not 0) — this is the specific regression `T-06-07-04` in the threat register calls out, and it is now covered.

**Evidence of correct 19:00-23:59 Chicago attribution under TZ=UTC:** `bucket-by-day.test.ts`'s test `'attributes a timestamp in the 19:00-23:59 Chicago evening window to the Chicago day, not the next UTC day'` asserts `2026-08-11T04:30:00.000Z` (23:30 Chicago on Aug 10) lands in the `2026-08-10` bucket with count 1, and the `2026-08-11` bucket stays 0.

### CR-03 — `getServerNow` skewed by host UTC offset

**Closed.** `getServerNow()` now returns `new Date()` directly — no wall-clock-parts reconstruction. Reproduced the pre-fix bug analytically to confirm the review's reported skew and confirm the fix: for the instant `2026-08-07T04:30:00Z`, the OLD implementation (`new Date(year, month-1, day, hour, minute)` fed with Chicago parts) produced `2026-08-06T23:30:00.000Z` under a `TZ=UTC` host — a 5-hour skew matching `06-REVIEW.md`'s own reproduction exactly. The NEW implementation produces `2026-08-07T04:30:00.000Z` (the real instant), zero skew, by construction.

**Window boundary agreement under both timezones:** computed `windowStartIso(new Date())` under `TZ=UTC` and `TZ=America/Chicago` in the same second — both produced `2026-07-09T00:00:00.000Z` for a `now` of `2026-08-07T21:5x` on that date, confirming the boundary is host-timezone independent.

`windowStartIso` was also rewritten (previously `startOfDay(subDays(now, ...))` via `date-fns`, which reads `now`'s HOST-local calendar day) to derive the boundary from `businessDayKey` plus fixed-millisecond stepping — closing the same class of host-dependency on the window-start side, not just `getServerNow` itself.

## Static Gate — Recorded Under Both Timezones

| Check | TZ=UTC | TZ=America/Chicago |
|---|---|---|
| `npx tsc --noEmit` | Pass | Pass |
| `npx vitest run` | Pass — 132/132 tests, 14/14 files | Pass — 132/132 tests, 14/14 files |
| `npm run lint` | Pass (no eslint errors) | Pass (no eslint errors) |
| `npm run build` | Pass — compiled successfully, 12/12 static pages generated | Pass — compiled successfully, 12/12 static pages generated |

A pass under only the developer's local zone is exactly how CR-02 and CR-03 went unnoticed originally (the review report notes the defects were masked on a Chicago-set dev machine, skew = 0) — both timezones are recorded here specifically to guard against that recurrence.

## Still-Open Review Findings (Not Addressed by This Plan)

Recorded explicitly, not silently dropped, per the plan's Task 5 requirement:

- **WR-01** — `session_id` is client-controlled with no length/format bound (unbounded-write vector against the public `WITH CHECK (true)` insert policy). Not touched.
- **WR-02** — the composite index (`event_type, created_at, session_id`) does not serve either the CR-01 RPC's intended `count(distinct session_id)` query or the current windowed reads well. Not touched — the RPC itself is deferred, so its supporting index is deferred with it.
- **WR-03** — `PageViewTracker` writes its `sessionStorage` dedupe marker before confirming the insert succeeded, permanently losing events on any failure (ad-blocker, offline, 5xx). Not touched.
- **WR-04** — `trackBrowserEvent` never inspects the `{ error }` value PostgREST resolves with, so failures are unobservable even internally (blocks WR-03's fix). Not touched.
- **WR-05** — the honeypot rejection path in `booking-actions.ts`/`contact-actions.ts` is timing-distinguishable from the real success path, leaking the bot-detection signal. Not touched.
- **WR-06** — `booking-actions.ts`'s `serverVehicleDesc` is read from client `FormData` despite a comment claiming it is server-derived; pre-existing Phase 4 code, out of scope for this Phase 6 analytics plan.
- **IN-01 through IN-04** — untyped Supabase client assertions, a discarded-but-correct `Set` allocation (subsumed by CR-01's deferred RPC), a taxonomy test gap, and two minor test-reliability gaps in `session-id.test.ts`. Not touched.

**Visitors card semantics changed — flagged for downstream awareness:** any future copy, documentation, or dashboard description that refers to the "Visitors" card as an all-time total is now incorrect. It counts distinct sessions in the trailing `ANALYTICS_WINDOW_DAYS`-day window (currently 30 days), matching the chart directly above it. The current UI label ("Visitors") and its Phase-6 tracking-hint subtitle do not themselves claim "all-time," so no immediate UI text change was required — the correction is captured here and in `SummaryTotals`'s TSDoc for any future reader.

## User Setup Required

None — no external service configuration required. No new environment variables, no migration files added (the CR-01 RPC fix that would require a migration was deliberately deferred, per the plan).

## Next Phase Readiness

- All three CRITICAL findings from `06-REVIEW.md` are closed and proven by tests written to fail against the pre-fix code.
- The remaining WR-*/IN-* findings above are still open and unaddressed by any plan in this phase to date — a future gap-closure plan (or a decision to accept them) is needed before Phase 6 is considered fully clean.
- The durable CR-01 fix (Postgres RPC + supporting index, closing WR-02 alongside it) remains a good candidate for a follow-up plan if visitor volume approaches the `VISITOR_ROWS_LIMIT` bound in practice.

---

## Self-Check

- `src/lib/analytics/business-day.ts` — FOUND
- `src/lib/analytics/business-day.test.ts` — FOUND
- `src/lib/analytics/bucket-by-day.ts` (modified) — FOUND
- `src/lib/analytics/bucket-by-day.test.ts` (modified) — FOUND
- `src/lib/dashboard/dashboard-queries.ts` (modified) — FOUND
- Commit `9f19d57` — FOUND
- Commit `df75347` — FOUND
- Commit `96d57a7` — FOUND
- Commit `8f1a7d4` — FOUND

## Self-Check: PASSED

---
*Phase: 06-analytics*
*Completed: 2026-08-07*
