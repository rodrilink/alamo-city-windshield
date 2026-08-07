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
// D-12's logging rule is asymmetric by design: `trackServerEvent` logs a
// failure via `console.error` (visible in Vercel logs when the dashboard
// numbers look wrong); `trackBrowserEvent` swallows a failure with no
// console output at all (a visitor's console is not where telemetry
// problems get reported, and logging there would advertise that tracking
// exists while going nowhere useful).
//
// No `import 'server-only'` fence is added to this module -- it must export
// `trackBrowserEvent` to the browser bundle. `createAdminClient` (imported
// below) carries its own `server-only` fence in `@/lib/supabase/admin`, so
// an accidental import of `trackServerEvent` from a Client Component is
// already a build error without this module needing its own fence. Do not
// "fix" that by removing the fence from `admin.ts`.

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/client'
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

/**
 * D-09/D-10: browser-side tracking helper. Inserts one `analytics_events` row
 * using the anon browser client under the pre-existing `public_insert_analytics`
 * RLS policy (`WITH CHECK (true)`), and swallows any failure silently.
 *
 * No `vin` parameter -- the only browser-side event is `page_view` (D-05),
 * which carries a pathname, never a VIN.
 *
 * @param eventType - One of `ANALYTICS_EVENTS`'s four members (D-04); in practice only `PAGE_VIEW` today.
 * @param fields - Optional `page`, the pathname to record (D-02).
 * @returns Always resolves; never rejects and never carries a failure signal.
 */
export async function trackBrowserEvent(eventType: AnalyticsEventType, fields?: { page?: string }): Promise<void> {
    try {
        const supabase = createClient()
        await supabase.from('analytics_events').insert({
            event_type: eventType,
            page: fields?.page ?? null,
        })
    } catch {
        // D-12: browser-side tracking failures are swallowed entirely -- no
        // console output. A visitor's console is not where our telemetry
        // problems get reported, and logging there would advertise that
        // tracking exists while going nowhere useful. This empty catch is
        // deliberate -- do not "fix" it by adding logging.
    }
}
