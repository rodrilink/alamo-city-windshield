// This suite deliberately pins values, not logic. `dashboard-queries.ts`
// reads `page_view` and `vin_search` as `.eq('event_type', ...)` filters, so
// a changed string on either side produces an empty chart with no error --
// the exact silent-failure risk recorded in STATE.md (D-01). Its job is to
// make a change to any of the four strings, or the addition of a fifth
// event type, fail loudly in CI rather than silently at runtime.
import { describe, expect, it } from 'vitest'

import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

describe('ANALYTICS_EVENTS string values', () => {
    it('pins PAGE_VIEW to the literal dashboard-queries.ts filters on for ADMIN-02', () => {
        // Arrange
        const expected = 'page_view'

        // Act
        const actual = ANALYTICS_EVENTS.PAGE_VIEW

        // Assert
        expect(actual).toBe(expected)
    })

    it('pins VIN_SEARCH to the literal dashboard-queries.ts filters on for ADMIN-04', () => {
        // Arrange
        const expected = 'vin_search'

        // Act
        const actual = ANALYTICS_EVENTS.VIN_SEARCH

        // Assert
        expect(actual).toBe(expected)
    })

    it('pins CONTACT_SUBMIT to the literal contact-actions.ts writes on success', () => {
        // Arrange
        const expected = 'contact_submit'

        // Act
        const actual = ANALYTICS_EVENTS.CONTACT_SUBMIT

        // Assert
        expect(actual).toBe(expected)
    })

    it('pins BOOKING_CREATED to the literal booking-actions.ts writes on success', () => {
        // Arrange
        const expected = 'booking_created'

        // Act
        const actual = ANALYTICS_EVENTS.BOOKING_CREATED

        // Assert
        expect(actual).toBe(expected)
    })
})

describe('ANALYTICS_EVENTS closed taxonomy (D-04)', () => {
    it('has exactly four members -- a fifth member fails this test deliberately', () => {
        // Arrange
        const expectedMemberCount = 4

        // Act
        const memberCount = Object.keys(ANALYTICS_EVENTS).length

        // Assert
        expect(memberCount).toBe(expectedMemberCount)
    })
})
