// This suite unit-tests only the pure function exported by
// `src/lib/analytics/business-day.ts` -- `businessDayKey`. No Supabase, no
// clock mock: every assertion uses a fixed ISO instant, so results cannot
// depend on the test runner's own timezone or the live clock.
//
// These tests are written to FAIL against the pre-gap-closure code (there was
// no `businessDayKey` at all -- the two call sites used
// `createdAt.slice(0, 10)` and `format(new Date(ts), 'yyyy-MM-dd')`
// respectively). They exist to prove CR-02's fix, not merely to describe it.
import { describe, expect, it } from 'vitest'

import { businessDayKey } from '@/lib/analytics/business-day'

describe('businessDayKey', () => {
    it('keys an evening Chicago instant to the Chicago calendar day, not the UTC day', () => {
        // Arrange
        // 2026-08-07T23:30:00Z is 2026-08-07 18:30 in America/Chicago (CDT,
        // UTC-5) -- same UTC day and same Chicago day, included as a baseline.
        const instant = '2026-08-07T23:30:00Z'

        // Act
        const key = businessDayKey(instant)

        // Assert
        expect(key).toBe('2026-08-07')
    })

    it('keys a UTC-midnight-spanning instant to the PREVIOUS Chicago day, not the UTC day (CR-02)', () => {
        // Arrange
        // 2026-08-08T04:00:00Z is 2026-08-07 23:00 in America/Chicago
        // (CDT, UTC-5) -- this is the exact case that double-counted under
        // the old UTC-day dedupe: a session active just before and just after
        // this instant is the same Chicago evening but crosses the UTC date
        // boundary.
        const instant = '2026-08-08T04:00:00Z'

        // Act
        const key = businessDayKey(instant)

        // Assert
        expect(key).toBe('2026-08-07')
    })

    it('produces the same key for a UTC-midnight-spanning session at both ends, proving it counts once', () => {
        // Arrange
        // Two timestamps on either side of UTC midnight, both within the
        // same Chicago evening (18:50 and 19:10 Chicago on Aug 7).
        const beforeUtcMidnight = '2026-08-07T23:50:00Z'
        const afterUtcMidnight = '2026-08-08T00:10:00Z'

        // Act
        const firstKey = businessDayKey(beforeUtcMidnight)
        const secondKey = businessDayKey(afterUtcMidnight)

        // Assert
        expect(firstKey).toBe(secondKey)
    })

    it('accepts a Date instance directly, not only an ISO string', () => {
        // Arrange
        const instant = new Date('2026-08-08T04:00:00Z')

        // Act
        const key = businessDayKey(instant)

        // Assert
        expect(key).toBe('2026-08-07')
    })

    it('is host-timezone independent -- returns the same key under TZ=UTC and TZ=America/Chicago', () => {
        // Arrange
        const instant = '2026-08-08T04:00:00Z'
        const originalTz = process.env.TZ

        try {
            // Act
            process.env.TZ = 'UTC'
            const keyUnderUtc = businessDayKey(instant)

            process.env.TZ = 'America/Chicago'
            const keyUnderChicago = businessDayKey(instant)

            // Assert
            expect(keyUnderUtc).toBe('2026-08-07')
            expect(keyUnderChicago).toBe('2026-08-07')
            expect(keyUnderUtc).toBe(keyUnderChicago)
        } finally {
            process.env.TZ = originalTz
        }
    })

    it('behaves sanely across the DST boundary (2026-03-08, America/Chicago springs forward)', () => {
        // Arrange
        // 2026-03-08 07:59:00Z is 2026-03-08 01:59 CST (UTC-6, before the
        // 2:00 AM local jump to 3:00 AM CDT).
        const justBeforeSpringForward = '2026-03-08T07:59:00Z'
        // 2026-03-08T08:01:00Z is 2026-03-08 03:01 CDT (UTC-5, immediately
        // after the jump) -- still the same Chicago calendar day.
        const justAfterSpringForward = '2026-03-08T08:01:00Z'

        // Act
        const beforeKey = businessDayKey(justBeforeSpringForward)
        const afterKey = businessDayKey(justAfterSpringForward)

        // Assert
        expect(beforeKey).toBe('2026-03-08')
        expect(afterKey).toBe('2026-03-08')
    })
})
