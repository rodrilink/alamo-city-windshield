// Client-safe date-key helpers for the booking Client Components.
//
// `src/lib/server-time.ts` is deliberately fenced with `import 'server-only'`
// (D-06) so a client-side call can never silently use the browser's clock
// instead of the server-decided "now". That fence means its
// `formatLocalDateKey`/`isDateBeforeBusinessToday` cannot be imported here --
// doing so is a Next.js build error by design (confirmed empirically: this
// fence broke `npm run build` when first attempted). This file duplicates
// only the pure, non-secret formatting logic (never the "what time is it"
// decision itself, which stays server-only and is passed down as the
// `serverToday` prop) so `BookingCalendar`/`SlotList` can key dates without
// crossing the fence.
//
// Per RESEARCH.md Pitfall 3 / Pattern 3: never use `date.toISOString()` to
// key a date against business logic -- it converts to UTC first, shifting
// the calendar day near midnight. `react-day-picker` constructs its internal
// `Date` objects from the browser's local calendar grid, so keying must use
// local getters (`getFullYear`/`getMonth`/`getDate`), matching
// `formatLocalDateKey`'s convention exactly.

import type { ServerTodayParts } from '@/components/booking/BookingCalendar'

/**
 * Formats a `Date` object into a `'yyyy-MM-dd'` key using its local calendar
 * getters -- never `toISOString()`. Mirrors `formatLocalDateKey` in
 * `src/lib/server-time.ts` exactly; duplicated here because that module is
 * `server-only` fenced (see file header).
 *
 * @param date - The `Date` object to key, typically constructed by `react-day-picker` from its month grid.
 * @returns The date's local calendar day as a zero-padded `'yyyy-MM-dd'` string.
 */
export function formatLocalDateKeyClient(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Decides whether a `'yyyy-MM-dd'` date key is strictly before the server's
 * decided "today" (D-05/D-06). `serverToday` must always be the value passed
 * down as a prop from a Server Component's `getBusinessNowParts()` call --
 * never derived from the client's own clock here.
 *
 * @param dateKey - A `'yyyy-MM-dd'` date string to classify.
 * @param serverToday - The Central-time "today" parts computed server-side and passed down as props.
 * @returns `true` when `dateKey` is strictly before `serverToday`.
 */
export function isDateKeyBeforeServerToday(dateKey: string, serverToday: ServerTodayParts): boolean {
    const [yearPart, monthPart, dayPart] = dateKey.split('-').map(Number)
    const todayValue = serverToday.year * 10000 + serverToday.month * 100 + serverToday.day
    const dateValue = yearPart * 10000 + monthPart * 100 + dayPart
    return dateValue < todayValue
}
