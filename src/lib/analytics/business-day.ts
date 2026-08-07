// Gap closure (06-07, CR-02): the ONE definition of "a day" for the visitors
// analytics path. Two other day definitions exist on this codebase's history
// and BOTH are wrong here:
//
//   - `createdAt.slice(0, 10)` -- a UTC calendar day, because Supabase
//     serializes `TIMESTAMPTZ` in UTC. `getVisitorSeries` used this to dedupe.
//   - `format(new Date(ts), 'yyyy-MM-dd')` -- a HOST-local calendar day,
//     because `new Date(ts)` combined with `date-fns`' `format` reads the
//     host machine's own timezone. `bucketByDay` used this to bucket.
//
// The actual business day is `America/Chicago` (`BUSINESS_TIME_ZONE` in
// `server-time.ts`). On Vercel the host runs UTC, so a session spanning UTC
// midnight (e.g. 23:50Z and 00:10Z, both ~18:5x/19:1x Chicago the same
// evening) produced TWO different UTC-day keys under the old dedupe, and a
// single Chicago evening (19:00-23:59 Chicago, which is the *next* UTC day)
// was attributed to the wrong calendar day under the old host-local bucket
// key. Routing both the dedupe key and the bucket key through this single
// function eliminates both defects at once -- see `bucket-by-day.ts` and
// `dashboard-queries.ts`.
//
// This module never calls `new Date()` internally and never reads
// `getFullYear()`/`getMonth()`/`getDate()` (host-local getters) -- it only
// derives calendar parts via `Intl.DateTimeFormat` with an explicit
// `timeZone`, matching `server-time.ts`'s established approach. That keeps it
// pure, clock-free and host-timezone-independent, so it is testable without
// mocks and produces the same output under any `TZ`.

import { BUSINESS_TIME_ZONE } from '@/lib/server-time'

const BUSINESS_DAY_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
})

/**
 * Returns `instant`'s calendar day in `BUSINESS_TIME_ZONE`
 * (`America/Chicago`), as a `'yyyy-MM-dd'` string -- regardless of the host
 * machine's own timezone. This is the single day definition the visitors
 * analytics path uses for both session-dedupe and chart-bucketing (CR-02).
 *
 * Uses `Intl.DateTimeFormat`'s `'en-CA'` locale, which formats dates as
 * `yyyy-MM-dd` natively, with an explicit `timeZone` -- never
 * `getFullYear()`/`getMonth()`/`getDate()`, which read host-local parts and
 * are the root cause this function exists to avoid.
 *
 * @param instant - An ISO-8601 timestamp string or `Date` instant to key.
 * @returns The instant's `America/Chicago` calendar day as `'yyyy-MM-dd'`.
 */
export function businessDayKey(instant: string | Date): string {
    const date = instant instanceof Date ? instant : new Date(instant)
    return BUSINESS_DAY_KEY_FORMATTER.format(date)
}
