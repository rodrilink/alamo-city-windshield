import 'server-only'

// D-08's booking guarantee (attempt-insert-and-catch-23505) only holds if the
// calendar the customer sees is accurate. An availability read that fails
// must NEVER be treated as "nothing is booked" -- that would render an
// unavailable database as a fully-open calendar, silently letting a customer
// select a slot the server never actually confirmed as free. This is the
// deliberate inversion of `vin-cache.ts`'s "catch and return null" idiom:
// a cache miss is harmless, but a booking-availability miss is not, so this
// module returns the explicit `{ ok: false }` failure variant from
// `@/types/booking` instead of degrading to an empty result.

import { createAdminClient } from '@/lib/supabase/admin'
import { generateSlotsForDate } from '@/lib/booking/slots'
import { getBusinessNowParts, isSlotInThePast } from '@/lib/server-time'
import type { DayAvailability, MonthAvailability, Slot } from '@/types/booking'

/**
 * Returns which `'yyyy-MM-dd'` dates in the given month are fully booked
 * (BOOK-03, D-07). "Fully booked" is computed per-date against that date's
 * own `generateSlotsForDate` length -- never a hardcoded slot count -- because
 * Saturday has 3 slots while weekdays have more (RESEARCH.md Open Question 2).
 *
 * Only `appt_date`/`appt_time` are selected, never the full row -- booking
 * rows carry customer names and phone numbers this read has no reason to load
 * (T-04-05-07).
 *
 * @param year - The visible month's year.
 * @param month - The visible month, 1-indexed (January = 1).
 * @returns `{ ok: true, data: { fullyBookedDates } }` on success, or `{ ok: false }`
 *   if the read failed -- the caller must NOT treat a failure as "nothing is
 *   booked" (that would silently contradict D-08's guarantee).
 */
export async function getMonthAvailability(year: number, month: number): Promise<MonthAvailability> {
    try {
        const supabase = createAdminClient()

        const rangeStart = formatDateRangeBoundary(year, month, 1)
        const daysInMonth = new Date(year, month, 0).getDate()
        const rangeEnd = formatDateRangeBoundary(year, month, daysInMonth)

        const { data, error } = await supabase
            .from('bookings')
            .select('appt_date, appt_time')
            .gte('appt_date', rangeStart)
            .lte('appt_date', rangeEnd)

        if (error) {
            console.error('getMonthAvailability: Supabase read failed', { year, month, error })
            return { ok: false }
        }

        const bookedCountByDate = new Map<string, number>()
        for (const row of data ?? []) {
            const dateKey = row.appt_date as string
            bookedCountByDate.set(dateKey, (bookedCountByDate.get(dateKey) ?? 0) + 1)
        }

        const fullyBookedDates: string[] = []
        for (const [dateKey, bookedCount] of bookedCountByDate) {
            const totalSlots = generateSlotsForDate(parseLocalDateKey(dateKey)).length
            if (totalSlots > 0 && bookedCount >= totalSlots) {
                fullyBookedDates.push(dateKey)
            }
        }

        return { ok: true, data: { fullyBookedDates } }
    } catch (error) {
        console.error('getMonthAvailability: unexpected error', { year, month, error })
        return { ok: false }
    }
}

/**
 * Returns the full slot list for one date (D-07, BOOK-02), each slot marked
 * available or unavailable. A slot is unavailable if it is already booked OR
 * if it is in the past (per D-05, both render identically in the UI, but the
 * reason stays distinct in the data via `Slot.unavailableReason`). "Past" is
 * always decided server-side via `isSlotInThePast` (D-06) -- never from a
 * value supplied by the caller.
 *
 * @param dateString - The selected date as a `'yyyy-MM-dd'` string.
 * @returns `{ ok: true, data: { slots } }` on success, or `{ ok: false }` if
 *   the read failed -- the caller must NOT treat a failure as "nothing is
 *   booked" (that would silently contradict D-08's guarantee).
 */
export async function getDayAvailability(dateString: string): Promise<DayAvailability> {
    try {
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('bookings')
            .select('appt_date, appt_time')
            .eq('appt_date', dateString)

        if (error) {
            console.error('getDayAvailability: Supabase read failed', { dateString, error })
            return { ok: false }
        }

        const bookedTimes = new Set((data ?? []).map((row) => normalizeTimeString(row.appt_time as string)))
        const nowParts = getBusinessNowParts()

        const slots: Slot[] = generateSlotsForDate(parseLocalDateKey(dateString)).map((time) => {
            if (bookedTimes.has(time)) {
                return { time, available: false, unavailableReason: 'booked' }
            }
            if (isSlotInThePast(dateString, time, nowParts)) {
                return { time, available: false, unavailableReason: 'past' }
            }
            return { time, available: true, unavailableReason: null }
        })

        return { ok: true, data: { slots } }
    } catch (error) {
        console.error('getDayAvailability: unexpected error', { dateString, error })
        return { ok: false }
    }
}

/**
 * Formats a year/month/day into a `'yyyy-MM-dd'` string for the month-range
 * query boundary. Uses plain zero-padded string formatting rather than
 * constructing a `Date` and reading it back -- avoids any timezone
 * round-trip for a value that is only ever compared against Postgres `DATE`
 * columns as text.
 */
function formatDateRangeBoundary(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Parses a `'yyyy-MM-dd'` string into a local `Date` (year/month/day
 * constructor, not `Date.parse`) so `generateSlotsForDate`'s weekday lookup
 * matches the calendar day the string represents, with no UTC shift.
 */
function parseLocalDateKey(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
}

/**
 * Normalizes a Postgres `TIME` value (which PostgREST may return as
 * `'HH:mm:ss'`) down to the `'HH:mm'` shape `generateSlotsForDate` produces,
 * so the booked-times set compares correctly against the generated slot list.
 */
function normalizeTimeString(time: string): string {
    return time.slice(0, 5)
}
