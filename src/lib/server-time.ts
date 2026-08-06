import 'server-only'

// This module's output (the current date/time) is not secret, but D-06
// requires that "now" is decided by the server, never the browser -- a
// booking's past/future status must never depend on a client clock that
// could be wrong or deliberately manipulated (T-04-03-01). The
// `server-only` import above turns an accidental client-side import of this
// module into a Next.js build error rather than a silent wrong-clock bug.

/**
 * D-06: the single IANA timezone every "what time is it" decision in this
 * phase is computed against, regardless of the host machine's own timezone
 * (Vercel's Node runtime defaults to UTC).
 */
export const BUSINESS_TIME_ZONE = 'America/Chicago'

interface BusinessNowParts {
    year: number
    month: number
    day: number
    hour: number
    minute: number
}

const PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
})

/**
 * Decomposes a JS `Date` (an instant in time) into its `America/Chicago`
 * wall-clock parts, via `Intl.DateTimeFormat` + `formatToParts` with an
 * explicit `timeZone` -- never derived from the host machine's own
 * timezone. Extracted from `getBusinessNowParts` so the same logic can be
 * tested deterministically against a fixed known instant instead of the
 * live clock.
 *
 * @param instant - The instant in time to decompose.
 * @returns The instant's `America/Chicago` wall-clock parts.
 */
function toBusinessParts(instant: Date): BusinessNowParts {
    const parts = Object.fromEntries(PARTS_FORMATTER.formatToParts(instant).map((part) => [part.type, part.value]))

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        // Intl can emit '24' for midnight when hour12 is false -- normalize
        // it back to 0 so callers never see an out-of-range hour.
        hour: Number(parts.hour === '24' ? '0' : parts.hour),
        minute: Number(parts.minute),
    }
}

/**
 * Returns the current date/time, decomposed as `America/Chicago` wall-clock
 * parts (D-06). Never read the host machine's local timezone directly --
 * the server process itself runs in UTC on Vercel.
 *
 * @returns The current instant's `America/Chicago` wall-clock parts.
 */
export function getBusinessNowParts(): BusinessNowParts {
    return toBusinessParts(new Date())
}

/**
 * Returns today's `America/Chicago` calendar date as a `'yyyy-MM-dd'`
 * string, for keying against Postgres `DATE` columns and for the calendar
 * UI's disabled-date matcher.
 *
 * @returns Today's Central-time date as a zero-padded `'yyyy-MM-dd'` string.
 */
export function getBusinessTodayDateString(): string {
    const { year, month, day } = getBusinessNowParts()
    return formatDateParts(year, month, day)
}

/**
 * Formats a `Date` object into a `'yyyy-MM-dd'` key using its **local**
 * calendar getters (`getFullYear`/`getMonth`/`getDate`) -- deliberately NOT
 * `toISOString()`. `toISOString()` converts to UTC first, which shifts the
 * calendar day near midnight; `react-day-picker` constructs its internal
 * `Date` objects from the browser's local calendar grid, so keying against
 * those objects must use the same local-getter convention, or a date near
 * midnight would key to the wrong day.
 *
 * @param date - The `Date` object to key, typically constructed by `react-day-picker` from its month grid.
 * @returns The date's local calendar day as a zero-padded `'yyyy-MM-dd'` string.
 */
export function formatLocalDateKey(date: Date): string {
    return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function formatDateParts(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Decides whether a `'yyyy-MM-dd'` date string is strictly before today in
 * `America/Chicago`. Used to classify a calendar date as past, today, or
 * future.
 *
 * @param dateString - A `'yyyy-MM-dd'` date string to classify.
 * @param nowParts - The Central-time "now" parts to compare against (inject explicitly for deterministic tests; defaults to the live clock).
 * @returns `true` when `dateString` is strictly before today.
 */
export function isDateBeforeBusinessToday(dateString: string, nowParts: BusinessNowParts = getBusinessNowParts()): boolean {
    const [yearPart, monthPart, dayPart] = dateString.split('-').map(Number)
    const todayValue = nowParts.year * 10000 + nowParts.month * 100 + nowParts.day
    const dateValue = yearPart * 10000 + monthPart * 100 + dayPart
    return dateValue < todayValue
}

/**
 * Decides whether a given `(appt_date, appt_time)` pair has already passed
 * relative to `America/Chicago` "now" (D-06/D-15). Compares year/month/day
 * against `apptDate` first, and only compares hour/minute against `apptTime`
 * when `apptDate` equals today -- this order is deliberate.
 *
 * Do NOT construct a JS `Date` by concatenating the database's `DATE` and
 * `TIME` strings and letting the runtime apply an implicit timezone -- that
 * reintroduces exactly the bug D-06 exists to prevent (a `DATE`+`TIME`
 * literal parsed as UTC, or as the host machine's local zone, silently
 * disagrees with the Central-time business rule).
 *
 * @param apptDate - The appointment's date as a `'yyyy-MM-dd'` string.
 * @param apptTime - The appointment's time as a `'HH:mm'` 24-hour string.
 * @param nowParts - The Central-time "now" parts to compare against (inject explicitly for deterministic tests; defaults to the live clock).
 * @returns `true` when the appointment's date and time are both at or before "now".
 */
export function isSlotInThePast(apptDate: string, apptTime: string, nowParts: BusinessNowParts = getBusinessNowParts()): boolean {
    if (isDateBeforeBusinessToday(apptDate, nowParts)) return true

    const [yearPart, monthPart, dayPart] = apptDate.split('-').map(Number)
    const isToday = yearPart === nowParts.year && monthPart === nowParts.month && dayPart === nowParts.day
    if (!isToday) return false

    const [hourPart, minutePart] = apptTime.split(':').map(Number)
    const nowMinutes = nowParts.hour * 60 + nowParts.minute
    const slotMinutes = hourPart * 60 + minutePart
    return slotMinutes <= nowMinutes
}
