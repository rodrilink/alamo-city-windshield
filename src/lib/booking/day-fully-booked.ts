// WR-01 gap closure (.planning/todos/pending/slot-taken-race-recovery.md):
// day-level "fully booked" state was previously INFERRED at the call site in
// `SlotList.tsx` -- a single lost slot-taken race unconditionally marked the
// whole date fully booked in the month calendar, even when the date had
// several other genuinely open slots. This module extracts that derivation
// into an explicitly tested pure predicate so "every slot taken" is proven,
// never assumed from one collision.
//
// Two cases deliberately return `false` even though they might look like
// "fully booked" at a glance:
//   - `{ ok: false }` (a failed read): a failed read is not evidence of
//     anything. Treating a failure as "fully booked" would falsely hide an
//     otherwise-open date from the customer for no reason.
//   - an empty slot list: a day that generates no slots at all (e.g. Sunday,
//     or any other `BUSINESS.hours`-closed day) is "closed", not "fully
//     booked" -- the calendar already disables those dates via its own
//     `disabled` matcher, and reporting `true` here would conflate two
//     distinct reasons for a date being unselectable.

import type { DayAvailability } from '@/types/booking'

/**
 * Derives whether every slot on a given date is unavailable, from a
 * refetched day-level availability read.
 *
 * @param availability - The result of a day-level availability read (e.g. `refreshDayAvailability`).
 * @returns `true` only when the read succeeded, produced at least one slot, and every slot is unavailable.
 */
export function isDayFullyBooked(availability: DayAvailability): boolean {
    if (!availability.ok) return false
    if (availability.data.slots.length === 0) return false
    return availability.data.slots.every((slot) => !slot.available)
}
