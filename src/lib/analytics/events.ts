// D-01: this module is the single source of truth for `analytics_events`'s
// `event_type` strings. `src/lib/dashboard/dashboard-queries.ts` imports
// `ANALYTICS_EVENTS` as its read-side `.eq('event_type', ...)` filter, and
// every Phase 6 write site (`trackServerEvent` / `trackBrowserEvent` in
// `./track-event.ts`) accepts only the `AnalyticsEventType` union derived
// below. Changing a string value here, without updating the other side, is
// exactly the STATE.md blocker this module exists to close -- but because
// both sides import from here, that class of mistake is now a `tsc` failure
// rather than a chart that silently renders empty.
//
// No `import 'server-only'` fence is added here. Unlike `bucket-by-day.ts`'s
// reasoning (its output is non-secret chart data), this module's reason is
// structural: it exports pure string constants consumed by BOTH browser code
// (`PageViewTracker`, via `trackBrowserEvent`) and server code (the Server
// Actions and the VIN route, via `trackServerEvent`). Fencing it would break
// the browser path entirely.
//
// D-04 fixes the taxonomy at exactly these four members. A fifth event type
// is a scope decision for a later phase (see 06-CONTEXT.md's Deferred
// Ideas) -- not an edit to make in passing while touching this file for an
// unrelated reason.

/**
 * D-01/D-04: the closed four-member `event_type` taxonomy for
 * `analytics_events`. Each member is named for the requirement it serves.
 */
export const ANALYTICS_EVENTS = {
    /** ANLY-02: a tracked page view, fired by `trackBrowserEvent`. */
    PAGE_VIEW: 'page_view',
    /** ANLY-03: a successful VIN decode, fired by `trackServerEvent`. */
    VIN_SEARCH: 'vin_search',
    /** ANLY-04: a real contact-form submission, fired by `trackServerEvent`. */
    CONTACT_SUBMIT: 'contact_submit',
    /** ANLY-05: a real booking creation, fired by `trackServerEvent`. */
    BOOKING_CREATED: 'booking_created',
} as const

/**
 * The union of all valid `event_type` strings, derived from
 * `ANALYTICS_EVENTS`'s values rather than hand-written -- a hand-written
 * string-literal union could drift from the object it is meant to mirror.
 */
export type AnalyticsEventType = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]
