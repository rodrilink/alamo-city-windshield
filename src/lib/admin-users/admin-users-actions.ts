'use server'

// The three Server Actions backing /admin/users (USER-01/02/03, D-05, D-10).
// Every `auth.admin.*` call runs through `createAdminClient()` (service-role,
// bypasses RLS by design) -- never the cookie-aware `server.ts` client, which
// has no `auth.admin` namespace at all. `server.ts` is used for exactly ONE
// thing in this file: reading the caller's own identity via `getUser()` for
// the D-10 self-delete guard, mirroring RESEARCH.md's anti-pattern warning
// against ever substituting `getSession()` for that read.
//
// D-10's two guards (isSelfDeleteAttempt, isLastAdminAttempt) are imported
// from `admin-guards.ts` (plan 05-03) and both run BEFORE any `deleteUser()`
// call -- ordering is load-bearing, not stylistic, since a delete is
// irreversible (see booking-actions.ts's honeypot-before-insert precedent for
// the same "gate before the irreversible step" discipline).
//
// Password handling (D-12): the submitted password is echoed back to the
// browser exactly once on success as `generatedPassword`, since no SMTP/email
// delivery exists to send it through instead. It must NEVER appear in a
// `console.error`/`console.log` call anywhere in this file -- logging a
// createUser failure logs only the error object and the email, never the
// password or confirmPassword variables.

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isSelfDeleteAttempt, isLastAdminAttempt } from '@/lib/admin-users/admin-guards'
import { addUserSchema } from '@/lib/admin-users/add-user-schema'
import { ADMIN_COPY } from '@/lib/constants'
import type { AddUserActionState, AddUserFormValues, RemoveUserActionState } from '@/types/admin'

/** D-07: the exact fields the user list renders -- never the raw `User` object. */
export interface AdminListItem {
    id: string
    email: string
    createdAt: string
    lastSignInAt: string | null
}

export type ListAdminsResult = { ok: true; data: AdminListItem[] } | { ok: false }

/**
 * USER-01/D-05: enumerates every `auth.users` row through the service-role
 * Admin API -- `auth.users` IS the admin list, since no public signup path
 * exists anywhere in the application.
 *
 * @returns A discriminated result carrying only `id`, `email`, `createdAt`
 * and `lastSignInAt` per admin -- never the raw `User` object, which carries
 * `app_metadata`, `identities` and other fields with no business crossing
 * into the browser payload.
 */
export async function listAdmins(): Promise<ListAdminsResult> {
    try {
        const supabase = createAdminClient()
        // Explicit perPage (RESEARCH.md Pitfall 4): the default is 50,
        // documented only in a @remarks comment in the installed .d.ts --
        // an implicit ceiling that silently truncates the list is worse
        // than a visible, intentional one.
        const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 })

        if (error) {
            console.error('listAdmins: query failed', { error })
            return { ok: false }
        }

        const admins: AdminListItem[] = data.users.map((user) => ({
            id: user.id,
            email: user.email ?? '',
            createdAt: user.created_at,
            // RESEARCH.md Pitfall 5: last_sign_in_at is undefined (not null)
            // for a user who has never logged in -- normalize to null here so
            // downstream components get one consistent "no value" shape.
            lastSignInAt: user.last_sign_in_at ?? null,
        }))

        return { ok: true, data: admins }
    } catch (error) {
        console.error('listAdmins: unexpected error', { error })
        return { ok: false }
    }
}

/**
 * USER-02/D-12: creates a new admin account. Every Supabase Auth user is a
 * full admin (D-05) -- there is no separate roles table this phase.
 *
 * @param prevState - The previous action state (unused directly, but required by `useActionState`'s signature).
 * @param formData - The submitted form data (`email`, `password`, `confirmPassword`).
 * @returns The next `AddUserActionState`. On success, `generatedPassword` carries
 * the submitted password back to the browser exactly once (D-12) -- there is no
 * email delivery to send it through instead.
 */
export async function addUserAction(prevState: AddUserActionState, formData: FormData): Promise<AddUserActionState> {
    const values: AddUserFormValues = {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        confirmPassword: String(formData.get('confirmPassword') ?? ''),
    }

    // Zod re-validation (untrusted-input gate) -- the client already
    // validated; this run is what actually guards a crafted POST.
    const parsed = addUserSchema.safeParse(values)
    if (!parsed.success) {
        const fieldErrors: Partial<Record<keyof AddUserFormValues, string>> = {}
        for (const issue of parsed.error.issues) {
            const field = issue.path[0] as keyof AddUserFormValues | undefined
            if (field && !fieldErrors[field]) {
                fieldErrors[field] = issue.message
            }
        }
        return { status: 'error', values, fieldErrors, message: ADMIN_COPY.addUserGenericError }
    }

    try {
        const supabase = createAdminClient()
        // email_confirm: true -- D-08 leaves no SMTP configured, so an
        // unconfirmed user could never complete confirmation and would be
        // unable to sign in, making USER-02 silently produce a dead account.
        const { error } = await supabase.auth.admin.createUser({
            email: parsed.data.email,
            password: parsed.data.password,
            email_confirm: true,
        })

        if (error) {
            // Log only the error object and the email -- NEVER the password
            // or confirmPassword values. See this file's header comment.
            console.error('addUserAction: createUser failed', { error, email: parsed.data.email })
            return { status: 'error', values, message: ADMIN_COPY.addUserGenericError }
        }

        revalidatePath('/admin/users')

        return {
            status: 'success',
            values,
            generatedPassword: parsed.data.password,
        }
    } catch (error) {
        console.error('addUserAction: unexpected error', { error, email: parsed.data.email })
        return { status: 'error', values, message: ADMIN_COPY.addUserGenericError }
    }
}

/**
 * USER-03/D-10: removes an admin account, refusing both a self-delete and a
 * last-admin removal server-side -- never merely hidden in the UI.
 *
 * @param prevState - The previous action state (unused directly, but required by `useActionState`'s signature).
 * @param formData - The submitted form data. Must carry only the target user id --
 * the caller's own identity is always derived server-side via `getUser()`, never
 * read from `formData`, since a client-supplied caller id would let an attacker
 * defeat guard 1 by lying about who they are.
 * @returns The next `RemoveUserActionState`.
 */
export async function removeUserAction(prevState: RemoveUserActionState, formData: FormData): Promise<RemoveUserActionState> {
    const targetId = String(formData.get('userId') ?? '')

    if (!targetId) {
        return { status: 'error', message: ADMIN_COPY.addUserGenericError }
    }

    try {
        // Caller identity, established server-side. getUser() revalidates the
        // JWT against the auth server rather than trusting an unverified
        // session-cookie claim (CVE-2025-29927) -- the same load-bearing
        // reasoning as src/lib/supabase/middleware.ts.
        const serverSupabase = await createClient()
        const {
            data: { user: caller },
        } = await serverSupabase.auth.getUser()

        if (!caller) {
            console.error('removeUserAction: no authenticated caller')
            return { status: 'error', message: ADMIN_COPY.addUserGenericError }
        }

        const adminSupabase = createAdminClient()
        // Called once -- its result backs both the total count (guard 2) and
        // confirming the target still exists.
        const { data, error: listError } = await adminSupabase.auth.admin.listUsers({ perPage: 100 })

        if (listError) {
            console.error('removeUserAction: listUsers failed', { error: listError })
            return { status: 'error', message: ADMIN_COPY.addUserGenericError }
        }

        // Guard 1 (D-10): refuse self-removal.
        if (isSelfDeleteAttempt(targetId, caller.id)) {
            return { status: 'error', message: ADMIN_COPY.selfDeleteError }
        }

        // Guard 2 (D-10): refuse removing the last remaining admin.
        if (isLastAdminAttempt(data.users.length)) {
            return { status: 'error', message: ADMIN_COPY.lastAdminError }
        }

        // Both guards passed -- only now is the irreversible delete attempted.
        // shouldSoftDelete left at its default false: no soft-delete requirement exists.
        const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(targetId)

        if (deleteError) {
            console.error('removeUserAction: deleteUser failed', { error: deleteError })
            return { status: 'error', message: ADMIN_COPY.addUserGenericError }
        }

        revalidatePath('/admin/users')

        return { status: 'success' }
    } catch (error) {
        console.error('removeUserAction: unexpected error', { error })
        return { status: 'error', message: ADMIN_COPY.addUserGenericError }
    }
}
