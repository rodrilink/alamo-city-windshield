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

import { startOfDay, subDays } from 'date-fns'

import { createClient } from '@/lib/supabase/server'
import { bucketByDay, ANALYTICS_WINDOW_DAYS } from '@/lib/analytics/bucket-by-day'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { getBusinessNowParts, getBusinessTodayDateString } from '@/lib/server-time'
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
 * Four card totals for the dashboard summary row (ADMIN-05), mixed-source
 * per D-02: `contacts` and `bookings` are real-table counts (Phase 4 already
 * writes real rows there); `visitors` and `vinSearches` count
 * `analytics_events` rows, written by Phase 6 via
 * `src/lib/analytics/track-event.ts`. Every count uses
 * `select('*', { count: 'exact', head: true })` so only the count crosses
 * the wire, never row data. A real `0` remains a legitimate empty state
 * (e.g. no visitors yet today) that stays structurally distinct from a
 * `{ ok: false }` failure -- never fabricate or estimate a number (D-02).
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
 * @returns `{ ok: true, data: SummaryTotals }` on success, or `{ ok: false }` if any count failed.
 */
export async function getSummaryTotals(): Promise<DashboardReadResult<SummaryTotals>> {
    try {
        const supabase = await createClient()

        const [contactsResult, bookingsResult, visitorsResult, vinSearchesResult] = await Promise.all([
            supabase.from('contacts').select('*', { count: 'exact', head: true }),
            supabase.from('bookings').select('*', { count: 'exact', head: true }),
            supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', ANALYTICS_EVENTS.PAGE_VIEW),
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
        if (visitorsResult.error) {
            console.error('getSummaryTotals: visitors count failed', { error: visitorsResult.error })
            return { ok: false }
        }
        if (vinSearchesResult.error) {
            console.error('getSummaryTotals: vinSearches count failed', { error: vinSearchesResult.error })
            return { ok: false }
        }

        return {
            ok: true,
            data: {
                contacts: contactsResult.count ?? 0,
                bookings: bookingsResult.count ?? 0,
                visitors: visitorsResult.count ?? 0,
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
 * Derives "now" as a plain `Date` instant from the server-time module's
 * business-timezone parts (`getBusinessNowParts`), rather than calling
 * `new Date()` directly at each call site (T-05-06-05). The instant itself
 * is passed explicitly into `bucketByDay`, matching that function's
 * "clock passed as parameter, never read internally" contract.
 */
function getServerNow(): Date {
    const { year, month, day, hour, minute } = getBusinessNowParts()
    return new Date(year, month - 1, day, hour, minute)
}

/**
 * Computes the D-03 window start (`ANALYTICS_WINDOW_DAYS` days back from
 * `now`) as an ISO-8601 instant, for the `.gte('created_at', ...)` filter
 * shared by all three chart-series reads below.
 */
function windowStartIso(now: Date): string {
    return startOfDay(subDays(now, ANALYTICS_WINDOW_DAYS - 1)).toISOString()
}

/**
 * Reads the ADMIN-02 visitor-traffic chart series: `analytics_events` rows
 * whose `event_type` is a page view, over the trailing `ANALYTICS_WINDOW_DAYS`
 * window, bucketed into daily counts by `bucketByDay`. Phase 6 now writes
 * these rows via `src/lib/analytics/track-event.ts`'s `trackBrowserEvent`;
 * a genuinely empty window (e.g. no visitors yet today) remains a legitimate
 * empty result -- the page renders `ADMIN_COPY.dashboardEmptyStateHint` for
 * it, structurally distinct from a `{ ok: false }` failure.
 *
 * @returns `{ ok: true, data: DailyBucket[] }` (always a full zero-filled window) on success, or `{ ok: false }` if the read failed.
 */
export async function getVisitorSeries(): Promise<DashboardReadResult<DailyBucket[]>> {
    try {
        const supabase = await createClient()
        const now = getServerNow()

        const { data, error } = await supabase
            .from('analytics_events')
            .select('created_at')
            .eq('event_type', ANALYTICS_EVENTS.PAGE_VIEW)
            .gte('created_at', windowStartIso(now))

        if (error) {
            console.error('getVisitorSeries: Supabase read failed', { error })
            return { ok: false }
        }

        const timestamps = (data ?? []).map((row) => row.created_at as string)
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
