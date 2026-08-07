// D-09: split out of `./track-event.ts` (06-02). `trackServerEvent` lives in
// that file and statically imports `createAdminClient` from
// `@/lib/supabase/admin`, which carries `import 'server-only'`. Bundlers
// evaluate that marker at module-graph-inclusion time, not at call time --
// so a Client Component importing `trackBrowserEvent` from the same module
// as `trackServerEvent` would fail the production build even though it
// never calls `trackServerEvent`. This module's import graph stays entirely
// browser-safe so `PageViewTracker.tsx` (06-02, a Client Component) can
// import it directly.
//
// D-12: browser-side tracking failures are swallowed entirely -- no console
// output. A visitor's console is not where our telemetry problems get
// reported, and logging there would advertise that tracking exists while
// going nowhere useful. Contrast `trackServerEvent`'s `console.error` in
// `./track-event.ts`.

import { createClient } from '@/lib/supabase/client'
import type { AnalyticsEventType } from '@/lib/analytics/events'

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
