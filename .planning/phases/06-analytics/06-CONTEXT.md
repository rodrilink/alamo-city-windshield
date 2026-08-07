# Phase 6: Analytics - Context

**Gathered:** 2026-08-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Every meaningful user action fires a tracked event row into the existing `analytics_events` table in a
non-blocking way, and the two dashboard charts Phase 5 deliberately left empty — visitors (ADMIN-02)
and VIN searches (ADMIN-04) — light up with real accumulated data.

Delivers: a shared event-type contract (ANLY-01), `page_view` tracking on all public pages (ANLY-02),
`vin_search` on successful VIN decodes (ANLY-03), `contact_submit` on contact submission (ANLY-04),
`booking_created` on successful booking (ANLY-05), and fire-and-forget semantics throughout (ANLY-06).

Already delivered by earlier phases — verify, do not rebuild:
- **The `analytics_events` table already exists** (Phase 1, `supabase/migrations/20260412000000_initial_schema.sql`)
  with `event_type`, `page`, `vin`, `metadata` JSONB, RLS enabled, and a `public_insert_analytics`
  policy of `WITH CHECK (true)` that already permits anonymous inserts. **ANLY-01 is structurally
  satisfied** — this phase adds no migration.
- **The entire read/chart/bucketing layer already exists** (Phase 5, 05 D-01): `dashboard-queries.ts`,
  `bucket-by-day.ts`, `VisitorsChart.tsx`, `VinSearchChart.tsx`, `SummaryCards.tsx`. Phase 6 adds
  **only the writes**. Chart *components* must not change.
- `recharts` ^3.8.0 is installed. **This phase requires no new dependencies** — no package-approval
  gate is needed, unlike Phases 3, 4 and 5.

Does NOT deliver: any database migration or schema change; any change to chart components; a fifth
event type (D-04); a metadata analytics schema (D-02); bot/user-agent filtering (D-07); tracking of
admin-area traffic (D-06); tracking of the manual-entry `/api/estimate` path (D-13).

</domain>

<decisions>
## Implementation Decisions

### Event contract and payload

- **D-01:** **A shared const + union type is the single source of truth for `event_type` strings.**
  Create `src/lib/analytics/events.ts` exporting an `ANALYTICS_EVENTS` object and an
  `AnalyticsEventType` union. The tracking helpers accept only that type, and
  `src/lib/dashboard/dashboard-queries.ts` is **refactored to import from it** rather than keeping its
  own two private consts (`EVENT_TYPE_PAGE_VIEW`, `EVENT_TYPE_VIN_SEARCH`, lines 46 and 52).
  - *Why this matters:* `STATE.md` records this as an open silent-failure risk. The consumer currently
    hardcodes `'page_view'` and `'vin_search'` as **un-exported** literals. If the Phase 6 producer
    emits any other string, the visitors and VIN-search charts render **empty without erroring** — a
    silent wrong answer, not a crash. Importing one const makes a mismatch a **compile error**.
  - This is a deliberate, small edit to Phase 5 code. 05 D-01's "Phase 6 lights these charts up with
    no changes to chart code" payoff is preserved — the *chart components* are untouched; only the
    query module's constant declarations move.
  - *Rejected:* a DB `CHECK` constraint. Strongest guarantee, but 05 D-06 established this project adds
    no migrations for this work, and a rejected insert fails silently anyway under D-10 — so it would
    not surface the error it exists to catch.
- **D-02:** **Use the purpose-built columns; keep `metadata` minimal.** `page` holds the pathname on
  `page_view`; `vin` holds the VIN on `vin_search`; `metadata` stays `null` unless a specific event
  genuinely needs an extra field.
  - *Why:* nothing on the dashboard consumes `metadata` today. Filling real columns keeps rows
    queryable with plain `.eq()` filters instead of JSON operators, and avoids inventing a JSON shape
    with no reader.
- **D-03:** **The raw 17-character VIN is stored on `vin_search` events.** Consistent with existing
  precedent — `bookings.vin`, `contacts.vin` and `vin_cache` (which stores the VIN *plus* the full
  NHTSA payload) already persist raw VINs. The `vin` column on `analytics_events` exists for exactly
  this.
- **D-04:** **Exactly four event types. The union has these members and no others:** `page_view`,
  `vin_search`, `contact_submit`, `booking_created`. These match ANLY-02..05 verbatim and match the two
  literals `dashboard-queries.ts` already expects. A fifth event is a scope question for a later phase,
  not an implementation detail of this one.

### Page-view firing and hygiene

- **D-05:** **A `'use client'` `<PageViewTracker />` mounted in `src/app/(public)/layout.tsx`**, firing
  on mount and on `usePathname()` change.
  - *Why one insertion point:* the public pages are **mixed component types** — `(public)/page.tsx` is
    `'use client'` (snap-scroll needs a ref), while `/about`, `/contact` and `/book` are Server
    Components. A layout-level client tracker covers all of them uniformly regardless, and naturally
    catches client-side navigation between pages, which a server-render call would miss.
  - This turns `(public)/layout.tsx` from a bare passthrough into a real layout. That does not
    contradict 04 D-20 (which was about not forcing *marketing chrome* through a layout) — each page
    still composes its own `TopNav` + `Footer`.
  - *Rejected:* firing in `src/lib/supabase/middleware.ts`. It runs on every non-asset route and would
    catch everything at zero client cost — but it also catches prefetches and bots indiscriminately,
    and it would put an analytics write inside the **auth guard**, mixing an optional concern into a
    security-critical file.
- **D-06:** **All `(public)` routes are tracked, `/book` included. Admin traffic is excluded
  structurally** — `(admin)` has its own separate layout, so the tracker never mounts there.
  - ANLY-02's three named pages (Home, About, Contact) are a floor, not a ceiling. The `page` column
    keeps routes separable, and there is no allow-list to drift out of sync when a page is added.
- **D-07:** **Repeat views are deduped within a session** via `sessionStorage`. Chosen so the
  "Total Visitors" card leans toward unique-visitor semantics rather than raw view inflation.
  - **No user-agent bot filtering.** UA strings are trivially spoofed and the blocklist rots. The
    client-side choice in D-05 already provides real filtering for free: the tracker only fires when JS
    executes and the component actually mounts, so Next.js prefetches and most non-executing crawlers
    never trigger it.
- **D-08:** **The dedupe key is path + session** — one row per distinct pathname per session. Home →
  About → Home writes **two** rows, not three.
  - *Consequence to record honestly:* the dashboard's "Total Visitors" card therefore counts
    **distinct page-visits per session, not unique people**. Nobody downstream should describe it as
    unique visitors.
  - *Rejected:* one event per session total. That would make the card genuinely count sessions, but it
    discards per-page data for every page after the landing page, reducing the `page` column to
    "entry page only".

### Write path and fire-and-forget

- **D-09:** **Split write path — each event writes from where it already knows it happened.**
  - `page_view` inserts **from the browser** via the anon client (`src/lib/supabase/client.ts`), using
    the `public_insert_analytics` RLS policy that exists precisely for this.
  - `contact_submit` and `booking_created` insert **server-side inside the existing Server Actions**
    (`src/lib/contact/contact-actions.ts`, `src/lib/booking/booking-actions.ts`) via
    `createAdminClient()` — the client both actions already use.
  - Both helpers share the D-01 event constants.
  - *Rejected — a `POST /api/track` Route Handler:* it adds a **public unauthenticated write endpoint**
    (a new abuse surface), and it makes the server-side events perform a pointless HTTP hop to their
    own process — the same reasoning 05 D-04 used to reject Route Handlers for dashboard reads.
  - *Rejected — a single `trackEvent` Server Action:* invoking one from the browser is still an HTTP
    round-trip with React action-protocol overhead, and calling a Server Action from inside another is
    an awkward pattern this codebase uses nowhere.
- **D-10:** **"Non-blocking" means awaited-and-swallowed, NOT detached.** The tracking insert is
  awaited inside the Server Action, wrapped so any failure is logged and discarded — the user's result
  is never affected by it.
  - *Why not fire-without-awaiting:* on Vercel's serverless runtime, a promise still in flight when the
    response is sent **may never complete**. Events would be lost non-deterministically and the metric
    would quietly under-count in the way that is hardest to notice. Truly detached work would require
    `waitUntil()`.
  - This is the correct reading of ANLY-06: the guarantee is *"a failed event never blocks or errors
    the user action"*, not *"the write is detached"*. Cost is one extra same-region Supabase round-trip
    on submit.
  - *Rejected:* awaiting with a timeout. More machinery than a same-region insert warrants, and a
    fired-then-abandoned insert may still land — making the timeout a latency guard, not a correctness
    one.
- **D-11:** **Events fire only after a confirmed success**, on the success path, after the insert
  returns without error.
  - ⚠ **The honeypot early-return in `createContact` must NOT fire an event.** It returns
    `{ status: 'success' }` to fool a bot **without inserting anything** (CONT-03,
    `contact-actions.ts`). Firing there would let bot submissions inflate `contact_submit`.
  - A `booking_created` row that does not correspond to a real `bookings` row would make the analytics
    table disagree with the source table. Validation failures and the `'slot-taken'` race do not fire.
- **D-12:** **Server-side failures log; browser-side failures are silent.**
  - Server: `console.error` with context, matching the established pattern exactly
    (`console.error('createContact: insert failed', { error })`) — visible in Vercel logs when the
    numbers look wrong.
  - Browser: swallowed entirely, no console output. A visitor's console is not where our telemetry
    problems get reported, and logging there would advertise that tracking exists while going nowhere
    useful.

### VIN-search trigger point

- **D-13:** **`vin_search` fires server-side inside `src/app/api/vin/[vin]/route.ts`** — one insertion
  point.
  - It covers **both** existing callers (`src/components/home/EstimateSection.tsx` and
    `src/components/contact/ContactVinSearch.tsx`, which each `fetch('/api/vin/...')`) plus any future
    one, and cannot be skipped by a caller who forgets.
  - The route already holds the **validated, normalized** VIN (`trim().toUpperCase()` past the
    `isValidVin` gate) and already knows the exact outcome — nothing needs re-deriving client-side.
  - *Rejected:* also tracking `/api/estimate`. ANLY-03 says "on VIN decode", and the manual-entry path
    involves no VIN at all — it would count something the metric does not name.
- **D-14:** **Only successful decodes fire: `decoded` and `needs-vehicle-type`.**
  - Both are genuine successful NHTSA decodes producing a real vehicle and a real estimate —
    `needs-vehicle-type` merely means the `BodyClass` did not map to a size bucket (D-19 of Phase 3).
  - `not-found`, `unreachable` and `invalid` do **not** fire. Without a `metadata` outcome field
    (excluded by D-02), a mixed count would silently blend successes with typos and outages.
- **D-15:** ⚠ **Cache hits DO fire — the event must be added in BOTH success branches of the route.**
  The route returns early on a `vin_cache` hit without ever calling NHTSA (Step 2 of the handler); that
  early return is easy to miss.
  - *Why:* the metric measures **user demand** — from the user's side a cache hit is an identical
    successful search. Excluding cache hits would make the chart *drop* whenever caching works well,
    inverting its meaning.
- **D-16:** **`src/app/(public)/book/page.tsx`'s server-side re-decode does NOT fire an event.** It
  calls `decodeVin` / `readVinCache` directly, bypassing the route handler.
  - That decode re-derives `vehicle_desc` for a booking the user has already decided on (04 D-12 /
    D-19) — the user is booking, not searching, and their actual search already fired via the route
    handler. Counting it would double-count one user's journey and would require a second insertion
    point, breaking D-13's single-point property.

### Claude's Discretion

- **`sessionStorage` unavailability** (private browsing, storage disabled, SSR pass). Sensible default:
  treat it as "not yet seen" and fire, rather than throwing or silently disabling tracking — but a
  guarded read either way. Must not throw during render.
- **The tracker's render output** (almost certainly `null`), whether it needs a `Suspense` boundary,
  and whether it uses an effect keyed on pathname.
- **Exact helper signatures and file layout** under `src/lib/analytics/` — whether the browser and
  server helpers live in one module or two, and whether they share an internal implementation. Note
  `src/lib/analytics/bucket-by-day.ts` already occupies that directory, so `events.ts` sits beside it.
- **Whether the event-contract reconciliation gets a unit test.** With D-01 the type system already
  catches drift, so a test is belt-and-braces. If added, it must be a **pure-function** test — this
  repo has 33 `vitest` tests and **zero component-test infrastructure** (no `@testing-library/react`,
  no `jsdom`), a known deferred blocker. The `PageViewTracker` component itself therefore cannot be
  unit-tested and falls to manual UAT.
- **Whether the "Total Visitors" card copy is reworded** now that D-08 pins its semantics. Optional,
  but if left alone the label overstates what it counts.
- **How Phase 6 is verified** given the charts need accumulated data. Exercising each of the four
  events once and confirming the rows land (and the charts stop showing the 05 D-01 empty state) is
  sufficient; a populated-looking chart is not required.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 6: Analytics" — the goal, requirement IDs ANLY-01..06, and the 4
  success criteria this phase is measured against
- `.planning/REQUIREMENTS.md` — ANLY-01..06 in full

### The consumer side — already built, must stay reconciled
- `src/lib/dashboard/dashboard-queries.ts` — ⚠ **the critical file.** Lines 46 and 52 hold the private
  `EVENT_TYPE_PAGE_VIEW = 'page_view'` and `EVENT_TYPE_VIN_SEARCH = 'vin_search'` consts that D-01
  refactors into an import. Also `getSummaryTotals()` (the two analytics-sourced cards) and the two
  30-day series readers. A producer/consumer mismatch here renders charts **empty without erroring**.
- `src/lib/analytics/bucket-by-day.ts` — `ANALYTICS_WINDOW_DAYS = 30`, `ANALYTICS_BUCKET_GRANULARITY`,
  and `bucketByDay()`. The new `events.ts` sits beside it in the same directory.
- `src/components/dashboard/VisitorsChart.tsx`, `VinSearchChart.tsx`, `SummaryCards.tsx` — the D-01
  consumers. **Read to confirm the contract; do not modify.**

### Database schema (exists — no migration this phase)
- `supabase/migrations/20260412000000_initial_schema.sql` — the `analytics_events` table:
  `id`, `created_at TIMESTAMPTZ DEFAULT now()`, `event_type TEXT NOT NULL`, `page TEXT`, `vin TEXT`,
  `metadata JSONB`. RLS enabled with **`public_insert_analytics` = `FOR INSERT WITH CHECK (true)`**
  (this is what makes D-09's browser insert legal) and `admin_select_analytics` =
  `USING (auth.role() = 'authenticated')`.

### The four write sites
- `src/app/(public)/layout.tsx` — currently a bare passthrough; D-05 mounts the tracker here
- `src/app/api/vin/[vin]/route.ts` — D-13/D-14/D-15. ⚠ **Two success return points**: the `vin_cache`
  hit early-return (Step 2) and the post-NHTSA return (Step 5). Both need the event.
- `src/lib/contact/contact-actions.ts` — `createContact`. ⚠ Note the **honeypot early-return** that
  returns `'success'` without inserting (D-11 excludes it).
- `src/lib/booking/booking-actions.ts` — `createBooking`. Note the `'23505'` slot-taken branch and the
  validation-failure branches, none of which fire.

### Supabase clients
- `src/lib/supabase/client.ts` — `createBrowserClient` with the anon key; D-09's browser write path
- `src/lib/supabase/admin.ts` — service-role client, `import 'server-only'`; used by both existing
  Server Actions and therefore by D-09's server write path
- `src/lib/supabase/middleware.ts` — **read but do not modify** (D-05 rejected middleware tracking).
  Note it silently skips auth when env vars are absent — relevant when verifying.

### Prior-phase decisions that constrain this phase
- `.planning/phases/05-admin-backend/05-CONTEXT.md` — **D-01** (the read layer was built to be filled
  by this phase with no chart-code change), **D-02** (no card shows a fabricated number), **D-03**
  (30-day daily-bucket window), **D-18** (the contacts chart reads the real `contacts` table, so only
  visitors + VIN-search consume `analytics_events`), D-06 (no migrations)
- `.planning/phases/04-booking-contact/04-CONTEXT.md` — D-12/D-19 (`vehicle_desc` denormalization, why
  `/book` re-decodes and why D-16 excludes it), D-13 (Server Actions for writes)
- `.planning/phases/03-vin-estimate/03-CONTEXT.md` — D-17/D-18 (the `unreachable` vs `not-found`
  distinction D-14 relies on), D-19 (`needs-vehicle-type`), D-21 (`vin_cache` is the sole caching
  layer; failures are never cached)
- `.planning/STATE.md` §Blockers — the "**Analytics `event_type` literals need Phase 06
  reconciliation**" entry that D-01 closes, and the standing component-test-infrastructure gap

### Established conventions
- `src/lib/constants.ts` — the copy-module pattern (`ESTIMATE_COPY`, `BOOKING_COPY`, `CONTACT_COPY`,
  `ADMIN_COPY`) if any user-facing string is needed (unlikely — tracking is invisible)
- `console.error('<fn>: <what> failed', { error })` — the established server logging shape D-12 follows

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`analytics_events` table + its RLS policies** — already exactly right. `public_insert_analytics`
  with `WITH CHECK (true)` was written in Phase 1 anticipating an anonymous browser insert; D-09 uses
  it as designed. ANLY-01 needs no work beyond confirming this.
- **`src/lib/supabase/client.ts`** — the browser anon client already exists and is currently unused by
  any feature. D-09's `page_view` path is its first real consumer.
- **`src/lib/supabase/admin.ts`** — already imported by both Server Actions that D-09/D-11 extend.
- **The whole Phase 5 read layer** — `dashboard-queries.ts`, `bucket-by-day.ts` and the three chart
  components. This phase writes rows into a query layer that is already built and tested.
- **`recharts` ^3.8.0 is installed.** No new dependency is required by this phase — so unlike Phases 3,
  4 and 5, **no blocking package-approval gate is needed.**

### Established Patterns
- **Per-page chrome; layouts stay thin.** `(public)/layout.tsx` is a bare passthrough returning
  `children`; each page composes its own `TopNav` + `Footer`. D-05 adds the first real content to that
  layout — a single invisible tracker, not chrome.
- **Server Actions for writes; Route Handlers only for public read-only GETs** (04 D-13, 05 D-04). D-09
  follows this: no new endpoint is created.
- **Errors branch on structured fields, never message text** (04 D-10 branches on `error.code === '23505'`).
- **Failure logging shape:** `console.error('createContact: insert failed', { error })`.
- **`server-only` fencing** for anything touching secrets (`admin.ts`, `pricing.ts`).
- **Unit tests are pure-function only.** All 33 `vitest` tests target non-React modules; there is
  **zero component-test infrastructure**. Any logic worth testing here (the event contract, a dedupe
  predicate) must be extracted into a pure module; the tracker component stays on manual UAT.

### Integration Points
- `src/app/(public)/layout.tsx` → gains `<PageViewTracker />` (D-05); covers `/`, `/about`, `/contact`,
  `/book`.
- `src/app/api/vin/[vin]/route.ts` → gains the `vin_search` write in **two** success branches (D-15).
- `src/lib/contact/contact-actions.ts` → gains `contact_submit` on the real success path only, after
  the honeypot branch (D-11).
- `src/lib/booking/booking-actions.ts` → gains `booking_created` on the success path only, not on
  `'slot-taken'` (D-11).
- `src/lib/dashboard/dashboard-queries.ts` → **modified**: its two private event-type consts are
  replaced by an import from the new `src/lib/analytics/events.ts` (D-01). This is the one Phase 5 file
  this phase edits.
- `src/lib/analytics/events.ts` → **new**, beside the existing `bucket-by-day.ts`.

</code_context>

<specifics>
## Specific Ideas

- The dashboard's "Total Visitors" card counts **distinct page-visits per session**, not unique people
  (D-08). Do not let any copy or documentation describe it as unique visitors.
- The honeypot's fake-success return must stay eventless — a bot must not be able to inflate
  `contact_submit` (D-11).
- Cache hits are real searches. If the VIN-search chart ever *drops* as caching improves, D-15 was
  implemented in only one of the route's two success branches.
- A tracking failure must be invisible to the user in every case, but must remain visible to us in
  Vercel logs on the server side (D-10 + D-12).

</specifics>

<deferred>
## Deferred Ideas

- **A fifth+ event type** (`estimate_viewed`, `booking_started`, `manual_entry_used`, funnel
  drop-off tracking). D-04 fixes the taxonomy at four. `src/lib/analytics/events.ts` is the seam if
  this is revisited.
- **Rich `metadata` payloads** — referrer, viewport, decode outcome, session identifiers. D-02 keeps
  the JSONB column empty for now; each field is a separate privacy and payload decision.
- **Tracking failed VIN searches** (`not-found` / `unreachable`) to surface typo rates and NHTSA
  outages. D-14 excludes them because, without a `metadata` outcome field, the count would silently
  blend successes with failures. Worth revisiting together with rich metadata.
- **Server-side bot filtering** using signals the browser doesn't have. D-07 declines UA-based
  filtering; genuine filtering would need a different vantage point.
- **A unique-visitor metric** (a persistent visitor identifier rather than `sessionStorage`) — has real
  privacy implications and would change what the dashboard card means.
- **Chart date-range picker** (7/30/90 days) — carried over from 05's deferred list; `ANALYTICS_WINDOW_DAYS`
  remains the seam.
- **Component-test infrastructure** (`@testing-library/react`, `jsdom`, `@vitejs/plugin-react`) — a
  standing project-wide gap, now also blocking any test of `PageViewTracker`. Still not this phase's
  job to resolve.

### Reviewed Todos (not folded)
- **`calendar-sizing-centering.md`** (cosmetic, from Phase 4 UAT) — not folded. Targets
  `src/components/booking/BookingCalendar.tsx`; a booking-UI cosmetic issue with no analytics
  dimension. Same disposition as Phase 5. Best handled as a quick task.
- **`requirements-traceability-stale.md`** (docs, info) — not folded. Every row in
  `.planning/REQUIREMENTS.md`'s traceability table still reads `Pending`, including verified Phases
  1–5. Project-wide tooling drift, not Phase 6 work — and Phase 6 will inherit the same problem on
  completion. Worth fixing at the mechanism level rather than backfilling per phase.

</deferred>

---

*Phase: 06-analytics*
*Context gathered: 2026-08-07*
