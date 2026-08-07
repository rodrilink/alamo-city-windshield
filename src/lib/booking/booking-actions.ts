'use server'

// The repo's first Server Action (D-13). `createBooking` runs honeypot ->
// Zod re-validation -> slot-legality re-validation (D-15) -> insert, in that
// exact order, mirroring the outcome-branching discipline of
// `src/app/api/vin/[vin]/route.ts` (a discriminated status, logging
// diagnostic detail server-side only, never in the returned state) and using
// `createAdminClient()` exactly as `vin-cache.ts` does.
//
// Deliberately does NOT copy `vin-cache.ts`'s catch-and-return-null idiom:
// that shape is correct for a cache where failure is harmless (D-21 of Phase
// 3), but silently discarding a booking insert failure would hide a real
// customer-facing problem. Every failure here is branched and reported via
// `BookingActionState`, never swallowed.

import { createAdminClient } from '@/lib/supabase/admin'
import { bookingSchema, isLegalSlot } from '@/lib/booking/booking-schema'
import { BOOKING_COPY, BUSINESS } from '@/lib/constants'
import { trackServerEvent } from '@/lib/analytics/track-event'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import type { BookingActionState, BookingFormValues } from '@/types/booking'

/**
 * Server Action backing the booking form (BOOK-05, D-08 through D-15).
 *
 * Control order, each gating the next:
 * 1. Honeypot (D-14) — a filled honeypot returns silently as if the
 *    submission succeeded, with no write. Applied to bookings (not just
 *    contacts, per CONT-03) because a scripted insert would otherwise
 *    permanently occupy a slot via the `UNIQUE` constraint.
 * 2. Zod re-validation — the client already validated; this run is the
 *    untrusted-input gate, since a crafted POST never touches the client
 *    resolver.
 * 3. Slot-legality re-validation (D-15) — rejects an off-grid, past-closing,
 *    or Sunday `apptTime` with `status: 'error'`, NOT `'slot-taken'`: this is
 *    a different failure class than a race (RESEARCH.md Pitfall 4), and the
 *    slot must not be marked unavailable since it was never real.
 * 4. Insert (D-08) — attempted directly, no availability `SELECT` first. The
 *    `UNIQUE (appt_date, appt_time)` constraint is the only real guarantee
 *    under concurrent requests.
 * 5. Branch on `error.code` (D-10) — `'23505'` and only that code means the
 *    slot was taken. Any other error returns a generic, phone-inclusive
 *    message and must NOT disable the slot, since it may still be free.
 *    Raw Postgres/PostgREST diagnostics never reach the returned state; they
 *    are logged server-side via `console.error` only (T-04-05-06).
 *
 * @param prevState - The previous action state (unused directly, but required by `useActionState`'s signature).
 * @param formData - The submitted form data, including `vehicleDesc` supplied by the caller from a server-side VIN re-decode (plan `04-06`) — never read from `formData` itself for that field (D-19).
 * @returns The next `BookingActionState`, preserving submitted values on every non-success path (D-09).
 */
export async function createBooking(prevState: BookingActionState, formData: FormData): Promise<BookingActionState> {
    const values: BookingFormValues = {
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        vin: formData.get('vin') ? String(formData.get('vin')) : null,
        apptDate: String(formData.get('apptDate') ?? ''),
        apptTime: String(formData.get('apptTime') ?? ''),
        honeypot: String(formData.get('honeypot') ?? ''),
    }

    // 1. Honeypot (D-14). Reject silently -- the bot gets no signal that its
    // submission was discarded. Runs before any database call.
    if (values.honeypot !== '') {
        return { status: 'success', values }
    }

    // 2. Zod re-validation (untrusted-input gate).
    const parsed = bookingSchema.safeParse(values)
    if (!parsed.success) {
        const fieldErrors: Partial<Record<keyof BookingFormValues, string>> = {}
        for (const issue of parsed.error.issues) {
            const field = issue.path[0] as keyof BookingFormValues | undefined
            if (field && !fieldErrors[field]) {
                fieldErrors[field] = issue.message
            }
        }
        return { status: 'error', values, fieldErrors, message: `${BOOKING_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }

    // 3. Slot-legality re-validation (D-15). A different failure class than
    // a race -- reject with 'error', never 'slot-taken', since the slot was
    // never real.
    if (!isLegalSlot(values.apptDate, values.apptTime)) {
        return { status: 'error', values, message: `${BOOKING_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }

    // Server-derived vehicle description (D-19): only ever taken from a
    // caller-supplied field the Server Action itself does not compute --
    // plan 04-06 passes this in from its own server-side VIN re-decode.
    // Never read `vehicleDesc` from `formData` here.
    const vehicleDesc = formData.get('serverVehicleDesc') ? String(formData.get('serverVehicleDesc')) : null

    // 4. Insert (D-08). Attempt directly -- no check-then-insert. The
    // UNIQUE (appt_date, appt_time) constraint is the sole arbiter.
    try {
        const supabase = createAdminClient()
        const { error } = await supabase.from('bookings').insert({
            name: parsed.data.firstName,
            last_name: parsed.data.lastName,
            phone: parsed.data.phone,
            vin: parsed.data.vin,
            vehicle_desc: vehicleDesc,
            appt_date: parsed.data.apptDate,
            appt_time: parsed.data.apptTime,
            status: 'pending',
        })

        // 5. Branch on error.code, never error.message (D-10).
        if (error?.code === '23505') {
            return { status: 'slot-taken', values, message: BOOKING_COPY.slotTakenMessage }
        }
        if (error) {
            console.error('createBooking: insert failed', { error })
            return { status: 'error', values, message: `${BOOKING_COPY.genericErrorMessage} ${BUSINESS.phone}` }
        }

        // D-11: fires only past both error branches above -- the honeypot
        // early-return and the '23505' slot-taken race are deliberately
        // eventless, since neither produced a real `bookings` row.
        await trackServerEvent(ANALYTICS_EVENTS.BOOKING_CREATED)

        return { status: 'success', values }
    } catch (error) {
        console.error('createBooking: unexpected error', { error })
        return { status: 'error', values, message: `${BOOKING_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }
}
