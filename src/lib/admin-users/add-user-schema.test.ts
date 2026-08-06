import { describe, expect, it } from 'vitest'

import { addUserSchema } from '@/lib/admin-users/add-user-schema'

// This suite unit-tests `addUserSchema` as a pure function -- no Supabase, no
// Server Action, matching the framing of `contact-schema.test.ts`.

function baseAddUserPayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        email: 'newadmin@example.com',
        password: 'hunter2hunter2',
        confirmPassword: 'hunter2hunter2',
        ...overrides,
    }
}

describe('addUserSchema required fields', () => {
    it('passes a well-formed submission with a valid email and matching passwords', () => {
        // Arrange
        const payload = baseAddUserPayload()

        // Act
        const result = addUserSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })

    it('fails when email is malformed', () => {
        // Arrange
        const payload = baseAddUserPayload({ email: 'not-an-email' })

        // Act
        const result = addUserSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })

    it('trims leading and trailing whitespace on email before validation', () => {
        // Arrange
        const payload = baseAddUserPayload({ email: '  newadmin@example.com  ' })

        // Act
        const result = addUserSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.email).toBe('newadmin@example.com')
        }
    })
})

describe('addUserSchema password length boundary (D-12 min(8))', () => {
    it('passes a password of exactly 8 characters', () => {
        // Arrange
        const payload = baseAddUserPayload({ password: '12345678', confirmPassword: '12345678' })

        // Act
        const result = addUserSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })

    it('fails a password of 7 characters', () => {
        // Arrange
        const payload = baseAddUserPayload({ password: '1234567', confirmPassword: '1234567' })

        // Act
        const result = addUserSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
    })
})

describe('addUserSchema confirm-password match', () => {
    it('fails when confirmPassword differs from password, with the issue path on confirmPassword', () => {
        // Arrange
        const payload = baseAddUserPayload({ password: 'hunter2hunter2', confirmPassword: 'different1' })

        // Act
        const result = addUserSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].path).toEqual(['confirmPassword'])
        }
    })
})
