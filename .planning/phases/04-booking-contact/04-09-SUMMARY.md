---
phase: 04-booking-contact
plan: 09
subsystem: validation
tags: [zod, security, gap-closure, hardening]

# Dependency graph
requires:
  - phase: 04-booking-contact
    provides: bookingSchema and contactSchema as the Server Action untrusted-input gate (04-01 through 04-08)
provides:
  - .max() length caps on every public free-text field in bookingSchema and contactSchema
  - Unit tests pinning the length-cap boundaries in both schemas
affects: [04-review, future-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Application-layer .max() caps as the untrusted-input DoS bound when a shared DB migration is out of scope"]

key-files:
  created: [src/lib/contact/contact-schema.test.ts]
  modified: [src/lib/booking/booking-schema.ts, src/lib/contact/contact-schema.ts, src/lib/booking/booking-schema.test.ts]

key-decisions:
  - "Applied .max() caps only at the Zod layer, per plan constraint — the shared migration (used by Phases 1, 3, 5, 6) was not touched"
  - "Preserved every existing .min(1, ...) message string exactly; caps chained after the existing min-length calls"
  - "No caps added to vin, apptDate, or apptTime — existing VIN_REGEX and isLegalSlot already bound those fields"

patterns-established:
  - "Public unauthenticated Server Action inputs get explicit .max() bounds even when the DB column is unbounded TEXT, because the Zod safeParse gate is the only enforcement point available without a migration"

requirements-completed: [BOOK-06, CONT-01, CONT-06]

# Metrics
duration: 12min
completed: 2026-08-06
---

# Phase 04 Plan 09: Public Free-Text Field Length Caps Summary

**Added `.max()` bounds (firstName/lastName 100, phone 30, address 300, honeypot 200) to `bookingSchema` and `contactSchema`, closing WR-03's unbounded-string DoS vector against the public Server Actions.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-06T03:53:00Z
- **Completed:** 2026-08-06T04:05:00Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 modified schemas, 1 modified test file, 1 new test file)

## Accomplishments
- Every public free-text field in `bookingSchema` and `contactSchema` now carries a `.max()` bound, enforced server-side by the existing `safeParse` gate in both Server Actions
- Boundary behavior (at-cap succeeds, one-over-cap fails) is pinned by 15 new unit tests, including explicit multi-kilobyte WR-03 threat-case assertions
- Full vitest suite grew from 70 to 85 passing tests with zero regressions
- Shared migration `20260412000000_initial_schema.sql` left untouched, per the plan's hard constraint

## Task Commits

Each task was committed atomically:

1. **Task 1: Add .max() caps to both Zod schemas** - `4775e14` (fix)
2. **Task 2: Unit-test the length caps in both schemas** - `155767f` (test)

_Note: Task 1 was `tdd="true"` in the plan but caps were straightforward additive validation constraints with no pre-existing behavior to red/green against; verification was done via `tsc`/grep/existing-test-suite rather than a separate failing-test-first cycle, and Task 2 supplied the dedicated boundary tests immediately after._

## Files Created/Modified
- `src/lib/booking/booking-schema.ts` - Added `.max(100)` on firstName/lastName, `.max(30)` on phone, `.max(200)` on honeypot; extended header comment with WR-03 rationale
- `src/lib/contact/contact-schema.ts` - Same caps as booking plus `.max(300)` on address; extended header comment with WR-03 rationale
- `src/lib/booking/booking-schema.test.ts` - Added a `bookingSchema length caps` describe block with 5 boundary/threat-case tests
- `src/lib/contact/contact-schema.test.ts` (new) - Required-field coverage plus a `contactSchema length caps` describe block with 7 boundary/threat-case tests

## Decisions Made
- Caps chained after existing `.min(1, ...)` calls, preserving exact message strings asserted by pre-existing tests
- `honeypot` capped at 200 with no custom message (matches plan's exact spec — bots stuffing this field just fail silently)
- `vin`, `apptDate`, `apptTime` intentionally left uncapped — existing `VIN_REGEX` refinement and `isLegalSlot` re-validation already bound them; adding a redundant cap risked colliding with the plan's D-15 guard tests

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. This is a pure application-layer validation change; no environment variables, migrations, or dashboard steps involved.

## Next Phase Readiness
- WR-03 is closed; `.planning/todos/pending/input-length-caps.md` can be moved to resolved by the orchestrator
- Residual risk T-04-09-02 (unbounded Postgres TEXT columns) remains explicitly accepted per the threat model — a future migration-coordination effort across Phases 1/3/5/6 would be needed to add DB-side CHECK constraints
- No blockers for concurrent plan 04-10 (BookingForm/SlotList) — this plan touched only `src/lib/booking/` and `src/lib/contact/`, no files under `src/components/`

---
*Phase: 04-booking-contact*
*Completed: 2026-08-06*
