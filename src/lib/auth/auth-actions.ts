'use server'

// This file deliberately uses `createClient()` from `@/lib/supabase/server`,
// never the service-role client from `@/lib/supabase/admin`. `signInWithPassword`
// on that other client would authenticate but never establish a browser
// session -- that client sets `persistSession: false` and has no cookie
// plumbing at all (see `src/lib/supabase/admin.ts` lines 38-47). The
// cookie-aware SSR client is the one D-04/AUTH-01 requires so the session
// cookie the browser holds afterward is real. Do not "simplify" this import.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { isAuthApiError } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { loginSchema } from '@/lib/auth/login-schema'
import { ADMIN_COPY } from '@/lib/constants'
import type { LoginActionState } from '@/types/auth'

/**
 * Server Action backing the admin login form (AUTH-01, AUTH-02).
 *
 * Control order: Zod re-validation (untrusted-input gate) -> Supabase
 * `signInWithPassword` via the cookie-aware SSR client -> `redirect('/admin')`
 * on success (D-09: always this fixed destination, never a caller-supplied
 * destination parameter). A validation failure and an invalid-credential failure
 * return the exact same `ADMIN_COPY.loginGenericError` reference -- a
 * malformed email must be indistinguishable from a wrong password, per V2
 * Authentication's account-enumeration rule (T-05-04-01).
 *
 * @param prevState - The previous action state (unused directly, required by `useActionState`'s signature).
 * @param formData - The submitted form data (`email`, `password`).
 * @returns The next `LoginActionState`. Never returns on success -- `redirect()` throws internally.
 */
export async function loginAction(prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    // 1. Zod re-validation (untrusted-input gate). Do not surface field-level
    // errors here -- the same generic message as a credential failure, so a
    // malformed email is not distinguishable from a wrong password.
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
        return { status: 'error', message: ADMIN_COPY.loginGenericError }
    }

    // 2. Sign in. `redirect()` throws internally (Next.js's control-flow
    // signal), so it must sit outside this try/catch -- otherwise a
    // successful login would be caught and rendered as a failure.
    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
        })

        if (error) {
            // Never log the password. The email is acceptable server-side context.
            console.error('loginAction: signInWithPassword failed', { email: parsed.data.email, error })

            // A reachability failure (Supabase itself unreachable, 5xx) is a
            // different problem than wrong credentials (Phase 3 D-17/D-18: a
            // fixable failure must never be disguised as a permanent one).
            const isUnreachable = !isAuthApiError(error) || (error.status !== undefined && error.status >= 500)
            return {
                status: 'error',
                message: isUnreachable ? ADMIN_COPY.loginUnreachableError : ADMIN_COPY.loginGenericError,
            }
        }

        // D-05: session cookie written by the SSR client's `setAll`. A stale
        // cached RSC payload from the pre-login (logged-out) render must not
        // be served after this -- `revalidatePath` before `redirect`.
        revalidatePath('/', 'layout')
    } catch (error) {
        console.error('loginAction: unexpected error', { email: parsed.data.email, error })
        return { status: 'error', message: ADMIN_COPY.loginUnreachableError }
    }

    // D-09: always this fixed destination. Never read a caller-supplied
    // destination query param, never accept one through `formData`, never
    // add a parameter to this signature that could carry one -- the whole
    // open-redirect vulnerability class (T-05-04-03) is absent by construction.
    redirect('/admin')
}

/**
 * Server Action backing the sidebar logout control (AUTH-05).
 *
 * `revalidatePath` is not cosmetic: without it, a cached RSC payload rendered
 * for the authenticated session could still be served after sign-out.
 *
 * @returns Never returns -- `redirect()` throws internally.
 */
export async function logoutAction(): Promise<void> {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/admin/login')
}
