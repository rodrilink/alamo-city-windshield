import { describe, expect, it } from 'vitest'

import { contactSchema } from '@/lib/contact/contact-schema'

// This suite unit-tests `contactSchema` as a pure function -- no Supabase, no
// Server Action, matching the framing of `booking-schema.test.ts`.

function baseContactPayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '210-555-0100',
        address: null,
        honeypot: '',
        ...overrides,
    }
}

describe('contactSchema required fields', () => {
    it('passes a well-formed submission with all required fields present', () => {
        // Arrange
        const payload = baseContactPayload()

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })

    it('fails when name, last name, or phone is missing', () => {
        // Arrange
        const payload = baseContactPayload({ firstName: '', lastName: '', phone: '' })

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('passes when address is null -- address is optional (CONT-01)', () => {
        // Arrange
        const payload = baseContactPayload({ address: null })

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })
})

describe('contactSchema length caps', () => {
    it('passes a firstName of exactly 100 characters', () => {
        // Arrange
        const payload = baseContactPayload({ firstName: 'a'.repeat(100) })

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })

    it('fails a firstName of 101 characters', () => {
        // Arrange
        const payload = baseContactPayload({ firstName: 'a'.repeat(101) })

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('fails a lastName of 101 characters', () => {
        // Arrange
        const payload = baseContactPayload({ lastName: 'a'.repeat(101) })

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('fails a phone of 31 characters', () => {
        // Arrange
        const payload = baseContactPayload({ phone: '1'.repeat(31) })

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('passes an address of exactly 300 characters', () => {
        // Arrange
        const payload = baseContactPayload({ address: 'a'.repeat(300) })

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })

    it('fails an address of 301 characters', () => {
        // Arrange
        const payload = baseContactPayload({ address: 'a'.repeat(301) })

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('fails a multi-kilobyte firstName -- the WR-03 scripted-POST threat case', () => {
        // Arrange
        const payload = baseContactPayload({ firstName: 'a'.repeat(10000) })

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })
})
