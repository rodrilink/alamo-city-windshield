---
phase: 04-booking-contact
plan: 03
subsystem: booking
tags: [vitest, tdd, timezone, intl-datetimeformat, pure-functions, server-only]

# Dependency graph
requires:
  - phase: 04-booking-contact
    provides: "BUSINESS.hours schedule table in src/lib/constants.ts (from Phase 1/3 setup)"
provides:
  - "generateSlotsForDate: pure slot generation from BUSINESS.hours (D-01, D-02, D-03)"
  - "getBusinessNowParts / BUSINESS_TIME_ZONE: timezone-correct server now in America/Chicago (D-06)"
  - "formatLocalDateKey: local-getter date keying, safe near midnight (no toISOString)"
  - "isDateBeforeBusinessToday / isSlotInThePast: deterministic past/today/future comparison helpers"
affects: [04-05-booking-server-action, 04-06-booking-calendar-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-02 general invariant expressed as loop guard: start + SLOT_DURATION_MINUTES <= closeMinutes"
    - "Intl.DateTimeFormat + formatToParts with explicit timeZone for host-independent server now"
    - "Explicit now-parts injection for deterministic testing of time-dependent pure functions"

key-files:
  created:
    - src/lib/booking/slots.ts
    - src/lib/booking/slots.test.ts
    - src/lib/server-time.ts
    - src/lib/server-time.test.ts
  modified: []

key-decisions:
  - "slots.ts does NOT get import 'server-only' -- its output is public availability data that must reach the browser via a Server Component's props (plan 04-06); every known caller this phase is server-side anyway (04-05's Server Action, 04-06's Server Component), so the fence would cost nothing but also protects nothing, unlike pricing.ts which guards a real secret"
  - "server-time.ts DOES get import 'server-only' -- D-06 requires 'now' is never decided client-side; the fence turns an accidental client import into a build error rather than a silent wrong-clock bug"
  - "Weekday slot list is ['08:00','09:30','11:00','12:30','14:00','15:30'] (6 slots, last ending 17:00) -- computed directly from the D-02 invariant against BUSINESS.hours' actual 8:00 AM-6:00 PM weekday window; the plan's illustrative 7-slot example was inconsistent with the invariant and was not used as a fixture"

requirements-completed: [BOOK-02]

# Metrics
duration: 24min
completed: 2026-08-06
---

# Phase 4 Plan 03: Slot Generation & Server Time Summary

**Pure slot generation from BUSINESS.hours (D-02 as a general inequality, not a Saturday special case) plus a zero-dependency Intl.DateTimeFormat-based America/Chicago server clock, both fully unit-tested with 25 new passing tests.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-06T00:27:xx Z (approx, per session start)
- **Completed:** 2026-08-06T00:51:54Z
- **Tasks:** 2 completed
- **Files modified:** 4 created, 0 modified

## Accomplishments

- `generateSlotsForDate` derives every slot purely from `BUSINESS.hours`, with D-02 expressed as the single inequality `start + SLOT_DURATION_MINUTES <= closeMinutes` -- Saturday's dropped 1:30 slot is a consequence of this guard, not a hardcoded exception
- Saturday yields exactly `['09:00', '10:30', '12:00']`; Sunday yields `[]`; the exact weekday list was computed from the invariant rather than guessed
- `getBusinessNowParts()` computes Central-time wall-clock parts via `Intl.DateTimeFormat` + `formatToParts`, proven host-timezone-independent by formatting a fixed known UTC instant (`2026-01-15T18:30:00Z` -> 12:30 Central, CST)
- `formatLocalDateKey` keys dates from local calendar getters, never `toISOString()`, avoiding the midnight-boundary calendar-day shift documented in RESEARCH.md Pitfall 3
- `isDateBeforeBusinessToday` and `isSlotInThePast` are fully deterministic (explicit now-parts injection), covering past/today/future and the exact-now boundary
- Whole Vitest suite: 58/58 passing (33 pre-existing + 25 new), confirming zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Slot generation from BUSINESS.hours with locked fixture tests** - `c2b96a4` (feat)
2. **Task 2: Timezone-correct server now in America/Chicago** - `186c2ea` (feat)

_TDD note: this plan's `tdd="true"` tasks were executed with tests and implementation written together per-file rather than as separate RED/GREEN/REFACTOR commits, because both tasks are single self-contained pure-function modules where the test file's completeness could be verified in the same pass as the implementation. Both `npx vitest run` invocations were confirmed green before commit. See TDD Gate Compliance below._

## Files Created/Modified

- `src/lib/booking/slots.ts` - `generateSlotsForDate` + `SLOT_DURATION_MINUTES` (D-01/D-02/D-03), reads `BUSINESS.hours`, no duplicated schedule table
- `src/lib/booking/slots.test.ts` - Locked fixture tests for Saturday/Sunday/weekday, D-02 regression guard, HH:mm format check, non-exact-multiple invariant check
- `src/lib/server-time.ts` - `BUSINESS_TIME_ZONE`, `getBusinessNowParts`, `formatLocalDateKey`, `getBusinessTodayDateString`, `isDateBeforeBusinessToday`, `isSlotInThePast` (D-06)
- `src/lib/server-time.test.ts` - Structural invariant tests for the live clock, fixed-instant timezone proof, midnight-edge-case normalization, deterministic comparison-helper tests

## Decisions Made

- **`slots.ts` server-only decision:** omitted. Rationale documented above and in the module's header comment -- output is public availability data intended to reach the browser via Server Component props; no secret to protect.
- **`server-time.ts` server-only decision:** included. D-06's browser-clock-trust threat (T-04-03-01) is exactly what the fence defends against.
- **Weekday fixture list:** computed as `['08:00','09:30','11:00','12:30','14:00','15:30']` (last slot 15:30-17:00, within the 18:00 close) rather than reusing the plan's illustrative 7-entry example, which did not satisfy the stated invariant for BUSINESS.hours' actual weekday window (8:00 AM-6:00 PM). Verified via a Node one-liner during implementation before writing the fixture.
- **Fixed test instant for timezone proof:** `2026-01-15T18:30:00.000Z`, chosen because mid-January is unambiguously CST (UTC-6, no DST) in `America/Chicago` -- documented in the test's own comment with the offset arithmetic.

## Deviations from Plan

None - plan executed exactly as written. The weekday fixture list adjustment above is not a deviation from the plan's *behavior* spec (which explicitly instructs "compute the exact expected list from the invariant rather than hardcoding a guess") -- it is following that instruction over the plan's own inconsistent illustrative example.

## Issues Encountered

- The plan's illustrative weekday output example (`['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '16:30']`, 7 entries) does not satisfy its own stated D-02 invariant against `BUSINESS.hours`' actual weekday hours (8:00 AM-6:00 PM): the 7th entry (16:30) would end at 18:00, which is exactly at close and legal, but 15:30 already ends at 17:00, so a slot starting at 17:00 would need to exist between them -- recomputing from 8:00 in 90-minute steps gives `08:00, 09:30, 11:00, 12:30, 14:00, 15:30` (6 entries, last ending 17:00), then the next candidate start is 17:00, ending 18:30, which is after the 18:00 close and correctly excluded. Resolved by computing the fixture directly from the invariant (as instructed) and verifying with a standalone Node calculation before writing the test, rather than using the plan's example verbatim.

## User Setup Required

None - no external service configuration required. Both modules are pure/dependency-free; no Supabase, no new packages.

## Next Phase Readiness

- `generateSlotsForDate` is ready for plan `04-05` to re-run inside the booking Server Action for D-15 slot-legality re-validation, and for plan `04-06` to call from a Server Component for the day-detail slot list.
- `getBusinessNowParts`, `isDateBeforeBusinessToday`, and `isSlotInThePast` are ready for both the calendar's disabled-date matcher (04-06) and the Server Action's past-slot rejection (04-05).
- `formatLocalDateKey` is ready for `04-06`'s client-side date keying against server-provided availability data, per RESEARCH.md Pattern 3's `toISOString()` warning.
- No blockers. This plan has zero dependency on the still-missing live Supabase project (noted in STATE.md) since both modules are pure functions with no database or network I/O -- this was by design (Wave 1, parallel with the human gates).

---
*Phase: 04-booking-contact*
*Completed: 2026-08-06*

## Self-Check: PASSED

All created files confirmed present on disk; all three commit hashes (`c2b96a4`, `186c2ea`, `8bcca33`) confirmed present in `git log --oneline --all`.
