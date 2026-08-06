import { describe, expect, it } from 'vitest'

import { isLastAdminAttempt, isSelfDeleteAttempt } from '@/lib/admin-users/admin-guards'

// This suite unit-tests both pure predicates exported by
// `src/lib/admin-users/admin-guards.ts` -- no Supabase, no Server Action,
// matching the framing of `booking-schema.test.ts`'s `isLegalSlot` tests.

describe('isSelfDeleteAttempt', () => {
    it('returns true when the target id and caller id are the same non-empty string', () => {
        // Arrange
        const targetUserId = 'user-123'
        const callerUserId = 'user-123'

        // Act
        const result = isSelfDeleteAttempt(targetUserId, callerUserId)

        // Assert
        expect(result).toBe(true)
    })

    it('returns false when the target id and caller id differ', () => {
        // Arrange
        const targetUserId = 'user-123'
        const callerUserId = 'user-456'

        // Act
        const result = isSelfDeleteAttempt(targetUserId, callerUserId)

        // Assert
        expect(result).toBe(false)
    })

    it('returns true for two identical strings regardless of format -- exact-string comparison, no normalization', () => {
        // Arrange
        const targetUserId = 'AbC-999'
        const callerUserId = 'AbC-999'

        // Act
        const result = isSelfDeleteAttempt(targetUserId, callerUserId)

        // Assert
        expect(result).toBe(true)
    })
})

describe('isLastAdminAttempt', () => {
    it('returns true for a total admin count of 1', () => {
        // Arrange
        const totalAdminCount = 1

        // Act
        const result = isLastAdminAttempt(totalAdminCount)

        // Assert
        expect(result).toBe(true)
    })

    it('returns true for a total admin count of 0 -- defensive: zero must never permit a delete', () => {
        // Arrange
        const totalAdminCount = 0

        // Act
        const result = isLastAdminAttempt(totalAdminCount)

        // Assert
        expect(result).toBe(true)
    })

    it('returns false for a total admin count of 2', () => {
        // Arrange
        const totalAdminCount = 2

        // Act
        const result = isLastAdminAttempt(totalAdminCount)

        // Assert
        expect(result).toBe(false)
    })

    it('returns false for a large total admin count such as 50', () => {
        // Arrange
        const totalAdminCount = 50

        // Act
        const result = isLastAdminAttempt(totalAdminCount)

        // Assert
        expect(result).toBe(false)
    })
})
