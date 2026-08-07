# Phase 6: Analytics - Pattern Map

**Mapped:** 2026-08-07
**Files analyzed:** 6 (2 new, 4 modified) + 1 optional test file
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/analytics/events.ts` | config (const/type module) | transform | `src/lib/analytics/bucket-by-day.ts` | exact |
| `src/lib/analytics/track-event.ts` (new, name is discretion) | service/utility (dual-client insert helper) | event-driven / CRUD(insert-only) | `src/lib/supabase/admin.ts` (client factory usage) + `contact-actions.ts`/`booking-actions.ts` (insert idiom) | role-match (composite) |
| `src/components/analytics/PageViewTracker.tsx` (new, name is discretion) | component (client, side-effect only) | event-driven | `src/components/layout/TopNav.tsx` | role-match |
| `src/app/(public)/layout.tsx` | provider/layout | request-response | (itself — bare passthrough today) | n/a (trivial edit) |
| `src/app/api/vin/[vin]/route.ts` | route (Route Handler) | request-response | (itself — insert two call sites into existing branches) | exact (self-analog) |
| `src/lib/contact/contact-actions.ts` | service (Server Action) | CRUD (insert) | `src/lib/booking/booking-actions.ts` (sibling Server Action, more elaborate branching) | exact |
| `src/lib/booking/booking-actions.ts` | service (Server Action) | CRUD (insert) | `src/lib/contact/contact-actions.ts` (sibling Server Action) | exact |
| `src/lib/dashboard/dashboard-queries.ts` | service (query module) | CRUD (read) | (itself — swap two const declarations for an import) | exact (self-analog) |

## Pattern Assignments

### `src/lib/analytics/events.ts` (config, new)

**Analog:** `src/lib/analytics/bucket-by-day.ts` (same directory, same "small const-exporting module with a documenting comment block" shape)

**Module-header comment pattern** (bucket-by-day.ts lines 1-8):
```typescript
// This module's output (daily event/row counts over a trailing window) is
// NOT secret -- its whole purpose is to reach the browser as chart data
// (rendered by a Server Component into a Client Component's props, mirroring
// `src/lib/booking/slots.ts`'s same reasoning). No `import 'server-only'`
// fence is added here. This module never calls `new Date()` or `Date.now()`
// internally -- the caller passes `now` explicitly, the same idiom
// `slots.ts`'s `generateSlotsForDate` uses to stay testable without a clock
// mock.
```
Use the same header-comment convention: state why the module has no `import 'server-only'` fence (it doesn't need one — `events.ts` exports pure constants consumed by both browser and server code), and note it sits beside `bucket-by-day.ts` deliberately (D-01's directory placement).

**Const export pattern** (bucket-by-day.ts lines 14-18):
```typescript
/** D-03: length of the trailing window every chart queries, in days. */
export const ANALYTICS_WINDOW_DAYS = 30

/** D-03: the bucket granularity every chart aggregates into. */
export const ANALYTICS_BUCKET_GRANULARITY = 'day' as const
```
Mirror this exactly for the event-type contract: a named, TSDoc-commented export, not an inline literal. Concretely:
```typescript
export const ANALYTICS_EVENTS = {
    PAGE_VIEW: 'page_view',
    VIN_SEARCH: 'vin_search',
    CONTACT_SUBMIT: 'contact_submit',
    BOOKING_CREATED: 'booking_created',
} as const

export type AnalyticsEventType = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]
```
D-04 requires **exactly** these four members, no more.

**Consumer contract this must satisfy** — `dashboard-queries.ts` currently declares (lines 40-52):
```typescript
/**
 * `analytics_events.event_type` literal for a page-view event (ADMIN-02).
 * Matches the exact string ANLY-02's requirement text names -- Phase 6 owns
 * the write side and must reconcile against this constant rather than a
 * scattered string literal.
 */
const EVENT_TYPE_PAGE_VIEW = 'page_view'

/**
 * `analytics_events.event_type` literal for a VIN-search event (ADMIN-04).
 * Matches the exact string ANLY-03's requirement text names.
 */
const EVENT_TYPE_VIN_SEARCH = 'vin_search'
```
and consumes them at lines 86-87 and 252, 285 via `.eq('event_type', EVENT_TYPE_PAGE_VIEW)` / `.eq('event_type', EVENT_TYPE_VIN_SEARCH)`. The refactor (D-01) is: delete both `const` declarations, add `import { ANALYTICS_EVENTS } from '@/lib/analytics/events'` at the top (alongside the existing `import { bucketByDay, ANALYTICS_WINDOW_DAYS } from '@/lib/analytics/bucket-by-day'` on line 23), and replace every reference:
- `EVENT_TYPE_PAGE_VIEW` → `ANALYTICS_EVENTS.PAGE_VIEW` (3 call sites: line 86 and line 252)
- `EVENT_TYPE_VIN_SEARCH` → `ANALYTICS_EVENTS.VIN_SEARCH` (2 call sites: line 87 and line 285)

No other line in `dashboard-queries.ts` changes — `getSummaryTotals`, `getVisitorSeries`, `getVinSearchSeries` keep their exact `try/catch` + `console.error('<fn>: ...', { error })` + `{ ok: false }` shape.

---

### Tracking helper module(s) under `src/lib/analytics/` (new)

**Analogs:**
- Browser client factory: `src/lib/supabase/client.ts` (full file, 8 lines):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```
- Server admin client factory: `src/lib/supabase/admin.ts` (full file) — service-role client, `import 'server-only'` fenced, throws hard on missing env vars. The two existing Server Actions both call it the same way: `const supabase = createAdminClient()` (no `await` — it's synchronous), immediately followed by `.from('table').insert({...})`.
- Insert idiom, server side — `contact-actions.ts` lines 53-66:
```typescript
try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('contacts').insert({
        name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        phone: parsed.data.phone,
        address: parsed.data.address,
        honeypot: parsed.data.honeypot,
    })

    if (error) {
        console.error('createContact: insert failed', { error })
        return { status: 'error', values, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }

    return { status: 'success', values }
} catch (error) {
    console.error('createContact: unexpected error', { error })
    return { status: 'error', values, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
}
```
For the analytics helper, this becomes an **awaited-and-swallowed** variant per D-10/D-12 — the error is logged but never returned or rethrown, since a tracking failure must never affect the caller's own result:
```typescript
export async function trackServerEvent(
    eventType: AnalyticsEventType,
    fields: { page?: string; vin?: string } = {}
): Promise<void> {
    try {
        const supabase = createAdminClient()
        const { error } = await supabase.from('analytics_events').insert({
            event_type: eventType,
            page: fields.page ?? null,
            vin: fields.vin ?? null,
        })

        if (error) {
            console.error('trackServerEvent: insert failed', { error, eventType })
        }
    } catch (error) {
        console.error('trackServerEvent: unexpected error', { error, eventType })
    }
}
```
Note this function deliberately has **no return value the caller branches on** — that is the D-10/D-12 contract (server failures log; they never surface to the caller).

**Browser-side variant** — same insert shape, using `createClient()` from `src/lib/supabase/client.ts`, but per D-12 the browser catch/error path is **silent** (no `console.error`, nothing):
```typescript
export async function trackBrowserEvent(
    eventType: AnalyticsEventType,
    fields: { page?: string } = {}
): Promise<void> {
    try {
        const supabase = createClient()
        await supabase.from('analytics_events').insert({
            event_type: eventType,
            page: fields.page ?? null,
        })
    } catch {
        // D-12: browser-side tracking failures are swallowed entirely — no
        // console output. A visitor's console is not where telemetry
        // problems get reported.
    }
}
```

**Insert-shape reference — the `analytics_events` table** (migration `supabase/migrations/20260412000000_initial_schema.sql` lines 82-99):
```sql
CREATE TABLE analytics_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT now(),
  event_type  TEXT        NOT NULL,
  page        TEXT,
  vin         TEXT,
  metadata    JSONB
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admin_select_analytics"
  ON analytics_events FOR SELECT
  USING (auth.role() = 'authenticated');
```
Only `event_type` is `NOT NULL`; `page`, `vin`, `metadata` are all nullable. D-02 says: fill `page` on `page_view`, `vin` on `vin_search`, leave `metadata` `null` always, leave the other of `page`/`vin` unset/null on every event. `created_at` and `id` are DB-generated — never set them from application code (no existing insert call site in this repo sets them either; see `contacts`/`bookings` inserts above, neither sets `id` or `created_at`).

---

### `src/components/analytics/PageViewTracker.tsx` (new, `'use client'`)

**Analog:** `src/components/layout/TopNav.tsx` lines 1-25 (closest existing `'use client'` component using `usePathname`):
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Phone } from 'lucide-react'
...
export function TopNav({ overlay = false }: TopNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  ...
```
No existing component in this repo combines `usePathname()` with `useEffect()` — `TopNav` only reads `pathname` for `Link` `className` comparisons, it never runs an effect keyed on it. `PageViewTracker` is the first such component; base it on `TopNav`'s import/style conventions (2-space indent — note this repo's `src/components/` files use 2-space, NOT the 4-space from the global standard; see Style Note below) and the `'use client'` directive placement, but add:
```typescript
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackBrowserEvent } from '@/lib/analytics/track-event'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

const SESSION_STORAGE_PREFIX = 'pv:'

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // D-07/D-08: guarded sessionStorage read, dedupe key is path + session.
    // Must not throw during render if storage is unavailable (private
    // browsing, disabled storage) -- default to "not yet seen" and fire.
    let alreadySeen = false
    try {
      alreadySeen = window.sessionStorage.getItem(SESSION_STORAGE_PREFIX + pathname) === '1'
    } catch {
      alreadySeen = false
    }

    if (alreadySeen) {
      return
    }

    void trackBrowserEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: pathname })

    try {
      window.sessionStorage.setItem(SESSION_STORAGE_PREFIX + pathname, '1')
    } catch {
      // Storage unavailable -- tracking still fired above; dedupe is
      // best-effort only, never a hard requirement (Claude's Discretion).
    }
  }, [pathname])

  return null
}
```
Render output is `null` (Claude's Discretion note in CONTEXT.md agrees this is the near-certain choice). No `Suspense` boundary is needed — `usePathname()` itself does not suspend outside of `useSearchParams()`-style hooks, and none of this repo's existing `'use client'` components wrap themselves in `Suspense`.

---

### `src/app/(public)/layout.tsx` (modified)

**Current state (full file, the "before" D-05 changes):**
```typescript
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

**Target shape** — mount `<PageViewTracker />` alongside `children`, matching this repo's 2-space component-file style:
```typescript
import { PageViewTracker } from '@/components/analytics/PageViewTracker'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PageViewTracker />
      {children}
    </>
  )
}
```
This is the only edit — no other Phase-5-style header comment is required here since the file had none before; keep it minimal per D-05 ("a single invisible tracker, not chrome").

---

### `src/app/api/vin/[vin]/route.ts` (modified — two insertion points, D-13/D-14/D-15)

**Analog:** itself — the two existing success `return NextResponse.json(...)` blocks are the exact analogs for each other; the pattern is "insert immediately before the success `return`, awaited, using the already-known outcome".

**Insertion point 1 — cache-hit branch (Step 2), lines 57-72, the easy-to-miss one per D-15:**
```typescript
    const cached = await readVinCache(vin)
    if (cached && cached.model_year !== null) {
        const modelYear = Number.parseInt(cached.model_year, 10)

        if (!Number.isNaN(modelYear)) {
            const sizeBucket = mapBodyClassToSizeBucket(cached.body_class)
            const vehicle: DecodedVehicle = {
                vin: cached.vin,
                modelYear,
                make: cached.make,
                model: cached.model,
                bodyClass: cached.body_class,
                sizeBucket,
            }

            // Step 5 (cache-hit branch) — price and shape the response
            // (VIN-04, D-15). ...
            return NextResponse.json(
                {
                    status: sizeBucket === null ? 'needs-vehicle-type' : 'decoded',
                    vehicle,
                    estimates: computeEstimateMatrix(modelYear),
                    adasApplies: adasApplies(modelYear),
                    cached: true,
                } satisfies VinLookupResponse,
                { status: 200 }
            )
        }
    }
```
Add the `trackServerEvent(ANALYTICS_EVENTS.VIN_SEARCH, { vin })` call `await`ed immediately before this `return NextResponse.json(...)`, inside the `if (!Number.isNaN(modelYear))` block — this is the D-14 "both `decoded` and `needs-vehicle-type` fire" branch; there is no separate condition needed since both statuses reach this one return.

**Insertion point 2 — post-NHTSA success branch (Step 5), lines 132-150:**
```typescript
    const vehicle: DecodedVehicle = {
        vin,
        modelYear: outcome.modelYear,
        make: outcome.make,
        model: outcome.model,
        bodyClass: outcome.bodyClass,
        sizeBucket: outcome.sizeBucket,
    }

    return NextResponse.json(
        {
            status: outcome.sizeBucket === null ? 'needs-vehicle-type' : 'decoded',
            vehicle,
            estimates: computeEstimateMatrix(outcome.modelYear),
            adasApplies: adasApplies(outcome.modelYear),
            cached: false,
        } satisfies VinLookupResponse,
        { status: 200 }
    )
```
Add the same `await trackServerEvent(ANALYTICS_EVENTS.VIN_SEARCH, { vin })` immediately before this `return`.

**What must NOT get the call** — the three failure branches already in the file, confirmed by reading them:
- Step 1, lines 27-33: `invalid` (fails `isValidVin` before any network/DB call)
- lines 79-93: `unreachable` (NHTSA network failure) — has its own `console.error('VIN decode unreachable', { vin, reason: outcome.reason, detail: outcome.detail })` which is a **different** logging call and must not be confused with the tracking call
- lines 95-105: `not-found` (`no-data` outcome from NHTSA)

**Import to add** at the top of the file, alongside the existing imports (lines 1-5):
```typescript
import { trackServerEvent } from '@/lib/analytics/track-event'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
```

---

### `src/lib/contact/contact-actions.ts` (modified, D-11)

**Full current file already read** (73 lines). The two branch points:

**Honeypot early-return — MUST NOT fire (lines 34-37):**
```typescript
    // 1. Honeypot (CONT-03). Reject silently -- runs before any database call.
    if (values.honeypot !== '') {
        return { status: 'success', values }
    }
```
No event call goes here or anywhere before it. This is the D-11 warning: it returns `status: 'success'` to the caller but must remain eventless.

**Real success path — MUST fire (lines 52-68):**
```typescript
    // 3. Insert (CONT-04).
    try {
        const supabase = createAdminClient()
        const { error } = await supabase.from('contacts').insert({
            name: parsed.data.firstName,
            last_name: parsed.data.lastName,
            phone: parsed.data.phone,
            address: parsed.data.address,
            honeypot: parsed.data.honeypot,
        })

        if (error) {
            console.error('createContact: insert failed', { error })
            return { status: 'error', values, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
        }

        return { status: 'success', values }
    } catch (error) {
        console.error('createContact: unexpected error', { error })
        return { status: 'error', values, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }
```
Add `await trackServerEvent(ANALYTICS_EVENTS.CONTACT_SUBMIT)` on the line immediately after `if (error) {...}` resolves false and immediately before `return { status: 'success', values }` — i.e., only on the path where the insert itself returned no error. Do not fire inside the `catch` block, and do not fire before the `if (error)` check.

**Import to add:**
```typescript
import { trackServerEvent } from '@/lib/analytics/track-event'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
```

---

### `src/lib/booking/booking-actions.ts` (modified, D-11)

**Full current file already read** (122 lines). The three relevant branch points:

**Honeypot early-return — MUST NOT fire (lines 60-64):**
```typescript
    // 1. Honeypot (D-14). Reject silently -- the bot gets no signal that its
    // submission was discarded. Runs before any database call.
    if (values.honeypot !== '') {
        return { status: 'success', values }
    }
```

**`'23505'` slot-taken branch — MUST NOT fire (lines 107-110):**
```typescript
        // 5. Branch on error.code, never error.message (D-10).
        if (error?.code === '23505') {
            return { status: 'slot-taken', values, message: BOOKING_COPY.slotTakenMessage }
        }
```

**Generic error branch — MUST NOT fire (lines 111-114):**
```typescript
        if (error) {
            console.error('createBooking: insert failed', { error })
            return { status: 'error', values, message: `${BOOKING_COPY.genericErrorMessage} ${BUSINESS.phone}` }
        }
```

**Real success path — MUST fire (line 116, in context lines 94-121):**
```typescript
    try {
        const supabase = createAdminClient()
        const { error } = await supabase.from('bookings').insert({
            name: parsed.data.firstName,
            last_name: parsed.data.lastName,
            phone: parsed.data.phone,
            vin: parsed.data.vin,
            vehicle_desc: vehicleDesc,
            appt_date: parsed.data.apptDate,
            appt_time: parsed.data.apptTime,
            status: 'pending',
        })

        // 5. Branch on error.code, never error.message (D-10).
        if (error?.code === '23505') {
            return { status: 'slot-taken', values, message: BOOKING_COPY.slotTakenMessage }
        }
        if (error) {
            console.error('createBooking: insert failed', { error })
            return { status: 'error', values, message: `${BOOKING_COPY.genericErrorMessage} ${BUSINESS.phone}` }
        }

        return { status: 'success', values }
    } catch (error) {
        console.error('createBooking: unexpected error', { error })
        return { status: 'error', values, message: `${BOOKING_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }
```
Add `await trackServerEvent(ANALYTICS_EVENTS.BOOKING_CREATED)` immediately after both `if (error?.code === '23505')` and `if (error)` have resolved false, immediately before `return { status: 'success', values }` — i.e., past both error branches, never inside `catch`.

**Import to add:**
```typescript
import { trackServerEvent } from '@/lib/analytics/track-event'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
```

---

## Shared Patterns

### Server-side failure logging (D-12)
**Source:** every `.service.ts`-equivalent file in this repo — quoted instance from `contact-actions.ts` line 64:
```typescript
console.error('createContact: insert failed', { error })
```
and `booking-actions.ts` line 112:
```typescript
console.error('createBooking: insert failed', { error })
```
**Apply to:** the new `trackServerEvent` helper — use the exact same `console.error('<fnName>: <what> failed', { error, ...context })` shape. Suggested: `console.error('trackServerEvent: insert failed', { error, eventType })`.

### Awaited-and-swallowed non-blocking write (D-10)
**Source:** no exact existing analog (this repo's other inserts all branch on and surface `error`) — this is a **new** pattern: await the insert, but never propagate its result to the caller. Model the shape on the existing `try { ... } catch (error) { console.error(...) }` skeleton used throughout `contact-actions.ts` / `booking-actions.ts` / `dashboard-queries.ts`, but drop the `return { ok: false }` / `return { status: 'error' }` outcome — the function returns `void` (or `Promise<void>`) unconditionally.

### Dual Supabase client selection (D-09)
**Source:** `src/lib/supabase/client.ts` (browser/anon) vs `src/lib/supabase/admin.ts` (service-role). Existing precedent for choosing the admin client from a Server Action: both `contact-actions.ts` line 54 and `booking-actions.ts` line 95 call `createAdminClient()` (no `await`, synchronous factory) then immediately chain `.from(table).insert(...)`.
**Apply to:** `trackServerEvent` uses `createAdminClient()`; the client-mounted `PageViewTracker` (via `trackBrowserEvent`) uses `createClient()` from `src/lib/supabase/client.ts`.

### RLS policy already permits the browser insert
**Source:** migration lines 93-95 — `public_insert_analytics` = `FOR INSERT WITH CHECK (true)`. No RLS change needed; this is confirmation only, not a pattern to replicate elsewhere (it is deliberately permissive for this one table).

### Named-constant-over-inline-literal convention
**Source:** `bucket-by-day.ts` lines 14-18 (`ANALYTICS_WINDOW_DAYS`, `ANALYTICS_BUCKET_GRANULARITY`) and `dashboard-queries.ts` lines 31-38 (`RECENT_CONTACTS_LIMIT`, `UPCOMING_APPOINTMENTS_LIMIT`).
**Apply to:** `events.ts`'s `ANALYTICS_EVENTS` object — every event-type string is a named property, never an inline literal at any call site.

## Style Note (repo-wide, overrides global 4-space default for this codebase)

This repository's actual TypeScript/TSX files use **2-space indentation** and in several files (`client.ts`, `admin.ts`, `PublicLayout`, `TopNav.tsx`) omit the trailing-comma/semicolon conventions inconsistently — e.g. `client.ts` and `admin.ts` have no trailing commas in single-line object literals, while `dashboard-queries.ts` and the Server Actions use 4-space indentation with trailing commas. **Match the indentation of whichever file is being edited**, not a single repo-wide default:
- `src/lib/dashboard/dashboard-queries.ts`, `src/lib/contact/contact-actions.ts`, `src/lib/booking/booking-actions.ts`, `src/app/api/vin/[vin]/route.ts`, `src/lib/analytics/bucket-by-day.ts` — 4-space, single quotes, no semicolons at statement end in some (e.g. `bucket-by-day.ts` has no trailing `;`), trailing commas in multiline objects.
- `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`, `src/app/(public)/layout.tsx`, `src/components/layout/TopNav.tsx` — 2-space.
New files (`events.ts`, the tracking helper, `PageViewTracker.tsx`) should follow the **4-space** style since they live in `src/lib/` alongside `bucket-by-day.ts` / `dashboard-queries.ts`, except `PageViewTracker.tsx`, which lives in `src/components/` where 2-space is the observed convention (see `TopNav.tsx`).

## No Analog Found

None — every file in this phase has at least a role-match or exact analog. The only genuinely novel piece is the "awaited-and-swallowed, non-branching" write shape (D-10), noted under Shared Patterns above, since every existing insert in this repo branches on and surfaces its `error`.

## Metadata

**Analog search scope:** `src/lib/`, `src/app/(public)/`, `src/app/api/vin/[vin]/`, `src/lib/supabase/`, `src/lib/contact/`, `src/lib/booking/`, `src/lib/dashboard/`, `src/components/dashboard/`, `src/components/layout/`, `supabase/migrations/`
**Files scanned:** 15 read in full (dashboard-queries.ts, bucket-by-day.ts, bucket-by-day.test.ts, route.ts, contact-actions.ts, booking-actions.ts, client.ts, admin.ts, layout.tsx, VisitorsChart.tsx, VinSearchChart.tsx, SummaryCards.tsx, TopNav.tsx) + migration grep + repo-wide `'use client'`/`usePathname`/`useEffect` greps
**Pattern extraction date:** 2026-08-07
