# Phase 3: VIN Estimate - Research

**Researched:** 2026-08-04
**Domain:** Server-side VIN decoding (NHTSA vPIC), pure-function pricing formula, Next.js 15 Route Handlers, Supabase service-role caching
**Confidence:** HIGH (external API contract verified via live probes + official docs; Next.js/Supabase mechanics verified via official docs; one arithmetic discrepancy found in locked context — see Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pricing Formula (values are LOCKED — hardcode in `lib/pricing.ts`)**
- D-01: Base price for a standard windshield replacement is $300.
- D-02: Vehicle size modifier uses three buckets mapped from NHTSA `BodyClass`: Car (sedan, coupe, hatchback, wagon, convertible) +$0; SUV/Truck (SUV, crossover, MPV, pickup) +$75; Van/Oversized (van, minivan, cargo van, oversized) +$150.
- D-03: Windshield type modifier: Standard +$0, Acoustic +$100, Heated +$200.
- D-04: ADAS calibration is a range contribution, not a flat add: for `ModelYear >= 2018` it adds $0 to the low end and $250 to the high end. Pre-2018 vehicles get no ADAS contribution.
- D-05: Every estimate carries a ±10% baseline spread. Formula:
  ```
  subtotal = 300 + sizeModifier (0|75|150) + glassModifier (0|100|200)
  low      = subtotal * 0.90
  high     = subtotal * 1.10 + (modelYear >= 2018 ? 250 : 0)
  ```
- D-06: Worked examples (test fixtures) — **see Open Questions: one row does not reconcile with the D-05 formula as written.**

  | Vehicle | Glass | Expected quote |
  |---|---|---|
  | 2015 Honda Civic (sedan) | Standard | $270 – $330 |
  | 2020 Toyota Camry (sedan) | Standard | $270 – $580 |
  | 2020 Toyota Camry (sedan) | Acoustic | $360 – $690 |
  | 2022 Ford F-150 (pickup) | Standard | $338 – $663 |
  | 2023 Honda Odyssey (van) | Heated | $585 – $995 |
  | 2016 Chevy Silverado (pickup) | Standard | $338 – $413 |

**Result Presentation**
- D-07: On success, the VIN form is replaced by the result **inside the same card** (no modal/sheet/new section). "Estimate another vehicle" link returns to the form.
- D-08: Loading state is the submit button becoming an inline spinner reading "Decoding VIN…" with the input locked. No skeleton, no layout shift.
- D-09: Line-item breakdown is always visible: base price, vehicle size, glass type, camera recalibration (4 rows).
- D-10: ADAS shown as a breakdown line "Camera recalibration — up to $250" plus an info-icon note below, shown only for `ModelYear >= 2018`.
- D-11: One-line muted disclaimer under the CTA: estimate not final quote, final pricing confirmed on seeing vehicle, phone number pulled from `BUSINESS.phone` (never hardcoded).
- D-12: Phase 2 "Estimates launching soon" placeholder line is removed.

**Windshield Type Selector**
- D-13: Selector lives on the result, not the form. Form stays single-field.
- D-14: Standard preselected.
- D-15: Route Handler computes and returns **all three glass variants** in one response. Toggling is pure client state. Do NOT import `lib/pricing.ts` into a Client Component.
- D-16: One-line hint per active option describing physically observable traits (acoustic = road noise reduction, common on newer/luxury trims; heated = visible heating elements or wiper de-icer strip).

**Fallback and Failure Handling — three distinct branches**
- D-17: NHTSA unreachable (6s timeout, network error, 5xx) → manual entry form (model year + vehicle type only, 3 buttons: Car / SUV or Truck / Van). Header reads e.g. "2020 SUV".
- D-18: NHTSA responds but rejects the VIN (bad checksum, no data on file) → different message: "vehicle wasn't found, double-check the characters" + secondary "enter manually" link. NOT the manual form directly.
- D-19: NHTSA decodes but `BodyClass` missing/unmappable (e.g. "Incomplete Vehicle", "Truck-Tractor", "Low Speed Vehicle (LSV)") → show result with vehicle type as a live selector, defaulting to Car. Do not guess silently.
- D-20: Manual-entry estimate uses same card layout and same math, with one added line noting it's based on details entered. No wider range, no "rough estimate" relabel.
- D-21: Failed lookups are never written to `vin_cache` — only successful decodes are cached.

### Claude's Discretion
- Rounding convention for displayed prices (nearest dollar vs nearest $5).
- Exact `BodyClass` string → size bucket mapping table, including unmappable-value detection triggering D-19.
- `@shaggytools/nhtsa-api-wrapper` vs raw `fetch` with `AbortController`.
- Control style for both selectors (segmented buttons vs radio cards) — white/red/black only.
- Whether the price animates or cuts when the selector changes.
- Entrance/exit animation for form → result swap (stay consistent with `motion/react` `whileInView` + `viewport={{ root: scrollRef }}`).
- `vin_cache` TTL — indefinite caching acceptable (VIN data is immutable).
- Whether to build the result as a standalone component anticipating Phase 4 reuse on `/contact`.
- Exact disclaimer, hint, and ADAS note wording.

### Deferred Ideas (OUT OF SCOPE)
- Admin-editable pricing (`pricing_config` table) — v2, hardcode in `lib/pricing.ts` this phase.
- Gating the estimate behind a phone number capture.
- Rate-limiting the VIN proxy — `vin_cache` absorbs repeat lookups; revisit if traffic warrants.
- Carrying the estimate into the booking record — Phase 4.
- Contact page VIN search — Phase 4 (reuses this decoder).
- Make/model on manual entry — rejected, keep to two fields (model year + vehicle type bucket).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIN-01 | Server-side Route Handler (`/api/vin/[vin]`) calls NHTSA vPIC API | §Route Handler Mechanics — confirmed `decodevinvalues` endpoint shape, Next.js 15 async `params`, default-uncached GET behavior |
| VIN-02 | NHTSA call has 6-second timeout with graceful failure + manual entry fallback | §Timeout & Failure Classification — live-verified `AbortSignal.timeout()` error shape vs network-error shape; concrete 3-branch classification rule |
| VIN-03 | Decoded VIN results cached in Supabase to avoid repeat API calls | §Service-Role Supabase Client — verified `createClient` admin pattern; read-then-write sequence against `vin_cache` |
| VIN-04 | Pricing formula: base + size + windshield + ADAS modifier | §Pricing Formula Verification — arithmetic check of all 6 D-06 fixtures against D-05, one discrepancy found |
| VIN-05 | Estimate displayed as range with line-item breakdown | §Result Presentation / Code Examples |
| VIN-06 | Windshield type selector (standard/acoustic/heated) | §Don't Hand-Roll, §Keeping the Formula off the Client |
| VIN-07 | ADAS calibration flag auto-detected for 2018+ vehicles | §BodyClass Value Inventory, §ErrorCode Semantics |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Next.js 15.5.15 / React 19.1.0 / TypeScript 5 / Tailwind v4 / shadcn — already scaffolded (`package.json` confirmed, no version drift from stack research).
- Palette strictly white/red/black — no amber/yellow. ADAS notices and error states must use brand red or muted gray only.
- Animation imports MUST come from `motion/react`, never `framer-motion`. `motion` 12.38.0 is already installed (`package.json` line 18).
- `src/` directory, `@/` path alias (confirmed in `tsconfig.json`).
- Service role key must never be `NEXT_PUBLIC_`-prefixed (Phase 1 D-21, re-affirmed here for `lib/supabase/admin.ts`).

## Summary

This phase has one true open technical question (the NHTSA response contract) and the rest is composition of already-established project patterns. Live probes against the real `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/{vin}?format=json` endpoint (run during this research session, not from training data) show that **NHTSA always returns HTTP 200** — errors are only ever signaled inside the JSON body via `ErrorCode`/`ErrorText`, and, critically, **a non-zero `ErrorCode` does NOT mean "no usable data."** Real-world checksum-related codes (e.g. `1` — bad check digit) commonly co-occur with a fully populated `Make`/`Model`/`BodyClass`/`ModelYear`. The reliable signal for "NHTSA answered but has nothing useful" (D-18) is **empty `ModelYear` AND empty `Make` AND empty `Model`** — not the `ErrorCode` value itself. This gives the planner a field-presence classification rule instead of a fragile `ErrorCode` string-parsing rule.

The official NHTSA `BodyClass` enumeration was pulled live (71 values) and mapped completely into the three D-02 buckets plus an explicit unmappable set, giving the planner a literal lookup table rather than a partial list.

Next.js 15's Route Handler contract was confirmed against the official `route.js` docs: dynamic `params` is a `Promise` that must be awaited, and — a favorable finding — **GET Route Handlers are uncached by default since Next.js 15.0.0-RC**, so no `dynamic`/`revalidate` route-segment config is needed to avoid framework-level caching colliding with the Supabase-based `vin_cache`. This actually *supersedes* an older suggestion in `ARCHITECTURE.md` (line 396) to "add `revalidate` caching" — that guidance predates this phase's CONTEXT.md decision to cache exclusively in Supabase, and following it would introduce a second, redundant cache layer with different invalidation semantics. Recommend the planner **not** add Next-level fetch caching for the outbound NHTSA call or the route segment.

The `server-only` package (already used implicitly by the Next.js ecosystem, separately installable, verified on the npm registry, zero postinstall risk, 13.2M weekly downloads) gives D-15's "never ship the formula to the client" rule a build-time guarantee instead of a code-review convention — confirmed against official Next.js docs.

No test runner exists in this project (`package.json` has only `dev`/`build`/`start`/`lint`). Since `.planning/config.json` has `workflow.nyquist_validation: false`, a formal test-infrastructure section is not required, but the D-06 fixtures should still be checked programmatically — the cheapest verified option is Node's built-in `node --test` runner (confirmed working with zero dependencies against the installed Node 24.13.0, including native `.ts` execution), not Vitest/Jest.

**One important discrepancy found:** applying the LOCKED D-05 formula literally to the LOCKED D-06 fixture table reconciles exactly for 5 of 6 rows, but the 2023 Honda Odyssey (Heated) row's high end does not compute to the formula's output. See Open Questions — this needs a decision before it's used as a test fixture.

**Primary recommendation:** Build `/api/vin/[vin]/route.ts` as a plain `fetch` + `AbortSignal.timeout(6000)` handler (skip `@shaggytools/nhtsa-api-wrapper`), classify the NHTSA response by field presence (not `ErrorCode` parsing) into the three D-17/D-18/D-19 branches, mark `lib/pricing.ts` with `import 'server-only'`, and verify the D-06 fixtures with a zero-dependency `node --test` script once the Odyssey discrepancy is resolved with the user.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| VIN format validation (17-char pattern) | Browser/Client | API/Backend | Client validates for instant feedback (already shipped, Phase 2); **must be re-validated server-side** in the Route Handler since it's a public GET endpoint reachable directly, bypassing the UI |
| NHTSA vPIC call + 6s timeout | API/Backend | — | Must stay server-side: keeps NHTSA UNAUTH endpoint insulated from direct browser CORS/rate-limit exposure, allows caching, keeps formula server-side (D-15) |
| Response classification (D-17/18/19 branching) | API/Backend | — | The Route Handler owns interpreting `ErrorCode`/field-presence and returning a shaped, unambiguous status to the client — client must not re-interpret raw NHTSA fields |
| `vin_cache` read/write | Database/Storage | API/Backend | RLS-enabled-no-policies table (Phase 1); only the service-role client (server-only) can reach it |
| Pricing calculation (`lib/pricing.ts`) | API/Backend | — | Pure function, but MUST run only in the Route Handler — never imported into a Client Component (D-15); `server-only` import enforces this at build time |
| Windshield/vehicle-type selector state | Browser/Client | — | Pure UI state — toggling between the three precomputed variants already returned by the Route Handler; zero additional network calls |
| Manual-entry fallback form | Browser/Client | API/Backend | Two-field form is client UI; but it still calls the same pricing computation server-side (reuse the same Route Handler response shape, or a sibling handler) so the formula never ships to the client either |
| Entrance/exit animation (form↔result swap) | Browser/Client | — | `motion/react`, client-only concern |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.103.0 (already installed, `package.json` line 14) | Service-role admin client for `vin_cache` | Same SDK already used for the cookie-based client; `createClient` (not `createServerClient`) is the documented pattern for service-role usage [VERIFIED: Supabase official docs] |
| Native `fetch` + `AbortController`/`AbortSignal.timeout()` | Node 24 runtime built-in (no install) | NHTSA vPIC HTTP call with 6s budget | Live-verified in this session: `AbortSignal.timeout(N)` throws a `DOMException` with `name === 'TimeoutError'`; a genuine network failure throws `TypeError` with message `"fetch failed"` and `.cause.code` (e.g. `ENOTFOUND`) — these are cleanly distinguishable without any wrapper library [VERIFIED: live probe, this session, Node v24.13.0] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `server-only` | 0.0.1 on npm, 13.2M weekly downloads [VERIFIED: npm registry, `npm view server-only version` = 0.0.1, `scripts.postinstall` empty] | Build-time guarantee that `lib/pricing.ts` is never bundled into a Client Component | Add `import 'server-only'` as the first line of `lib/pricing.ts`; Next.js throws a build error if any Client Component's module graph transitively imports it [CITED: nextjs.org/docs/app/getting-started/server-and-client-components §Preventing environment poisoning] |
| `lucide-react` | 1.8.0 (already installed) | Info icon for the D-10 ADAS note | Already the project's icon library (Phase 2) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `fetch` | `@shaggytools/nhtsa-api-wrapper` (real package, npm registry confirms version 3.0.4 [ASSUMED — package name discovered via training/WebSearch, registry-confirmed but not via official docs/Context7]) | Wrapper adds a dependency and its own response typing that would need reconciling with this phase's field-presence classification rule anyway; the 6s timeout must be hand-rolled either way since the wrapper doesn't expose one directly. CONTEXT.md discretion note already leans toward raw fetch — this research confirms that's the lower-friction choice. |
| `node --test` for pricing fixtures | Vitest | Vitest is the ecosystem-standard choice long-term (matches what a Next.js/React project would eventually want for component tests), but installing it is a bigger commitment for one pure-function test file. `node --test` requires zero new dependencies and Node 24 (installed) runs `.ts` files natively — confirmed working live in this session. |

**Installation:**
```bash
npm install server-only
```

**Version verification:** `npm view server-only version` → `0.0.1` (confirmed live, this session). No other new packages required for this phase — `@supabase/supabase-js`, `motion`, `lucide-react` are already in `package.json`.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `server-only` | npm | published under `vercel/next.js` monorepo (long-standing, ubiquitous in Next.js ecosystem) | 13.2M/wk [VERIFIED: `api.npmjs.org/downloads/point/last-week/server-only`, this session] | none linked in npm metadata (package is part of the `vercel/next.js` monorepo; not a standalone repo listing) | `[OK]` — slopcheck flagged "No source repository linked" as an informational note only, not a warning tier | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

slopcheck was successfully installed and run this session (`pip install slopcheck`, then `slopcheck install server-only`). It returned `[OK]` for `server-only` with a note that no source repository is linked in npm's metadata — this is expected for packages published from a monorepo (the code itself is trivial: a single-line side-effect module) and is corroborated by 13.2M weekly downloads and zero `postinstall` script (`npm view server-only scripts.postinstall` returned empty). No other packages are being newly installed this phase.

## Architecture Patterns

### System Architecture Diagram

```
Browser (EstimateSection.tsx, Client Component)
  │
  │ 1. User types 17-char VIN, client-side regex validates (already shipped)
  │ 2. fetch('/api/vin/{vin}')
  ▼
Route Handler  app/api/vin/[vin]/route.ts  (Server, Node runtime)
  │
  │ 3. Re-validate VIN format server-side (defense — public endpoint)
  │
  ├─► lib/supabase/admin.ts ──► vin_cache table (SELECT by vin)
  │        │
  │        ├── HIT  ──────────────────────────────────┐
  │        │                                           │
  │        └── MISS                                    │
  │             │                                      │
  │             ▼                                      │
  │        lib/vin.ts: fetch NHTSA vPIC                │
  │        decodevinvalues/{vin}?format=json            │
  │        AbortSignal.timeout(6000)                   │
  │             │                                      │
  │      ┌──────┼──────────────┬──────────────┐        │
  │      │      │              │              │        │
  │   throws  200 OK        200 OK,        200 OK,      │
  │  (Timeout/  ModelYear/   ModelYear/     ModelYear/  │
  │  network/   Make/Model   Make/Model     Make/Model  │
  │  5xx)       ALL empty    present,       present,    │
  │      │      (D-18)       BodyClass      BodyClass   │
  │      │         │         unmappable     maps to a   │
  │      │         │         (D-19)         bucket      │
  │      ▼         ▼              │              │      │
  │   D-17       D-18              └──────┬───────┘      │
  │  manual-    "check VIN                │              │
  │  entry      characters"               ▼              │
  │  form UI    + manual link      lib/supabase/admin.ts │
  │                                 INSERT vin_cache     │
  │                                 (D-21: only success) │
  │                                        │             │
  │                                        └─────────────┤
  │                                                       ▼
  │                                        lib/pricing.ts (server-only)
  │                                        compute ALL THREE glass variants
  │                                        (D-15 — never ships to client)
  │                                                       │
  ▼                                                       ▼
Route Handler returns shaped JSON:
{ status: 'decoded'|'not-found'|'needs-vehicle-type'|'unreachable',
  vehicle: {...}, estimates: { standard, acoustic, heated } }
  │
  ▼
Browser: EstimateSection.tsx renders one of 4 states
(result card / typo message / vehicle-type selector / manual form)
Windshield-type toggle = pure client state over the 3 precomputed estimates
```

### Recommended Project Structure
```
src/
├── app/api/vin/[vin]/route.ts   # GET handler — the phase's central piece
├── lib/
│   ├── pricing.ts                # pure fn, `import 'server-only'` first line, holds D-01..D-05
│   ├── vin.ts                    # NHTSA fetch + response classification (6s AbortSignal.timeout)
│   └── supabase/
│       ├── admin.ts              # NEW — service-role client, no cookies
│       ├── server.ts             # existing — cookie client (RSC/Server Actions)
│       └── client.ts             # existing — browser client
├── types/
│   └── vehicle.ts                # NEW — DecodedVehicle, EstimateResponse, GlassType, SizeBucket
└── components/home/
    └── EstimateSection.tsx       # rewired: form → result swap, two new selectors, manual form
```

### Pattern 1: Field-Presence Response Classification (NOT ErrorCode parsing)
**What:** Classify the NHTSA JSON response by checking whether `ModelYear`, `Make`, `Model` are non-empty strings — not by parsing the `ErrorCode` field.
**When to use:** In `lib/vin.ts`, immediately after a successful `fetch` (200 status) from NHTSA.
**Why not `ErrorCode`:** Live probes this session show `ErrorCode` is a **comma-joined string of code numbers** (e.g. `"1,7,400"`, `"6,11"`) with no fixed cardinality, and non-zero codes routinely co-occur with fully usable data:

```typescript
// Source: live probe, this session, against
// https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/{vin}?format=json

// Real Ford F-150 pattern, deliberately-invalid check digit (ErrorCode "1"):
// { ErrorCode: "1", ErrorText: "1 - Check Digit (9th position) does not calculate properly",
//   ModelYear: "2022", Make: "FORD", Model: "F-150", BodyClass: "Pickup" }
// --> full usable data despite non-zero ErrorCode

// Garbage VIN with unrecognized manufacturer (ErrorCode "7" or "1,7,400"):
// { ErrorCode: "7", ErrorText: "7 - Manufacturer is not registered with NHTSA...",
//   ModelYear: "", Make: "", Model: "", BodyClass: "" }
// --> no usable data; THIS is the D-18 signal

function classifyDecode(result: NhtsaResult): 'decoded' | 'not-found' | 'needs-vehicle-type' {
  const hasCoreData = Boolean(result.ModelYear && result.Make && result.Model)
  if (!hasCoreData) return 'not-found' // D-18
  const bucket = mapBodyClassToSizeBucket(result.BodyClass)
  return bucket ? 'decoded' : 'needs-vehicle-type' // D-19 if unmappable
}
```

### Pattern 2: Three-Way Timeout/Network/HTTP-Status Classification
**What:** Distinguish "NHTSA unreachable" (D-17) from a normal 200 response, using error shape — not status codes, since NHTSA never returns non-2xx for a bad VIN.
**Example (all three branches live-verified this session, Node v24.13.0):**
```typescript
// Source: live probe, this session
async function fetchNhtsa(vin: string): Promise<Response> {
  return fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`,
    { signal: AbortSignal.timeout(6000) }
  )
}

try {
  const res = await fetchNhtsa(vin)
  if (!res.ok) {
    // D-17 — NHTSA replied but with a 5xx/4xx (outage). Confirmed empirically:
    // NHTSA returns HTTP 200 for every VIN format tested, valid or garbage —
    // a non-2xx here means an actual service outage, not a bad VIN.
  }
  const data = await res.json()
  // ... classify per Pattern 1
} catch (err) {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    // D-17 — 6s budget exceeded. Verified live: AbortSignal.timeout(1) on this
    // endpoint throws DOMException { name: 'TimeoutError', message: 'The operation
    // was aborted due to timeout' }
  } else if (err instanceof TypeError) {
    // D-17 — network failure. Verified live against an unresolvable host:
    // TypeError { message: 'fetch failed', cause: { code: 'ENOTFOUND' } }
  }
  // both collapse to the same D-17 UI branch; keep the distinction only for logging
}
```

### Pattern 3: Route Handler Awaited `params` (Next.js 15)
**What:** `params` on the second argument of a Route Handler is a `Promise` in Next.js 15+, must be awaited.
**Example:**
```typescript
// Source: nextjs.org/docs/app/api-reference/file-conventions/route
// (confirmed current for the installed 15.5.15; version history table on that
// page states "v15.0.0-RC: context.params is now a promise")
export async function GET(
  request: Request,
  { params }: { params: Promise<{ vin: string }> }
) {
  const { vin } = await params
  // ...
}
```

### Pattern 4: Route Handlers Are Uncached by Default in Next.js 15
**What:** Since Next.js 15.0.0-RC, GET Route Handlers and `fetch` calls default to dynamic/uncached (this reversed the Next 13/14 behavior). [CITED: nextjs.org/docs/app/api-reference/file-conventions/route — version history table]
**Why it matters here:** No `export const dynamic = 'force-dynamic'` or route-segment config is needed to prevent Next.js from caching a stale NHTSA response. **Do not** add `fetch(url, { next: { revalidate: N } })` to the outbound NHTSA call — that would introduce a second cache layer (Next's Data Cache) on top of the Supabase `vin_cache`, with different invalidation semantics and no way to bypass it from application code. `ARCHITECTURE.md` line 396 ("Add `revalidate` caching") predates this phase's locked decision (D-21: cache exclusively in `vin_cache`, indefinitely) and should be treated as superseded.

### Pattern 5: Service-Role Supabase Admin Client
**What:** A second Supabase client, separate from `lib/supabase/server.ts`, using `@supabase/supabase-js`'s plain `createClient` (not `@supabase/ssr`'s `createServerClient`) with the service-role secret, no cookies, no session persistence.
**Example:**
```typescript
// Source: supabase.com/docs/guides/troubleshooting/
// performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa
// lib/supabase/admin.ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
```
Differs from `src/lib/supabase/server.ts` (lines 1-28, existing): that file uses `createServerClient` from `@supabase/ssr` and wires `cookies()` from `next/headers` because it authenticates as the *visiting user* under RLS. The admin client authenticates as the service role and bypasses RLS entirely — appropriate here because `vin_cache` (migration lines 116-121) has RLS enabled with **zero policies**, meaning the anon/authenticated roles get zero access by design; only the service-role client can reach the table at all.

**Read-then-write sequence for `vin_cache` (D-21 — only successful decodes cached):**
```typescript
const admin = createAdminClient()

// 1. Read
const { data: cached } = await admin
  .from('vin_cache')
  .select('*')
  .eq('vin', vin)
  .maybeSingle()

if (cached) {
  // use cached.model_year, cached.make, cached.model, cached.body_class
} else {
  const nhtsaResult = await fetchAndClassify(vin)
  if (nhtsaResult.status === 'decoded') {
    // 2. Write — ONLY on decoded success (D-21), never on 'not-found' or 'needs-vehicle-type'
    await admin.from('vin_cache').insert({
      vin,
      model_year: nhtsaResult.modelYear,
      make: nhtsaResult.make,
      model: nhtsaResult.model,
      body_class: nhtsaResult.bodyClass,
      raw_response: nhtsaResult.raw,
    })
  }
}
```
Note: `vin_cache.vin` has a `UNIQUE` constraint (migration line 108) — a race between two concurrent requests for the same never-before-seen VIN will cause the second `insert` to fail with a unique-violation. This is a benign, low-probability race (single-location small-business traffic) — the planner should wrap the insert in a try/catch that swallows a unique-violation rather than surfacing it as an error, since the read that follows would find the row anyway.

No generated Supabase types exist in this repo (`src/lib/supabase/` contains only `client.ts`, `middleware.ts`, `server.ts` — confirmed by directory listing this session); the admin client and `vin_cache` row shape should use a hand-written interface in `types/vehicle.ts` rather than assuming a `Database` generic type exists.

### Anti-Patterns to Avoid
- **Parsing `ErrorCode` as the primary signal:** It's an unstructured, comma-joined string with no documented fixed enumeration of "which codes mean no data." Field presence (`ModelYear`/`Make`/`Model` non-empty) is a stable, directly-observable signal this phase's UI already needs to check anyway.
- **Adding Next.js fetch-level caching (`next: { revalidate }`) to the outbound NHTSA call:** redundant with and inconsistent with the Supabase `vin_cache`, which is the sole caching layer per D-21.
- **Importing `lib/pricing.ts` into `EstimateSection.tsx` directly:** breaks D-15. The `server-only` import makes this a build error, not just a lint warning.
- **Guessing a size bucket for an unmapped `BodyClass`:** D-19 explicitly forbids silent guessing — must surface the selector.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Preventing server code from leaking into client bundles | A code-review convention/comment | `import 'server-only'` in `lib/pricing.ts` | Turns a discipline problem into a build-time compiler error [CITED: nextjs.org/docs/app/getting-started/server-and-client-components] |
| Fetch timeout | A manual `setTimeout` + `AbortController.abort()` combo | `AbortSignal.timeout(6000)` | One-line, standard Web API, live-verified to throw a distinguishable `TimeoutError` | 
| VIN checksum validation | A hand-rolled VIN check-digit algorithm | Don't build this at all — NHTSA already validates and reports it via `ErrorCode`; this phase's classification rule doesn't need to reimplement checksum math (confirmed during research: even the project's own probe script computing a check digit added no value NHTSA doesn't already surface) | Avoids duplicating logic NHTSA already owns and keeps the source of truth external |

**Key insight:** The instinct to parse `ErrorCode` deeply (build an error-code-to-branch lookup table) is exactly the kind of "custom solution to a deceptively complex problem" this section warns about — the actual signal the UI needs (do we have enough data to show a result?) is already directly observable in three plain fields, with no NHTSA-specific code table required.

## Common Pitfalls

### Pitfall 1: Treating a non-zero `ErrorCode` as "reject the VIN"
**What goes wrong:** A naive `if (result.ErrorCode !== '0') { showTypoMessage() }` would misclassify a large fraction of real-world VINs, because check-digit-related codes (`1`) and incomplete-VIN codes （`6`) commonly appear on responses that still contain full `Make`/`Model`/`BodyClass`/`ModelYear` data.
**Why it happens:** The field is named `ErrorCode`, which reads as "something is wrong" — but NHTSA's own semantics are closer to "advisory/decode-quality notes," not "hard failure."
**How to avoid:** Use the field-presence rule from Pattern 1.
**Warning signs:** If real customer VINs (which always have correct checksums) are being shown the "check your VIN characters" message, the classification is using `ErrorCode` instead of field presence.

### Pitfall 2: Assuming a non-2xx status means "bad VIN"
**What goes wrong:** Building retry/error-messaging logic keyed off HTTP status for VIN validity issues.
**Why it happens:** Reasonable assumption for most REST APIs.
**How to avoid:** NHTSA returns HTTP 200 for every VIN input shape tested this session (valid, garbage, too-short, invalid-character). Reserve `!res.ok` handling exclusively for genuine outages, and route it to D-17 (same as timeout/network error), not D-18.
**Warning signs:** Dead code path — if the D-18 branch is only ever reached via `!res.ok` checks, it will never fire, because bad VINs return 200 with empty fields, not a 4xx/5xx.

### Pitfall 3: Empty string vs. absent field for `BodyClass`
**What goes wrong:** `BodyClass` can come back as `""` (empty string) rather than `null`/`undefined` — a naive `if (!result.BodyClass)` check does correctly catch this (empty string is falsy), but a check like `result.BodyClass !== undefined` would not, silently treating an unmapped/empty BodyClass as if it were a real value.
**How to avoid:** Normalize with a falsy/empty-string check before the size-bucket lookup, and treat "value present but not in the lookup table" (e.g. `"Truck-Tractor"`, any `"Incomplete*"` variant) the same as "value absent" — both trigger D-19.

### Pitfall 4: Rounding half-values inconsistently
**What goes wrong:** The D-05 formula produces non-integer cents for several D-06 fixtures (e.g. F-150: low = 337.5, high = 662.5). If low/high are displayed with naive `toFixed(2)` or floored/ceiled inconsistently, displayed numbers won't match the LOCKED D-06 table.
**How to avoid:** `Math.round()` (JavaScript rounds `.5` up toward positive infinity for positive numbers) reproduces the D-06 fixtures exactly for the 5 rows that reconcile: `Math.round(337.5) === 338`, `Math.round(662.5) === 663`. This confirms the discretion item "nearest dollar, not nearest $5" — nearest $5 would give 335/340 and 660/665, which do not match.

### Pitfall 5: Race on first-time `vin_cache` insert
**What goes wrong:** Two near-simultaneous requests for the same never-cached VIN both miss the cache, both call NHTSA, both attempt `INSERT`; the second violates the `UNIQUE (vin)` constraint (migration line 108).
**How to avoid:** Wrap the insert in a try/catch (or use Supabase's `upsert` with `onConflict: 'vin', ignoreDuplicates: true`) so a duplicate-key error doesn't surface to the user — the response can proceed with the freshly-computed estimate regardless of whether the cache write succeeded.

## Runtime State Inventory

Not applicable — this is a greenfield feature phase, not a rename/refactor/migration. `vin_cache` is a new table already created empty in Phase 1 with no existing rows to migrate.

## Code Examples

### BodyClass → Size Bucket Mapping (complete inventory)

The following is the **full, live-pulled enumeration** of the 71 `BodyClass` values NHTSA's vPIC service can return [VERIFIED: `GET https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleVariableValuesList/BODY%20CLASS?format=json`, this session], mapped into the D-02 buckets. This directly answers the "highest-value research target #3" — an explicit, complete mapping rather than a partial guess.

```typescript
// Source: live pull, this session, GetVehicleVariableValuesList/BODY CLASS
// types/vehicle.ts
export type SizeBucket = 'car' | 'suv-truck' | 'van-oversized'

const CAR_BODY_CLASSES = new Set([
  'Sedan/Saloon',
  'Coupe',
  'Convertible/Cabriolet',
  'Hatchback/Liftback/Notchback',
  'Wagon',
  'Roadster',
  'Limousine',
])

const SUV_TRUCK_BODY_CLASSES = new Set([
  'Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]',
  'Crossover Utility Vehicle [CUV]',
  'Pickup',
  'Truck',
  'Sport Utility Truck [SUT]',
])

const VAN_OVERSIZED_BODY_CLASSES = new Set([
  'Van',
  'Minivan',
  'Cargo Van',
  'Step Van/Walk-in Van',
  'Motorhome',
  'Bus',
  'Bus - School Bus',
])

// Everything else — including all 71 NHTSA values not listed above — is
// UNMAPPABLE and must trigger D-19 (live vehicle-type selector). This
// explicitly includes (non-exhaustive, from the full 71-value pull):
//   '', 'Incomplete', 'Incomplete - Cutaway', 'Incomplete - Chassis Cab (Single Cab)',
//   'Incomplete - Chassis Cab (Double Cab)', 'Incomplete - Glider',
//   'Incomplete - Stripped Chassis', 'Incomplete - Bus Chassis', ...(9 more Incomplete-* variants),
//   'Truck-Tractor', 'Trailer', 'Streetcar/Trolley',
//   'Low Speed Vehicle [LSV]/Neighborhood Electric Vehicle [NEV]',
//   all 'Motorcycle - *' variants (16 total),
//   all 'Off-Road Vehicle - *' variants (9 total: ATV, Dirt Bike, Enduro, Go-Kart,
//     Snowmobile, MOHUV/ROV, Motocross, Golf Cart, Farm Equipment, Construction Equipment),
//   'Ambulance', 'Street Sweeper', 'Fire Apparatus'
// CONTEXT.md D-19's own examples ("Incomplete Vehicle", "Truck-Tractor",
// "Low Speed Vehicle (LSV)") are all confirmed present in this unmapped set.

export function mapBodyClassToSizeBucket(bodyClass: string): SizeBucket | null {
  const trimmed = bodyClass.trim()
  if (!trimmed) return null
  if (CAR_BODY_CLASSES.has(trimmed)) return 'car'
  if (SUV_TRUCK_BODY_CLASSES.has(trimmed)) return 'suv-truck'
  if (VAN_OVERSIZED_BODY_CLASSES.has(trimmed)) return 'van-oversized'
  return null // unmappable — triggers D-19
}
```

### Pricing Formula Verification (against all 6 D-06 fixtures)

```
subtotal = 300 + sizeMod + glassMod
low  = round(subtotal * 0.90)
high = round(subtotal * 1.10) + (modelYear >= 2018 ? 250 : 0)

1. Civic 2015, sedan, standard:   subtotal=300           low=270  high=330            -> $270-$330  MATCH
2. Camry 2020, sedan, standard:   subtotal=300           low=270  high=330+250=580     -> $270-$580  MATCH
3. Camry 2020, sedan, acoustic:   subtotal=400           low=360  high=440+250=690     -> $360-$690  MATCH
4. F-150 2022, pickup, standard:  subtotal=375  low=round(337.5)=338  high=round(412.5)+250=413+250=663  -> $338-$663  MATCH
5. Odyssey 2023, van, heated:     subtotal=650           low=585  high=715+250=965     -> table says $995  MISMATCH ($30 off)
6. Silverado 2016, pickup, std:   subtotal=375  low=round(337.5)=338  high=round(412.5)=413 (no ADAS, pre-2018)  -> $338-$413  MATCH
```
5 of 6 fixtures reconcile exactly with the LOCKED D-05 formula, including the two rows requiring `Math.round()` half-up behavior. This gives HIGH confidence the formula transcription is correct and row 5's **$995 is very likely a transposition typo for $965** (only the tens digit differs — 9↔6). See Open Questions.

### Minimal `node --test` fixture check (zero new dependencies)

```typescript
// Source: verified live this session — Node v24.13.0 executes .ts test files
// directly, and `node --test` is a built-in test runner (no install required)
// src/lib/pricing.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeEstimate } from './pricing'

test('2015 Honda Civic, standard glass', () => {
  const result = computeEstimate({ modelYear: 2015, sizeBucket: 'car', glassType: 'standard' })
  assert.equal(result.low, 270)
  assert.equal(result.high, 330)
})
// ... one test per D-06 row
```
Run with: `node --test src/lib/pricing.test.ts` (no build step; native TS execution confirmed working this session). Caveat: native `node` execution does **not** resolve the `@/` path alias (that's a bundler-only feature) — fine here since `lib/pricing.ts` should have zero imports beyond `server-only`, so the test file only needs a relative import.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Route Handlers/`fetch` cached by default (Next.js 13/14) | Uncached by default | Next.js 15.0.0-RC [CITED: nextjs.org/docs/app/api-reference/file-conventions/route, version history table] | No `dynamic`/`revalidate` config needed to avoid stale NHTSA caching; simplifies this phase's Route Handler |
| Dynamic route `params` as a plain object | `params` is a `Promise`, must `await` | Next.js 15.0.0-RC [CITED: same page] | `app/api/vin/[vin]/route.ts` signature must destructure `await params` |
| `framer-motion` package name | `motion/react` (rebranded) | Already reflected in this project's Phase 1/2 code (`EstimateSection.tsx` line 6: `import { motion } from 'motion/react'`) | No action needed — already correctly used |

**Deprecated/outdated:** `ARCHITECTURE.md` line 396's suggestion to "add `revalidate` caching" to the VIN Route Handler predates this phase's CONTEXT.md decision (D-21) to cache exclusively via `vin_cache`; treat that specific line as superseded, not as active guidance.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@shaggytools/nhtsa-api-wrapper` package name/version (3.0.4) — discovered originally via STACK.md/training data, registry-confirmed via `npm view` this session but not via an official docs page or Context7 | Standard Stack, Alternatives Considered | Low — this phase's recommendation is to NOT install it, so the risk is purely informational (if the planner decides to use it anyway, re-verify via its own README before adding) |
| A2 | The 2023 Honda Odyssey (Heated) $995 high-end figure in D-06 is a typo for $965 | Code Examples §Pricing Formula Verification, Open Questions | Medium — if the table is actually correct and the *formula* has an undocumented adjustment (e.g., van-specific ADAS scaling), building a test fixture off the wrong assumption would either wrongly "fix" a correct formula or wrongly bake in a bug. Needs explicit user confirmation before the planner encodes a test fixture. |
| A3 | Accessibility guidance (radiogroup semantics for the two selectors, `aria-live="polite"` on the price display) follows general WAI-ARIA Authoring Practices conventions | Security/Accessibility notes below | Low — standard, uncontroversial web accessibility practice; not verified against a specific WAI-ARIA APG page fetch this session |

**If this table is empty:** N/A — see above.

## Open Questions

1. **Does the 2023 Honda Odyssey (Heated) fixture's $995 high-end reconcile with the LOCKED D-05 formula?**
   - What we know: Applying `subtotal = 300 + 150(van) + 200(heated) = 650; high = 650*1.10 + 250 = 965` for every other row in the table produces an exact match (5 of 6 rows, including two requiring half-up rounding). Only this one row is off, by exactly $30 — and $965 vs. $995 is a single-digit transposition (6↔9), which is a very plausible typo.
   - What's unclear: Whether the table or the formula is the error. CONTEXT.md marks both as user-reviewed and LOCKED, and explicitly says "the user reviewed the D-06 worked examples explicitly and confirmed they match what the business would quote by phone" — including specifically calling out the Camry row, not the Odyssey row.
   - Recommendation: Flag this to the user (or via `discuss-phase`/a `checkpoint:human-verify`) before the planner writes it as a hardcoded test assertion. Do not silently pick one value — this research explicitly should not re-derive locked pricing values, and this is exactly that kind of decision. If unresolved by plan time, the safest path is to implement D-05 exactly as written (it's unambiguous and internally consistent) and treat the $995 in the table as needing a follow-up correction, since 5/6 independent data points corroborate the formula over the table.

2. **Manual-entry fallback (D-17): does it share the same Route Handler or need a sibling endpoint?**
   - What we know: D-17's two-field form (model year + vehicle type bucket) needs the same `lib/pricing.ts` computation, server-side, without ever exposing the formula.
   - What's unclear: CONTEXT.md doesn't specify whether this is a second Route Handler (e.g. `/api/estimate/manual`) or a Server Action, given ARCHITECTURE.md's general guidance that Route Handlers are for idempotent/cacheable GETs (Pattern 5) while mutations go through Server Actions (Pattern 2) — but a manual estimate is neither a mutation nor cacheable by VIN (there's no VIN).
   - Recommendation: A Server Action is arguably the better fit here (no caching concern, no idempotent-GET rationale applies, keeps `lib/pricing.ts` import server-side either way) — but this is a planning-level implementation choice, not a research gap; either approach satisfies D-15 and D-20 as long as `lib/pricing.ts` is never imported client-side.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| NHTSA vPIC API (`vpic.nhtsa.dot.gov`) | VIN-01 | ✓ | v3.66 (per STACK.md); live-probed successfully this session with multiple VIN shapes | D-17 manual entry form (already designed into this phase) |
| Node.js (local dev + Vercel runtime) | Route Handler, native `fetch`/`AbortController` | ✓ | v24.13.0 locally confirmed; Vercel's Next.js 15 Node runtime supports `AbortSignal.timeout` (stable since Node 17.3/18) | — |
| Supabase project (existing) | `vin_cache` reads/writes | ✓ (already provisioned Phase 1) | `@supabase/supabase-js` 2.103.0 | — |
| `slopcheck` (dev tooling) | Package Legitimacy Audit | ✓ (installed this session via pip) | — | If unavailable in a future session, mark all new packages `[ASSUMED]` per protocol |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** NHTSA outage → D-17 manual entry (by design, not a gap).

## Security Domain

`security_enforcement` is absent from `.planning/config.json` → treated as enabled per protocol.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This endpoint is intentionally public (no login required to get an estimate) |
| V3 Session Management | No | No session state involved |
| V4 Access Control | Yes | `vin_cache` RLS-enabled-with-zero-policies (migration lines 116-121) already restricts all non-service-role access; the Route Handler must use `lib/supabase/admin.ts` (service role), never the anon/cookie client, to reach this table |
| V5 Input Validation | Yes | Re-validate the 17-char VIN format (`/^[A-HJ-NPR-Z0-9]{17}$/`, already defined client-side in `EstimateSection.tsx` line 17) **server-side inside the Route Handler** before using the value in the outbound NHTSA URL or the Supabase `.eq('vin', ...)` query — the Route Handler is a public GET endpoint reachable directly (e.g. `curl /api/vin/anything`), bypassing all client-side validation |
| V6 Cryptography | Yes (secrets, not crypto primitives) | `SUPABASE_SERVICE_ROLE_KEY` must be read only inside server-only code (`lib/supabase/admin.ts`, itself marked `import 'server-only'`), never `NEXT_PUBLIC_`-prefixed (Phase 1 D-21, re-confirmed) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path/query injection into the outbound NHTSA URL via an unvalidated `vin` route param | Tampering | Validate against the VIN regex server-side before building the URL; reject with a 400-equivalent UI state (or fall into D-18 "check your VIN" messaging) rather than passing an arbitrary string through |
| SSRF-adjacent: attacker sends a non-VIN string hoping it's used unsafely | Tampering | The outbound URL's host (`vpic.nhtsa.dot.gov`) is a fixed constant, never derived from user input — only the path segment is user-controlled, and it's regex-validated first |
| Leaking the full 140+-field raw NHTSA payload (including internal/irrelevant fields) to the browser | Information Disclosure | The Route Handler should return a curated response shape (`{ vehicle, estimates }`), not `res.json()` passed through verbatim; `raw_response` JSONB is stored server-side in `vin_cache` for debugging, not re-served to the client |
| NHTSA soft rate-limiting the shop's server IP under load | Denial of Service | Explicitly deferred per CONTEXT.md ("Rate-limiting the VIN proxy") — `vin_cache` absorbs repeat lookups of the same VIN, which mitigates but does not eliminate this; out of scope for this phase per user decision |
| Service-role key exposure via accidental client bundle inclusion | Information Disclosure | `server-only` import in `lib/supabase/admin.ts` turns this into a build-time error rather than a runtime leak |

### Accessibility notes (not ASVS, but explicitly requested in scope)
- The price display (low/high range + line items) should live in an `aria-live="polite"` region so screen reader users are notified when the windshield-type selector changes the numbers, without the interruption of `assertive`.
- Both selectors (windshield type, and the D-19/D-17 vehicle-type buttons) are natural fits for the WAI-ARIA `radiogroup`/`radio` pattern (single-select, mutually exclusive) rather than a generic button group with manual `aria-pressed` toggling — this gives arrow-key navigation semantics for free from the underlying primitive if built on Radix (shadcn's `ToggleGroup` wraps Radix `ToggleGroup`, which supports `type="single"` for exactly this). [ASSUMED — general WAI-ARIA Authoring Practices convention, not verified against a specific fetched APG page this session]
- With no amber/yellow available, the D-18 "typo" message and D-17 fallback prompt should be differentiated from a true error state using layout/icon (e.g., an info-circle icon in muted gray for "didn't find it, check characters" vs. brand-red text only for genuine validation failures) rather than color alone — this also happens to satisfy general "don't rely on color alone" accessibility guidance for free.

## Sources

### Primary (HIGH confidence)
- Live probe, this session: `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/{vin}?format=json` — multiple VIN shapes (clean valid VIN, bad-checksum-but-recognizable VIN, garbage/unregistered-manufacturer VIN, too-short VIN, fabricated-checksum VIN) — confirms HTTP 200 always, `ErrorCode` is advisory not binary pass/fail, field-presence is the reliable success signal
- Live probe, this session: `https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleVariableValuesList/BODY%20CLASS?format=json` — complete 71-value `BodyClass` enumeration
- Live probe, this session: Node v24.13.0 `fetch` + `AbortSignal.timeout()` error shapes (`TimeoutError` DOMException vs. `TypeError`/"fetch failed" for network errors)
- Live probe, this session: `npm view server-only version`, `npm view server-only scripts.postinstall`, `api.npmjs.org/downloads/point/last-week/server-only`
- Live probe, this session: `slopcheck install server-only` — `[OK]` verdict
- nextjs.org/docs/app/api-reference/file-conventions/route — Route Handler `params` Promise contract, GET default-uncached behavior, version history table (fetched this session)
- nextjs.org/docs/app/getting-started/server-and-client-components §Preventing environment poisoning — `server-only` package build-time enforcement mechanism (fetched this session)
- supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa — exact admin client code (fetched this session)
- Local repo files (this session): `package.json`, `tsconfig.json`, `supabase/migrations/20260412000000_initial_schema.sql`, `src/components/home/EstimateSection.tsx`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/constants.ts`

### Secondary (MEDIUM confidence)
- WebSearch cross-referencing Next.js 15 `params`-as-Promise change (multiple independent sources agreeing, plus confirmed against the official docs page directly)
- WebSearch on `motion/react` `AnimatePresence` `mode="wait"` API surface (motion.dev tutorial/docs pages referenced; not independently fetched in full this session)
- WebSearch on Supabase service-role client config shape (cross-referenced against the directly-fetched official troubleshooting doc, which matches)

### Tertiary (LOW confidence)
- `@shaggytools/nhtsa-api-wrapper` existence/version — registry-confirmed (`npm view` shows 3.0.4) but package name originated from STACK.md/training data, not an official docs fetch or Context7 lookup; tagged `[ASSUMED]` per provenance rule regardless of registry confirmation. Not recommended for use this phase regardless.
- WAI-ARIA radiogroup/aria-live accessibility guidance — general training-knowledge convention, not verified against a specific fetched WAI-ARIA APG page this session

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages beyond `server-only` (registry + slopcheck verified live); all other dependencies already installed and version-confirmed in `package.json`
- Architecture (NHTSA contract, Route Handler mechanics, Supabase admin client): HIGH — verified via live API probes and official docs fetched this session, not training data
- BodyClass mapping: HIGH — complete enumeration pulled live from NHTSA's own variable-values endpoint, not a partial/remembered list
- Pricing formula reconciliation: HIGH confidence in the arithmetic itself; the Odyssey row discrepancy is a flagged open question requiring user input, not a research gap
- Pitfalls: HIGH — each pitfall is backed by a specific live probe result from this session, not general knowledge
- Accessibility guidance: MEDIUM — sound convention but not independently re-verified against a live WAI-ARIA source this session

**Research date:** 2026-08-04
**Valid until:** NHTSA vPIC contract and BodyClass enumeration: ~90 days (government API, changes rarely, but not contractually versioned). Next.js/Supabase mechanics: 30 days (fast-moving ecosystem, though this project is pinned to specific installed versions that won't drift mid-phase).
