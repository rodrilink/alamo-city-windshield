'use server'

// D-07's refresh-on-select Server Action. Per RESEARCH.md Open Question 1's
// recommendation, the initial month load on `/book` is a Server Component
// fetch (no extra network hop), while this on-select re-fetch is a Server
// Action -- keeping it consistent with the write path's error handling and
// avoiding a third Route Handler pattern in this phase. Also reused by
// `BookingForm.tsx` after a lost 'slot-taken' race (D-09) to refresh the
// just-taken slot's disabled state without a full page reload.

import { getDayAvailability, getMonthAvailability } from '@/lib/booking/booking-availability'
import type { DayAvailability, MonthAvailability } from '@/types/booking'

/**
 * Returns the full slot list for one date by delegating to `04-05`'s
 * day-level availability read. Thin wrapper only -- all read/branch logic
 * lives in `booking-availability.ts`; this file exists solely to expose that
 * read as a Server Action callable from Client Components.
 *
 * @param dateString - The selected date as a `'yyyy-MM-dd'` string.
 * @returns The day's availability read result (see `getDayAvailability`).
 */
export async function refreshDayAvailability(dateString: string): Promise<DayAvailability> {
    return getDayAvailability(dateString)
}

/**
 * Returns which dates in the given month are fully booked, by delegating to
 * `04-05`'s month-level availability read. Called when the visible month
 * changes on `/book` (D-07's month-upfront re-fetch), since the initial
 * month's data only covers the month the page first rendered.
 *
 * @param year - The visible month's year.
 * @param month - The visible month, 1-indexed (January = 1).
 * @returns The month's availability read result (see `getMonthAvailability`).
 */
export async function refreshMonthAvailability(year: number, month: number): Promise<MonthAvailability> {
    return getMonthAvailability(year, month)
}
