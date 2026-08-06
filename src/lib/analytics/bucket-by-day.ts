// This module's output (daily event/row counts over a trailing window) is
// NOT secret -- its whole purpose is to reach the browser as chart data
// (rendered by a Server Component into a Client Component's props, mirroring
// `src/lib/booking/slots.ts`'s same reasoning). No `import 'server-only'`
// fence is added here. This module never calls `new Date()` or `Date.now()`
// internally -- the caller passes `now` explicitly, the same idiom
// `slots.ts`'s `generateSlotsForDate` uses to stay testable without a clock
// mock.

import { eachDayOfInterval, format, startOfDay, subDays } from 'date-fns'

import type { DailyBucket } from '@/types/admin'

/** D-03: length of the trailing window every chart queries, in days. */
export const ANALYTICS_WINDOW_DAYS = 30

/** D-03: the bucket granularity every chart aggregates into. */
export const ANALYTICS_BUCKET_GRANULARITY = 'day' as const

/**
 * D-03: buckets raw `created_at` timestamps into daily counts across a fixed
 * trailing window. Every day in the window appears in the output, including
 * zero-count days -- this is what keeps the chart's x-axis continuous even
 * though, per D-01, every day is currently a zero day for the two
 * `analytics_events`-sourced charts (event tracking arrives in Phase 6).
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
    const windowEnd = startOfDay(now)
    const windowStart = subDays(windowEnd, windowDays - 1)

    const days = eachDayOfInterval({ start: windowStart, end: windowEnd })

    const countsByDate = new Map<string, number>()
    for (const timestamp of createdAtTimestamps) {
        const dateKey = format(new Date(timestamp), 'yyyy-MM-dd')
        countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1)
    }

    return days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd')
        return { date: dateKey, count: countsByDate.get(dateKey) ?? 0 }
    })
}
