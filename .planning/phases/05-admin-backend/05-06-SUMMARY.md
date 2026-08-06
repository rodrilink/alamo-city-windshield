---
phase: 05-admin-backend
plan: 06
subsystem: dashboard
tags: [supabase, ssr, rls, dashboard, analytics, server-only]

# Dependency graph
requires:
  - phase: 05-admin-backend
    plan: 03
    provides: bucketByDay/ANALYTICS_WINDOW_DAYS (src/lib/analytics/bucket-by-day.ts), DashboardReadResult/DailyBucket types (src/types/admin.ts)
provides:
  - "src/lib/dashboard/dashboard-queries.ts: all six dashboard reads (getSummaryTotals, getRecentContacts, getUpcomingAppointments, getVisitorSeries, getVinSearchSeries, getContactSeries) plus RECENT_CONTACTS_LIMIT/UPCOMING_APPOINTMENTS_LIMIT"
affects: [05-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dashboard reads execute through the RLS-respecting SSR client (createClient from @/lib/supabase/server), never createAdminClient -- inverts booking-availability.ts's public-flow client choice"
    - "Server-side clock derived via getBusinessNowParts() and reassembled into a Date, never new Date() called at call sites -- extends server-time.ts's existing convention to this module"
    - "Card totals use select('*', { count: 'exact', head: true }) so only counts cross the wire, never row data"

key-files:
  created:
    - src/lib/dashboard/dashboard-queries.ts
  modified: []

key-decisions:
  - "getSummaryTotals treats any one of the four Promise.all count errors as a whole-read failure (returns { ok: false }) rather than partial success, since a dashboard with 3 correct cards and 1 silently-wrong card is worse than an honest full failure"
  - "Added a local getServerNow() helper that derives a Date instant from getBusinessNowParts() rather than calling new Date() directly at each of the three chart-series call sites -- keeps the clock read in one place and matches server-time.ts's server-side-clock discipline"
  - "windowStartIso() reuses date-fns's startOfDay/subDays (already a bucket-by-day.ts dependency) instead of manual Date mutation, keeping the window-start math consistent with bucketByDay's own arithmetic"

requirements-completed: [ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07]

# Metrics
duration: 20min
completed: 2026-08-06
---

# Phase 5 Plan 06: Dashboard Read Module Summary

**Single `server-only` module exporting six Supabase reads (4 mixed-source card totals, 3 daily-bucketed chart series, 2 bounded tables) through the RLS-respecting SSR client, with the D-18 contacts-chart amendment honored exactly.**

## Performance

- **Duration:** 20 min
- **Completed:** 2026-08-06
- **Tasks:** 2 completed
- **Files modified:** 1 (created)

## Accomplishments

- `src/lib/dashboard/dashboard-queries.ts` created with `import 'server-only'` on line 1, importing `createClient` from `@/lib/supabase/server` exclusively — no `createAdminClient` anywhere in executable code
- `getSummaryTotals()` returns the four D-02 mixed-source card totals (`contacts`, `bookings` from real tables; `visitors`, `vinSearches` from `analytics_events`), using head-only exact counts so no row data crosses the wire
- `getRecentContacts()` and `getUpcomingAppointments()` implement the two D-16 bounded table reads against the migration's real column names, using named limit constants (`RECENT_CONTACTS_LIMIT`, `UPCOMING_APPOINTMENTS_LIMIT`, both `= 10`)
- `getVisitorSeries()`, `getVinSearchSeries()`, and `getContactSeries()` implement the three D-03-windowed daily chart series via `bucketByDay`, with `getContactSeries()` correctly implementing the D-18 amendment (reads `contacts`, not `analytics_events`)
- Every function follows the `booking-availability.ts` failure shape: try/catch, explicit `if (error)` branch, `console.error` naming the function, and `{ ok: false }` — never `{ ok: true, data: [] }` from an error branch
- `npx tsc --noEmit`, `npm run lint`, and `npx vitest run` (115/115 tests) all exit 0

## Task Commits

Both tasks were implemented together in a single file build (Task 2's helper functions, `getServerNow`/`windowStartIso`, are shared infrastructure inseparable from Task 1's already-written module), then committed atomically:

1. **Tasks 1 & 2: Dashboard read module (totals, tables, chart series)** - `1a62f2a` (feat)

## Files Created/Modified

- `src/lib/dashboard/dashboard-queries.ts` (NEW, 332 lines) — all six dashboard reads, both D-16 limit constants, the two `event_type` literal constants (`page_view`, `vin_search`), and the `getServerNow`/`windowStartIso` helpers

## Exact Exported Signatures (for plan 05-07)

```typescript
// Constants
export const RECENT_CONTACTS_LIMIT = 10 // D-16
export const UPCOMING_APPOINTMENTS_LIMIT = 10 // D-16

// Types
export interface SummaryTotals { contacts: number; bookings: number; visitors: number; vinSearches: number }
export interface RecentContactRow { created_at: string; name: string; last_name: string; phone: string; address: string | null; vin: string | null; message: string | null }
export interface UpcomingAppointmentRow { appt_date: string; appt_time: string; name: string; last_name: string; phone: string; vehicle_desc: string | null; status: string }

// Functions
export async function getSummaryTotals(): Promise<DashboardReadResult<SummaryTotals>>
export async function getRecentContacts(): Promise<DashboardReadResult<RecentContactRow[]>>
export async function getUpcomingAppointments(): Promise<DashboardReadResult<UpcomingAppointmentRow[]>>
export async function getVisitorSeries(): Promise<DashboardReadResult<DailyBucket[]>>
export async function getVinSearchSeries(): Promise<DashboardReadResult<DailyBucket[]>>
export async function getContactSeries(): Promise<DashboardReadResult<DailyBucket[]>>
```

## Exact `event_type` String Constants (for Phase 6, ANLY-02..06)

- Page-view events: `'page_view'` (module-internal constant `EVENT_TYPE_PAGE_VIEW`, used in `getVisitorSeries` and the visitors count in `getSummaryTotals`)
- VIN-search events: `'vin_search'` (module-internal constant `EVENT_TYPE_VIN_SEARCH`, used in `getVinSearchSeries` and the vinSearches count in `getSummaryTotals`)

These two constants are not exported (they are query-internal, not part of the module's public read API), but Phase 6's writes must use these exact literal strings for `analytics_events.event_type` for the charts and totals built here to light up correctly. `contact_submit` and `booking_created` (also named in ANLY-04/ANLY-05) are not consumed by this module — the contacts chart reads the real `contacts` table per D-18, and no chart in this phase consumes a `booking_created` event.

## Decisions Made

- `getSummaryTotals` fails the whole read if any one of its four parallel counts errors, rather than returning partial data — a dashboard showing 3 correct cards and 1 silently-wrong card would be indistinguishable from a real bug in the wrong card, which is exactly what `DashboardReadResult`'s discriminated failure exists to prevent.
- Added a local `getServerNow()` helper (not in the original plan text, but required by the acceptance criteria's "clock derived through the existing server-time module" requirement) that reassembles a `Date` from `getBusinessNowParts()`'s decomposed parts, rather than reading `Date` directly in each of the three chart-series functions. This required extending the `server-time.ts` import to include `getBusinessNowParts` alongside `getBusinessTodayDateString`, but did not modify `server-time.ts` itself.
- `windowStartIso()` reuses `date-fns`'s `startOfDay`/`subDays` (already imported by `bucket-by-day.ts`) instead of manual `Date` mutation, for consistency with the rest of the D-03 window-math convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inline `new Date()` calls replaced with a server-time-derived clock**
- **Found during:** Task 2, immediately after first draft and before verification
- **Issue:** The first draft of `getVisitorSeries`/`getVinSearchSeries`/`getContactSeries` called `new Date()` directly at each call site to derive "now" for `bucketByDay`. The plan's own acceptance criteria requires `grep -c "new Date()" ... reports 0 outside of the server-time helper call — the clock is derived through the existing server-time module and passed explicitly to bucketByDay`. Calling `new Date()` inline three times violates that criterion and the repo-wide convention (`server-time.ts`, `slots.ts`) of never reading the clock directly outside a single designated helper.
- **Fix:** Added a private `getServerNow()` helper in `dashboard-queries.ts` that derives a `Date` instant from `getBusinessNowParts()` (the existing server-time module) and is called once per function instead of `new Date()`. Also replaced manual `setDate`/`setHours` mutation in the window-start helper with `date-fns`'s `startOfDay`/`subDays`, matching `bucket-by-day.ts`'s own arithmetic style.
- **Files modified:** `src/lib/dashboard/dashboard-queries.ts` (same file, within the same task, before first commit)
- **Commit:** `1a62f2a` (folded into the single task commit — the fix landed before any commit was made, so there is no separate "broken then fixed" commit pair)

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources — every function performs a real Supabase query.

## Threat Flags

None. All five threats this plan's `<threat_model>` assigns to this file (T-05-06-01 through T-05-06-07, excluding the two integration-time ones) are mitigated exactly as specified: RLS-respecting client only, no `select('*')` outside head-only counts, `server-only` fencing, opaque `{ ok: false }` on error, server-derived clock/date boundaries, bounded queries via named constants, and structurally distinct failure vs. empty-result states.

## Issues Encountered

None beyond the `new Date()` deviation documented above, caught and fixed before verification.

## User Setup Required

None — no external service configuration required. This module reads existing tables through the existing SSR client; `.env.local` already contains the Supabase keys per the upstream status note.

## Next Phase Readiness

Plan 05-07 (the dashboard page and its Server/Client Component composition) can import all six functions and both limit constants directly from `@/lib/dashboard/dashboard-queries`. No blockers. The two `event_type` string literals (`page_view`, `vin_search`) are documented above for Phase 6 to reconcile its `analytics_events` writes against.

---
*Phase: 05-admin-backend*
*Completed: 2026-08-06*

## Self-Check: PASSED

`src/lib/dashboard/dashboard-queries.ts` verified present on disk. Commit `1a62f2a` verified present in `git log --oneline`. `npx tsc --noEmit`, `npm run lint`, and `npx vitest run` (115/115 passing) all re-verified exit 0 after the `getServerNow()` fix.
