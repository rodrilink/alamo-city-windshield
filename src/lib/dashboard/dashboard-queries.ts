import 'server-only'

// D-04: every read in this module executes through the RLS-respecting SSR
// client (`createClient` from `@/lib/supabase/server`) so the query runs as
// the logged-in admin, not a privileged service-role identity. This is a
// deliberate divergence from this module's structural analog,
// `@/lib/booking/booking-availability.ts`, which imports `createAdminClient`
// from `@/lib/supabase/admin` because booking availability is a public,
// unauthenticated flow that must bypass RLS entirely. A future edit must NOT
// "align" this file with that one by swapping in `createAdminClient` -- doing
// so would let any dashboard read silently bypass RLS (T-05-06-01).
//
// Every function below follows `booking-availability.ts`'s failure shape:
// try/catch, an explicit `if (error)` branch with a `console.error` naming
// the function, and a discriminated `{ ok: false }` return. A failed query
// must never collapse into `{ ok: true, data: [] }` -- that would make a real
// outage indistinguishable from D-01's legitimate "no data yet" empty state
// (RESEARCH.md Pitfall 3, T-05-06-07).

import { createClient } from '@/lib/supabase/server'
import { businessDayKey } from '@/lib/analytics/business-day'
import { bucketByDay, ANALYTICS_WINDOW_DAYS, MILLISECONDS_PER_DAY } from '@/lib/analytics/bucket-by-day'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { getBusinessTodayDateString } from '@/lib/server-time'
import type { DailyBucket, DashboardReadResult } from '@/types/admin'

/**
 * D-16: bounded read limit for the recent-contacts table (ADMIN-06). Named
 * constant, not an inline literal, so the bound can be tuned in one place.
 */
export const RECENT_CONTACTS_LIMIT = 10

/**
 * D-16: bounded read limit for the upcoming-appointments table (ADMIN-07).
 * Named constant, not an inline literal, so the bound can be tuned in one
 * place.
 */
export const UPCOMING_APPOINTMENTS_LIMIT = 10

/**
 * Gap closure (06-07, CR-01): row cap for both visitors reads
 * (`getSummaryTotals`'s session-id read and `getVisitorSeries`), set at
 * `supabase/config.toml`'s configured `max_rows` (1000). PostgREST enforces
 * `max_rows` server-side and returns HTTP 200 with a silently truncated body
 * when a query would exceed it -- `.error` stays null, so the existing
 * `if (error)` guard cannot detect this. Applying the SAME limit explicitly
 * here, combined with `.order()` (below) and saturation detection (below),
 * converts an invisible truncation into a deterministic, detectable one: if
 * the returned row count equals this limit, the result may be truncated and
 * the read must fail loudly rather than return a possibly-wrong number.
 *
 * The durable fix is a Postgres RPC doing `count(distinct session_id)`
 * server-side (`SECURITY INVOKER`, to preserve the existing
 * `admin_select_analytics` RLS policy) -- see `06-REVIEW.md` CR-01's
 * suggested migration. That removes the cap entirely by never transferring
 * row data at all. Deferred here as a schema change (Rule 4), out of scope
 * for this gap-closure plan.
 */
export const VISITOR_ROWS_LIMIT = 1000

/**
 * Four card totals for the dashboard summary row (ADMIN-05), mixed-source
 * per D-02: `contacts` and `bookings` are real-table counts (Phase 4 already
 * writes real rows there); `vinSearches` counts `analytics_events` rows via
 * `select('*', { count: 'exact', head: true })` so only the count crosses
 * the wire, never row data.
 *
 * Gap closure (06-06): `visitors` counts **distinct browser sessions**, not
 * `page_view` rows -- a single visitor browsing N pages in one session
 * increments this by exactly 1, not N. `head: true` cannot express DISTINCT,
 * so this one count instead selects `session_id` for `page_view` rows and
 * counts unique non-null values in TypeScript (row data crosses the wire for
 * this count only). A new browser tab, or the same person returning later,
 * is a new session and counts again -- this is a *session* count, not a
 * unique-people count. Rows with `session_id IS NULL` (written before this
 * plan, or by visitors whose `sessionStorage` was unavailable -- see
 * `src/lib/analytics/session-id.ts`) are excluded from the distinct count:
 * counting each NULL row as its own session would resurrect the exact
 * page-views-as-visitors bug this plan fixes, and collapsing all NULLs into
 * one session would invent a visitor that does not exist. Exclusion
 * undercounts slightly and never inflates -- the safe direction for a number
 * an owner makes decisions on. `getVisitorSeries` below applies the identical
 * rule for the chart.
 *
 * Gap closure (06-07, CR-01) -- **deliberate semantic change**: `visitors` is
 * now "distinct sessions in the trailing `ANALYTICS_WINDOW_DAYS` window," NOT
 * "distinct sessions ever." The card previously read all `page_view` rows
 * with no time filter and no limit, which is unboundable: `supabase/
 * config.toml`'s `max_rows = 1000` caps every PostgREST response server-side
 * and returns HTTP 200 with a silently truncated body, so past ~200 lifetime
 * sessions (at ~5 page views/session) the card would freeze permanently with
 * no error. A windowed count that stays correct is a better contract than an
 * all-time count that silently goes wrong. Any downstream copy that
 * describes this card as an all-time total is now incorrect and must be
 * updated to describe a trailing-window count instead.
 *
 * A real `0` remains a legitimate empty state (e.g. no visitors yet in the
 * window) that stays structurally distinct from a `{ ok: false }` failure --
 * never fabricate or estimate a number (D-02). A `{ ok: false }` is also now
 * returned if the visitors read *saturates* `VISITOR_ROWS_LIMIT` -- see
 * `getSummaryTotals`'s saturation check below -- because a truncated distinct
 * count cannot be trusted to be correct.
 */
export interface SummaryTotals {
    contacts: number
    bookings: number
    visitors: number
    vinSearches: number
}

/**
 * Reads the four ADMIN-05 summary-card totals. Returns `{ ok: false }` if any
 * of the four counts fails -- a partial success is not distinguishable from
 * "some cards are wrong," so this function treats any single count error as
 * a whole-read failure per RESEARCH.md Pitfall 3.
 *
 * Gap closure (06-07, CR-01): the visitors count is now windowed (see
 * `SummaryTotals` TSDoc), ordered newest-first, and capped at
 * `VISITOR_ROWS_LIMIT`. If the returned row count equals that limit, the
 * distinct-session count may be missing rows PostgREST silently dropped --
 * this is treated as a failure (`{ ok: false }`), not returned as a possibly
 * wrong number.
 *
 * @returns `{ ok: true, data: SummaryTotals }` on success, or `{ ok: false }` if any count failed or the visitors read may have been truncated.
 */
export async function getSummaryTotals(): Promise<DashboardReadResult<SummaryTotals>> {
    try {
        const supabase = await createClient()
        const now = getServerNow()

        const [contactsResult, bookingsResult, visitorSessionsResult, vinSearchesResult] = await Promise.all([
            supabase.from('contacts').select('*', { count: 'exact', head: true }),
            supabase.from('bookings').select('*', { count: 'exact', head: true }),
            // Gap closure (06-06 / 06-07): `head: true` cannot express
            // DISTINCT, so this one count selects `session_id` for `page_view`
            // rows and is reduced to a distinct-session count below (see
            // SummaryTotals TSDoc for the NULL-exclusion and windowing
            // rationale). The window, order and limit together bound the
            // payload and make truncation deterministic and detectable
            // (CR-01) rather than an arbitrary, invisible subset.
            supabase
                .from('analytics_events')
                .select('session_id, created_at')
                .eq('event_type', ANALYTICS_EVENTS.PAGE_VIEW)
                .gte('created_at', windowStartIso(now))
                .order('created_at', { ascending: false })
                .limit(VISITOR_ROWS_LIMIT),
            supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', ANALYTICS_EVENTS.VIN_SEARCH),
        ])

        if (contactsResult.error) {
            console.error('getSummaryTotals: contacts count failed', { error: contactsResult.error })
            return { ok: false }
        }
        if (bookingsResult.error) {
            console.error('getSummaryTotals: bookings count failed', { error: bookingsResult.error })
            return { ok: false }
        }
        if (visitorSessionsResult.error) {
            console.error('getSummaryTotals: visitors count failed', { error: visitorSessionsResult.error })
            return { ok: false }
        }
        if (vinSearchesResult.error) {
            console.error('getSummaryTotals: vinSearches count failed', { error: vinSearchesResult.error })
            return { ok: false }
        }

        const visitorRows = visitorSessionsResult.data ?? []
        // Gap closure (06-07, CR-01): PostgREST returns HTTP 200 with a
        // truncated body when a query exceeds `max_rows` -- `.error` stays
        // null, so a full page of rows is the only detectable signal. A
        // truncated distinct-session count is not safely correctable (we do
        // not know which sessions were cut), so this surfaces as a visible
        // failure rather than a silently wrong number.
        if (visitorRows.length >= VISITOR_ROWS_LIMIT) {
            console.error('getSummaryTotals: visitors read saturated VISITOR_ROWS_LIMIT, result may be truncated', {
                limit: VISITOR_ROWS_LIMIT,
                returned: visitorRows.length,
            })
            return { ok: false }
        }

        // Gap closure (06-06): distinct, non-null session_id values only --
        // NULL rows (pre-migration or storage-unavailable) are excluded, not
        // collapsed into one phantom session. See SummaryTotals TSDoc.
        const distinctSessionIds = new Set(
            visitorRows.map((row) => row.session_id as string | null).filter((sessionId): sessionId is string => sessionId !== null)
        )

        return {
            ok: true,
            data: {
                contacts: contactsResult.count ?? 0,
                bookings: bookingsResult.count ?? 0,
                visitors: distinctSessionIds.size,
                vinSearches: vinSearchesResult.count ?? 0,
            },
        }
    } catch (error) {
        console.error('getSummaryTotals: unexpected error', { error })
        return { ok: false }
    }
}

/** One row of the ADMIN-06 recent-contacts table. */
export interface RecentContactRow {
    created_at: string
    name: string
    last_name: string
    phone: string
    address: string | null
    vin: string | null
    message: string | null
}

/**
 * Reads the ADMIN-06 recent-contacts table: the newest `RECENT_CONTACTS_LIMIT`
 * rows from `contacts`, newest first (D-16). Selects only the columns the
 * table needs -- never `select('*')` -- and deliberately excludes
 * `honeypot`, which is an anti-spam implementation detail with no place on an
 * admin screen (T-05-06-02).
 *
 * @returns `{ ok: true, data: RecentContactRow[] }` on success, or `{ ok: false }` if the read failed.
 */
export async function getRecentContacts(): Promise<DashboardReadResult<RecentContactRow[]>> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('contacts')
            .select('created_at, name, last_name, phone, address, vin, message')
            .order('created_at', { ascending: false })
            .limit(RECENT_CONTACTS_LIMIT)

        if (error) {
            console.error('getRecentContacts: Supabase read failed', { error })
            return { ok: false }
        }

        return { ok: true, data: data ?? [] }
    } catch (error) {
        console.error('getRecentContacts: unexpected error', { error })
        return { ok: false }
    }
}

/** One row of the ADMIN-07 upcoming-appointments table. */
export interface UpcomingAppointmentRow {
    appt_date: string
    appt_time: string
    name: string
    last_name: string
    phone: string
    vehicle_desc: string | null
    status: string
}

/**
 * Reads the ADMIN-07 upcoming-appointments table: bookings whose `appt_date`
 * is today (America/Chicago, derived server-side via `getBusinessTodayDateString`
 * -- never from a client-supplied value, T-05-06-05) or later, soonest first,
 * bounded to `UPCOMING_APPOINTMENTS_LIMIT` rows (D-16). This filter is
 * deliberately forward-looking and is NOT the charts' 30-day backward window
 * (D-03) -- applying a past window to "upcoming appointments" would show the
 * opposite of what ADMIN-07 asks for. `vehicle_desc` is consumed as
 * denormalized text exactly as Phase 4's D-12 intended: no VIN re-decoding,
 * no NHTSA call from this internal page (D-17).
 *
 * @returns `{ ok: true, data: UpcomingAppointmentRow[] }` on success, or `{ ok: false }` if the read failed.
 */
export async function getUpcomingAppointments(): Promise<DashboardReadResult<UpcomingAppointmentRow[]>> {
    try {
        const supabase = await createClient()
        const today = getBusinessTodayDateString()

        const { data, error } = await supabase
            .from('bookings')
            .select('appt_date, appt_time, name, last_name, phone, vehicle_desc, status')
            .gte('appt_date', today)
            .order('appt_date', { ascending: true })
            .order('appt_time', { ascending: true })
            .limit(UPCOMING_APPOINTMENTS_LIMIT)

        if (error) {
            console.error('getUpcomingAppointments: Supabase read failed', { error })
            return { ok: false }
        }

        return { ok: true, data: data ?? [] }
    } catch (error) {
        console.error('getUpcomingAppointments: unexpected error', { error })
        return { ok: false }
    }
}

/**
 * Returns the current instant, for passing explicitly into `bucketByDay`
 * (matching that function's "clock passed as parameter, never read
 * internally" contract) and into `windowStartIso` below.
 *
 * Gap closure (06-07, CR-03): this used to reconstruct a `Date` from
 * `getBusinessNowParts()`'s America/Chicago wall-clock parts via
 * `new Date(year, month - 1, day, hour, minute)`. That constructor
 * interprets its numeric arguments in the **host machine's** timezone, so
 * feeding Chicago parts into it produced an instant skewed by the
 * host-Chicago UTC offset -- 5 hours on Vercel, which runs UTC. "Now" as an
 * *instant* is timezone-independent; only its *rendering* into calendar
 * parts needs a business timezone, and that rendering now happens
 * exclusively downstream, through `businessDayKey` (CR-02's fix). Encoding a
 * timezone into an instant and then treating the result as a real instant is
 * exactly the anti-pattern `server-time.ts`'s own comments warn against --
 * this function used to reintroduce it despite its docstring's claim
 * otherwise.
 */
function getServerNow(): Date {
    return new Date()
}

/**
 * Computes the D-03 window start (`ANALYTICS_WINDOW_DAYS` days back from
 * `now`, inclusive of `now`'s own business day) as an ISO-8601 instant, for
 * the `.gte('created_at', ...)` filter shared by every chart-series read and
 * the CR-01 visitors reads above.
 *
 * Gap closure (06-07, CR-03): previously computed via
 * `startOfDay(subDays(now, ...))` (`date-fns`), which reads `now`'s
 * HOST-local calendar day -- on Vercel (UTC) that is not the same calendar
 * day as `now`'s America/Chicago business day, shifting the window boundary
 * by up to the host-Chicago UTC offset. The boundary is now derived from
 * `businessDayKey` (the same America/Chicago day used everywhere else on
 * this path, CR-02) rather than from a host-local `Date` reconstruction: the
 * boundary is midnight America/Chicago at the start of the oldest day in the
 * window, expressed as the exact instant `windowDays - 1` fixed 24h-blocks
 * before `now`'s business-day start. Concretely, this parses
 * `businessDayKey(now)` (a `'yyyy-MM-dd'` string) as midnight UTC and steps
 * back by `(windowDays - 1) * 24h` in milliseconds -- never via host-local
 * `setDate`/`getDate` (the same class of anti-pattern this function's
 * previous implementation had). Parsing the day-key as UTC-midnight and
 * stepping in fixed-size UTC days, rather than parsing it as Chicago
 * midnight, makes the boundary intentionally slightly earlier than the exact
 * Chicago-midnight instant (up to the UTC offset) -- an earlier `.gte` bound
 * only ever WIDENS the window, so no event within the intended window can be
 * excluded by this approximation.
 */
function windowStartIso(now: Date): string {
    const oldestDayKey = businessDayKey(new Date(now.getTime() - (ANALYTICS_WINDOW_DAYS - 1) * MILLISECONDS_PER_DAY))
    return `${oldestDayKey}T00:00:00.000Z`
}

/**
 * Reads the ADMIN-02 visitor-traffic chart series: `analytics_events` rows
 * whose `event_type` is a page view, over the trailing `ANALYTICS_WINDOW_DAYS`
 * window, reduced to one timestamp per distinct session per day and then
 * bucketed into daily counts by `bucketByDay`, so each session contributes at
 * most 1 to its day's bucket -- matching `getSummaryTotals`'s distinct-session
 * KPI (gap closure 06-06). Rows with `session_id IS NULL` (pre-migration or
 * storage-unavailable, per `src/lib/analytics/session-id.ts`) are excluded
 * from this count for the same reason stated on `SummaryTotals.visitors`:
 * exclusion undercounts rather than inflates. A genuinely empty window (e.g.
 * no visitors yet today) remains a legitimate empty result -- the page
 * renders `ADMIN_COPY.dashboardEmptyStateHint` for it, structurally distinct
 * from a `{ ok: false }` failure.
 *
 * Gap closure (06-07, CR-01/CR-02): the read now carries an explicit
 * `.order('created_at', { ascending: false })` and `.limit(VISITOR_ROWS_LIMIT)`
 * -- without an order, PostgREST's `max_rows` truncation returned an
 * arbitrary physical-order subset, so whole days vanished nondeterministically.
 * Ordering newest-first makes any truncation deterministic and recent-biased,
 * and saturating the limit is now detected and surfaced as `{ ok: false }`
 * rather than silently rendering a partial series. The per-session-per-day
 * dedupe key is now `businessDayKey` (America/Chicago), not
 * `createdAt.slice(0, 10)` (UTC) -- the same key `bucketByDay` uses to
 * bucket, so a session spanning UTC midnight cannot produce two dedupe keys
 * (CR-02).
 *
 * @returns `{ ok: true, data: DailyBucket[] }` (always a full zero-filled window) on success, or `{ ok: false }` if the read failed or may have been truncated.
 */
export async function getVisitorSeries(): Promise<DashboardReadResult<DailyBucket[]>> {
    try {
        const supabase = await createClient()
        const now = getServerNow()

        const { data, error } = await supabase
            .from('analytics_events')
            .select('created_at, session_id')
            .eq('event_type', ANALYTICS_EVENTS.PAGE_VIEW)
            .gte('created_at', windowStartIso(now))
            .order('created_at', { ascending: false })
            .limit(VISITOR_ROWS_LIMIT)

        if (error) {
            console.error('getVisitorSeries: Supabase read failed', { error })
            return { ok: false }
        }

        const rows = data ?? []
        // Gap closure (06-07, CR-01): a full page of rows means PostgREST's
        // `max_rows` may have truncated the result -- the chart would then
        // silently lose whichever days fell outside the returned page. Fail
        // visibly instead of rendering a possibly-incomplete series.
        if (rows.length >= VISITOR_ROWS_LIMIT) {
            console.error('getVisitorSeries: read saturated VISITOR_ROWS_LIMIT, result may be truncated', {
                limit: VISITOR_ROWS_LIMIT,
                returned: rows.length,
            })
            return { ok: false }
        }

        // Gap closure (06-06/06-07): collapse to one timestamp per distinct
        // session per **business day** -- a session that visits 3 pages in
        // one Chicago day contributes 1 timestamp to that day's bucket, not
        // 3. NULL session_id rows are excluded entirely (see function
        // TSDoc). Keying with `businessDayKey` (not `createdAt.slice(0,10)`)
        // is what prevents a UTC-midnight-spanning session from producing
        // two dedupe keys (CR-02).
        const firstTimestampBySessionAndDay = new Map<string, string>()
        for (const row of rows) {
            const sessionId = row.session_id as string | null
            if (sessionId === null) {
                continue
            }
            const createdAt = row.created_at as string
            const dayKey = businessDayKey(createdAt)
            const dedupeKey = `${dayKey}:${sessionId}`
            if (!firstTimestampBySessionAndDay.has(dedupeKey)) {
                firstTimestampBySessionAndDay.set(dedupeKey, createdAt)
            }
        }

        const timestamps = Array.from(firstTimestampBySessionAndDay.values())
        return { ok: true, data: bucketByDay(timestamps, now, ANALYTICS_WINDOW_DAYS) }
    } catch (error) {
        console.error('getVisitorSeries: unexpected error', { error })
        return { ok: false }
    }
}

/**
 * Reads the ADMIN-04 VIN-search chart series: `analytics_events` rows whose
 * `event_type` is a VIN search, over the trailing `ANALYTICS_WINDOW_DAYS`
 * window, bucketed into daily counts by `bucketByDay`. Phase 6 now writes
 * these rows via `src/lib/analytics/track-event.ts`'s `trackServerEvent` --
 * same legitimate-empty-state reasoning as `getVisitorSeries`.
 *
 * @returns `{ ok: true, data: DailyBucket[] }` (always a full zero-filled window) on success, or `{ ok: false }` if the read failed.
 */
export async function getVinSearchSeries(): Promise<DashboardReadResult<DailyBucket[]>> {
    try {
        const supabase = await createClient()
        const now = getServerNow()

        const { data, error } = await supabase
            .from('analytics_events')
            .select('created_at')
            .eq('event_type', ANALYTICS_EVENTS.VIN_SEARCH)
            .gte('created_at', windowStartIso(now))

        if (error) {
            console.error('getVinSearchSeries: Supabase read failed', { error })
            return { ok: false }
        }

        const timestamps = (data ?? []).map((row) => row.created_at as string)
        return { ok: true, data: bucketByDay(timestamps, now, ANALYTICS_WINDOW_DAYS) }
    } catch (error) {
        console.error('getVinSearchSeries: unexpected error', { error })
        return { ok: false }
    }
}

/**
 * Reads the ADMIN-03 contacts chart series. **D-18 amendment: this function
 * deliberately reads the real `contacts` table, not `analytics_events`,**
 * unlike its two siblings above. Research surfaced a conflict between D-01
 * (charts query `analytics_events`) and D-02 (no card or chart shows `0`
 * when real data exists): `contacts` holds real Phase 4 rows today, so a
 * contacts summary card showing a real count directly above a contacts chart
 * showing "no data" would read as a bug -- exactly the failure mode D-02
 * exists to prevent. Do NOT "make the three charts consistent" by switching
 * this back to `analytics_events` -- that would silently revert D-18.
 *
 * @returns `{ ok: true, data: DailyBucket[] }` (always a full zero-filled window) on success, or `{ ok: false }` if the read failed.
 */
export async function getContactSeries(): Promise<DashboardReadResult<DailyBucket[]>> {
    try {
        const supabase = await createClient()
        const now = getServerNow()

        const { data, error } = await supabase.from('contacts').select('created_at').gte('created_at', windowStartIso(now))

        if (error) {
            console.error('getContactSeries: Supabase read failed', { error })
            return { ok: false }
        }

        const timestamps = (data ?? []).map((row) => row.created_at as string)
        return { ok: true, data: bucketByDay(timestamps, now, ANALYTICS_WINDOW_DAYS) }
    } catch (error) {
        console.error('getContactSeries: unexpected error', { error })
        return { ok: false }
    }
}
