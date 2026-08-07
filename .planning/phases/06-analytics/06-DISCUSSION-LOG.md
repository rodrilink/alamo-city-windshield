# Phase 6: Analytics - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-07
**Phase:** 6-analytics
**Areas discussed:** Event contract & metadata, Page-view firing & hygiene, Write path & fire-and-forget, VIN-search trigger point

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Event contract & metadata | Where the four `event_type` strings live and how the producer stays reconciled with `dashboard-queries.ts`; JSONB metadata usage | ✓ |
| Page-view firing & hygiene | How `page_view` fires across mixed client/server component types; scope and filtering | ✓ |
| Write path & fire-and-forget | Browser vs Route Handler vs Server Action; what "non-blocking" concretely means | ✓ |
| VIN-search trigger point | Server-side vs client-side; which of five outcomes count; cache hits | ✓ |

**User's choice:** All four areas.

---

## Event contract & metadata

### Q1 — How should the four `event_type` strings be defined so producer and consumer can't drift apart?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared const + union type | New `src/lib/analytics/events.ts` with `ANALYTICS_EVENTS` + `AnalyticsEventType`; `dashboard-queries.ts` refactored to import it. A typo becomes a compile error. Costs one small edit to Phase 5 code. | ✓ |
| Shared const, leave consumer alone | Producer gets the module; `dashboard-queries.ts` keeps its private literals. Zero Phase 5 edits, but the silent-failure mode survives, resting on a test or grep. | |
| Add a DB CHECK constraint | Migration adds `CHECK (event_type IN (...))`. Strongest guarantee, but 05 D-06 established no migrations, and a rejected insert fails silently under fire-and-forget anyway. | |

**User's choice:** Shared const + union type
**Notes:** Directly closes the `STATE.md` blocker. 05 D-01's "no chart-code changes" payoff still holds — chart *components* are untouched; only the query module's constant declarations move.

### Q2 — What gets written into the `page`, `vin`, and `metadata` columns?

| Option | Description | Selected |
|--------|-------------|----------|
| Fill columns, metadata minimal | `page` = pathname, `vin` = VIN, `metadata` null unless genuinely needed. Keeps rows queryable with plain `.eq()`. Nothing consumes metadata today. | ✓ |
| Fill columns + small metadata blob | Adds referrer/viewport/decode outcome. More analytical value later, but each field is a privacy decision with no current consumer. | |
| Everything in metadata | Leave `page`/`vin` null, all detail in JSONB. Maximum flexibility, but abandons two purpose-built columns. | |

**User's choice:** Fill columns, metadata minimal

### Q3 — Storing the raw VIN on `vin_search` events — acceptable?

| Option | Description | Selected |
|--------|-------------|----------|
| Store the raw VIN | Consistent with `bookings`, `contacts` and `vin_cache`, which already store raw VINs. Makes "which vehicles are people quoting?" answerable. | ✓ |
| Store only derived fields | Year/make/model or size bucket in metadata instead. Partial privacy gain at best — the raw VIN already lives in `vin_cache`. | |
| Store nothing vehicle-specific | Count and timestamp only. Cleanest privacy posture, but discards the column the schema author added on purpose. | |

**User's choice:** Store the raw VIN
**Notes:** Raised proactively as a privacy question since a VIN identifies a specific physical vehicle. Existing precedent settled it.

### Q4 — Should the four requirement events be the complete taxonomy?

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly four event types | `page_view`, `vin_search`, `contact_submit`, `booking_created` and nothing else. Matches ANLY-02..05 verbatim and the two literals the consumer expects. | ✓ |
| Four plus room to grow | Same four, but structured for additions with candidate future events noted. Forward-looking, but every added event is untracked scope with no consumer. | |

**User's choice:** Exactly four event types

---

## Page-view firing & hygiene

### Q1 — How should `page_view` fire, given Home is a Client Component and About/Contact/Book are Server Components?

| Option | Description | Selected |
|--------|-------------|----------|
| Client tracker in public layout | `'use client'` `<PageViewTracker />` in `(public)/layout.tsx`, firing on `usePathname()` change. One insertion point covers all public routes; catches client-side nav. | ✓ |
| Server-side in each page | Fires during render per page; Home needs separate handling. No client JS, but misses client-side nav, risks double-firing, and spreads four call sites. | |
| Middleware-based | `supabase/middleware.ts` already runs on every route. Zero client cost, but catches prefetches and bots indiscriminately and puts an analytics write in the auth guard. | |

**User's choice:** Client tracker in public layout
**Notes:** The mixed component types across public pages are what make a layout-level tracker the only uniform option.

### Q2 — ANLY-02 names Home, About and Contact. Does `/book` get tracked?

| Option | Description | Selected |
|--------|-------------|----------|
| Track all public routes | Whatever pathname the layout sees, `/book` included. No allow-list to drift; `page` column keeps them separable. | ✓ |
| Only the three named pages | Explicit allow-list. Literal ANLY-02 compliance, but needs maintenance and silently drops real page views. | |

**User's choice:** Track all public routes
**Notes:** Admin traffic is excluded structurally — `(admin)` has its own layout, so the tracker never mounts there.

### Q3 — Should `page_view` do any filtering — bots, prefetches, duplicate views?

| Option | Description | Selected |
|--------|-------------|----------|
| Record raw, no filtering | Every mount writes a row. Client-side firing already excludes prefetches and non-JS crawlers for free. | |
| Dedupe within a session | `sessionStorage` suppression of repeat views, so the visitors number leans toward unique visitors. | ✓ |
| User-agent bot filtering | UA pattern list. Catches JS-executing scrapers, but UA is trivially spoofed and the list rots. | |

**User's choice:** Dedupe within a session

### Q4 — What's the dedupe key?

| Option | Description | Selected |
|--------|-------------|----------|
| Per path, per session | One row per distinct pathname per session. Home → About → Home writes 2 rows. Keeps the `page` column meaningful. | ✓ |
| One event per session total | Only the first public page view. Card genuinely counts sessions, but `page` degrades to "entry page only". | |

**User's choice:** Per path, per session
**Notes:** Recorded consequence — the "Total Visitors" card counts distinct page-visits per session, **not unique people**. Flagged so nobody downstream mislabels it.

---

## Write path & fire-and-forget

### Q1 — One write path for all four events, or different paths per event?

| Option | Description | Selected |
|--------|-------------|----------|
| Split: browser + server | `page_view` from the browser anon client via the existing RLS insert policy; the other two server-side in the existing Server Actions via `createAdminClient()`. Each event writes from where it already knows it happened. | ✓ |
| One Route Handler for everything | `POST /api/track`. Single choke point, but adds a public unauthenticated write endpoint and makes server-side events do a pointless HTTP hop to their own process (the 05 D-04 argument). | |
| One Server Action for everything | A single `trackEvent`. Uniform and type-safe, but a browser-invoked Server Action is still an HTTP round-trip, and action-calling-action is a pattern this codebase uses nowhere. | |

**User's choice:** Split: browser + server

### Q2 — What does "non-blocking" concretely mean for the two Server Actions?

| Option | Description | Selected |
|--------|-------------|----------|
| Awaited, errors swallowed | Awaited inside the action but wrapped so failures are logged and discarded. The only reliably correct option on serverless, where unawaited work can be killed at freeze. | ✓ |
| Detached, not awaited | Zero added latency, but on Vercel a promise in flight at response time may never complete — events lost non-deterministically. Would need `waitUntil()`. | |
| Awaited with a timeout | Bounds the worst case, echoing Phase 3's 6s NHTSA timeout. More machinery than a same-region insert warrants; an abandoned insert may still land. | |

**User's choice:** Awaited, errors swallowed
**Notes:** Settles ANLY-06's real intent — the guarantee is "a failed event never affects the user action", not "the write is detached".

### Q3 — Where in `createBooking` / `createContact` does the tracking call go?

| Option | Description | Selected |
|--------|-------------|----------|
| After a confirmed success only | Success path only, after the insert returns clean. The honeypot early-return (fake success, no insert) must NOT fire. | ✓ |
| On every submit attempt | Includes validation failures and slot-taken races. Richer funnel data, but inflates `booking_created` past real bookings and needs a metadata outcome field D-02 excluded. | |

**User's choice:** After a confirmed success only
**Notes:** The honeypot exclusion is the subtle part — `createContact` returns `{ status: 'success' }` to fool bots without inserting.

### Q4 — When a tracking write fails, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Server logs, browser silent | Server `console.error` with context per the established pattern; browser swallowed entirely. | ✓ |
| Both log to console | Symmetric and good for local dev, but puts our error output in every visitor's console where nobody reads it. | |
| Silent everywhere | No leakage or noise, but a systematically broken tracker becomes indistinguishable from zero traffic. | |

**User's choice:** Server logs, browser silent

---

## VIN-search trigger point

### Q1 — Where does `vin_search` fire?

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side in the route handler | One insertion point in `/api/vin/[vin]/route.ts` covers both callers and any future one. The route already holds the validated, normalized VIN and knows the outcome. | ✓ |
| Client-side at each call site | Both client components fire after their fetch. Keeps browser events on one path, but two call sites to sync and a third caller would go untracked. | |
| Both routes, including `/api/estimate` | Broader funnel coverage, but manual year entry involves no VIN — counting something the metric doesn't name. | |

**User's choice:** Server-side in the route handler

### Q2 — Which of the route's five outcomes record an event?

| Option | Description | Selected |
|--------|-------------|----------|
| Successful decodes only | `decoded` and `needs-vehicle-type`. Both are genuine successful decodes producing a real estimate. Matches "on successful VIN decode" exactly. | ✓ |
| Every valid-format attempt | All but `invalid`. Shows true demand including failures, but without a metadata outcome field the chart silently blends successes with typos and outages. | |
| Successes plus not-found | Adds the fixable-typo branch. Captures intent, but counts one person's retries as multiple searches. | |

**User's choice:** Successful decodes only

### Q3 — Does a cache hit fire an event?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — cache hits count | The metric measures user demand; a cache hit is an identical successful search from the user's side. Requires firing in **both** success branches of the route. | ✓ |
| No — only live decodes | Number means "distinct upstream lookups", useful for cache effectiveness, but under-reports user activity and the card is labeled for searches, not API calls. | |

**User's choice:** Yes — cache hits count
**Notes:** Flagged as an easy-to-miss implementation detail — the `vin_cache` hit returns early at Step 2 of the handler.

### Q4 — Does `/book`'s server-side re-decode count?

| Option | Description | Selected |
|--------|-------------|----------|
| No — it's not a user search | That decode re-derives `vehicle_desc` for a booking already decided on (04 D-12/D-19). The user's real search already fired. Counting it double-counts one journey. | ✓ |
| Yes — any successful decode counts | Literal reading of ANLY-03, but registers a VIN search the user never performed and needs a second insertion point. | |

**User's choice:** No — it's not a user search

---

## Claude's Discretion

- `sessionStorage` unavailability handling (private browsing, storage disabled, SSR pass) — must not throw during render.
- The tracker's render output (likely `null`), Suspense needs, and effect keying.
- Exact helper signatures and whether browser/server helpers share one module under `src/lib/analytics/`.
- Whether the event-contract reconciliation gets a pure-function unit test (the type system already catches drift).
- Whether the "Total Visitors" card copy is reworded now that D-08 pins its semantics.
- How the phase is verified given the charts need accumulated data.

## Deferred Ideas

- A fifth+ event type (`estimate_viewed`, `booking_started`, `manual_entry_used`, funnel drop-off).
- Rich `metadata` payloads — referrer, viewport, decode outcome, session identifiers.
- Tracking failed VIN searches (`not-found` / `unreachable`) to surface typo rates and NHTSA outages.
- Server-side bot filtering using signals the browser doesn't have.
- A unique-visitor metric with a persistent identifier (real privacy implications).
- Chart date-range picker (7/30/90 days) — carried from Phase 5.
- Component-test infrastructure — standing project-wide gap, now also blocking any `PageViewTracker` test.

### Reviewed Todos (not folded)

- `calendar-sizing-centering.md` — booking-UI cosmetic, no analytics dimension. Same disposition as Phase 5; best as a quick task.
- `requirements-traceability-stale.md` — project-wide docs/tooling drift, not Phase 6 work. Phase 6 will inherit the same problem on completion.
