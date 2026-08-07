---
phase: 06-analytics
plan: 01
subsystem: analytics
tags: [supabase, nextjs, typescript, vitest, analytics-events]

# Dependency graph
requires:
  - phase: 05-admin-backend
    provides: "dashboard-queries.ts read layer (getSummaryTotals, getVisitorSeries, getVinSearchSeries) and bucket-by-day.ts, built to be filled by Phase 6 with no chart-code change"
provides:
  - "src/lib/analytics/events.ts — ANALYTICS_EVENTS const + AnalyticsEventType union, the D-01 single source of truth for all four event_type strings"
  - "src/lib/analytics/track-event.ts — trackServerEvent and trackBrowserEvent, the awaited-and-swallowed insert helpers every Phase 6 write site consumes"
  - "dashboard-queries.ts refactored to import ANALYTICS_EVENTS, closing the STATE.md producer/consumer reconciliation blocker"
affects: [06-02, 06-03, 06-04, 06-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Named-const-over-inline-literal for domain string enums (ANALYTICS_EVENTS mirrors ANALYTICS_WINDOW_DAYS/RECENT_CONTACTS_LIMIT convention)"
    - "Awaited-and-swallowed non-blocking write: await the insert, log-or-silence on failure, never surface to caller (D-10)"
    - "Dual Supabase client selection by execution context (admin client server-side, anon client browser-side)"

key-files:
  created:
    - src/lib/analytics/events.ts
    - src/lib/analytics/track-event.ts
    - src/lib/analytics/events.test.ts
  modified:
    - src/lib/dashboard/dashboard-queries.ts

key-decisions:
  - "ANALYTICS_EVENTS values are byte-identical to dashboard-queries.ts's pre-existing private consts (page_view, vin_search) so the Task 4 refactor is a like-for-like swap, not a behavior change"
  - "AnalyticsEventType is derived via indexed access over ANALYTICS_EVENTS's values, not hand-written, so the type cannot drift from the object"
  - "trackServerEvent and trackBrowserEvent both return Promise<void> unconditionally — neither branches the caller on success/failure, per ANLY-06's non-blocking contract"
  - "track-event.ts carries no import 'server-only' fence (it must reach the browser bundle for trackBrowserEvent); trackServerEvent's exposure risk is closed structurally because createAdminClient's own server-only fence in admin.ts already fails the build on an accidental client import"

patterns-established:
  - "Event-type contract module: a `const ... as const` object plus a derived union type, TSDoc-commented per member with the requirement ID it serves"
  - "Split write path by execution context (D-09): browser writes use the anon client under permissive RLS, server writes use the admin client — no shared Route Handler in between"

requirements-completed: [ANLY-01, ANLY-06]

# Metrics
duration: 15min
completed: 2026-08-07
---

# Phase 6 Plan 1: Analytics Event Contract & Tracking Helpers Summary

**Shared `ANALYTICS_EVENTS` const/type contract plus `trackServerEvent`/`trackBrowserEvent` awaited-and-swallowed Supabase insert helpers, with `dashboard-queries.ts` refactored to import the same constants it used to hardcode — closing the STATE.md silent-failure blocker at the TypeScript compile-error level.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-07T17:27:02Z (per STATE.md `last_updated`; task execution began after context load)
- **Completed:** 2026-08-07T17:35:43Z
- **Tasks:** 4 completed
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- Created `src/lib/analytics/events.ts` exporting `ANALYTICS_EVENTS` (exactly four members: `page_view`, `vin_search`, `contact_submit`, `booking_created`) and the derived `AnalyticsEventType` union — the D-01 single source of truth.
- Pinned all four string values and the closed four-member taxonomy in a pure-function `vitest` suite (`events.test.ts`) — a fifth member or a changed string now fails CI loudly.
- Created `src/lib/analytics/track-event.ts` exporting `trackServerEvent` (service-role client, logs failures, D-10/D-12) and `trackBrowserEvent` (anon client, silent on failure, D-12) — both `Promise<void>`, neither surfaces failure to its caller.
- Refactored `src/lib/dashboard/dashboard-queries.ts` to import `ANALYTICS_EVENTS` instead of declaring two private, un-exported `EVENT_TYPE_*` consts — **this closes the STATE.md blocker "Analytics `event_type` literals need Phase 06 reconciliation."** A producer/consumer string mismatch is now a `tsc` compile error, not a silently empty ADMIN-02/ADMIN-04 chart.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the event-type contract module** - `1bc8dd7` (feat)
2. **Task 2: Pin the four event-type string values with a pure-function test** - `079dc0b` (test)
3. **Task 3: Create the dual-client tracking helpers** - `494a29e` (feat)
4. **Task 4: Reconcile dashboard-queries.ts to the shared contract** - `72b7040` (fix)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — orchestrator merges and finalizes STATE.md/ROADMAP.md centrally)

## Files Created/Modified

- `src/lib/analytics/events.ts` - `ANALYTICS_EVENTS` const object (`as const`) and derived `AnalyticsEventType` union; module-header comment explains the no-`server-only`-fence rationale and D-04's closed taxonomy.
- `src/lib/analytics/track-event.ts` - `trackServerEvent(eventType, fields?)` via `createAdminClient()`, and `trackBrowserEvent(eventType, fields?)` via `createClient()`; both insert into `analytics_events` leaving `metadata` null (D-02).
- `src/lib/analytics/events.test.ts` - Five pure-function assertions: four value pins plus one taxonomy-length pin.
- `src/lib/dashboard/dashboard-queries.ts` - Removed `EVENT_TYPE_PAGE_VIEW`/`EVENT_TYPE_VIN_SEARCH` private consts and their TSDoc; added `import { ANALYTICS_EVENTS } from '@/lib/analytics/events'`; replaced all four `.eq('event_type', ...)` call sites across `getSummaryTotals`, `getVisitorSeries`, `getVinSearchSeries`; updated three stale TSDoc comments that assumed Phase 6 had not yet shipped the write side.

## Fixed Signatures for Downstream Plans (06-02, 06-03, 06-04)

```typescript
export async function trackServerEvent(
    eventType: AnalyticsEventType,
    fields?: { page?: string; vin?: string }
): Promise<void>

export async function trackBrowserEvent(
    eventType: AnalyticsEventType,
    fields?: { page?: string }
): Promise<void>
```

Both imported from `@/lib/analytics/track-event`. `ANALYTICS_EVENTS` and `AnalyticsEventType` imported from `@/lib/analytics/events`. Do not change these signatures without updating all three downstream write-site plans.

## Decisions Made

- No deviations from the plan's specified signatures, file layout, or event-value strings — Task 1's four literals were verified byte-identical to `dashboard-queries.ts`'s pre-existing `EVENT_TYPE_PAGE_VIEW`/`EVENT_TYPE_VIN_SEARCH` values before the Task 4 refactor, satisfying the plan's explicit compile-and-grep verification gates.
- Followed 06-PATTERNS.md's style note: new `src/lib/` files use 4-space indentation, single quotes, no trailing statement semicolons, matching `bucket-by-day.ts` and `dashboard-queries.ts`.

## Deviations from Plan

None - plan executed exactly as written. All four tasks' acceptance criteria were verified command-by-command (`npx tsc --noEmit`, `npx vitest run`, `npx eslint`, and the plan's `grep`/`node -e` literal-isolation checks) and all passed on the first implementation pass; no auto-fixes were required.

One verification-harness note (not a code deviation): the plan's suggested one-liner check `node -e "...s.indexOf('trackBrowserEvent')...console.log(/console\./.test(s.slice(i)))"` returns `true` against the shipped file because the module-header comment mentions the identifier `trackBrowserEvent` in prose before the function declaration itself, so the slice captures `trackServerEvent`'s own (correct, required) `console.error` calls first. Re-running the same check anchored on `export async function trackBrowserEvent` (the actual function boundary) returns `false`, confirming the function body itself has zero `console.` calls, satisfying D-12's silent-browser-catch requirement. Documented here for the phase verifier's awareness; no code change was needed.

## Issues Encountered

None.

## STATE.md Blocker Closure

**Closed:** "Analytics `event_type` literals need Phase 06 reconciliation."

`dashboard-queries.ts` previously hardcoded `'page_view'` and `'vin_search'` as private, un-exported consts with no producer yet writing those rows. This plan created the producer-side contract (`events.ts`) first, verified its four literal values were byte-identical to the pre-existing consumer consts, then refactored the consumer to import from that same contract. Repo-wide grep confirms: `grep -rl "'page_view'" src/ --include=*.ts --include=*.tsx` returns exactly `src/lib/analytics/events.ts` and `src/lib/analytics/events.test.ts` — no other file declares an event-type string literal. A future mismatch between any Phase 6 write site and the dashboard read layer is now structurally impossible without a `tsc` failure.

## Test Count

`npx vitest run` — **12 test files, 120 tests, all passing** (11 pre-existing files / 115 tests + `events.test.ts`'s 1 file / 5 tests). `npx tsc --noEmit` exits 0. `npx eslint src/lib/analytics src/lib/dashboard` exits 0.

## User Setup Required

None - no external service configuration required. No new dependency was installed (confirmed by 06-CONTEXT.md: `recharts` and all other dependencies were already present).

## Next Phase Readiness

- Plans 06-02 (VIN search tracking), 06-03 (contact/booking tracking), and 06-04 (page-view tracking) can now import `trackServerEvent`/`trackBrowserEvent` and `ANALYTICS_EVENTS` with fixed, verified signatures.
- No blockers. The dashboard read layer and the write-side contract are reconciled at the type level; downstream plans need only call the two helpers at their respective D-11/D-13/D-14/D-15/D-05 insertion points per 06-PATTERNS.md.

## Self-Check: PASSED

- FOUND: `src/lib/analytics/events.ts`
- FOUND: `src/lib/analytics/track-event.ts`
- FOUND: `src/lib/analytics/events.test.ts`
- FOUND: `src/lib/dashboard/dashboard-queries.ts`
- FOUND: `.planning/phases/06-analytics/06-01-SUMMARY.md`
- FOUND commit: `1bc8dd7`
- FOUND commit: `079dc0b`
- FOUND commit: `494a29e`
- FOUND commit: `72b7040`
- FOUND commit: `b832ca6`
