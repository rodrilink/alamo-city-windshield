// This module's output (daily event/row counts over a trailing window) is
// NOT secret -- its whole purpose is to reach the browser as chart data
// (rendered by a Server Component into a Client Component's props, mirroring
// `src/lib/booking/slots.ts`'s same reasoning). No `import 'server-only'`
// fence is added here. This module never calls `new Date()` or `Date.now()`
// internally -- the caller passes `now` explicitly, the same idiom
// `slots.ts`'s `generateSlotsForDate` uses to stay testable without a clock
// mock.
//
// Gap closure (06-07, CR-02): BOTH the per-timestamp count key and the axis
// day key are now derived from `businessDayKey` (America/Chicago), the SAME
// function. This is deliberate and load-bearing -- if one side used a
// different day definition than the other (e.g. axis days built from
// host-local `startOfDay`/`eachDayOfInterval` while counts keyed off
// `businessDayKey`), the two `Map`s would silently stop joining and the
// chart would render an all-zero series, which is a WORSE failure than the
// wrong-day attribution bug this replaces (see `T-06-07-04`).
//
// The axis is built by walking backward from `now` in fixed 24-hour
// millisecond steps -- NOT `date-fns`' `addDays`/`subDays`, which internally
// call `Date.prototype.setDate`/`getDate` (host-local calendar arithmetic,
// the same anti-pattern CR-03 fixes in `dashboard-queries.ts`). A pure
// millisecond step is host-timezone-independent by construction. Each step
// is then projected through `businessDayKey` to get its Chicago calendar-day
// label, so the axis and the counts can never disagree.

import { businessDayKey } from '@/lib/analytics/business-day'
import type { DailyBucket } from '@/types/admin'

/**
 * Gap closure (06-07, CR-02/CR-03): the fixed-size building block for
 * host-timezone-independent day arithmetic on this analytics path. Exported
 * so `dashboard-queries.ts`'s `windowStartIso` (CR-03's fix) can step by the
 * same unit this module uses for its axis walk, rather than duplicating the
 * magic number or falling back to `date-fns`' host-local `addDays`/`subDays`.
 */
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/** D-03: length of the trailing window every chart queries, in days. */
export const ANALYTICS_WINDOW_DAYS = 30

/** D-03: the bucket granularity every chart aggregates into. */
export const ANALYTICS_BUCKET_GRANULARITY = 'day' as const

/**
 * D-03: buckets raw `created_at` timestamps into daily counts across a fixed
 * trailing window, keyed by the `America/Chicago` business day (CR-02) for
 * both the counts and the axis. Every day in the window appears in the
 * output, including zero-count days -- this is what keeps the chart's x-axis
 * continuous across quiet days rather than collapsing the gap.
 *
 * @param createdAtTimestamps - ISO-8601 `created_at` strings from a Supabase row set, already filtered to one source/event_type.
 * @param now - The reference "today" instant, passed explicitly so this function needs no clock mock in tests.
 * @param windowDays - Defaults to `ANALYTICS_WINDOW_DAYS`; parameterized so tests can use a small window.
 * @returns One `DailyBucket` per day in the window, oldest first, zero-filled for days with no matching timestamps.
 */
export function bucketByDay(
    createdAtTimestamps: string[],
    now: Date,
    windowDays: number = ANALYTICS_WINDOW_DAYS
): DailyBucket[] {
    // Fixed 24h-millisecond steps back from `now` -- never host-local
    // calendar arithmetic (see module header). The resulting instants are
    // only ever used as input to `businessDayKey` below, never rendered or
    // compared directly, so a step landing at a slightly different
    // wall-clock hour than `now` (possible across a DST transition) cannot
    // produce a wrong label.
    const days: Date[] = []
    for (let daysBack = windowDays - 1; daysBack >= 0; daysBack--) {
        days.push(new Date(now.getTime() - daysBack * MILLISECONDS_PER_DAY))
    }

    const countsByDate = new Map<string, number>()
    for (const timestamp of createdAtTimestamps) {
        const dateKey = businessDayKey(timestamp)
        countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1)
    }

    return days.map((day) => {
        const dateKey = businessDayKey(day)
        return { date: dateKey, count: countsByDate.get(dateKey) ?? 0 }
    })
}
