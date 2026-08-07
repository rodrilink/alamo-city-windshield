// Gap closure (Phase 6 plan 06-06): a browser-only session identifier so the
// dashboard's Visitors KPI/chart can count distinct sessions instead of raw
// page_view rows. This module imports NOTHING that reaches `server-only` --
// `PageViewTracker.tsx` (a Client Component) imports it directly, and
// `track-browser-event.ts`'s header comment already documents why a
// server-only-tainted import anywhere in this graph fails `npm run build`
// even if the tainted export is never called. Keep it that way.
//
// Storage-failure rule (the important part): if `sessionStorage` is
// unavailable (private browsing, storage disabled), this returns `null`
// rather than generating a fresh throwaway id per call. A per-call id would
// make each page view its own "session" and reproduce the exact
// page-views-as-visitors bug this plan fixes, just invisibly. Returning
// `null` means those rows are written with session_id NULL and excluded from
// the distinct-session count (see dashboard-queries.ts's NULL rule) --
// undercounting, never inflating. Undercounting is the safe direction for a
// metric an owner makes decisions on.

const SESSION_ID_STORAGE_KEY = 'analytics:sid'

/**
 * Generates a collision-resistant id without `crypto.randomUUID`, for
 * environments where it is unavailable (requires a secure context). These
 * ids only need to distinguish concurrent sessions from one another -- they
 * authenticate nothing, so `Math.random` entropy is sufficient.
 */
function generateFallbackId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function generateSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return generateFallbackId()
}

/**
 * Returns a session id stable for the lifetime of the browser tab/session,
 * generating and persisting one on first call. Returns `null` -- never a
 * fresh per-call id -- if `sessionStorage` is unavailable, so storage
 * failures undercount rather than inflate the distinct-session metric (see
 * module header comment).
 *
 * @returns A stable session id string, or `null` if storage is unavailable.
 */
export function getOrCreateSessionId(): string | null {
    try {
        const existing = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY)
        if (existing) {
            return existing
        }

        const generated = generateSessionId()
        window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, generated)
        return generated
    } catch {
        // Storage unavailable -- return null rather than a throwaway id.
        // See module header comment for why this is the safe direction.
        return null
    }
}
