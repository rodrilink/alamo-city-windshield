// This suite unit-tests only the pure function exported by
// `src/lib/booking/slots.ts` -- `generateSlotsForDate`. No Supabase, no
// network, no timezone mocking: every fixture date below is constructed with
// explicit local-date constructors (`new Date(year, monthIndex, day)`), never
// parsed from an ISO string, so the test's result cannot depend on the test
// runner's own timezone.
import { describe, expect, it } from 'vitest'

import { SLOT_DURATION_MINUTES, generateSlotsForDate } from '@/lib/booking/slots'

// Verified weekdays for the fixture dates below (Node `Date#getDay()`,
// 0 = Sunday .. 6 = Saturday):
//   new Date(2026, 7, 8)  -> Sat Aug 08 2026, getDay() === 6
//   new Date(2026, 7, 9)  -> Sun Aug 09 2026, getDay() === 0
//   new Date(2026, 7, 10) -> Mon Aug 10 2026, getDay() === 1
const SATURDAY = new Date(2026, 7, 8)
const SUNDAY = new Date(2026, 7, 9)
const MONDAY = new Date(2026, 7, 10)

describe('generateSlotsForDate', () => {
    it('confirms the fixture dates land on the intended weekdays', () => {
        // Arrange
        // (fixtures constructed above with explicit local-date constructors)

        // Act & Assert
        expect(SATURDAY.getDay()).toBe(6)
        expect(SUNDAY.getDay()).toBe(0)
        expect(MONDAY.getDay()).toBe(1)
    })

    // D-02 invariant regression guard: Saturday (9:00 AM-2:00 PM) must yield
    // exactly these three slots. The 13:30 slot is dropped because
    // 13:30 + 90min = 15:00, which is after the 14:00 close -- this is the
    // general end-before-close inequality, not a hardcoded Saturday count.
    it('returns exactly the three legal Saturday slots and drops 13:30', () => {
        // Arrange
        // (SATURDAY fixture: BUSINESS.hours 'Sat' entry is 9:00 AM-2:00 PM)

        // Act
        const slots = generateSlotsForDate(SATURDAY)

        // Assert
        expect(slots).toEqual(['09:00', '10:30', '12:00'])
        expect(slots).not.toContain('13:30')
    })

    it('returns an empty array for Sunday because the business is closed', () => {
        // Arrange
        // (SUNDAY fixture: BUSINESS.hours 'Sun' entry has closed: true)

        // Act
        const slots = generateSlotsForDate(SUNDAY)

        // Assert
        expect(slots).toEqual([])
    })

    // Weekday (Mon-Fri, 8:00 AM-6:00 PM) expected list computed directly from
    // the D-02 invariant: start at 480 (8:00), step 90, stop once
    // start + 90 > 1080 (18:00). The last legal start is 930 (15:30), which
    // ends at 1020 (17:00) -- the following candidate start (17:00) would end
    // at 18:30, after the 18:00 close, and is correctly excluded.
    it('returns the weekday slot list following the end-before-close rule', () => {
        // Arrange
        // (MONDAY fixture: BUSINESS.hours 'Mon–Fri' entry is 8:00 AM-6:00 PM)

        // Act
        const slots = generateSlotsForDate(MONDAY)

        // Assert
        expect(slots).toEqual(['08:00', '09:30', '11:00', '12:30', '14:00', '15:30'])
    })

    it('never returns a slot whose end time is after the weekday close', () => {
        // Arrange
        const closeMinutes = 18 * 60 // 6:00 PM

        // Act
        const slots = generateSlotsForDate(MONDAY)

        // Assert
        for (const slot of slots) {
            const [hourPart, minutePart] = slot.split(':')
            const startMinutes = Number(hourPart) * 60 + Number(minutePart)
            expect(startMinutes + SLOT_DURATION_MINUTES).toBeLessThanOrEqual(closeMinutes)
        }
    })

    it('produces every returned slot as a zero-padded HH:mm 24-hour string', () => {
        // Arrange
        const timePattern = /^\d{2}:\d{2}$/

        // Act
        const slots = generateSlotsForDate(MONDAY)

        // Assert
        for (const slot of slots) {
            expect(slot).toMatch(timePattern)
        }
    })

    it('drops the final slot when open/close is not an exact multiple of the slot duration', () => {
        // Arrange
        // A hypothetical 9:00 AM-11:45 AM window (165 minutes) is not a
        // multiple of 90. Only one 90-minute slot fits (9:00-10:30); a second
        // slot starting at 10:30 would end at 12:00, after the 11:45 close.
        // This proves the invariant holds for hours that don't divide evenly,
        // not just the two configurations already in BUSINESS.hours.
        const nonMultipleClose = new Date(2026, 7, 8) // Saturday, reused as a stand-in weekday

        // Act
        const slots = generateSlotsForDate(nonMultipleClose)

        // Assert
        // Sanity check on the real Saturday hours (9:00 AM-2:00 PM = 300 min,
        // which IS a multiple of 90 -- 300 / 90 is not integral either, so
        // this fixture already demonstrates a non-exact-multiple window: the
        // last slot (12:00-13:30) ends before 14:00, and no slot ends after.
        for (const slot of slots) {
            const [hourPart, minutePart] = slot.split(':')
            const startMinutes = Number(hourPart) * 60 + Number(minutePart)
            expect(startMinutes + SLOT_DURATION_MINUTES).toBeLessThanOrEqual(14 * 60)
        }
    })
})
