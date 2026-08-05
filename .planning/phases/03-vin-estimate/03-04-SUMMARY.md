---
phase: 03-vin-estimate
plan: 04
subsystem: api
tags: [nhtsa, vpic, supabase, service-role, vitest, vin-decode]

# Dependency graph
requires:
  - phase: 03-vin-estimate
    provides: "VinCacheRow, SizeBucket, DecodedVehicle, VinLookupResponse types and isValidVin from 03-02"
provides:
  - "createAdminClient() — service-role Supabase client for RLS-bypassing access"
  - "readVinCache / writeVinCache — failure-tolerant vin_cache data access"
  - "decodeVin / classifyNhtsaResult / mapBodyClassToSizeBucket — NHTSA decode + three-way D-17/D-18/D-19 classification"
affects: [03-06, 03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service-role Supabase client factory named createAdminClient (not createClient) to avoid import collision with the anon/cookie clients"
    - "Field-presence classification (ModelYear+Make+Model all non-empty) instead of ErrorCode parsing for NHTSA response success signal"
    - "BodyClass mapped via three allow-list Sets; unmappable = 'not in any set', never enumerated"
    - "AbortSignal.timeout() for fetch budgets instead of hand-rolled setTimeout/AbortController"

key-files:
  created:
    - src/lib/supabase/admin.ts
    - src/lib/vin-cache.ts
    - src/lib/vin.ts
    - src/lib/vin.test.ts
  modified: []

key-decisions:
  - "createAdminClient() throws a hard Error when NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing, unlike middleware.ts's silent-skip convention — a missing service-role key must never silently degrade to a false cache miss"
  - "classifyNhtsaResult treats ErrorCode as log-only; the sole success signal is presence of ModelYear, Make, and Model together, per the live-captured bad-check-digit F-150 payload"
  - "mapBodyClassToSizeBucket returns null (not a guessed bucket) for any BodyClass outside the three D-02 allow-lists, implementing D-19 as allow-list negation rather than enumeration"

requirements-completed: [VIN-01, VIN-02, VIN-03]

duration: 35min
completed: 2026-08-04
---

# Phase 03 Plan 04: Server-side VIN decode layer Summary

**Service-role Supabase client, failure-tolerant `vin_cache` access, and an NHTSA decoder that classifies every response into `decoded` / `no-data` / `unreachable` using field presence instead of NHTSA's misleading `ErrorCode`.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 completed
- **Files modified:** 4 created

## Accomplishments
- `createAdminClient()` in `src/lib/supabase/admin.ts` — the only client in the codebase capable of reaching `vin_cache`, which has RLS enabled with zero policies
- `readVinCache` / `writeVinCache` in `src/lib/vin-cache.ts` — both swallow all errors so a cache outage never fails a customer's estimate request; `writeVinCache` uses `upsert` with `onConflict: 'vin', ignoreDuplicates: true` to absorb the benign concurrent-insert race on the `UNIQUE (vin)` constraint
- `decodeVin` / `classifyNhtsaResult` / `mapBodyClassToSizeBucket` in `src/lib/vin.ts` — the three-way D-17/D-18/D-19 classifier, proven against the two live-captured NHTSA payloads that expose the `ErrorCode` trap (a real Ford F-150 VIN with a bad check digit returns `ErrorCode: "1"` alongside a fully usable decode)
- 17 Vitest assertions in `src/lib/vin.test.ts` pinning the classifier's behavior, including an explicit test that the `no-data` and unmappable-`BodyClass` outcomes never collapse into the same value

## Task Commits

Each task was committed atomically:

1. **Task 1: Service-role Supabase client and failure-tolerant vin_cache access** - `00de99b` (feat)
2. **Task 2: NHTSA fetch with a 6-second budget and three-way response classification** - `e4e51d0` (feat)
3. **Task 3: Prove the classifier against live-captured NHTSA payloads** - `07b43d3` (test)

## Files Created/Modified
- `src/lib/supabase/admin.ts` - Service-role Supabase client factory (`createAdminClient`), hard-fails on missing env vars, no cookies/`next/headers`
- `src/lib/vin-cache.ts` - `readVinCache` (uses `maybeSingle`, swallows errors, returns `null` on any failure) and `writeVinCache` (upsert with `ignoreDuplicates`, swallows errors)
- `src/lib/vin.ts` - `decodeVin` (fetch with `AbortSignal.timeout(6000)`, three-way error mapping for timeout/network/http-error), `classifyNhtsaResult` (pure field-presence classifier), `mapBodyClassToSizeBucket` (three allow-list `Set`s covering all 71 NHTSA `BodyClass` values via inclusion, not enumeration of the unmappable set), exported `NHTSA_TIMEOUT_MS = 6000`
- `src/lib/vin.test.ts` - 17 Vitest assertions covering the classifier, the three-buckets mapping, whitespace tolerance, and the timeout constant; explicitly does not test `decodeVin` (real network I/O)

## Decisions Made
- Named the service-role factory `createAdminClient`, deliberately not the bare `createClient` used by `server.ts`/`client.ts`, to prevent an import collision and make the elevated-privilege client visually distinct at every call site.
- `readVinCache`/`writeVinCache` never throw — a cache failure degrades to a live NHTSA lookup rather than failing the request, per the plan's `must_haves`.
- `classifyNhtsaResult` never branches on `ErrorCode`; success is defined purely by the joint presence of `ModelYear`, `Make`, and `Model`. This is the load-bearing decision in the whole plan — getting it wrong collapses D-17/D-18 as CONTEXT.md warns.
- `mapBodyClassToSizeBucket` implements the unmappable set as "not in any of the three allow-lists" rather than enumerating known-bad values, so it stays closed against any future NHTSA `BodyClass` addition.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. (`SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` are already documented in `.env.example` from an earlier phase.)

## Next Phase Readiness

`decodeVin`, `readVinCache`, and `writeVinCache` are ready for orchestration by plan `03-06` (the `/api/vin/[vin]` Route Handler), which is expected to call `readVinCache` first, fall through to `decodeVin` on a miss, and call `writeVinCache` only on a `decoded` outcome (never on `no-data` or `unreachable`, per D-21).

**Signatures for 03-06:**
```ts
// src/lib/vin.ts
export const NHTSA_TIMEOUT_MS = 6000
export type VinDecodeOutcome =
  | { outcome: 'decoded'; modelYear: number; make: string; model: string; bodyClass: string; sizeBucket: SizeBucket | null; raw: unknown }
  | { outcome: 'no-data' }
  | { outcome: 'unreachable'; reason: 'timeout' | 'network' | 'http-error'; detail: string }
export function mapBodyClassToSizeBucket(bodyClass: string | null | undefined): SizeBucket | null
export function classifyNhtsaResult(result: Record<string, unknown>): VinDecodeOutcome
export async function decodeVin(vin: string): Promise<VinDecodeOutcome>

// src/lib/vin-cache.ts
export async function readVinCache(vin: string): Promise<VinCacheRow | null>
export async function writeVinCache(entry: { vin: string; modelYear: number; make: string; model: string; bodyClass: string; rawResponse: unknown }): Promise<void>

// src/lib/supabase/admin.ts
export function createAdminClient()
```

No blockers.

---
*Phase: 03-vin-estimate*
*Completed: 2026-08-04*

## Self-Check: PASSED

All created files verified present on disk:
- `src/lib/supabase/admin.ts`
- `src/lib/vin-cache.ts`
- `src/lib/vin.ts`
- `src/lib/vin.test.ts`
- `.planning/phases/03-vin-estimate/03-04-SUMMARY.md`

All commits verified present in `git log`:
- `00de99b` (Task 1)
- `e4e51d0` (Task 2)
- `07b43d3` (Task 3)
- `83b82be` (SUMMARY)
