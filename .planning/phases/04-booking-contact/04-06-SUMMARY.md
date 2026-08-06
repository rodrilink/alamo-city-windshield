---
phase: 04-booking-contact
plan: 06
subsystem: booking
tags: [nextjs-server-actions, react-day-picker, react-hook-form, useActionState, server-only-fence, vin-decode]

# Dependency graph
requires:
  - phase: 04-booking-contact
    provides: "booking-actions.ts (createBooking Server Action), booking-availability.ts (getMonthAvailability/getDayAvailability), booking-schema.ts (bookingSchema/isLegalSlot), types/booking.ts, constants.ts BOOKING_COPY, shadcn calendar.tsx/form.tsx/label.tsx primitives"
provides:
  - "/book route with normal-flow chrome (D-20) and server-side VIN re-decode building vehicle_desc (D-19)"
  - "BookingCalendar client component: month grid with disabled matcher (fully-booked, past, 30-day window, Sunday), controlled month/onMonthChange re-fetch"
  - "SlotList client component: shared disabled treatment for past+booked slots (D-05), empty-state copy"
  - "BookingForm client component: first useActionState + react-hook-form wiring in this repo, D-09 value preservation, D-10 distinct slot-taken/error branching, D-14 honeypot"
  - "BookingConfirmation presentational component: D-11 confirmation content including promised phone call"
  - "availability-actions.ts: refreshDayAvailability/refreshMonthAvailability Server Actions for on-select and on-month-change re-fetch"
affects: [04-07-contact, 04-08-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-safe date-key duplication: src/components/booking/date-key.ts duplicates formatLocalDateKey/isDateBeforeBusinessToday's pure logic locally because src/lib/server-time.ts is server-only fenced and cannot be imported into a Client Component (discovered as a build-breaking blocker, fixed via Rule 3)"
    - "useActionState (React 19, from 'react') + useForm({ values: state.values }) for Server Action form round-tripping with D-09 value preservation"
    - "Server Action wrapper modules (availability-actions.ts) exposing read-only 04-05 functions to Client Components without duplicating their logic"

key-files:
  created:
    - "src/app/(public)/book/page.tsx"
    - "src/lib/booking/availability-actions.ts"
    - "src/components/booking/BookingCalendar.tsx"
    - "src/components/booking/SlotList.tsx"
    - "src/components/booking/date-key.ts"
    - "src/components/booking/BookingForm.tsx"
    - "src/components/booking/BookingConfirmation.tsx"
  modified: []

key-decisions:
  - "Added src/components/booking/date-key.ts (not in the original files_modified list) to unblock a Next.js build error: src/lib/server-time.ts is import 'server-only' fenced per 04-05/D-06, and BookingCalendar.tsx/SlotList.tsx are Client Components that need the same 'yyyy-MM-dd' local-getter date-keying logic. Duplicated only the pure, non-secret formatting/comparison functions (never the underlying 'what time is it' decision, which stays server-only and arrives as the serverToday prop)."
  - "Added a refreshMonthAvailability Server Action (not explicitly named in the plan's acceptance criteria, which only required the day-level refreshDayAvailability) so BookingCalendar's onMonthChange handler actually re-fetches fully-booked dates for the newly visible month, rather than leaving D-07's month-upfront re-fetch as dead code."
  - "BookingForm renders BookingConfirmation directly on state.status === 'success' rather than the parent SlotList/BookingCalendar owning that transition -- keeps the confirmation swap colocated with the action state that triggers it."

patterns-established:
  - "Server-only fence boundary: any Client Component needing date/time logic from a server-only module must get the decision (e.g. serverToday) as a prop and reimplement only pure formatting locally -- never attempt to import across the fence."

requirements-completed: [BOOK-01, BOOK-02, BOOK-03, BOOK-06, BOOK-07]

# Metrics
duration: 45min
completed: 2026-08-06
---

# Phase 4 Plan 06: Booking Flow (/book) Summary

**`/book` route with month calendar, slot list, and booking form wired to `createBooking` via `useActionState`, including server-side VIN re-decode and a D-11 confirmation screen with the promised follow-up call**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-06T00:43:00Z (approx, per STATE.md session start)
- **Completed:** 2026-08-06T01:57:10Z
- **Tasks:** 3
- **Files modified:** 8 (7 created within plan scope + 1 additional helper created to unblock the build)

## Accomplishments
- `/book` renders with `/about`'s exact normal-flow chrome (no snap-scroll), re-decodes `?vin=` server-side via the existing `readVinCache`/`decodeVin`/`writeVinCache` sequence to derive `vehicle_desc`, and degrades gracefully on both VIN re-decode failure and availability-read failure
- `BookingCalendar` disables fully-booked, past, out-of-30-day-window, and Sunday dates while leaving today selectable (D-04), keyed via local `Date` getters rather than `toISOString()`
- `SlotList` gives past and booked slots one shared disabled treatment (D-05) and shows a slot-picker leading into `BookingForm`
- `BookingForm` establishes this repo's first `useActionState` + `react-hook-form` pattern, preserves entered values across every failed submit (D-09), and renders `'slot-taken'` and `'error'` as visually and behaviorally distinct outcomes (D-10) — only `'slot-taken'` disables the slot
- `BookingConfirmation` renders the D-11 confirmation content (date, time, name, conditional vehicle line, promised phone call, shop phone) with zero data fetching

## Task Commits

Each task was committed atomically:

1. **Task 1: The /book Server Component page with server-side VIN re-decode** - `e2929f7` (feat)
2. **Task 2: Calendar and slot list with disabled states** - `349590b` (feat)
3. **Task 3: Booking form wired to createBooking, and the confirmation screen** - `5d62e46` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `src/app/(public)/book/page.tsx` - Server Component: parses/validates `?vin=`, re-decodes server-side, fetches initial month availability, renders `BookingCalendar` or a schedule-unavailable message
- `src/lib/booking/availability-actions.ts` - `'use server'` wrappers `refreshDayAvailability`/`refreshMonthAvailability` delegating to 04-05's reads
- `src/components/booking/BookingCalendar.tsx` - Client Component: month grid, disabled matcher, month-change and date-select re-fetch wiring
- `src/components/booking/SlotList.tsx` - Client Component: slot buttons with shared disabled treatment, empty-state copy, embeds `BookingForm` once a slot is picked
- `src/components/booking/date-key.ts` - Client-safe duplication of `server-time.ts`'s pure date-key formatting/comparison (see Deviations)
- `src/components/booking/BookingForm.tsx` - Client Component: `useActionState(createBooking, ...)` + `useForm` wiring, honeypot, distinct slot-taken/error rendering
- `src/components/booking/BookingConfirmation.tsx` - Presentational D-11 confirmation screen

## Decisions Made
- `date-key.ts` created as a new file to resolve a `server-only` build error (see Deviations) — scoped narrowly to pure formatting/comparison logic only, never the underlying time decision.
- `refreshMonthAvailability` added to `availability-actions.ts` alongside the plan-specified `refreshDayAvailability` so the month-change handler has a real re-fetch to call instead of being dead code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `src/lib/server-time.ts`'s `server-only` fence broke the build when imported into Client Components**
- **Found during:** Task 2 (Calendar and slot list with disabled states)
- **Issue:** `BookingCalendar.tsx` and `SlotList.tsx` need `formatLocalDateKey` and `isDateBeforeBusinessToday` for date-keying (per the plan's explicit "never use `toISOString()`" requirement), but `server-time.ts` is `import 'server-only'` fenced per 04-05/D-06. Importing it into a `'use client'` component fails `npm run build` with "You're importing a component that needs server-only" — confirmed by an actual failed build during this session, not a hypothetical.
- **Fix:** Created `src/components/booking/date-key.ts`, duplicating only the pure, non-secret local-getter formatting (`formatLocalDateKeyClient`) and date-key comparison (`isDateKeyBeforeServerToday`) logic. The underlying "what time is it" decision itself (`getBusinessNowParts()`) is never duplicated or called client-side — it remains server-only and arrives as the `serverToday` prop computed once in `/book`'s Server Component. This mirrors the pattern PATTERNS.md and RESEARCH.md already established for `slots.ts` (fence decision is per-module, based on whether the module's *decision* or just its *output shape* is being reused).
- **Files modified:** `src/components/booking/date-key.ts` (new), `src/components/booking/BookingCalendar.tsx`, `src/components/booking/SlotList.tsx`
- **Verification:** `npm run build` exits 0; `grep -c toISOString` on both files returns 0; `npx tsc --noEmit` and `npx vitest run` (70/70) both pass.
- **Committed in:** `349590b` (Task 2 commit)

**2. [Rule 3 - Blocking] Duplicate `name` attribute on the honeypot input**
- **Found during:** Task 3 (Booking form wired to createBooking)
- **Issue:** The honeypot `<input>` had both an explicit `name="honeypot"` and `{...form.register('honeypot')}`, which also sets `name` — TypeScript error TS2783 ("specified more than once, so this usage will be overwritten").
- **Fix:** Removed the explicit `name` attribute; `register('honeypot')` already supplies the correct `name` for both RHF tracking and native `FormData` submission.
- **Files modified:** `src/components/booking/BookingForm.tsx`
- **Verification:** `npx tsc --noEmit` exits 0.
- **Committed in:** `5d62e46` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking build/type errors)
**Impact on plan:** Both fixes were necessary to make the plan's own acceptance criteria achievable (no `toISOString()`, clean `tsc`/`build`). No scope creep — `date-key.ts` is scoped to pure formatting only and stays inside `src/components/booking/`.

## Issues Encountered
- The acceptance-criteria greps for `fromDate|toDate|initialFocus` (BookingCalendar.tsx) and `useFormState` (BookingForm.tsx) initially matched explanatory code comments that named the deprecated APIs to document their absence, not actual usage. Reworded both comments to avoid naming the literal deprecated tokens while preserving the same explanation, so the greps return 0 as intended without weakening the documentation.

## User Setup Required

None - no external service configuration required. The live Supabase project and `.env.local` from earlier waves are already in place and were used implicitly via `createAdminClient()` inside the already-built `booking-actions.ts`/`booking-availability.ts` (no direct database calls were added in this plan).

## Next Phase Readiness

- `BookingCalendar` prop contract: `{ initialYear: number, initialMonth: number, initialFullyBookedDates: string[], serverToday: { year, month, day, hour, minute }, vin: string | null, vehicleDesc: string | null }`.
- `BookingConfirmation` prop contract: `{ firstName: string, lastName: string, phone: string, apptDate: string, apptTime: string, vehicleDesc: string | null }` — purely presentational, no fetching.
- `slots.ts` (from 04-03) was confirmed importable client-side in principle (it carries no `server-only` fence per its own header comment), but this plan never actually imported it into a Client Component — availability data arrives pre-computed from the server via props/Server Actions instead, per the plan's own instruction ("the slot list arrives as data from the server").
- `src/lib/server-time.ts` remains `server-only` fenced and unmodified; any future Client Component needing date-key logic should reuse `src/components/booking/date-key.ts` rather than re-duplicating it a third time, or consider promoting it to a shared, non-fenced location if a third consumer appears.
- Plan `04-08` (verification) should specifically re-check: (1) the `date-key.ts` duplication doesn't drift from `server-time.ts`'s logic over time, and (2) the full booking flow end-to-end against the live Supabase project (calendar select → slot pick → submit → confirmation, plus a deliberate double-submit to exercise the `23505` slot-taken path).

---
*Phase: 04-booking-contact*
*Completed: 2026-08-06*

## Self-Check: PASSED

All claimed created files verified present on disk (`src/app/(public)/book/page.tsx`, `src/lib/booking/availability-actions.ts`, `src/components/booking/BookingCalendar.tsx`, `src/components/booking/SlotList.tsx`, `src/components/booking/date-key.ts`, `src/components/booking/BookingForm.tsx`, `src/components/booking/BookingConfirmation.tsx`, this SUMMARY.md). All four commit hashes (`e2929f7`, `349590b`, `5d62e46`, `20b12b9`) verified present in `git log --oneline --all`.
