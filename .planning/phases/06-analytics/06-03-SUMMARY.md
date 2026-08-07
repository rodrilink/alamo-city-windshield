---
phase: 06-analytics
plan: 03
subsystem: analytics
tags: [supabase, nextjs, typescript, vitest, analytics-events, vin]

# Dependency graph
requires:
  - phase: 06-analytics
    provides: "06-01's ANALYTICS_EVENTS/AnalyticsEventType contract and trackServerEvent/trackBrowserEvent helpers"
provides:
  - "src/app/api/vin/[vin]/route.ts fires ANALYTICS_EVENTS.VIN_SEARCH on both of its success return paths (cache hit and post-NHTSA decode), feeding the ADMIN-04 VIN-search chart"
affects: [06-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Awaited tracking call placed immediately before each success return in a Route Handler that already owns the outcome decision -- no new branching, no re-derivation of state"

key-files:
  created: []
  modified:
    - src/app/api/vin/[vin]/route.ts

key-decisions:
  - "Both success branches (vin_cache hit early-return at Step 2, post-NHTSA decode at Step 5) fire the identical await trackServerEvent(ANALYTICS_EVENTS.VIN_SEARCH, { vin }) call, per D-15 -- cache hits are real user searches and must not be excluded"
  - "The normalized const vin (rawVin.trim().toUpperCase(), validated past isValidVin) is used at both call sites, never cached.vin or vehicle.vin, closing threat T-06-03-01"
  - "No call added to the invalid, unreachable, or not-found branches (D-14), and none added to book/page.tsx's separate server-side re-decode (D-16)"

patterns-established: []

requirements-completed: [ANLY-03, ANLY-06]

# Metrics
duration: 12min
completed: 2026-08-07
---

# Phase 6 Plan 3: VIN-Search Event Tracking Summary

**`vin_search` now fires from both success return points of `/api/vin/[vin]` -- the `vin_cache` hit early-return and the post-NHTSA decode -- so the ADMIN-04 chart counts every successful search rather than under-counting as caching improves.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-07T17:32:00Z (approx, per session context)
- **Completed:** 2026-08-07T17:44:16Z
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments

- Added `await trackServerEvent(ANALYTICS_EVENTS.VIN_SEARCH, { vin })` immediately before the `vin_cache` hit early-return's `NextResponse.json({ ..., cached: true })` (line 71, inside the `if (!Number.isNaN(modelYear))` block) -- the branch D-15 warns is easy to miss.
- Added the identical call immediately before the post-NHTSA success return's `NextResponse.json({ ..., cached: false })` (line 156), after the `vehicle` object is built.
- Both calls use the file's existing normalized `const vin` (line 29, `rawVin.trim().toUpperCase()`), never `cached.vin`/`vehicle.vin`, keeping only `isValidVin`-validated 17-character values on the write path (closes threat T-06-03-01).
- Left the `invalid` (line ~32), `unreachable` (line ~101), and `not-found` (line ~115) branches untouched -- no tracking call precedes or appears within any of them.
- Left `src/app/(public)/book/page.tsx` completely unmodified (D-16) -- confirmed 0 occurrences of `trackServerEvent` in that file.
- Every response body, `satisfies VinLookupResponse` assertion, and HTTP status code is byte-identical to before; only two `await` statements and two explanatory comments were inserted.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fire vin_search in both success branches of the VIN route** - `7c31dc4` (feat)

**Plan metadata:** committed alongside this SUMMARY (worktree mode -- orchestrator merges and finalizes STATE.md/ROADMAP.md centrally)

## Files Created/Modified

- `src/app/api/vin/[vin]/route.ts` - Added `import { trackServerEvent } from '@/lib/analytics/track-event'` and `import { ANALYTICS_EVENTS } from '@/lib/analytics/events'`; inserted one awaited `trackServerEvent(ANALYTICS_EVENTS.VIN_SEARCH, { vin })` call before each of the route's two success `return`s (final line numbers: **71** for the cache-hit branch, **156** for the post-NHTSA branch); added a comment at each site naming the governing decision (D-15 at the cache-hit site, explicitly warning that excluding cache hits would make the ADMIN-04 chart drop as caching improves; D-13/D-14 at the post-NHTSA site).

## Insertion Point Evidence (per plan's `<output>` requirement)

| Branch | Final line of tracking call | Fires? | Confirmed by |
|---|---|---|---|
| `vin_cache` hit early-return (`cached: true`, Step 2) | 71 | **YES** (D-15) | `node -e` check: tracking call index < `'cached: true'` index → `true` |
| Post-NHTSA success (`cached: false`, Step 5) | 156 | **YES** | `node -e` check: tracking call index < `'cached: false'` index (searched from that call onward) → `true` |
| `'invalid'` (~line 32) | n/a | **NO** | No `trackServerEvent` call precedes or is inside this branch; branch source unchanged |
| `'unreachable'` (~line 101) | n/a | **NO** | `node -e` check: no `trackServerEvent` match in slice between `'unreachable'` and `'not-found'` string indices → `false` |
| `'not-found'` (~line 115) | n/a | **NO** | Same slice check above covers this boundary; branch source unchanged |
| `src/app/(public)/book/page.tsx` re-decode (D-16) | n/a | **NO** | `grep -c "trackServerEvent" "src/app/(public)/book/page.tsx"` → `0`; file not modified |

## Decisions Made

- No deviations from the plan's specified insertion points, call signature, or comment content -- implemented exactly as `06-PATTERNS.md`'s pre-quoted target shape and the plan's `<action>` block specify.
- Used `{ vin }` only at both call sites (no `page` field), consistent with D-02's rule that `vin_search` events fill only the `vin` column and leave `metadata` null.

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria were verified command-by-command and passed on the first implementation pass; no auto-fixes were required.

## Verification Results

- `npx tsc --noEmit` -- exits 0.
- `npx vitest run` -- **12 test files, 120 tests, all passing** (no regressions from the pre-existing 06-01 baseline).
- `npx eslint "src/app/api/vin/[vin]/route.ts"` -- exits 0.
- `grep -c "await trackServerEvent(ANALYTICS_EVENTS.VIN_SEARCH" "src/app/api/vin/[vin]/route.ts"` -- `2`.
- `grep -c "^\s*trackServerEvent\|void trackServerEvent" "src/app/api/vin/[vin]/route.ts"` -- `0` (no un-awaited call).
- Cache-hit-precedes-tracking check and post-NHTSA-precedes-tracking check -- both `true`.
- Unreachable/not-found slice check for stray tracking calls -- `false` (none present).
- `grep -c "'vin_search'" "src/app/api/vin/[vin]/route.ts"` -- `0` (no hardcoded literal; only the imported `ANALYTICS_EVENTS.VIN_SEARCH` constant is used).
- `grep -c "trackServerEvent" "src/app/(public)/book/page.tsx"` -- `0` (D-16 untouched).
- `grep -c "console.error('VIN decode unreachable'" "src/app/api/vin/[vin]/route.ts"` -- `1` (diagnostic survives, unconfused with the tracking call).
- Repo-wide `grep -rc "ANALYTICS_EVENTS.VIN_SEARCH" src/ --include=*.ts --include=*.tsx | grep -v ":0"` -- `src/app/api/vin/[vin]/route.ts:2`, `src/lib/dashboard/dashboard-queries.ts:2` (the two read-side `.eq()` call sites from 06-01's refactor). `src/lib/analytics/events.ts` does not appear in this specific grep because it *defines* `VIN_SEARCH` as a bare object property, not as a `ANALYTICS_EVENTS.VIN_SEARCH` reference -- consistent with expectations.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `vin_search` events now land from both real-world code paths a user can trigger (`EstimateSection.tsx` and `ContactVinSearch.tsx`, both of which `fetch('/api/vin/...')`).
- End-to-end row-landing evidence (requesting the same VIN twice -- first `cached: false`, then `cached: true` -- and confirming both produce a row) is deferred to plan 06-05 per this plan's own `<verification>` step 6.
- No blockers for 06-05's end-to-end verification pass.

## Self-Check: PASSED

- FOUND: `src/app/api/vin/[vin]/route.ts`
- FOUND: `.planning/phases/06-analytics/06-03-SUMMARY.md`
- FOUND commit: `7c31dc4`

---
*Phase: 06-analytics*
*Completed: 2026-08-07*
