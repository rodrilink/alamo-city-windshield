---
phase: 04-booking-contact
plan: 05
subsystem: api
tags: [supabase, zod, server-actions, postgrest, nextjs]

# Dependency graph
requires:
  - phase: 04-booking-contact (plan 02)
    provides: Live Supabase project, applied migration, RLS-enforced bookings/contacts/analytics_events/vin_cache tables, proven 23505 unique-violation shape
  - phase: 04-booking-contact (plan 03)
    provides: Pure generateSlotsForDate/SLOT_DURATION_MINUTES (slots.ts) and server-time.ts helpers (getBusinessNowParts, formatLocalDateKey, getBusinessTodayDateString, isDateBeforeBusinessToday, isSlotInThePast)
  - phase: 04-booking-contact (plan 04)
    provides: Slot/BookingFormValues/ContactFormValues/BookingActionState/ContactActionState/MonthAvailability/DayAvailability types and BOOKING_COPY/CONTACT_COPY constants
provides:
  - getMonthAvailability/getDayAvailability server-only availability reads (src/lib/booking/booking-availability.ts)
  - bookingSchema/contactSchema Zod schemas plus isLegalSlot D-15 validator, both server/client-safe
  - createBooking and createContact Server Actions -- the repo's first Server Actions (D-13)
affects: [04-06, 04-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Attempt-insert-and-catch-23505 for double-booking prevention (D-08), never check-then-insert"
    - "Discriminated BookingActionState/ContactActionState returned by Server Actions, mirroring the /api/vin/[vin] outcome-branching shape"
    - "Availability reads return an explicit {ok:false} failure variant instead of degrading to an empty (fully-open) calendar on error"
    - "Zod schemas kept free of server-only fencing so the same schema serves as both the react-hook-form resolver and the server-side untrusted-input gate"

key-files:
  created:
    - src/lib/booking/booking-availability.ts
    - src/lib/booking/booking-schema.ts
    - src/lib/booking/booking-schema.test.ts
    - src/lib/contact/contact-schema.ts
    - src/lib/booking/booking-actions.ts
    - src/lib/contact/contact-actions.ts
  modified: []

key-decisions:
  - "isLegalSlot is a standalone export, not a Zod .refine() on bookingSchema, keeping the base schema usable purely client-side while D-15's slot re-validation stays an explicit Server Action step"
  - "vehicleDesc is read from a caller-supplied serverVehicleDesc formData field (populated by plan 04-06's server-side re-decode), never from a client-named vehicle_desc field, enforcing D-19 structurally"
  - "Corrected the plan's '13:30' slot-legality fixture to '12:30' after verifying against the real BUSINESS.hours grid (weekday: 08:00/09:30/11:00/12:30/14:00/15:30; Saturday: 09:00/10:30/12:00) -- 13:30 is off-grid for both days, so it could not prove the intended weekday-accepts/Saturday-rejects invariant"

patterns-established:
  - "Server Action three-way discriminated result (success/slot-taken/error for bookings, success/error for contacts), each non-success branch preserving submitted values (D-09)"
  - "console.error for server-side diagnostic logging, never forwarding error.message/details/hint into a returned action state or availability result"

requirements-completed: [BOOK-03, BOOK-05, BOOK-06, CONT-03, CONT-04, CONT-06]

duration: 55min
completed: 2026-08-06
---

# Phase 4 Plan 05: Booking & Contact Server Data Layer Summary

**Server Actions `createBooking`/`createContact` with D-08 attempt-insert-and-catch-23505 double-booking prevention, D-15 slot-legality re-validation, and month/day availability reads that never degrade a failed read into an open calendar.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-08-06T00:41:00Z (approx, from STATE.md session start)
- **Completed:** 2026-08-06T01:36:19Z
- **Tasks:** 3
- **Files modified:** 6 created, 0 modified

## Accomplishments
- `booking-availability.ts` computes month-level fully-booked dates per-date against `generateSlotsForDate(date).length` (never a hardcoded slot count) and day-level slot lists that mark each slot `booked`/`past`/available, returning an explicit failure variant on any read error instead of an empty (falsely-open) result
- `bookingSchema`/`contactSchema` validate required fields and reuse the shared `VIN_REGEX`, with a standalone `isLegalSlot` validator enforcing D-15 by re-running the same `generateSlotsForDate` the calendar UI displays from
- `createBooking` and `createContact` -- the repo's first Server Actions -- run honeypot → Zod → (slot-legality) → insert in strict order, branch on Postgres `error.code === '23505'` (never `error.message`) to distinguish "slot taken" from every other failure, and never leak raw Postgres/PostgREST diagnostics into the returned state

## Task Commits

Each task was committed atomically:

1. **Task 1: Availability reads for the month grid and the selected day** - `2bbf104` (feat)
2. **Task 2: Shared Zod schemas with slot-legality validation** - `3272cd0` (feat, tdd)
3. **Task 3: The createBooking and createContact Server Actions** - `7720dd5` (feat)

**Plan metadata:** committed alongside this SUMMARY (worktree mode -- orchestrator handles STATE.md/ROADMAP.md centrally after merge)

## Files Created/Modified
- `src/lib/booking/booking-availability.ts` - `getMonthAvailability`/`getDayAvailability` server-only reads via `createAdminClient()`, selecting only `appt_date`/`appt_time`, returning `{ok:false}` on any failure
- `src/lib/booking/booking-schema.ts` - `bookingSchema` Zod object plus `isLegalSlot(apptDate, apptTime)` D-15 validator
- `src/lib/booking/booking-schema.test.ts` - 12 vitest cases: required-field failures, VIN format (17-char valid, 16-char invalid, excluded-letter invalid, optional-empty valid), off-grid `'03:00'` rejection, Sunday zero-slot rejection, and the corrected weekday-accepts/Saturday-rejects `'12:30'` fixture pair
- `src/lib/contact/contact-schema.ts` - `contactSchema` Zod object (no slot logic, no `server-only`)
- `src/lib/booking/booking-actions.ts` - `createBooking(prevState, formData)` Server Action returning `BookingActionState`
- `src/lib/contact/contact-actions.ts` - `createContact(prevState, formData)` Server Action returning `ContactActionState`

## Decisions Made
- Kept `isLegalSlot` as a separate export rather than wiring `generateSlotsForDate` into a Zod `.refine()`, so `bookingSchema` stays a pure client/server-shared resolver while D-15's re-validation remains an explicit, auditable Server Action step (matches the plan's own framing of D-15 as independent re-validation, not implicit parsing).
- `vehicleDesc` is read from a `serverVehicleDesc` `formData` key that only the server side is expected to populate (plan `04-06`'s re-decode), keeping the client-supplied-vehicle-identity threat (T-04-05-02) structurally unrepresentable rather than merely convention-enforced.
- Corrected a factually-wrong literal in the plan's own acceptance criteria (see Deviations) rather than forcing the test to match an inconsistent example.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the plan's `'13:30'` slot-legality test fixture**
- **Found during:** Task 2 (Shared Zod schemas with slot-legality validation)
- **Issue:** The plan's `<behavior>` and acceptance criteria specified testing `appt_time = '13:30'` as accepted on a weekday and rejected on Saturday. Independently computing the real grid from `BUSINESS.hours` (weekday 8:00 AM–6:00 PM, Saturday 9:00 AM–2:00 PM, 90-minute slots) shows the weekday grid is `08:00, 09:30, 11:00, 12:30, 14:00, 15:30` and the Saturday grid is `09:00, 10:30, 12:00` — `13:30` is off-grid for *both* days, so a test asserting it as "accepted for a weekday date" would fail against the real, correct `generateSlotsForDate` output.
- **Fix:** Verified the actual grids via a standalone calculation mirroring `slots.ts`'s loop logic, then substituted `'12:30'` — on-grid for weekdays, off-grid for Saturday (Saturday's last slot is `12:00`) — which proves the exact same invariant the plan intended (a time legal on the longer weekday grid but illegal on Saturday's shorter grid) without asserting a false claim about the real business hours.
- **Files modified:** `src/lib/booking/booking-schema.test.ts`
- **Verification:** All 12 tests pass; the `'03:00'` off-grid and Sunday zero-slot cases (also required by the plan) are asserted unchanged and pass as specified.
- **Committed in:** `3272cd0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** The fix corrects a test fixture to match the real, already-implemented business-hours grid; it does not change `isLegalSlot`'s implementation or any acceptance-criteria-checked behavior. No scope creep.

## Issues Encountered
None beyond the fixture correction documented above.

## User Setup Required
None - no external service configuration required. The live Supabase project and `.env.local` from plan `04-02` are already in place and reused as-is via the existing `createAdminClient()`.

## Next Phase Readiness

Exported action signatures and availability function names for plans `04-06`/`04-07` to wire against:

- `getMonthAvailability(year: number, month: number): Promise<MonthAvailability>` — `src/lib/booking/booking-availability.ts`
- `getDayAvailability(dateString: string): Promise<DayAvailability>` — `src/lib/booking/booking-availability.ts`
- `bookingSchema` (Zod object), `isLegalSlot(apptDate: string, apptTime: string): boolean` — `src/lib/booking/booking-schema.ts`
- `contactSchema` (Zod object) — `src/lib/contact/contact-schema.ts`
- `createBooking(prevState: BookingActionState, formData: FormData): Promise<BookingActionState>` — `src/lib/booking/booking-actions.ts`. Expects form fields `firstName`, `lastName`, `phone`, `vin`, `apptDate`, `apptTime`, `honeypot`, and an optional `serverVehicleDesc` field that plan `04-06` must populate server-side from its own VIN re-decode (never client-supplied) if it wants `vehicle_desc` persisted.
- `createContact(prevState: ContactActionState, formData: FormData): Promise<ContactActionState>` — `src/lib/contact/contact-actions.ts`. Expects form fields `firstName`, `lastName`, `phone`, `address`, `honeypot`.

No blockers. `npx tsc --noEmit`, `npm run build`, and `npx vitest run` all exit 0 (70/70 tests passing, up from the 58/58 baseline by the 12 new schema tests).

---
*Phase: 04-booking-contact*
*Completed: 2026-08-06*

## Self-Check: PASSED

All 6 created source files and the SUMMARY.md itself verified present on disk. All 4 commit hashes (`2bbf104`, `3272cd0`, `7720dd5`, `5dec9ed`) verified present in git log.
