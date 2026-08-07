// This suite unit-tests only the pure function exported by
// `src/lib/analytics/bucket-by-day.ts` -- `bucketByDay`. No Supabase, no
// clock mock: a small `windowDays` (3) and a fixed `now` constructed with an
// explicit local-date constructor keep every assertion stable, mirroring
// `slots.test.ts`'s fixture-date convention.
import { describe, expect, it } from 'vitest'

import { bucketByDay } from '@/lib/analytics/bucket-by-day'

// Fixed reference "today": Wed Aug 12 2026 (explicit local-date constructor,
// never parsed from an ISO string, so results cannot depend on the test
// runner's own timezone).
const NOW = new Date(2026, 7, 12, 15, 30)
const WINDOW_DAYS = 3
// With windowDays = 3 and NOW = Aug 12, the window is [Aug 10, Aug 11, Aug 12].

describe('bucketByDay window shape', () => {
    it('returns exactly windowDays entries', () => {
        // Arrange
        const timestamps: string[] = []

        // Act
        const buckets = bucketByDay(timestamps, NOW, WINDOW_DAYS)

        // Assert
        expect(buckets).toHaveLength(WINDOW_DAYS)
    })

    it('orders entries oldest-first, with the last entry matching now\'s calendar day', () => {
        // Arrange
        const timestamps: string[] = []

        // Act
        const buckets = bucketByDay(timestamps, NOW, WINDOW_DAYS)

        // Assert
        expect(buckets[0].date).toBe('2026-08-10')
        expect(buckets[buckets.length - 1].date).toBe('2026-08-12')
    })
})

describe('bucketByDay zero-fill and counting', () => {
    it('yields every entry with count: 0 for an empty timestamp array (D-01 zero-data case)', () => {
        // Arrange
        const timestamps: string[] = []

        // Act
        const buckets = bucketByDay(timestamps, NOW, WINDOW_DAYS)

        // Assert
        for (const bucket of buckets) {
            expect(bucket.count).toBe(0)
        }
    })

    it('produces a single entry with count: 2 for two timestamps on the same calendar day', () => {
        // Arrange
        const timestamps = ['2026-08-11T08:00:00.000Z', '2026-08-11T20:00:00.000Z']

        // Act
        const buckets = bucketByDay(timestamps, NOW, WINDOW_DAYS)
        const augustEleventh = buckets.find((bucket) => bucket.date === '2026-08-11')

        // Assert
        expect(augustEleventh?.count).toBe(2)
    })

    it('excludes a timestamp older than the window entirely, without adding an extra entry', () => {
        // Arrange
        const timestamps = ['2026-08-01T12:00:00.000Z']

        // Act
        const buckets = bucketByDay(timestamps, NOW, WINDOW_DAYS)
        const totalCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0)

        // Assert
        expect(buckets).toHaveLength(WINDOW_DAYS)
        expect(totalCount).toBe(0)
    })

    it('still counts a timestamp later than now but on the same calendar day in the final bucket', () => {
        // Arrange
        const laterSameDay = new Date(2026, 7, 12, 23, 59)
        const timestamps = [laterSameDay.toISOString()]

        // Act
        const buckets = bucketByDay(timestamps, NOW, WINDOW_DAYS)
        const finalBucket = buckets[buckets.length - 1]

        // Assert
        expect(finalBucket.date).toBe('2026-08-12')
        expect(finalBucket.count).toBe(1)
    })
})

describe('bucketByDay purity', () => {
    it('returns equal output when called twice with the same arguments (no internal clock read)', () => {
        // Arrange
        const timestamps = ['2026-08-11T08:00:00.000Z']

        // Act
        const firstCall = bucketByDay(timestamps, NOW, WINDOW_DAYS)
        const secondCall = bucketByDay(timestamps, NOW, WINDOW_DAYS)

        // Assert
        expect(firstCall).toEqual(secondCall)
    })
})

// Gap closure (06-07, CR-02/T-06-07-04): these tests are written to FAIL
// against the pre-gap-closure code, which keyed counts via
// `format(new Date(ts), 'yyyy-MM-dd')` (host-local). They prove two things
// the previous implementation could not: (1) correct Chicago-day attribution
// for the 19:00-23:59 Chicago evening window under TZ=UTC, and (2) that the
// count-key and axis-key Maps actually join -- i.e. the chart does not
// silently render all zeros, which is the specific regression risk called
// out in the threat register (T-06-07-04).
describe('bucketByDay business-day attribution (CR-02)', () => {
    it('attributes a timestamp in the 19:00-23:59 Chicago evening window to the Chicago day, not the next UTC day', () => {
        // Arrange
        // 2026-08-11T04:30:00Z is 2026-08-10 23:30 in America/Chicago (CDT,
        // UTC-5) -- the "next UTC day, previous Chicago day" case that a
        // host-local bucket key gets wrong.
        const chicagoEveningTimestamp = '2026-08-11T04:30:00.000Z'
        const timestamps = [chicagoEveningTimestamp]

        // Act
        const buckets = bucketByDay(timestamps, NOW, WINDOW_DAYS)
        const augustTenth = buckets.find((bucket) => bucket.date === '2026-08-10')
        const augustEleventh = buckets.find((bucket) => bucket.date === '2026-08-11')

        // Assert
        expect(augustTenth?.count).toBe(1)
        expect(augustEleventh?.count).toBe(0)
    })

    it('does NOT render an all-zero series when timestamps are present -- the count and axis keys join (T-06-07-04)', () => {
        // Arrange
        // Timestamps spread across the window, all well clear of any day
        // boundary, so a correct implementation must land non-zero counts
        // somewhere in the window.
        const timestamps = ['2026-08-10T15:00:00.000Z', '2026-08-11T15:00:00.000Z', '2026-08-12T15:00:00.000Z']

        // Act
        const buckets = bucketByDay(timestamps, NOW, WINDOW_DAYS)
        const totalCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0)

        // Assert
        expect(totalCount).toBeGreaterThan(0)
        expect(totalCount).toBe(timestamps.length)
    })
})
