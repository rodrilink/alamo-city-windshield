// `vitest.config.mts` includes only `src/**/*.test.ts` with `environment: 'node'`
// and no jsdom, so `window`/`sessionStorage`/`crypto` are stubbed directly on
// globalThis rather than relying on a DOM environment -- matching the repo's
// existing pure-function test style (events.test.ts).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getOrCreateSessionId } from '@/lib/analytics/session-id'

function installFakeSessionStorage(): Storage {
    const store = new Map<string, string>()
    const fakeStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value)
        },
        removeItem: (key: string) => {
            store.delete(key)
        },
        clear: () => {
            store.clear()
        },
        get length() {
            return store.size
        },
        key: (index: number) => Array.from(store.keys())[index] ?? null,
    } as Storage
    ;(globalThis as unknown as { window: { sessionStorage: Storage } }).window = {
        sessionStorage: fakeStorage,
    }
    return fakeStorage
}

function installThrowingSessionStorage(): void {
    const throwingStorage = {
        getItem: () => {
            throw new Error('storage disabled')
        },
        setItem: () => {
            throw new Error('storage disabled')
        },
        removeItem: () => {
            throw new Error('storage disabled')
        },
        clear: () => {
            throw new Error('storage disabled')
        },
        length: 0,
        key: () => null,
    } as Storage
    ;(globalThis as unknown as { window: { sessionStorage: Storage } }).window = {
        sessionStorage: throwingStorage,
    }
}

describe('getOrCreateSessionId', () => {
    beforeEach(() => {
        installFakeSessionStorage()
    })

    afterEach(() => {
        delete (globalThis as unknown as { window?: unknown }).window
    })

    it('returns a stable id across repeated calls in one session', () => {
        // Arrange
        const firstCallId = getOrCreateSessionId()

        // Act
        const secondCallId = getOrCreateSessionId()

        // Assert
        expect(secondCallId).toBe(firstCallId)
    })

    it('generates a fresh id when storage is empty', () => {
        // Arrange
        // (fake sessionStorage installed in beforeEach starts empty)

        // Act
        const id = getOrCreateSessionId()

        // Assert
        expect(id).not.toBeNull()
        expect(typeof id).toBe('string')
        expect((id as string).length).toBeGreaterThan(0)
    })

    it('returns null, never a throwaway id, when storage throws', () => {
        // Arrange
        installThrowingSessionStorage()

        // Act
        const id = getOrCreateSessionId()

        // Assert
        expect(id).toBeNull()
    })

    it('does not throw when storage is unavailable', () => {
        // Arrange
        installThrowingSessionStorage()

        // Act
        const callWithThrowingStorage = () => getOrCreateSessionId()

        // Assert
        expect(callWithThrowingStorage).not.toThrow()
    })
})
