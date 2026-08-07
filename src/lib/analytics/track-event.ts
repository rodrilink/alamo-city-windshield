// D-09: the write path is deliberately split into two helpers rather than
// one, because each event writes from where it already knows it happened --
// the browser cannot use the service-role client, and the server should not
// make a pointless HTTP hop to its own process to reach a single shared
// helper. A `POST /api/track` Route Handler was rejected for the same reason
// 05 D-04 rejected Route Handlers for dashboard reads: it would add a new
// public, unauthenticated write endpoint that does not need to exist when
// the pre-existing `public_insert_analytics` RLS policy already permits the
// browser insert directly.
//
// D-12's logging rule is asymmetric by design: `trackServerEvent` (this
// module) logs a failure via `console.error` (visible in Vercel logs when
// the dashboard numbers look wrong); `trackBrowserEvent` (moved out to
// `./track-browser-event.ts`, see below) swallows a failure with no console
// output at all.
//
// `trackBrowserEvent` was split into its own module (06-02) rather than
// living here alongside `trackServerEvent`. This module imports
// `createAdminClient`, which carries `import 'server-only'` in
// `@/lib/supabase/admin`. Bundlers evaluate `server-only`'s marker at
// *module-graph-inclusion* time, not at call time -- so a Client Component
// that imports `trackBrowserEvent` from a module that also statically
// imports `createAdminClient` fails the production build even though that
// Client Component never calls `trackServerEvent`. Splitting the two
// functions into separate files (each still exported from
// `@/lib/analytics/`) keeps every existing server-side import path
// (`from '@/lib/analytics/track-event'`) unchanged while letting
// `PageViewTracker.tsx` import only the browser-safe half. Do not re-merge
// them without re-verifying `npm run build` from a Client Component
// consumer.

import { createAdminClient } from '@/lib/supabase/admin'
import type { AnalyticsEventType } from '@/lib/analytics/events'

/**
 * D-09/D-10: server-side tracking helper. Inserts one `analytics_events` row
 * using the service-role client, awaits it, and never returns or throws a
 * failure to its caller -- a failed event must never block or error the
 * user action that triggered it (ANLY-06).
 *
 * "Non-blocking" here means **awaited-and-swallowed, NOT detached**: callers
 * MUST `await` this function. On Vercel's serverless runtime, a promise
 * still in flight when the response is sent may never complete, so firing
 * this without awaiting it would lose events non-deterministically. Do not
 * "optimize" the `await` away at a call site.
 *
 * @param eventType - One of `ANALYTICS_EVENTS`'s four members (D-04).
 * @param fields - Optional `page` (unused server-side today, kept for signature symmetry) and `vin` (D-03: the raw VIN, stored on `vin_search` events). Neither is validated here -- callers pass already-validated values.
 * @returns Always resolves; never rejects and never carries a failure signal.
 */
export async function trackServerEvent(eventType: AnalyticsEventType, fields?: { page?: string; vin?: string }): Promise<void> {
    try {
        const supabase = createAdminClient()
        const { error } = await supabase.from('analytics_events').insert({
            event_type: eventType,
            page: fields?.page ?? null,
            vin: fields?.vin ?? null,
        })

        if (error) {
            console.error('trackServerEvent: insert failed', { error, eventType })
        }
    } catch (error) {
        console.error('trackServerEvent: unexpected error', { error, eventType })
    }
}

// `trackBrowserEvent` lives in `./track-browser-event.ts` (06-02) -- moved
// out of this file so a Client Component can import it without also
// pulling in `createAdminClient`'s `server-only` fence. Re-export it here
// only if a future consumer needs to import both helpers from this single
// path; today `PageViewTracker.tsx` imports it directly from
// `./track-browser-event` instead, keeping this module's import graph
// entirely server-only.
