---
phase: 06-analytics
reviewed: 2026-08-07T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/app/(public)/layout.tsx
  - src/app/api/vin/[vin]/route.ts
  - src/components/analytics/PageViewTracker.tsx
  - src/lib/analytics/events.test.ts
  - src/lib/analytics/events.ts
  - src/lib/analytics/session-id.test.ts
  - src/lib/analytics/session-id.ts
  - src/lib/analytics/track-browser-event.ts
  - src/lib/analytics/track-event.ts
  - src/lib/booking/booking-actions.ts
  - src/lib/contact/contact-actions.ts
  - src/lib/dashboard/dashboard-queries.ts
  - supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql
findings:
  critical: 3
  warning: 6
  info: 4
  total: 13
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-08-07
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 6 wires four analytics producers and reworks the Visitors KPI to count distinct sessions. The single-source-of-truth `events.ts` module, the `track-browser-event.ts` / `track-event.ts` split, and the fire-and-forget swallow discipline are all sound and correctly reasoned — I found no way for a tracking failure to propagate into a user-facing action, which was a stated requirement.

The defects are concentrated in `dashboard-queries.ts`, and they are worse than the "unbounded fetch as data grows" performance concern flagged in the brief. **This repo explicitly configures `max_rows = 1000` in `supabase/config.toml:18`.** That converts the two unbounded `analytics_events` reads from a slow query into a *silently truncated wrong answer*: past 1000 rows the Visitors KPI stops increasing and the Visitors chart loses its oldest days, with no error and no `{ ok: false }`. This is the exact "plausible-but-wrong number" failure the module's own header comment says it exists to prevent, and it is reachable at a very modest traffic level.

Separately, I found two genuine timezone defects that the extensive comments in `server-time.ts` and `bucket-by-day.ts` claim to have designed against. `getServerNow()` reconstructs a `Date` from America/Chicago wall-clock parts using the *host* timezone constructor, producing an instant skewed by the UTC offset (5 hours on Vercel, which runs UTC). And `getVisitorSeries` keys its per-day dedupe off `createdAt.slice(0,10)` (a UTC day) while `bucketByDay` buckets the same timestamps by host-local day — two different day definitions applied to the same data, neither of which is the America/Chicago business day the rest of the codebase is careful to use.

The `session_id` column is client-controlled and unvalidated, with no length bound anywhere in the stack. That is not an injection vector (PostgREST parameterizes), but it is an unbounded-write vector under a `WITH CHECK (true)` public insert policy.

Note on scope: several items the brief listed as intentional (empty browser catch, NULL exclusion, whole-read failure, the two-module split, `await` on tracking) I verified and am *not* reporting. The `await`-on-tracking design in particular is correct for Vercel's runtime and I confirmed it cannot break the VIN response.

## Critical Issues

### CR-01: Visitors KPI and chart silently truncate at 1000 rows — `max_rows` is configured in this repo

**File:** `src/lib/dashboard/dashboard-queries.ts:95`, `src/lib/dashboard/dashboard-queries.ts:271-275`
**Issue:**
Both `analytics_events` reads fetch rows with no `.limit()` and no pagination:

```ts
supabase.from('analytics_events').select('session_id').eq('event_type', ANALYTICS_EVENTS.PAGE_VIEW),
```

PostgREST caps every response at `max_rows`. This is not a hypothetical default — it is explicitly set in this repo:

```toml
# supabase/config.toml:18
max_rows = 1000
```

The cap is applied server-side and returns **HTTP 200 with a truncated body**. There is no error, so `visitorSessionsResult.error` is null and the `if (error)` guard never fires. Consequences:

1. **`getSummaryTotals`** (line 95) selects *all* `page_view` rows ever written, with no time filter at all. Once the table holds 1000 `page_view` rows lifetime, `distinctSessionIds.size` freezes and the "Total Visitors" card stops increasing forever. At ~5 page views per session that is ~200 sessions — reachable in days, not years.
2. **`getVisitorSeries`** (line 271) has a 30-day filter but no ordering. PostgREST returns an arbitrary (physical-order) 1000-row subset when truncated, so the chart silently loses whole days — and *which* days is nondeterministic.

This produces exactly the "plausible-but-wrong number" the module header (lines 13-18) says a `{ ok: false }` must exist to prevent. A frozen KPI reads as "traffic flatlined," which is worse than an error state because an owner will act on it.

Note that `getSummaryTotals` is additionally the only read in the file with no time window whatsoever, so it degrades fastest.

**Fix:**
Do the distinct-count in the database instead of in TypeScript. Add an RPC that returns a scalar, which also removes the row transfer entirely:

```sql
-- new migration
CREATE OR REPLACE FUNCTION count_distinct_visitor_sessions(since TIMESTAMPTZ DEFAULT NULL)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT COUNT(DISTINCT session_id)
  FROM analytics_events
  WHERE event_type = 'page_view'
    AND session_id IS NOT NULL
    AND (since IS NULL OR created_at >= since);
$$;

CREATE OR REPLACE FUNCTION visitor_sessions_by_day(since TIMESTAMPTZ)
RETURNS TABLE(day DATE, sessions BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT (created_at AT TIME ZONE 'America/Chicago')::date AS day,
         COUNT(DISTINCT session_id) AS sessions
  FROM analytics_events
  WHERE event_type = 'page_view'
    AND session_id IS NOT NULL
    AND created_at >= since
  GROUP BY 1;
$$;
```

`SECURITY INVOKER` keeps the existing RLS posture (`admin_select_analytics`) intact — do not use `SECURITY DEFINER` here. Then:

```ts
const { data: visitorCount, error } = await supabase.rpc('count_distinct_visitor_sessions')
// ...
visitors: visitorCount ?? 0,
```

This also fixes CR-02's day-key problem for the chart, since Postgres does the timezone conversion correctly. If an RPC is not acceptable, you must at minimum add `.limit()` + explicit `.order('created_at')` + a pagination loop, and treat a full-page result as a signal to keep fetching — but the RPC is strictly better and less code.

---

### CR-02: `getVisitorSeries` dedupes by UTC day while `bucketByDay` buckets by host-local day — neither is the business day

**File:** `src/lib/dashboard/dashboard-queries.ts:293` (and `src/lib/analytics/bucket-by-day.ts:44`)
**Issue:**
The dedupe key is derived by string-slicing the ISO timestamp:

```ts
const dayKey = createdAt.slice(0, 10)   // UTC calendar day
```

`created_at` is `TIMESTAMPTZ` and Supabase serializes it in UTC, so `slice(0,10)` is the **UTC** day. But the surviving timestamps are then handed to `bucketByDay`, which buckets via `format(new Date(timestamp), 'yyyy-MM-dd')` — the **host-local** day. And the business day everywhere else in this codebase is **America/Chicago** (`server-time.ts:15`).

Three different day definitions across one data path. Demonstrated (a real instant of Aug 6, 23:30 Chicago):

```
$ TZ=UTC node -e "..."
host TZ: UTC
dedupe key (slice(0,10))       -> 2026-08-07
bucketByDay key (host-local)   -> 2026-08-07
Chicago business day           -> 2026-08-06
```

Two concrete bugs follow:

1. **Wrong-day attribution.** Every event between 19:00 and 23:59 Chicago (00:00-04:59 UTC) is credited to the *next* calendar day on the chart. That is a five-hour window every single evening — peak consumer browsing hours for a local windshield service.
2. **Genuine double-counting, which defeats the purpose of the dedupe.** A session active across the UTC midnight boundary (e.g. 18:30 and 19:30 Chicago) gets two *different* dedupe keys, so two timestamps survive. Both then land in the *same* `bucketByDay` day. That session contributes **2** to one day's bucket — the exact "N page views inflate the visitor count" bug this gap closure exists to fix, just narrowed to the evening window.

The `bucketByDay` header comment claims it avoids clock problems by taking `now` as a parameter, but that only controls the window edges, not the per-timestamp bucketing on line 44, which still reads host-local.

**Fix:**
Preferred: adopt CR-01's `visitor_sessions_by_day` RPC, which does the grouping in Postgres with an explicit `AT TIME ZONE 'America/Chicago'`, eliminating both day-key definitions.

If keeping the TypeScript path, derive the business day explicitly and use one key for both stages:

```ts
import { TZDate } from '@date-fns/tz'   // or format via Intl with an explicit timeZone

function businessDayKey(iso: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIME_ZONE,
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(iso))   // en-CA yields 'yyyy-MM-dd'
}
```

Then key the dedupe map with `businessDayKey(createdAt)` **and** change `bucketByDay` to bucket with the same function, so the two stages cannot disagree.

---

### CR-03: `getServerNow()` returns an instant skewed by the host UTC offset, shifting every chart window

**File:** `src/lib/dashboard/dashboard-queries.ts:236-239`
**Issue:**

```ts
function getServerNow(): Date {
    const { year, month, day, hour, minute } = getBusinessNowParts()
    return new Date(year, month - 1, day, hour, minute)
}
```

`getBusinessNowParts()` returns **America/Chicago wall-clock parts**. The `new Date(y, m, d, h, min)` constructor interprets its arguments in the **host machine's** timezone. Feeding Chicago parts into a UTC-host constructor yields an instant that is wrong by the Chicago↔host offset. Verified:

```
$ TZ=UTC node -e "..."
host TZ: UTC
getServerNow -> 2026-08-06T23:30:00.000Z
real instant -> 2026-08-07T04:30:00.000Z
skew (hours): 5
```

Vercel's Node runtime runs UTC, so this is the production case, not an edge case. The bad instant flows into both `windowStartIso(now)` (the `.gte('created_at', ...)` filter for all three chart reads) and `bucketByDay(timestamps, now, ...)` (which derives the window edges).

Effect: every chart's 30-day window is shifted 5-6 hours early. The oldest day in the window is over-included and the newest day is cut short — so **today's most recent 5 hours of events are silently dropped from all three charts** (`.gte` is fine but `bucketByDay`'s `windowEnd = startOfDay(now)` lands on the wrong day near midnight, and the eachDayOfInterval range ends a day early during the 19:00-23:59 Chicago window). Combined with CR-02, the evening window is doubly wrong.

This is masked on a developer machine set to America/Chicago (skew = 0), which is likely why it was not caught — I reproduced it only by forcing `TZ=UTC`.

**Fix:**
`getBusinessNowParts()` already derives from `new Date()`, so the true instant is simply `new Date()`. The parts round-trip is what corrupts it. If the intent is "start of the current Chicago business day as a real instant," compute it without a lossy reconstruction:

```ts
/**
 * The current instant. "Now" as an instant is timezone-independent; only its
 * *rendering* into calendar parts needs the business timezone, which is done
 * downstream by the business-day key helper (see CR-02 fix).
 */
function getServerNow(): Date {
    return new Date()
}
```

and make the day-bucketing timezone-aware per CR-02, rather than trying to encode the timezone into the instant itself. Encoding a timezone offset into a `Date` and then treating it as a real instant is the anti-pattern `server-time.ts:124-129` explicitly warns against — this function reintroduces it.

## Warnings

### WR-01: `session_id` is client-controlled and unbounded — no length or format validation anywhere

**File:** `src/lib/analytics/track-browser-event.ts:46`, `supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql:23`
**Issue:**
`session_id` is written from browser-supplied input straight into an untyped `TEXT` column, under an RLS policy of `WITH CHECK (true)`:

```ts
session_id: fields?.sessionId ?? null,
```

It is not an injection vector — PostgREST parameterizes, and the value is only ever compared/`Set`-keyed, never interpolated into SQL or rendered as HTML. But there is no bound of any kind. An attacker can POST directly to the public `analytics_events` endpoint with the anon key (which is in the browser bundle by design) and write megabyte-sized `session_id` values, or millions of unique ones. `TEXT` has no length limit, and `max_rows` bounds reads, not writes. Beyond metric skew, this is a storage-exhaustion and read-amplification vector against the free-tier 500 MB budget.

**Fix:**
Constrain at the database, which is the only layer an attacker cannot bypass:

```sql
ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_session_id_len
  CHECK (session_id IS NULL OR char_length(session_id) <= 64);
```

Also defensively truncate client-side so a legitimate oversized value fails closed rather than erroring the insert:

```ts
session_id: fields?.sessionId?.slice(0, 64) ?? null,
```

Longer term, rate-limiting the public insert policy (or moving inserts behind a Route Handler with a token) is the real mitigation, but the CHECK constraint is the cheap high-value step.

---

### WR-02: Composite index column order does not serve either query

**File:** `supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql:25-26`
**Issue:**

```sql
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created_session
  ON analytics_events (event_type, created_at, session_id);
```

The migration adds this index but neither query can use it as an index-only scan for the distinct-session work. `getSummaryTotals`'s visitor read filters on `event_type` only (no `created_at` predicate at all — see CR-01), so the `created_at` middle column forces a range scan over every matching row. More importantly, `COUNT(DISTINCT session_id)` (the CR-01 fix) wants `session_id` adjacent to `event_type`, not separated by a high-cardinality timestamp.

This is a correctness-adjacent concern rather than pure performance: without a usable index the CR-01 RPC will do a sequential scan, and the whole point of moving the count into Postgres is to make it cheap.

**Fix:**
Keep the existing index for the time-windowed chart read, and add one that serves the distinct-session count:

```sql
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_session
  ON analytics_events (event_type, session_id)
  WHERE session_id IS NOT NULL;
```

The partial predicate matches the `session_id IS NOT NULL` filter both call sites apply, keeping the index small.

---

### WR-03: `PageViewTracker` writes its dedupe marker before confirming the insert, losing the event permanently

**File:** `src/components/analytics/PageViewTracker.tsx:55-58`
**Issue:**

```ts
void trackBrowserEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: pathname, sessionId })

try {
    window.sessionStorage.setItem(SESSION_STORAGE_PREFIX + pathname, '1')
}
```

The `void` detaches the promise and the marker is set immediately, unconditionally. If the insert fails (offline, Supabase 5xx, ad-blocker blocking the Supabase domain — common for anything named `analytics`), the marker is still written. The event is then **permanently** lost for that path+tab: every subsequent visit short-circuits at the `alreadySeen` guard.

An ad-blocker blocking the Supabase host is the realistic case, and it silently suppresses all page-view tracking for those users while the code believes it succeeded. This compounds CR-01's undercount.

Additionally, `void` on a floating promise here means React may unmount the component mid-flight during a fast navigation, though `fetch` is not cancelled so the insert generally still lands.

**Fix:**
Set the marker only after a confirmed success. This requires `trackBrowserEvent` to report outcome without throwing (D-12's no-console rule is preserved — a boolean return is not console output):

```ts
// track-browser-event.ts
export async function trackBrowserEvent(...): Promise<boolean> {
    try {
        const supabase = createClient()
        const { error } = await supabase.from('analytics_events').insert({ ... })
        return !error
    } catch {
        return false
    }
}
```

```tsx
// PageViewTracker.tsx
void trackBrowserEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: pathname, sessionId }).then((ok) => {
    if (!ok) return
    try {
        window.sessionStorage.setItem(SESSION_STORAGE_PREFIX + pathname, '1')
    } catch {
        // dedupe is best-effort
    }
})
```

Note the existing code also ignores the `error` field entirely (`await supabase...insert()` without destructuring `error`), so a PostgREST-level rejection is invisible even to the `catch` — the promise resolves normally. That is worth fixing regardless of the marker ordering.

---

### WR-04: `trackBrowserEvent` never inspects the returned `error`, so failures are undetectable rather than merely unlogged

**File:** `src/lib/analytics/track-browser-event.ts:43-47`
**Issue:**

```ts
await supabase.from('analytics_events').insert({ ... })
```

supabase-js does not reject on a PostgREST error; it resolves with `{ error }`. The `catch` block therefore only catches network-layer throws. An RLS rejection, constraint violation, or 4xx resolves successfully and is completely invisible — not just unlogged (which is D-12's intent), but unobservable to the function itself.

D-12 is a decision about *console output*, not about discarding the error value. As written, the function cannot distinguish success from failure even internally, which is what blocks the WR-03 fix.

**Fix:** Destructure and return the outcome as shown in WR-03's fix. This keeps the console silent (D-12 intact) while making the result actionable.

---

### WR-05: Honeypot rejection returns `status: 'success'` with `values`, leaking the bot-detection signal it exists to hide

**File:** `src/lib/booking/booking-actions.ts:64-66`, `src/lib/contact/contact-actions.ts:37-39`
**Issue:**

```ts
if (values.honeypot !== '') {
    return { status: 'success', values }
}
```

The stated intent is "the bot gets no signal that its submission was discarded." But the real success paths (`booking-actions.ts:123`, `contact-actions.ts:75`) return the *same* `{ status: 'success', values }` shape, so the shapes match — good. The observable difference is **timing**: the honeypot path returns before any network call, while the real path awaits an insert plus a `trackServerEvent` insert. A scripted client can trivially distinguish a sub-millisecond response from a multi-hundred-millisecond one and confirm honeypot detection.

This is a low-severity information leak, not a bypass, but it undermines the decision's own rationale.

**Fix:** If the signal genuinely matters, equalize by not short-circuiting the latency profile — or accept it and update the comment to say the honeypot is a cheap filter rather than an undetectable one. Documenting the real property is better than a comment that overstates the guarantee.

---

### WR-06: Booking `vehicleDesc` is read from client `FormData` despite comments asserting it is server-derived

**File:** `src/lib/booking/booking-actions.ts:88-92`
**Issue:**

```ts
// Server-derived vehicle description (D-19): only ever taken from a
// caller-supplied field the Server Action itself does not compute --
// plan 04-06 passes this in from its own server-side VIN re-decode.
// Never read `vehicleDesc` from `formData` here.
const vehicleDesc = formData.get('serverVehicleDesc') ? String(formData.get('serverVehicleDesc')) : null
```

The comment says "never read `vehicleDesc` from `formData`," and then the next line reads `serverVehicleDesc` from `formData`. Renaming the field does not make it server-derived — `FormData` in a Server Action is entirely attacker-controlled. Any client can POST an arbitrary `serverVehicleDesc` and have it stored unvalidated (it is not in `bookingSchema`, so Zod never sees it) and later rendered on the admin dashboard via `UpcomingAppointmentRow.vehicle_desc`.

React escapes it on render, so this is not stored XSS. But it is unvalidated, unbounded attacker-controlled text written to the database and displayed to an admin — and the comment actively misleads the next reader into believing it is trusted.

This is pre-existing (Phase 4) rather than introduced here, but this phase touches the file and the comment is load-bearing enough to flag.

**Fix:** Either validate it as untrusted input, or genuinely derive it server-side:

```ts
const rawVehicleDesc = formData.get('serverVehicleDesc')
const vehicleDesc = typeof rawVehicleDesc === 'string' && rawVehicleDesc.length > 0
    ? rawVehicleDesc.slice(0, 120)
    : null
```

and correct the comment to state plainly that this value is client-supplied and bounded, not server-derived.

## Info

### IN-01: `row.session_id as string | null` assertions paper over an untyped Supabase client

**File:** `src/lib/dashboard/dashboard-queries.ts:120`, `src/lib/dashboard/dashboard-queries.ts:288`, `src/lib/dashboard/dashboard-queries.ts:292`
**Issue:** The repeated `as string | null` / `as string` assertions exist because `createClient()` is not parameterized with generated database types, so every column is `any`. The assertions are currently *correct*, but they are unchecked — if `session_id` were later changed to a JSON or numeric column, these would compile fine and fail at runtime inside the `Set`.

**Fix:** Generate and wire Supabase types (`supabase gen types typescript`), then `createServerClient<Database>(...)`. The assertions become unnecessary and column renames become compile errors — the same class of protection `events.ts` deliberately built for `event_type`.

---

### IN-02: Distinct-session `Set` is built then immediately discarded except for `.size`

**File:** `src/lib/dashboard/dashboard-queries.ts:119-121`
**Issue:** The reduction allocates a `Set` holding every distinct session id (potentially thousands of UUID strings) solely to read `.size`. The logic itself is correct — I traced the `map` + type-guard `filter` and it properly excludes nulls without collapsing them. It is just the wrong layer to compute this at (see CR-01).

**Fix:** Subsumed by CR-01's RPC, which returns a scalar and never transfers row data.

---

### IN-03: `events.test.ts` member-count test does not actually pin the taxonomy

**File:** `src/lib/analytics/events.test.ts:57-68`
**Issue:** The test asserts `Object.keys(ANALYTICS_EVENTS).length === 4`. This catches an added or removed member but not a *renamed* key or a swapped value pairing (e.g. if `PAGE_VIEW` and `VIN_SEARCH` values were transposed, the four value-pinning tests would catch it, but a key rename with the same value would pass silently). The four value tests plus the count test together are close to sufficient; the gap is key names.

**Fix:** Pin the whole shape in one assertion, which also makes the intent clearer:

```ts
expect(ANALYTICS_EVENTS).toEqual({
    PAGE_VIEW: 'page_view',
    VIN_SEARCH: 'vin_search',
    CONTACT_SUBMIT: 'contact_submit',
    BOOKING_CREATED: 'booking_created',
})
```

---

### IN-04: `session-id.test.ts` leaks a global `window` stub and never asserts uniqueness across sessions

**File:** `src/lib/analytics/session-id.test.ts:27-31`, `src/lib/analytics/session-id.test.ts:75-86`
**Issue:** Two minor test-reliability gaps:
1. `installFakeSessionStorage` assigns `globalThis.window` directly. The `afterEach` deletes it, so cross-test leakage is handled — but `installThrowingSessionStorage` is called *inside* two tests after `beforeEach` already installed the working stub, silently overwriting it. It works, but the setup is order-dependent and fragile.
2. No test asserts that two *different* sessions get *different* ids. Given the `generateFallbackId` path uses `Math.random`, a regression that returned a constant would pass every existing test (the stability test would still pass, since a constant is trivially stable).

**Fix:** Add a uniqueness test that clears storage between calls:

```ts
it('generates a different id for a different session', () => {
    // Arrange
    const firstId = getOrCreateSessionId()
    installFakeSessionStorage() // fresh empty storage = new session

    // Act
    const secondId = getOrCreateSessionId()

    // Assert
    expect(secondId).not.toBe(firstId)
})
```

---

## Verified as correct (not findings)

Recording these so a re-review does not re-litigate them:

- **Tracking cannot break the user action.** `trackServerEvent` catches both the `{ error }` value and thrown exceptions and always resolves `void`. I traced all three call sites (`route.ts:71`, `route.ts:156`, `booking-actions.ts:121`, `contact-actions.ts:73`) — none can receive a rejection. The `await` before `NextResponse.json` adds one round-trip of latency but cannot fail the response, and is correct for Vercel's runtime where a detached promise may not complete.
- **The `track-event` / `track-browser-event` split** is necessary exactly as documented; `admin.ts:1` carries `import 'server-only'` and would poison any Client Component's module graph.
- **NULL-exclusion semantics** in both `getSummaryTotals` and `getVisitorSeries` are implemented consistently with the stated decision; the type-guard `filter` is correct.
- **VIN validation ordering** in `route.ts:29-35` correctly gates before any network or database use of the value.
- **`getSummaryTotals`'s all-or-nothing failure** is implemented as designed — each of the four error branches returns `{ ok: false }`.

---

_Reviewed: 2026-08-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
