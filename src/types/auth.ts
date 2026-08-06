// Shared client/server contract for the admin login form (AUTH-01, AUTH-05).
//
// This module is imported by BOTH the Client Component login form and the
// server-side `loginAction` Server Action. It MUST NOT gain the build-time
// server-side-only import fence, and must never contain a secret value --
// mirrors `src/types/booking.ts`'s same rule for its own form-value types.

/**
 * Values collected by the login form. Both fields are required -- Supabase
 * Auth's `signInWithPassword` rejects an empty email or password itself, but
 * the client-side schema catches it first for fast feedback.
 */
export interface LoginFormValues {
  email: string
  password: string
}

/**
 * Discriminated result of the `loginAction` Server Action.
 *
 * Deliberately the minimal 2-state variant (no `'success'` member, no
 * `values`, no `fieldErrors`): on success `loginAction` redirects rather than
 * returning, and a login form has no reason to preserve a failed password
 * attempt the way `BookingActionState`/`ContactActionState` preserve
 * `values` across a failed submit -- there is no D-09-style "restore what
 * the customer typed" requirement here.
 */
export type LoginActionState = { status: 'idle' } | { status: 'error'; message: string }
