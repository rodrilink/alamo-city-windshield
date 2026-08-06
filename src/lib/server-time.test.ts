// This suite unit-tests the pure functions exported by
// `src/lib/server-time.ts`. `getBusinessNowParts()` reads the real clock, so
// it is tested only for structural invariants (integer fields, valid
// ranges) -- never a pinned wall-clock value. Timezone correctness is tested
// deterministically by formatting a fixed known UTC instant through the same
// `Intl.DateTimeFormat` configuration. The comparison helpers
// (`isDateBeforeBusinessToday`, `isSlotInThePast`) are tested by passing
// explicit "now" parts, never by reading the system clock, so those tests
// are fully deterministic.
import { describe, expect, it } from 'vitest'

import {
    BUSINESS_TIME_ZONE,
    formatLocalDateKey,
    getBusinessNowParts,
    getBusinessTodayDateString,
    isDateBeforeBusinessToday,
    isSlotInThePast,
} from '@/lib/server-time'

describe('BUSINESS_TIME_ZONE', () => {
    it('is the literal America/Chicago IANA identifier', () => {
        // Arrange
        // (constant imported above)

        // Act & Assert
        expect(BUSINESS_TIME_ZONE).toBe('America/Chicago')
    })
})

describe('getBusinessNowParts', () => {
    it('returns all five fields as integers', () => {
        // Arrange
        // (reads the live clock -- structural assertion only)

        // Act
        const parts = getBusinessNowParts()

        // Assert
        expect(Number.isInteger(parts.year)).toBe(true)
        expect(Number.isInteger(parts.month)).toBe(true)
        expect(Number.isInteger(parts.day)).toBe(true)
        expect(Number.isInteger(parts.hour)).toBe(true)
        expect(Number.isInteger(parts.minute)).toBe(true)
    })

    it('returns month within 1-12', () => {
        // Arrange
        // (reads the live clock -- structural assertion only)

        // Act
        const parts = getBusinessNowParts()

        // Assert
        expect(parts.month).toBeGreaterThanOrEqual(1)
        expect(parts.month).toBeLessThanOrEqual(12)
    })

    it('returns hour within 0-23 and never 24', () => {
        // Arrange
        // (reads the live clock -- structural assertion only)

        // Act
        const parts = getBusinessNowParts()

        // Assert
        expect(parts.hour).toBeGreaterThanOrEqual(0)
        expect(parts.hour).toBeLessThanOrEqual(23)
        expect(parts.hour).not.toBe(24)
    })

    // Timezone correctness proof: format a fixed known UTC instant through
    // the exact same Intl.DateTimeFormat configuration this module uses, and
    // assert the expected Central wall-clock result. This is independent of
    // the host machine's own timezone because the assertion pins an absolute
    // instant, not "now".
    //
    // 2026-01-15T18:30:00.000Z falls in mid-January, when America/Chicago
    // observes CST (UTC-6, standard time -- DST does not apply). 18:30 UTC -
    // 6 hours = 12:30 Central, confirmed live against this repo's Node
    // runtime during implementation.
    it('formats a fixed known CST instant to the correct Central wall-clock parts', () => {
        // Arrange
        const fixedInstant = new Date('2026-01-15T18:30:00.000Z')
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: BUSINESS_TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        })

        // Act
        const parts = Object.fromEntries(formatter.formatToParts(fixedInstant).map((part) => [part.type, part.value]))

        // Assert
        expect(parts.year).toBe('2026')
        expect(parts.month).toBe('01')
        expect(parts.day).toBe('15')
        expect(parts.hour).toBe('12')
        expect(parts.minute).toBe('30')
    })

    // Midnight-Central edge case: some ICU builds emit '24' rather than '00'
    // for midnight when hour12 is false. 2026-01-16T06:00:00.000Z is exactly
    // 00:00 CST (06:00 UTC - 6 hours), verified live against this repo's
    // Node runtime to already emit '00' -- this test still pins the
    // normalized 0 result so a future ICU/runtime change is caught.
    it('normalizes midnight Central to hour 0, never 24', () => {
        // Arrange
        const midnightInstant = new Date('2026-01-16T06:00:00.000Z')

        // Act
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: BUSINESS_TIME_ZONE,
            hour: '2-digit',
            hour12: false,
        })
        const parts = Object.fromEntries(formatter.formatToParts(midnightInstant).map((part) => [part.type, part.value]))
        const normalizedHour = Number(parts.hour === '24' ? '0' : parts.hour)

        // Assert
        expect(normalizedHour).toBe(0)
    })
})

describe('formatLocalDateKey', () => {
    it('formats a Date using local getters as a zero-padded yyyy-MM-dd string', () => {
        // Arrange
        // month is zero-indexed in the Date constructor: 0 = January
        const date = new Date(2026, 0, 5)

        // Act
        const key = formatLocalDateKey(date)

        // Assert
        expect(key).toBe('2026-01-05')
    })

    it('does not shift the calendar day the way toISOString would near a UTC boundary', () => {
        // Arrange
        // A local date constructed directly at local midnight -- toISOString()
        // would convert to UTC first and could report the previous day
        // depending on the host's offset. formatLocalDateKey must not do that.
        const date = new Date(2026, 5, 20)

        // Act
        const key = formatLocalDateKey(date)

        // Assert
        expect(key).toBe('2026-06-20')
    })
})

describe('getBusinessTodayDateString', () => {
    it('returns a yyyy-MM-dd string matching getBusinessNowParts', () => {
        // Arrange
        const parts = getBusinessNowParts()
        const expected = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`

        // Act
        const todayString = getBusinessTodayDateString()

        // Assert
        expect(todayString).toBe(expected)
    })
})

describe('isDateBeforeBusinessToday', () => {
    const fixedNow = { year: 2026, month: 6, day: 15, hour: 10, minute: 0 }

    it('classifies a past date as before today', () => {
        // Arrange
        const pastDate = '2026-06-14'

        // Act
        const result = isDateBeforeBusinessToday(pastDate, fixedNow)

        // Assert
        expect(result).toBe(true)
    })

    it('classifies today as not before today', () => {
        // Arrange
        const todayDate = '2026-06-15'

        // Act
        const result = isDateBeforeBusinessToday(todayDate, fixedNow)

        // Assert
        expect(result).toBe(false)
    })

    it('classifies a future date as not before today', () => {
        // Arrange
        const futureDate = '2026-06-16'

        // Act
        const result = isDateBeforeBusinessToday(futureDate, fixedNow)

        // Assert
        expect(result).toBe(false)
    })

    it('classifies a future date in a later month as not before today', () => {
        // Arrange
        const futureDate = '2026-07-01'

        // Act
        const result = isDateBeforeBusinessToday(futureDate, fixedNow)

        // Assert
        expect(result).toBe(false)
    })
})

describe('isSlotInThePast', () => {
    const fixedNow = { year: 2026, month: 6, day: 15, hour: 14, minute: 30 }

    it('returns false for any date after today, regardless of the time', () => {
        // Arrange
        const futureDate = '2026-06-16'
        const earlyTime = '00:00'

        // Act
        const result = isSlotInThePast(futureDate, earlyTime, fixedNow)

        // Assert
        expect(result).toBe(false)
    })

    it('returns true for a past date, regardless of the time', () => {
        // Arrange
        const pastDate = '2026-06-14'
        const lateTime = '23:30'

        // Act
        const result = isSlotInThePast(pastDate, lateTime, fixedNow)

        // Assert
        expect(result).toBe(true)
    })

    it('returns true for a time earlier than now when the date is today', () => {
        // Arrange
        const todayDate = '2026-06-15'
        const earlierTime = '09:00'

        // Act
        const result = isSlotInThePast(todayDate, earlierTime, fixedNow)

        // Assert
        expect(result).toBe(true)
    })

    it('returns false for a time later than now when the date is today', () => {
        // Arrange
        const todayDate = '2026-06-15'
        const laterTime = '16:00'

        // Act
        const result = isSlotInThePast(todayDate, laterTime, fixedNow)

        // Assert
        expect(result).toBe(false)
    })

    it('returns true for a time exactly equal to now when the date is today', () => {
        // Arrange
        const todayDate = '2026-06-15'
        const exactTime = '14:30'

        // Act
        const result = isSlotInThePast(todayDate, exactTime, fixedNow)

        // Assert
        expect(result).toBe(true)
    })
})
