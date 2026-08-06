---
phase: 04-booking-contact
plan: 11
subsystem: ui
tags: [react, booking, gap-closure, race-condition, calendar]

# Dependency graph
requires:
  - phase: 04-booking-contact
    provides: "SlotList.tsx and BookingCalendar.tsx as built by plans 04-05/04-06/04-09/04-10 (day/month availability reads, WR-02's setSelectedTime(null) and preservedValues wiring)"
provides:
  - "isDayFullyBooked pure predicate (src/lib/booking/day-fully-booked.ts) deriving day-level fully-booked state from a real availability read"
  - "WR-01 fix: a lost slot-taken race marks a date fully booked in the month calendar only when every slot on that date is actually taken"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure predicate extraction for testability: a .tsx component's derived-state logic that would otherwise be untestable (vitest include is src/**/*.test.ts, not .tsx) is extracted into a plain .ts module with its own unit tests"

key-files:
  created:
    - src/lib/booking/day-fully-booked.ts
    - src/lib/booking/day-fully-booked.test.ts
  modified:
    - src/components/booking/SlotList.tsx

key-decisions:
  - "isDayFullyBooked returns false for both a failed read ({ ok: false }) and an empty slot list -- neither is evidence the day is fully booked, and conflating them with a genuine 'every slot taken' would misrepresent the calendar state"
  - "handleSlotTakenRefetch performs its own independent refreshDayAvailability call rather than trying to read BookingCalendar's onSlotTakenRefetch result, since that parent function returns Promise<void> and does not expose the refetched slot list"
  - "A thrown transport error during the day-level refetch is caught and swallowed, leaving calendar state unchanged, rather than surfacing an unhandled promise rejection from an event handler"

requirements-completed: [BOOK-02, BOOK-03]

# Metrics
duration: 20min
completed: 2026-08-06
---

# Phase 4 Plan 11: Fully-Booked Calendar Guard (WR-01 Gap Closure) Summary

**Extracted a tested `isDayFullyBooked` predicate and used it to guard `SlotList`'s calendar update so a single lost double-booking race no longer marks an entire date fully booked when other slots remain open.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-06T03:59:00Z
- **Completed:** 2026-08-06T04:19:44Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `src/lib/booking/day-fully-booked.ts` exports a pure `isDayFullyBooked(availability: DayAvailability): boolean` predicate, correctly distinguishing "every slot taken" from "read failed" and "no slots exist" (a closed day, e.g. Sunday)
- 5 unit tests in `day-fully-booked.test.ts` cover the success/failure/empty cases plus an explicit WR-01 regression case (6 slots, exactly 1 taken → `false`)
- `SlotList.tsx`'s `handleSlotTakenRefetch` is now `async` and performs its own `refreshDayAvailability` read, calling `onFullyBookedDate(dateKey)` only when `isDayFullyBooked` proves every slot on that date is unavailable
- WR-02's `setSelectedTime(null)` and the existing `onSlotTakenRefetch()` day-level slot refresh both remain intact and run in the same order as before
- `BookingCalendar.tsx` and `BookingForm.tsx` were not touched — the fix is scoped entirely to the call site in `SlotList.tsx`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract a pure isDayFullyBooked predicate with unit tests** - `737e553` (test)
2. **Task 2: Guard the calendar's fully-booked update behind the refetched day availability** - `6175776` (fix)

## Files Created/Modified
- `src/lib/booking/day-fully-booked.ts` - New pure predicate; returns `false` for a failed read or empty slot list, otherwise `slots.every((slot) => !slot.available)`
- `src/lib/booking/day-fully-booked.test.ts` - 5 tests: some-available→false, all-taken→true, empty-list→false, failed-read→false, and the named WR-01 regression case
- `src/components/booking/SlotList.tsx` - `handleSlotTakenRefetch` is now `async`; imports `refreshDayAvailability` and `isDayFullyBooked`; replaced the unconditional `onFullyBookedDate(dateKey)` call with a guard driven by an independent day-level refetch wrapped in try/catch; updated the function's own comment and the file-header comment to describe all three concerns (WR-02 clear, D-09/UAT-step-14 refresh, WR-01 guard)

## Decisions Made
- `isDayFullyBooked` treats a `{ ok: false }` read result and an empty slot list identically as `false` — both are "not evidence of fully booked," for different reasons (transient failure vs. a day the business is closed), and the header comment documents why each is deliberate
- `handleSlotTakenRefetch` reads its own fresh `DayAvailability` via `refreshDayAvailability` rather than trying to derive the day-level answer from `onSlotTakenRefetch`'s side effect, since that parent-owned function returns `Promise<void>` with no way for `SlotList` to inspect the result
- The new read is wrapped in `try { ... } catch { /* leave calendar state unchanged */ }` so a thrown transport error cannot produce an unhandled promise rejection from an event handler; `isDayFullyBooked` itself already handles a well-formed `{ ok: false }` failure result without throwing

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria (grep-based structural checks, `tsc --noEmit`, `lint`, `build`, `vitest run`) all pass exactly as specified after one comment-wording adjustment (see below).

**Minor self-correction (no Rule applies — cosmetic only):** The plan's grep-based acceptance criteria for Task 2 expect `isDayFullyBooked` to appear exactly 2 times and `onSlotTakenRefetch()` exactly 1 time in `SlotList.tsx`. My first draft of the updated code comments referenced both identifiers by their exact call-syntax (e.g. `` `onSlotTakenRefetch()` `` and `` `isDayFullyBooked` `` used twice in prose), which inflated the grep counts to 4 and 2 respectively without changing any functional code. I reworded the comments to describe behavior without repeating the exact identifier+parens pattern, which brought every grep count back to the plan's exact expected values while leaving the implementation itself unchanged.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WR-01 (`.planning/todos/pending/slot-taken-race-recovery.md`) is fully closed: `onFullyBookedDate` fires only when a refetched day availability shows every slot unavailable.
- WR-02 (also tracked in the same todo file) remains closed from plan 04-10 and was re-verified intact by this plan's full test/build/lint/tsc suite — `setSelectedTime(null)` still fires and the `preservedValues`/`initialValues`/`onValuesPreserved` D-09 mechanism is untouched.
- `.planning/todos/pending/slot-taken-race-recovery.md` can now be moved to `.planning/todos/resolved/` (or deleted) since both WR-01 and WR-02 are closed — left as-is per this plan's scope (file was read-only context, not in `files_modified`).
- Full verification suite passing: `npx tsc --noEmit` exits 0, `npm run lint` exits 0, `npm run build` exits 0, `npx vitest run` reports **90/90 passing** (85 baseline + 5 new `day-fully-booked.test.ts` tests, no regressions).
- Per the upstream context's UAT re-verification note, steps 11-14 (slot-taken race recovery: preserved form data, slot-taken message, taken slot disabled, and now the month-calendar staying selectable) should be re-walked in a future human UAT pass before this gap-closure wave is considered fully verified end-to-end against the live database.

---
*Phase: 04-booking-contact*
*Completed: 2026-08-06*
