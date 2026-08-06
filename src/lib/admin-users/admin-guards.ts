// D-10's two guards, enforced server-side inside `removeUserAction` and
// never merely by hiding a button. Pure functions -- no Supabase import, no
// I/O. Mirrors `src/lib/booking/booking-schema.ts`'s `isLegalSlot()`
// precedent: a separate, independently unit-testable predicate rather than
// logic inlined in the Server Action. Deliberately NOT build-time
// server-side-only fenced -- like `isLegalSlot` and `generateSlotsForDate`,
// this file holds pure predicates with no secret data, so the fence buys
// nothing (see those files' own header comments for the same reasoning).

/**
 * D-10 guard 1: refuse removing your own account.
 *
 * @param targetUserId - The id of the account being removed.
 * @param callerUserId - The id of the currently authenticated admin performing the removal.
 * @returns `true` if this removal must be blocked.
 */
export function isSelfDeleteAttempt(targetUserId: string, callerUserId: string): boolean {
    return targetUserId === callerUserId
}

/**
 * D-10 guard 2: refuse removing the last remaining admin account. Uses
 * `<= 1` rather than `=== 1` so a count of zero also blocks -- a defensive
 * floor, since a count of zero should never be reachable but must never be
 * treated as "safe to delete" if it somehow is.
 *
 * @param totalAdminCount - The count of rows currently returned by `listUsers()`.
 * @returns `true` if this removal must be blocked.
 */
export function isLastAdminAttempt(totalAdminCount: number): boolean {
    return totalAdminCount <= 1
}
