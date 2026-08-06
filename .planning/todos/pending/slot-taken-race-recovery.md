---
status: pending
created: 2026-08-06
source: 04-REVIEW.md (WR-01, WR-02)
type: bug
severity: warning
---

# Slot-taken race recovery has two UX defects

Both surface only when a customer loses the double-booking race — the path
UAT step 11-14 exercised once. Neither is a security issue and neither
blocks Phase 4 criteria (all five passed human UAT).

## WR-01 — one taken slot marks the whole day fully booked

`src/components/booking/SlotList.tsx:51-54` — `handleSlotTakenRefetch()` calls
`onFullyBookedDate(dateKey)` unconditionally, and
`src/components/booking/BookingCalendar.tsx:125` then renders that entire date
as fully booked in the month view.

**Failure scenario:** a day has 6 open slots. Two customers race for the 9:00
slot. The loser's calendar now shows the whole day as fully booked, hiding 5
genuinely available slots and pushing them to a different day unnecessarily.

**Fix direction:** refetch the day's availability and mark the date fully
booked only when every slot is actually taken — do not infer day-level state
from a single slot collision.

## WR-02 — selectedTime is not cleared, allowing a resubmit loop

`src/components/booking/SlotList.tsx:26,75-83` — `selectedTime` is never reset
after a slot-taken response, so `BookingForm` stays mounted on the same
`apptDate`/`apptTime`.

**Failure scenario:** the customer presses submit again on the slot they were
just told is taken, and gets the same rejection indefinitely.

**Fix direction — careful, there is a real tension here.** Preserving the
entered name/phone is REQUIRED (UAT step 13, verified passing). Only the
selected *time* should clear, so the form data survives while the known-taken
slot is deselected. Do not clear the whole form.

## Constraint

Re-verify UAT steps 11-14 after any change — preserved form data and the
slot-taken message are confirmed-passing behavior that must not regress.
