---
phase: 03-vin-estimate
plan: 02
subsystem: infra
tags: [vitest, testing, types, contract, server-only]

# Dependency graph
requires: [03-01]
provides:
  - "Working `npm test` / `npm run test:watch` commands via Vitest"
  - "vitest.config.mts with server-only alias stub and @ path alias"
  - "src/types/vehicle.ts — the shared VIN/estimate response contract"
affects: [03-03, 03-04, 03-05, 03-06, 03-07, 03-08]

# Tech tracking
tech-stack:
  added: ["server-only@0.0.1 (prod)", "vitest@4.1.10 (dev)"]
  patterns:
    - "resolve.alias (not resolve.conditions) to stub server-only under Vitest"
    - ".mts extension for Vite/Vitest config files in a CommonJS-default repo"
    - "Shared client-safe contract module (src/types/vehicle.ts) with no server-only import and no pricing literals, enforced by grep-based acceptance criteria"

key-files:
  created:
    - vitest.config.mts
    - src/test/server-only-stub.ts
    - src/types/vehicle.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "VIN_REGEX and isValidVin moved (not duplicated) from EstimateSection.tsx into src/types/vehicle.ts; EstimateSection.tsx itself is left untouched here per plan 03-07's ownership"
  - "EstimateMatrix is a full 3x3 Record<SizeBucket, Record<GlassType, EstimateVariant>> rather than three variants, so both the glass toggle and the D-19 vehicle-type selector are zero-latency client state"

requirements-completed: [VIN-04, VIN-05, VIN-06]

# Metrics
duration: 12min
completed: 2026-08-04
---

# Phase 03: VIN Estimate — Plan 02 Summary

**Stood up a working Vitest test harness (with a resolve.alias stub for the throwing `server-only` package) and defined the single shared contract — `src/types/vehicle.ts` — that every downstream Route Handler and UI plan in this phase imports.**

## Performance

- **Duration:** 12 min
- **Tasks:** 2
- **Files modified:** 5 (2 created new config/stub files, 1 created contract file, package.json + package-lock.json modified)

## Accomplishments

- Installed `server-only` (prod) and `vitest` (dev) per the human approval recorded in `03-01-SUMMARY.md`
- Added `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `package.json`
- Created `vitest.config.mts` using `resolve.alias` (not `resolve.conditions`, which planning verified does not work) to stub `server-only` and to resolve the `@` path alias, matching `tsconfig.json`
- Created `src/test/server-only-stub.ts`, a no-op ES module replacement for the real package's unconditional throw
- Created `src/types/vehicle.ts` exporting `GlassType`, `SizeBucket`, `VinLookupStatus`, `GLASS_TYPES`, `SIZE_BUCKETS`, `MIN_MODEL_YEAR`, `VIN_REGEX`, `isValidVin`, `EstimateBreakdown`, `EstimateVariant`, `EstimateMatrix`, `DecodedVehicle`, `VinLookupResponse`, `ManualEstimateResponse`, `VinCacheRow` (15 exports)
- Verified via grep that no pricing literal (`300`, `250`, `75`, `150`, `100`, `200`, `0.9`, `1.1`, `2018`) and no `server-only` import appear outside comments in `src/types/vehicle.ts`

## Final Exported Symbol List — `src/types/vehicle.ts`

Plans `03-03` through `03-07` import from `@/types/vehicle`:

- `GlassType` (type) — `'standard' | 'acoustic' | 'heated'`
- `SizeBucket` (type) — `'car' | 'suv-truck' | 'van-oversized'`
- `VinLookupStatus` (type) — `'decoded' | 'needs-vehicle-type' | 'not-found' | 'unreachable' | 'invalid'`
- `GLASS_TYPES` (const, `readonly GlassType[]`) — `['standard', 'acoustic', 'heated']`
- `SIZE_BUCKETS` (const, `readonly SizeBucket[]`) — `['car', 'suv-truck', 'van-oversized']`
- `MIN_MODEL_YEAR` (const) — `1981`
- `VIN_REGEX` (const, `RegExp`) — `/^[A-HJ-NPR-Z0-9]{17}$/`
- `isValidVin(value: string): boolean` (function)
- `EstimateBreakdown` (interface) — `basePrice`, `sizeModifier`, `glassModifier`, `adasHigh`
- `EstimateVariant` (interface) — `low`, `high`, `breakdown: EstimateBreakdown`
- `EstimateMatrix` (type) — `Record<SizeBucket, Record<GlassType, EstimateVariant>>`
- `DecodedVehicle` (interface) — `vin`, `modelYear`, `make`, `model`, `bodyClass`, `sizeBucket`
- `VinLookupResponse` (interface) — body of `GET /api/vin/[vin]`
- `ManualEstimateResponse` (interface) — body of `GET /api/estimate?year=YYYY`
- `VinCacheRow` (interface) — mirrors the `vin_cache` table (`model_year` is `string | null`)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. `npm audit` reports pre-existing vulnerabilities in transitive dependencies (unrelated to `server-only`/`vitest`); out of scope for this plan and not introduced by it.

## User Setup Required

None.

## Verification Results

- `npx vitest run --passWithNoTests` — exits 0, no `server-only` error
- `npx tsc --noEmit` — exits 0
- `npm run lint` — exits 0
- `npm run build` — exits 0 (Next.js production build compiles successfully with the new root `vitest.config.mts` and `src/test/` present)

## Next Phase Readiness

- `npm test` is now a real command backed by Vitest
- `src/types/vehicle.ts` is the single source of truth for the VIN lookup and estimate response shapes — no ambiguity remains for the Route Handler plans (`03-03`–`03-06`) or the UI plan (`03-07`)
- `EstimateSection.tsx` was intentionally left unmodified in this plan; its `VIN_REGEX` duplicate will be removed in `03-07` when it switches to importing from `@/types/vehicle`

---
*Phase: 03-vin-estimate*
*Completed: 2026-08-04*
