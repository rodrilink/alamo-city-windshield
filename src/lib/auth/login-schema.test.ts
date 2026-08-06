import { describe, expect, it } from 'vitest'

import { loginSchema } from '@/lib/auth/login-schema'

// This suite unit-tests `loginSchema` as a pure function -- no Supabase, no
// Server Action, matching the framing of `contact-schema.test.ts`.

function baseLoginPayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        email: 'admin@example.com',
        password: 'hunter2hunter2',
        ...overrides,
    }
}

describe('loginSchema required fields', () => {
    it('passes a well-formed submission with a valid email and password', () => {
        // Arrange
        const payload = baseLoginPayload()

        // Act
        const result = loginSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })

    it('fails when email is missing the @ character', () => {
        // Arrange
        const payload = baseLoginPayload({ email: 'not-an-email' })

        // Act
        const result = loginSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('fails when email is empty', () => {
        // Arrange
        const payload = baseLoginPayload({ email: '' })

        // Act
        const result = loginSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('fails when password is empty', () => {
        // Arrange
        const payload = baseLoginPayload({ password: '' })

        // Act
        const result = loginSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })
})

describe('loginSchema whitespace handling', () => {
    it('trims leading and trailing whitespace on email before validation', () => {
        // Arrange
        const payload = baseLoginPayload({ email: '  admin@example.com  ' })

        // Act
        const result = loginSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.email).toBe('admin@example.com')
        }
    })
})
