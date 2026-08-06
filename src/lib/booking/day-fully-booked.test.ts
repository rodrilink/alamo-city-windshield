// Unit coverage for `isDayFullyBooked` (WR-01 gap closure). Every case in
// this suite mirrors `slots.test.ts`'s pure-function conventions: no
// Supabase, no network, plain vitest imports, Arrange/Act/Assert comments on
// their own lines.
import { describe, expect, it } from 'vitest'

import { isDayFullyBooked } from '@/lib/booking/day-fully-booked'
import type { DayAvailability, Slot } from '@/types/booking'

/** Builds a `Slot` fixture without hand-rolling the shape in every test. */
function slot(time: string, available: boolean): Slot {
    return { time, available, unavailableReason: available ? null : 'booked' }
}

describe('isDayFullyBooked', () => {
    it('returns false when at least one slot is still available', () => {
        // Arrange
        const availability: DayAvailability = {
            ok: true,
            data: { slots: [slot('09:00', true), slot('10:30', false), slot('12:00', true)] },
        }

        // Act
        const result = isDayFullyBooked(availability)

        // Assert
        expect(result).toBe(false)
    })

    it('returns true when every slot is unavailable', () => {
        // Arrange
        const availability: DayAvailability = {
            ok: true,
            data: { slots: [slot('09:00', false), slot('10:30', false), slot('12:00', false)] },
        }

        // Act
        const result = isDayFullyBooked(availability)

        // Assert
        expect(result).toBe(true)
    })

    it('returns false for an empty slot list because a closed day is not a fully booked day', () => {
        // Arrange
        const availability: DayAvailability = { ok: true, data: { slots: [] } }

        // Act
        const result = isDayFullyBooked(availability)

        // Assert
        expect(result).toBe(false)
    })

    it('returns false for a failed read because a failed read is not evidence of anything', () => {
        // Arrange
        const availability: DayAvailability = { ok: false }

        // Act
        const result = isDayFullyBooked(availability)

        // Assert
        expect(result).toBe(false)
    })

    // WR-01 regression case: the exact failure scenario from the code review
    // finding -- a day with 6 open slots loses a race on exactly 1 of them.
    // The date must NOT be marked fully booked; 5 slots remain genuinely
    // open.
    it('WR-01 regression: returns false when 6 slots exist and only 1 is taken', () => {
        // Arrange
        const availability: DayAvailability = {
            ok: true,
            data: {
                slots: [
                    slot('08:00', true),
                    slot('09:30', false),
                    slot('11:00', true),
                    slot('12:30', true),
                    slot('14:00', true),
                    slot('15:30', true),
                ],
            },
        }

        // Act
        const result = isDayFullyBooked(availability)

        // Assert
        expect(result).toBe(false)
    })
})
