---
phase: 03-vin-estimate
plan: 06
subsystem: api
tags: [nextjs, route-handler, nhtsa, vin, pricing, trust-boundary]

# Dependency graph
requires:
  - phase: 03-vin-estimate
    provides: "src/lib/pricing.ts (computeEstimateMatrix, adasApplies) from plan 03-03"
  - phase: 03-vin-estimate
    provides: "src/lib/vin.ts (decodeVin, mapBodyClassToSizeBucket), src/lib/vin-cache.ts (readVinCache, writeVinCache) from plan 03-04"
provides:
  - "GET /api/vin/[vin] — the phase's only trust boundary, composing cache-read, NHTSA decode, cache-write, and pricing into one public response"
  - "GET /api/estimate?year=YYYY — manual-entry pricing path for D-17/D-20, no VIN required"
  - "Captured real response bodies for all five statuses (invalid, decoded, needs-vehicle-type via degraded-cache note, not-found, unreachable-by-code-path) for plan 03-07 to branch on"
affects: [03-07, 03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js 15 dynamic route params typed as Promise<{ vin: string }> and awaited before use"
    - "satisfies VinLookupResponse / satisfies ManualEstimateResponse on every NextResponse.json body to catch response-shape drift at compile time"
    - "Route Handlers are the sole permitted importers of @/lib/pricing — enforced by a repo-wide grep in acceptance criteria"
    - "HTTP 200 for expected application states (unreachable, not-found, needs-vehicle-type), HTTP 400 reserved for malformed client input only"

key-files:
  created:
    - "src/app/api/vin/[vin]/route.ts"
    - "src/app/api/estimate/route.ts"
  modified: []

key-decisions:
  - "Reworded one inline comment in the VIN route handler that literally contained the substring 'writeVinCache' in prose, which inflated the raw grep count used by the plan's own acceptance criterion (expects exactly 2: one import, one call site) to 3; no logic change, comment-only edit"
  - "Bucket re-derivation on cache hit calls mapBodyClassToSizeBucket on the cached body_class rather than trusting a stored bucket, per the interfaces note — keeps a future mapping-table correction effective on already-cached rows without a cache flush"
  - "An unparsable cached model_year (NaN after Number.parseInt) falls through to a live NHTSA decode rather than returning a broken cached result"

patterns-established:
  - "Both Route Handlers build response objects field-by-field from named properties, never spreading the internal decode outcome or cache row, so the response type contract in src/types/vehicle.ts is the only shape the browser ever sees"

requirements-completed: [VIN-01, VIN-02, VIN-03, VIN-04]

# Metrics
duration: 25min
completed: 2026-08-04
---

# Phase 3 Plan 06: VIN and Manual-Estimate Route Handlers Summary

**Two Next.js 15 Route Handlers — `GET /api/vin/[vin]` and `GET /api/estimate?year=YYYY` — composing the decode layer (`lib/vin.ts`, `lib/vin-cache.ts`) and pricing layer (`lib/pricing.ts`) into the phase's only public trust boundary, verified live against real NHTSA VINs.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 completed
- **Files modified:** 2 (both created new)

## Accomplishments

- `src/app/api/vin/[vin]/route.ts` — validates the VIN (HTTP 400 before any network/DB call), reads `vin_cache`, falls through to `decodeVin` on a miss, writes the cache only on a `decoded` outcome, prices via `computeEstimateMatrix`/`adasApplies`, and returns one of five mutually exclusive statuses: `invalid`, `unreachable`, `not-found`, `needs-vehicle-type`, `decoded`
- `src/app/api/estimate/route.ts` — validates a bounded `year` query parameter and returns the identical nine-variant pricing matrix without requiring a VIN, closing RESEARCH.md's Route-Handler-vs-Server-Action open question
- Live-verified against the plan's three prescribed test VINs: `1FTFW1E85NFA12345` (decoded, Ford F-150, `suv-truck`, ADAS applies, `low:338`/`high:663` matching D-06 row 4), `ZZZZZZZZZZZZZZZZZ` (not-found), `short` (invalid, HTTP 400)
- Live-verified `/api/estimate` against year 2020 (`low:270`/`high:580`, ADAS true — D-06 row 2) and year 2015 (`low:270`/`high:330`, ADAS false — D-06 row 1), plus four 400 cases (`abc`, `1800`, `99999`, missing param)
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm test` (33 tests) all exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: GET /api/vin/[vin] — validate, cache, decode, classify, price** - `ee02224` (feat)
2. **Task 2: GET /api/estimate?year=YYYY — pricing for the manual-entry path** - `d6c38c0` (feat)

**Plan metadata:** committed alongside this SUMMARY.md (worktree mode — orchestrator merges and finalizes)

## Files Created/Modified

- `src/app/api/vin/[vin]/route.ts` — `GET` handler: normalize/validate VIN (V5, T-03-01) → cache read with bucket re-derivation and NaN-year fallback → `decodeVin` classification switch (`unreachable`/`no-data`/`decoded`) → cache write only on `decoded` (D-21) → price and shape `VinLookupResponse`
- `src/app/api/estimate/route.ts` — `GET` handler: parse and bound `year` query param against `MIN_MODEL_YEAR`..currentYear+1 (T-03-06) → price and shape `ManualEstimateResponse`

## Decisions Made

- Reworded one comment in the VIN handler because its prose literally contained the string `writeVinCache`, which the plan's acceptance criterion counts with a raw (non-comment-aware for this one check) grep expecting exactly 2 matches (import + call). No functional change — verified the corrected count is exactly 2 before committing.
- Kept the bucket re-derivation and NaN-guard exactly as specified in the plan's Step 2 interface notes rather than trusting any derived value that might be cached in the future.

## Deviations from Plan

None — plan executed as written. The one comment wording adjustment above was made pre-commit during self-verification, not discovered as a bug after the fact, and is documented above for completeness rather than as a Rule 1-4 deviation.

## Issues Encountered

- No live Supabase project is configured in this worktree (no `.env.local`; only `.env.example` present, consistent with the prior-wave note that "no live Supabase project exists yet"). `createAdminClient()` therefore hard-fails on missing env vars, and both `readVinCache`/`writeVinCache` swallow that failure per their designed degrade-to-live-lookup behavior (confirmed by reading `src/lib/vin-cache.ts`). Practical effect: the repeat-request cache-hit check in the plan's `<human-check>` block could not be exercised end-to-end against a real cache hit in this environment — the second `curl` to `1FTFW1E85NFA12345` returned `"cached":false` (same as the first) instead of `"cached":true`, because every `vin_cache` read/write silently no-ops. This is a test-environment limitation, not a code defect: the code path Step 2 (cache read with bucket re-derivation) and Step 4 (cache write only on decode) were verified by direct source reading and match the plan's interface notes exactly. This will resolve automatically once a real Supabase project with a `vin_cache` table (created in an earlier phase per `03-04-SUMMARY.md`) is connected via `.env.local` in a non-worktree environment.

## User Setup Required

None for this plan specifically. Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are pre-existing requirements from earlier phases (see `.env.example`), not new to this plan, and their absence in this worktree only affected the cache-hit portion of manual verification as noted above.

## Captured Response Bodies (for plan 03-07)

**`status: "invalid"`** — `GET /api/vin/short` → HTTP 400:
```json
{"status":"invalid","vehicle":null,"estimates":null,"adasApplies":false,"cached":false}
```

**`status: "decoded"`** — `GET /api/vin/1FTFW1E85NFA12345` → HTTP 200:
```json
{"status":"decoded","vehicle":{"vin":"1FTFW1E85NFA12345","modelYear":2022,"make":"FORD","model":"F-150","bodyClass":"Pickup","sizeBucket":"suv-truck"},"estimates":{"car":{"standard":{"low":270,"high":580,...}},"suv-truck":{"standard":{"low":338,"high":663,...}},"van-oversized":{"standard":{"low":405,"high":745,...}}},"adasApplies":true,"cached":false}
```

**`status: "not-found"`** — `GET /api/vin/ZZZZZZZZZZZZZZZZZ` → HTTP 200:
```json
{"status":"not-found","vehicle":null,"estimates":null,"adasApplies":false,"cached":false}
```

**`status: "unreachable"`** — not exercised live (would require simulating an NHTSA timeout/outage); the code path returns HTTP 200 with:
```json
{"status":"unreachable","vehicle":null,"estimates":null,"adasApplies":false,"cached":false}
```

**`status: "needs-vehicle-type"`** — not exercised live in this session (requires a VIN whose `BodyClass` falls outside all three allow-lists in `lib/vin.ts`, e.g. a motorcycle or trailer VIN); the code path returns HTTP 200 with `vehicle.sizeBucket: null` and the full nine-variant `estimates` still populated (pricing does not depend on the bucket being resolved by the caller — the client selects among the returned variants).

**`status: "manual"`** — `GET /api/estimate?year=2020` → HTTP 200:
```json
{"status":"manual","modelYear":2020,"estimates":{"car":{"standard":{"low":270,"high":580,...}}},"adasApplies":true}
```

**`status: "invalid"`** (estimate) — `GET /api/estimate?year=abc` (and `1800`, `99999`, missing) → HTTP 400.

## Next Phase Readiness

- Both Route Handlers are live and ready for plan `03-07` (VIN search UI) to call `fetch('/api/vin/' + vin)` and `fetch('/api/estimate?year=' + year)` and branch on the `status` field
- `@/lib/pricing` import surface is confirmed restricted to exactly these two Route Handlers plus `lib/pricing.ts` itself (repo-wide grep, D-15/T-03-03 enforcement)
- The `needs-vehicle-type` and `unreachable` statuses were not exercised against a live NHTSA response in this session (no motorcycle/trailer VIN probed, no outage simulated) but their code paths were verified against `src/lib/vin.ts`'s documented outcome union and are structurally identical to the exercised `decoded`/`not-found` paths
- Cache-hit behavior (`cached: true`) could not be verified end-to-end in this worktree due to the absence of `.env.local` / a reachable Supabase project — this should be re-verified once a real Supabase connection is available, though the read/write code itself was verified by direct source inspection to match the plan's Step 2/Step 4 specification exactly
- No blockers

---
*Phase: 03-vin-estimate*
*Completed: 2026-08-04*

## Self-Check: PASSED

- FOUND: src/app/api/vin/[vin]/route.ts
- FOUND: src/app/api/estimate/route.ts
- FOUND: .planning/phases/03-vin-estimate/03-06-SUMMARY.md
- FOUND: ee02224 (Task 1 commit)
- FOUND: d6c38c0 (Task 2 commit)
- FOUND: 4724110 (SUMMARY commit)
