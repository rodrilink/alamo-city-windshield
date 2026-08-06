---
phase: 04-booking-contact
reviewed: 2026-08-06T02:46:23Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - src/app/(public)/book/page.tsx
  - src/app/(public)/contact/page.tsx
  - src/components/booking/BookingCalendar.tsx
  - src/components/booking/BookingConfirmation.tsx
  - src/components/booking/BookingForm.tsx
  - src/components/booking/SlotList.tsx
  - src/components/booking/date-key.ts
  - src/components/contact/ContactForm.tsx
  - src/components/contact/ContactVinSearch.tsx
  - src/components/home/EstimateResult.tsx
  - src/components/home/EstimateSection.tsx
  - src/components/ui/calendar.tsx
  - src/components/ui/form.tsx
  - src/components/ui/label.tsx
  - src/lib/booking/availability-actions.ts
  - src/lib/booking/booking-actions.ts
  - src/lib/booking/booking-availability.ts
  - src/lib/booking/booking-schema.ts
  - src/lib/booking/booking-schema.test.ts
  - src/lib/booking/slots.ts
  - src/lib/booking/slots.test.ts
  - src/lib/constants.ts
  - src/lib/contact/contact-actions.ts
  - src/lib/contact/contact-schema.ts
  - src/lib/server-time.ts
  - src/lib/server-time.test.ts
  - src/types/booking.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-08-06T02:46:23Z
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

This phase's security posture is solid: the service-role key stays behind `server-only` and out of every Client Component's import graph, every write path (`createBooking`, `createContact`) re-validates with the shared Zod schema server-side rather than trusting the client resolver, `isLegalSlot` independently re-derives slot legality from `generateSlotsForDate` rather than trusting a client-supplied `apptTime`, `vehicleDesc` is structurally unrepresentable as a client-supplied field (D-19), and the `23505`-only branching for "slot taken" is verified against the real database (per verified_context). No SQL/command injection, XSS, or hardcoded-secret patterns were found — `dangerouslySetInnerHTML`, `eval`, and raw `innerHTML` do not appear anywhere in the reviewed set.

The timezone handling is carefully done: `server-time.ts` and its client-safe date-key duplicate agree on the same integer-comparison scheme, weekday resolution never crosses a UTC boundary, and the D-02 slot-generation invariant is expressed generally rather than special-cased.

What I found instead are three real UI-state correctness bugs in the booking flow's race-handling path, plus two lower-severity gaps (unbounded text-input columns, and a documented-but-unassessed honeypot false-positive risk against browser autofill). None of these rise to Critical: none is exploitable for unauthorized data access or data loss, and the database-level `UNIQUE` constraint remains the actual backstop against double-booking regardless of any client-side state bug. All three Warnings are in the "slot just got taken by someone else" race-recovery path, which by definition is rarely exercised and easy to miss in manual UAT (the phase's own 04-08-SUMMARY.md confirms this exact path was tested once, successfully, but a single successful pass does not exercise the specific over-broad state update described in WR-01).

## Warnings

### WR-01: A single lost slot-taken race marks the entire day fully booked in the calendar, not just the taken slot

**File:** `src/components/booking/SlotList.tsx:51-54`
**Issue:** When `createBooking` returns `status: 'slot-taken'` (the D-08/D-10 race path — another customer booked the same slot first), `BookingForm`'s effect at `src/components/booking/BookingForm.tsx:63-68` calls `onSlotTaken`, which `SlotList` wires to `handleSlotTakenRefetch`:
```ts
function handleSlotTakenRefetch() {
    onFullyBookedDate(dateKey)   // marks the WHOLE DATE fully booked
    onSlotTakenRefetch()         // refetches the day's real slot list
}
```
`onFullyBookedDate(dateKey)` is `BookingCalendar`'s `setFullyBookedDates((prev) => new Set(prev).add(dateKey))` (`src/components/booking/BookingCalendar.tsx:125`). This adds the date to the calendar's fully-booked set unconditionally, even though only one of that date's several slots was actually taken — a weekday date with 6 slots that loses a race on 1 of them still has 5 legitimately free slots, yet the month calendar will now render that whole date as disabled (`fullyBookedDates.has(dateKey)` at `BookingCalendar.tsx:108`). A customer who navigates back to the month view after a single lost race will see a date they could otherwise book on rendered unselectable, until the next real `refreshMonthAvailability` call (a month change) corrects it.
**Fix:** Don't call `onFullyBookedDate` from the slot-taken handler at all — `onSlotTakenRefetch` already calls `refreshDayAvailability`, which is the accurate source of per-slot truth for the currently open day. If the intent was to eventually reflect the day becoming fully booked in the calendar too, derive that from the day-level refetch result instead of assuming a single race means the whole day is gone:
```ts
async function handleSlotTakenRefetch() {
    const result = await refreshDayAvailability(dateKey)
    setDayAvailability(result)
    if (result.ok && result.data.slots.every((slot) => !slot.available)) {
        onFullyBookedDate(dateKey)
    }
}
```

### WR-02: BookingForm stays mounted on the just-lost slot after a slot-taken response, letting the customer resubmit the same taken slot

**File:** `src/components/booking/SlotList.tsx:26,75-83`
**Issue:** `selectedTime` is local `useState` in `SlotList`, set only when the customer clicks a slot button. After a `'slot-taken'` response, `BookingForm`'s `onSlotTaken` callback triggers a day-availability refetch (WR-01), which updates the disabled state of the slot button in the grid above — but `selectedTime` itself is never cleared, so `{selectedTime && <BookingForm .../>}` keeps rendering the same `BookingForm` instance with the same stale `apptDate`/`apptTime` props still wired to the hidden fields (`BookingForm.tsx:90-91`). The visible message is D-10's distinct "that time slot was just taken" text, but the submit button directly below it is still enabled and still submits the identical, now-known-unavailable `apptDate`/`apptTime` pair. A customer who clicks submit again gets the same rejection in a loop instead of being guided to pick a different slot.
**Fix:** Clear `selectedTime` when the slot-taken race is detected, forcing the customer back to the slot grid to pick a fresh (now-accurately-disabled) slot:
```ts
function handleSlotTakenRefetch() {
    onSlotTakenRefetch()
    setSelectedTime(null)
}
```

### WR-03: Booking and contact form text fields have no maximum length, client or server side

**File:** `src/lib/booking/booking-schema.ts:34-47`, `src/lib/contact/contact-schema.ts:16-20`
**Issue:** `firstName`, `lastName`, `phone`, and `address` are validated only with `.trim().min(1, ...)` — there is no `.max()` anywhere in either schema, and the corresponding Postgres columns (`bookings.name`/`last_name`/`phone`/`address`, `contacts.name`/`last_name`/`phone`/`address`, all `TEXT` — `supabase/migrations/20260412000000_initial_schema.sql:11-15,51-54`) are unbounded. Since `createBooking`/`createContact` run behind a public, unauthenticated `'use server'` endpoint with only a honeypot as a bot deterrent (rate limiting is explicitly deferred per RESEARCH.md's own residual-risk table), a scripted POST can submit arbitrarily large strings (megabytes) in any of these fields with no honeypot friction to a determined scripted client, since the honeypot only stops naive form-fillers, not a targeted script that already knows the field names. This is a storage-bloat/minor-DoS vector, not a data-integrity one — Postgres `TEXT` has no theoretical size limit until practical request-size limits are hit, so the actual risk is bounded by Vercel's request body size limit, but nothing in this application layer bounds it below that.
**Fix:** Add reasonable `.max()` bounds matching real-world field lengths, e.g.:
```ts
firstName: z.string().trim().min(1, 'First name is required').max(100),
lastName: z.string().trim().min(1, 'Last name is required').max(100),
phone: z.string().trim().min(1, 'Phone number is required').max(30),
address: z.string().trim().max(300).nullable(),
```

## Info

### IN-01: Honeypot trip on a real customer produces a fake success screen with no explanation

**File:** `src/lib/booking/booking-actions.ts:60-64`, `src/lib/contact/contact-actions.ts:34-37`
**Issue:** Per the documented D-14 design, a filled honeypot field returns `{ status: 'success', values }` with no database write, deliberately indistinguishable from a real success — `BookingForm` (`BookingForm.tsx:70-80`) and `ContactForm` (`ContactForm.tsx:47-53`) both render their normal confirmation UI in this case. This is a documented, intentional anti-bot design (confirmed in RESEARCH.md and accepted per verified_context), but the specific failure mode of a legitimate human tripping it — e.g. a password manager or aggressive form-autofill extension that fills every input on a page, including visually-hidden ones with a real `<label>` and `name` attribute — does not appear to have been evaluated against this exact implementation. If that happens, the customer walks away believing their appointment or message was received when it was silently discarded, with no way to know something went wrong.
**Fix:** No code change required if the tradeoff is accepted as-is. If this is worth hardening later, consider a small honeypot-specific improvement (e.g., checking whether the field's `data-hpb` timestamp shows it was filled implausibly fast, or logging honeypot trips server-side via `console.error`/analytics so real-world false-positive rate can be observed) rather than changing the customer-facing behavior.

### IN-02: `date-key.ts` duplicates server-time.ts's date-key logic with no shared test or drift guard

**File:** `src/components/booking/date-key.ts:32-51`
**Issue:** This duplication is a deliberate, reviewed, and accepted deviation (per verified_context) to work around the `server-only` fence, and the two implementations were confirmed byte-identical in output at the time this phase was written. However, there is no automated test that pins `formatLocalDateKeyClient`/`isDateKeyBeforeServerToday` against `formatLocalDateKey`/`isDateBeforeBusinessToday` from `server-time.ts`, so a future edit to one side (e.g. changing the comparison to use `Date` objects instead of the packed integer, or adjusting padding) could silently drift without any test catching the divergence.
**Fix:** No action required now. If a third client-side consumer of this logic appears (per the plan's own "Next Phase Readiness" note), consider a small parity test that imports both modules' pure functions and asserts identical output across a fixture set of dates, so drift becomes a test failure rather than a runtime disagreement between the calendar's disabled matcher and the server's slot-legality check.

---

_Reviewed: 2026-08-06T02:46:23Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
