---
phase: 04-booking-contact
plan: 10
subsystem: ui
tags: [react-hook-form, zod, useActionState, react-19, booking, gap-closure]

# Dependency graph
requires:
  - phase: 04-booking-contact
    provides: "BookingForm.tsx and SlotList.tsx as built by plans 04-05/04-06 (createBooking Server Action, useActionState + useForm wiring, D-09 value-preservation mechanism)"
provides:
  - "BookingForm's submit path gated by react-hook-form's handleSubmit — the CONT-06/BOOK-06 verification gap is closed"
  - "Server-returned per-field errors (state.fieldErrors) rendered via form.setError, not just the generic state.message"
  - "WR-02 fix: a lost slot-taken race clears the selected time and returns the customer to the slot grid"
  - "New BookingForm props (initialValues, onValuesPreserved) that keep D-09 intact across the WR-02 remount"
affects: ["04-booking-contact plan 11 (WR-01 fix, depends on this plan's onFullyBookedDate call site being unchanged)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onValidSubmit builds FormData explicitly inside a component and calls the useActionState dispatcher only after react-hook-form's Zod resolver passes (mirrors ContactForm.tsx)"
    - "Lift-before-unmount: a child component (BookingForm) hands ephemeral state to its parent (SlotList) via a callback immediately before triggering its own unmount, so the parent can replay it into the next-mounted instance via a prop"

key-files:
  created: []
  modified:
    - src/components/booking/BookingForm.tsx
    - src/components/booking/SlotList.tsx

key-decisions:
  - "Removed action={formAction} entirely rather than keeping it alongside onSubmit — both on the same <form> element would re-enable the ungated native dispatch"
  - "Removed the three now-redundant hidden inputs (apptDate, apptTime, serverVehicleDesc) since onValidSubmit builds FormData explicitly and the browser no longer serializes the <form> element under onSubmit"
  - "honeypot is hardcoded to '' in the useForm values object and never appears in initialValues/preservedValues — deliberately excluded from the preserve/replay chain per D-14"
  - "apptDate/apptTime in the useForm values object always come from props, never from initialValues or state.values, so a newly-picked slot genuinely replaces the taken one"

requirements-completed: [BOOK-06, CONT-06]

# Metrics
duration: 25min
completed: 2026-08-06
---

# Phase 4 Plan 10: Booking Form Submit Gate + Slot-Taken Race Recovery Summary

**Wired BookingForm's submit through react-hook-form's handleSubmit (closing the CONT-06/BOOK-06 verification gap) and fixed WR-02 by clearing the taken slot while preserving entered customer data across the resulting remount.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-06T03:43:00Z
- **Completed:** 2026-08-06T04:08:44Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `BookingForm.tsx`'s `<form>` now submits via `onSubmit={form.handleSubmit(onValidSubmit)}` with `noValidate`, replacing the ungated `action={formAction}` — an empty-required-field submit now never reaches `createBooking`
- `state.fieldErrors` returned from a server round-trip is now applied via `form.setError` per field, so `<FormMessage/>` renders server validation failures, not just the generic `state.message` paragraph
- `SlotList.tsx`'s `handleSlotTakenRefetch` now calls `setSelectedTime(null)`, returning the customer to the slot grid after a lost race instead of leaving them able to resubmit the same known-taken slot (WR-02)
- Added `preservedValues` state in `SlotList` and `initialValues`/`onValuesPreserved` props on `BookingForm` so the customer's name/last name/phone/VIN survive the unmount/remount cycle WR-02's fix introduces (D-09, human UAT step 13's confirmed-passing behavior)

## Task Commits

Each task was committed atomically:

1. **Task 1: Gate the booking submit through handleSubmit and render per-field server errors** - `622099b` (fix)
2. **Task 2: Deselect the taken slot on a lost race without losing entered customer data** - `91eae67` (fix)

## Files Created/Modified
- `src/components/booking/BookingForm.tsx` - Replaced `action={formAction}` with `onSubmit={form.handleSubmit(onValidSubmit)}` + `noValidate`; added `onValidSubmit` that builds `FormData` explicitly; removed the three now-redundant hidden inputs; added a `useEffect` calling `form.setError` from `state.fieldErrors`; added `initialValues`/`onValuesPreserved` props consumed by `SlotList`
- `src/components/booking/SlotList.tsx` - Added `preservedValues` state; `handleSlotTakenRefetch` now calls `setSelectedTime(null)`; wired `initialValues={preservedValues}` and `onValuesPreserved={(values) => setPreservedValues(values)}` onto `<BookingForm>`; `onFullyBookedDate(dateKey)` call site left unchanged for plan 04-11

## Decisions Made
- Removed `action={formAction}` entirely instead of keeping both `action` and `onSubmit` on the same element — having both re-enables the ungated native dispatch path the gap closure is meant to eliminate
- Removed the three hidden inputs (`apptDate`, `apptTime`, `serverVehicleDesc`) rather than keeping them alongside the explicit `FormData` construction in `onValidSubmit` — under `onSubmit` the browser no longer serializes the `<form>` element, so the hidden inputs contributed nothing and risked silently drifting from the authoritative props
- `honeypot` is excluded from the preserve/replay chain by design — the `useForm` values object hardcodes it to `''` regardless of `initialValues`, protecting D-14's anti-bot guarantee from a stale replayed value
- `apptDate`/`apptTime` in the `useForm` values object always resolve from props, never from `initialValues` or `state.values`, so re-selecting a slot always reflects the newly picked time, not a resurrected taken one

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria (grep-based structural checks, `tsc --noEmit`, `lint`, `build`, `vitest run`) all pass as specified.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `onFullyBookedDate(dateKey)` call site in `SlotList.tsx`'s `handleSlotTakenRefetch` is left exactly where plan `04-11` expects it (WR-01's fix target) — verified no other change to that function's structure beyond adding `setSelectedTime(null)`.
- `src/lib/booking/booking-schema.ts` and `src/lib/contact/contact-schema.ts` were NOT touched by this plan (owned by concurrently-run plan `04-09`), matching the file-scope boundary given in the execution context.
- Full verification suite passing: `npx tsc --noEmit` exits 0, `npm run lint` exits 0, `npm run build` exits 0, `npx vitest run` reports 70/70 passing (baseline maintained, no regressions).
- The gap this plan closes (`04-VERIFICATION.md`'s `gaps:` entry on Roadmap Success Criterion 5 / CONT-06) should be re-verified in a future verification pass: submitting the booking form with blank required fields should now show inline Zod errors and never invoke `createBooking`, matching `ContactForm.tsx`'s already-verified behavior.

---
*Phase: 04-booking-contact*
*Completed: 2026-08-06*
