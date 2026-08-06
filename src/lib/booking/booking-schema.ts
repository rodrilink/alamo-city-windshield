// Shared client/server validation contract for the booking form (BOOK-06).
//
// Deliberately NOT build-time server-side-only fenced: RESEARCH.md's
// Architectural Responsibility Map places form validation on both tiers on
// purpose -- the same schema runs client-side as the react-hook-form
// resolver for fast feedback, and again server-side inside `createBooking`
// as the untrusted-input gate. A build-time server-side-only fence here would
// break the client resolver, which is the standard double-validation
// pattern, not duplication.
//
// The slot-legality validator (`isLegalSlot`) is a SEPARATE export, not a
// Zod `.refine()` wired into `bookingSchema` itself. `generateSlotsForDate`
// (src/lib/booking/slots.ts) carries no such build-time fence of its own
// (see that file's header comment -- its output is not secret), so pulling
// it into a refinement would still work at the type level, but keeping it a
// distinct export mirrors D-15's framing as an independent re-validation
// step run explicitly by the Server Action, not an implicit side effect of
// parsing. This also keeps `bookingSchema` usable for client-side field-level
// errors (missing name, malformed VIN) without also needing slot data wired
// through the resolver.
//
// WR-03: `createBooking` is a public, unauthenticated Server Action, so the
// `.max()` caps below are the application-layer bound against a scripted
// POST that never touches the React form. The backing Postgres columns
// remain unbounded `TEXT` by design -- the shared migration (used by Phases
// 1, 3, 5, and 6) is not modified by this change.

import { z } from 'zod'

import { generateSlotsForDate } from '@/lib/booking/slots'
import { VIN_REGEX } from '@/types/vehicle'

/**
 * Zod schema for the booking form's required customer fields, matching the
 * `bookings.name`/`last_name`/`phone` `NOT NULL` columns (see the migration).
 * `vin` is optional (BOOK-06) and validated with the existing shared
 * `VIN_REGEX` -- no second VIN pattern is defined here.
 */
export const bookingSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(100, 'First name is too long'),
    lastName: z.string().trim().min(1, 'Last name is required').max(100, 'Last name is too long'),
    phone: z.string().trim().min(1, 'Phone number is required').max(30, 'Phone number is too long'),
    vin: z
        .string()
        .trim()
        .toUpperCase()
        .refine((value) => value === '' || VIN_REGEX.test(value), {
            message: 'Enter a valid 17-character VIN, or leave this blank',
        })
        .nullable(),
    apptDate: z.string().trim().min(1, 'Appointment date is required'),
    apptTime: z.string().trim().min(1, 'Appointment time is required'),
    honeypot: z.string().max(200),
})

/**
 * D-15: confirms the submitted `apptTime` is a member of the slot list
 * `generateSlotsForDate` produces for `apptDate` -- the same function that
 * backs the displayed slot list, so the two can never disagree. This is the
 * control that stops a crafted `apptTime` (e.g. `'03:00'`) the `UNIQUE`
 * constraint would happily accept, and it also rejects any `apptDate` that
 * generates zero slots (Sunday, or any date the business is closed).
 *
 * @param apptDate - The submitted appointment date as a `'yyyy-MM-dd'` string.
 * @param apptTime - The submitted appointment time as a `'HH:mm'` 24-hour string.
 * @returns `true` only when `apptTime` is a legal slot start time for `apptDate`.
 */
export function isLegalSlot(apptDate: string, apptTime: string): boolean {
    const [year, month, day] = apptDate.split('-').map(Number)
    if (!year || !month || !day) return false

    const date = new Date(year, month - 1, day)
    const legalSlots = generateSlotsForDate(date)
    return legalSlots.includes(apptTime)
}
