// Shared booking and contact contract.
//
// This module is imported by BOTH Client Components (BookingCalendar,
// SlotList, BookingForm, ContactForm) and server modules (booking-actions.ts,
// contact-actions.ts, booking-availability.ts Server Actions/reads). This
// file MUST NOT gain the build-time server-side-only import fence used
// elsewhere in this repo (see `src/lib/server-time.ts`'s header comment for
// that pattern) and must never contain a secret value — every type here
// describes shapes that either originate from the browser (form values) or
// are explicitly meant to reach the browser (slot availability, action
// result state). See `src/types/vehicle.ts` for the precedent this module
// follows.

/**
 * D-05: the two distinct reasons a slot can be unselectable. Both reasons
 * render with the SAME visual treatment (a caller must not branch on this to
 * change the UI), but the type keeps them distinguishable so a future
 * feature (e.g. an admin-only "why is this blocked" tooltip) doesn't require
 * a breaking change to this contract.
 */
export type SlotUnavailableReason = 'past' | 'booked'

/**
 * A single bookable appointment slot on one date. `available` slots are
 * selectable; `unavailableReason` is `null` only when `available` is `true`.
 */
export interface Slot {
    /** The slot's start time as a `'HH:mm'` 24-hour string (see `generateSlotsForDate`). */
    time: string
    available: boolean
    /** D-05: why this slot is unselectable. Always `null` when `available` is `true`. */
    unavailableReason: SlotUnavailableReason | null
}

/**
 * Values collected by the booking form (BOOK-06). All four customer fields
 * are required because `bookings.name`/`last_name`/`phone` are `NOT NULL` in
 * the schema — `vin` is the only optional customer-supplied field.
 *
 * D-19: this contract deliberately has no field for the derived vehicle
 * description string. It is computed server-side from a re-decode of `vin`
 * (never accepted from the client) — making it unrepresentable here is the
 * enforcement mechanism, not just a convention.
 */
export interface BookingFormValues {
    firstName: string
    lastName: string
    phone: string
    /** Optional 17-character VIN, carried from `/book?vin=` (D-18). */
    vin: string | null
    /** Selected appointment date as a `'yyyy-MM-dd'` string. */
    apptDate: string
    /** Selected appointment time as a `'HH:mm'` 24-hour string. */
    apptTime: string
    /** D-14: honeypot field. A non-empty value means reject silently. */
    honeypot: string
}

/**
 * Values collected by the contact form (CONT-01). `address` is optional per
 * the schema; `message` is deliberately absent — CONTEXT.md's Deferred Ideas
 * leaves the `contacts.message` column unused in v1.
 */
export interface ContactFormValues {
    firstName: string
    lastName: string
    phone: string
    address: string | null
    /** CONT-03: honeypot field. A non-empty value means reject silently. */
    honeypot: string
}

/**
 * Discriminated result of the `createBooking` Server Action (D-08, D-09,
 * D-10, D-13).
 *
 * - `'idle'` — the initial state before any submission.
 * - `'success'` — the booking was inserted; render `BookingConfirmation`.
 * - `'slot-taken'` — reachable ONLY when the insert failed with Postgres
 *   error code `23505` (the `UNIQUE (appt_date, appt_time)` violation). This
 *   is the one and only signal for "someone else took this slot first."
 * - `'error'` — every other failure (network drop, RLS rejection, invalid
 *   payload, off-grid `apptTime` caught by D-15's server-side
 *   re-validation). `'error'` must NEVER disable the submitted slot in the
 *   UI — the slot may still be free; disabling it on a merely-transient
 *   failure would be misleading (D-10).
 */
export type BookingActionStatus = 'idle' | 'success' | 'slot-taken' | 'error'

export interface BookingActionState {
    status: BookingActionStatus
    /** D-09: the submitted values, preserved on every non-success outcome so entered data survives a failed submit. */
    values: BookingFormValues
    fieldErrors?: Partial<Record<keyof BookingFormValues, string>>
    /** A pre-written, constants-module string (never raw Postgres error text — see D-10). */
    message?: string
}

/**
 * Discriminated result of the `createContact` Server Action. Same shape as
 * `BookingActionState` minus `'slot-taken'` — the `contacts` table carries no
 * `UNIQUE` constraint, so a collision-based failure class does not exist for
 * this form.
 */
export type ContactActionStatus = 'idle' | 'success' | 'error'

export interface ContactActionState {
    status: ContactActionStatus
    values: ContactFormValues
    fieldErrors?: Partial<Record<keyof ContactFormValues, string>>
    message?: string
}

/**
 * Result of a month-level or day-level availability read (BOOK-03, D-07,
 * D-08). Modeled as a discriminated union so "the read failed" and "nothing
 * is booked" are two different values, never collapsed into one — an
 * `AvailabilityReadResult` of `{ ok: true, data: [] }` means the calendar
 * truly has no bookings; `{ ok: false }` means the query itself failed and
 * the caller must NOT treat that as "fully open" (that would silently
 * contradict D-08's booking guarantee by letting a customer select a slot
 * the server never actually confirmed as free).
 */
export type AvailabilityReadResult<TData> = { ok: true; data: TData } | { ok: false }

/** Month-level availability: which `'yyyy-MM-dd'` dates in the visible month are fully booked (BOOK-03, D-07). */
export type MonthAvailability = AvailabilityReadResult<{ fullyBookedDates: string[] }>

/** Day-level availability: the full slot list (available and unavailable) for one selected date (D-07 refresh-on-select). */
export type DayAvailability = AvailabilityReadResult<{ slots: Slot[] }>
