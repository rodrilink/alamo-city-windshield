import { describe, expect, it } from 'vitest'

import { bookingSchema, isLegalSlot } from '@/lib/booking/booking-schema'

// This suite unit-tests `bookingSchema` and `isLegalSlot` as pure functions --
// no Supabase, no Server Action. `isLegalSlot` calls the real
// `generateSlotsForDate`, so these tests are also the D-02 invariant's proof
// that slot-legality validation is backed by the same grid the calendar UI
// displays, not a parallel rule.

const VALID_VIN = '1HGCM82633A004352'

function baseBookingPayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '210-555-0100',
        vin: null,
        apptDate: '2026-08-10', // a Monday
        apptTime: '09:00',
        honeypot: '',
        ...overrides,
    }
}

describe('bookingSchema required fields', () => {
    it('fails when name, last name, or phone is missing', () => {
        // Arrange
        const payload = baseBookingPayload({ firstName: '', lastName: '', phone: '' })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('passes a well-formed submission with all required fields present', () => {
        // Arrange
        const payload = baseBookingPayload()

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })
})

describe('bookingSchema VIN validation', () => {
    it('passes a well-formed 17-character VIN', () => {
        // Arrange
        const payload = baseBookingPayload({ vin: VALID_VIN })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })

    it('fails a 16-character VIN', () => {
        // Arrange
        const payload = baseBookingPayload({ vin: VALID_VIN.slice(0, 16) })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('fails a VIN containing the excluded letter I', () => {
        // Arrange
        const payload = baseBookingPayload({ vin: 'IHGCM82633A004352' })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('passes when VIN is omitted -- VIN is optional on a booking (BOOK-06)', () => {
        // Arrange
        const payload = baseBookingPayload({ vin: null })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })

    it('passes when VIN is an empty string', () => {
        // Arrange
        const payload = baseBookingPayload({ vin: '' })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })
})

describe('bookingSchema length caps', () => {
    it('passes a firstName of exactly 100 characters', () => {
        // Arrange
        const payload = baseBookingPayload({ firstName: 'a'.repeat(100) })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })

    it('fails a firstName of 101 characters', () => {
        // Arrange
        const payload = baseBookingPayload({ firstName: 'a'.repeat(101) })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('fails a lastName of 101 characters', () => {
        // Arrange
        const payload = baseBookingPayload({ lastName: 'a'.repeat(101) })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('fails a phone of 31 characters', () => {
        // Arrange
        const payload = baseBookingPayload({ phone: '1'.repeat(31) })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('fails a multi-kilobyte firstName -- the WR-03 scripted-POST threat case', () => {
        // Arrange
        const payload = baseBookingPayload({ firstName: 'a'.repeat(10000) })

        // Act
        const result = bookingSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })
})

describe('isLegalSlot -- D-15 / Pitfall 4 guard', () => {
    it('rejects appt_time 03:00 for a weekday date, because it is not a member of the generated slot list', () => {
        // Arrange
        const weekday = '2026-08-10' // Monday

        // Act
        const legal = isLegalSlot(weekday, '03:00')

        // Assert
        expect(legal).toBe(false)
    })

    it('rejects any Sunday appt_date, because Sunday generates zero slots', () => {
        // Arrange
        const sunday = '2026-08-09'

        // Act
        const legal = isLegalSlot(sunday, '09:00')

        // Assert
        expect(legal).toBe(false)
    })

    const SLOT_LEGALITY_FIXTURES: ReadonlyArray<readonly [string, string, string, boolean]> = [
        ['weekday 12:30 is accepted (ends 2:00 PM, well before 6:00 PM close)', '2026-08-10', '12:30', true],
        ['Saturday 12:30 is rejected (would end 2:00 PM, at the boundary with no slot starting there)', '2026-08-08', '12:30', false],
        ['Saturday 09:00 is accepted (business opens 9:00 AM)', '2026-08-08', '09:00', true],
    ]

    it.each(SLOT_LEGALITY_FIXTURES)('%s', (_name, apptDate, apptTime, expectedLegal) => {
        // Arrange
        // (fixture values provided by the parameterized case)

        // Act
        const legal = isLegalSlot(apptDate, apptTime)

        // Assert
        expect(legal).toBe(expectedLegal)
    })
})
