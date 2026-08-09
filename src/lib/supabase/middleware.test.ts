import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

describe('middleware env guard (fail-closed)', () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    beforeEach(() => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
        vi.restoreAllMocks()
    })

    it('redirects /admin to login when Supabase env is missing', async () => {
        // Arrange
        const request = new NextRequest('https://example.com/admin')

        // Act
        const response = await updateSession(request)

        // Assert
        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toContain('/admin/login')
    })

    it('does NOT redirect /admin/login (no loop)', async () => {
        // Arrange
        const request = new NextRequest('https://example.com/admin/login')

        // Act
        const response = await updateSession(request)

        // Assert
        expect(response.status).toBe(200)
    })

    it('lets public routes through when env is missing', async () => {
        // Arrange
        const request = new NextRequest('https://example.com/about')

        // Act
        const response = await updateSession(request)

        // Assert
        expect(response.status).toBe(200)
    })
})
