---
phase: 03-vin-estimate
plan: 03
subsystem: pricing
tags: [pricing, formula, server-only, vitest, business-logic]

# Dependency graph
requires:
  - phase: 03-vin-estimate
    provides: "src/types/vehicle.ts contract, Vitest harness with server-only alias stub (plan 03-02)"
provides:
  - "src/lib/pricing.ts — server-only pricing formula module (PRICING constant, adasApplies, computeVariant, computeEstimateMatrix)"
  - "All six D-06 locked worked examples reproduced exactly and pinned as regression tests"
affects: [03-06, 03-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "server-only marker as first line of a pricing/business-data module (D-15 enforcement)"
    - "as const flat-object-literal for locked pricing constants, matching BUSINESS in src/lib/constants.ts"
    - "Math.round applied to the ±10% spread before any additive term (ADAS) is applied"

key-files:
  created:
    - src/lib/pricing.ts
    - src/lib/pricing.test.ts
  modified: []

key-decisions:
  - "Combined the `@/types/vehicle` type and value imports into a single import statement so pricing.ts has exactly 2 top-level imports total (server-only + @/types/vehicle), matching the plan's acceptance criterion precisely"

requirements-completed: [VIN-04, VIN-07]

# Metrics
duration: 15min
completed: 2026-08-04
---

# Phase 03: VIN Estimate — Plan 03 Summary

**Server-only pricing formula module (`src/lib/pricing.ts`) reproducing all six locked D-06 worked examples exactly, with 16 passing Vitest assertions pinning the formula, half-up rounding, and the ADAS boundary.**

## Performance

- **Duration:** 15 min
- **Tasks:** 2
- **Files modified:** 2 (both created new)

## Accomplishments

- Created `src/lib/pricing.ts` with `import 'server-only'` as line 1, exporting `PRICING` (as const), `adasApplies`, `computeVariant`, and `computeEstimateMatrix`
- Verified the formula against all six D-06 fixtures by hand before committing (all six passed)
- Created `src/lib/pricing.test.ts` with 16 tests across five `describe` blocks: locked fixtures, rounding contract, ADAS boundary, matrix shape, and breakdown consistency
- `npm test`, `npx tsc --noEmit`, and `npm run lint` all exit 0

## Exact Signatures (for plan 03-06)

```typescript
export const PRICING: {
    readonly basePrice: 300
    readonly sizeModifiers: { readonly car: 0; readonly 'suv-truck': 75; readonly 'van-oversized': 150 }
    readonly glassModifiers: { readonly standard: 0; readonly acoustic: 100; readonly heated: 200 }
    readonly adasHighAdd: 250
    readonly adasMinModelYear: 2018
    readonly spreadLow: 0.9
    readonly spreadHigh: 1.1
}

export function adasApplies(modelYear: number): boolean

export function computeVariant(
    modelYear: number,
    sizeBucket: SizeBucket,
    glassType: GlassType
): EstimateVariant // { low: number; high: number; breakdown: EstimateBreakdown }

export function computeEstimateMatrix(modelYear: number): EstimateMatrix // Record<SizeBucket, Record<GlassType, EstimateVariant>>
```

All three functions and `PRICING` are imported from `@/lib/pricing`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement the pricing formula as a server-only pure module** - `83f791e` (feat)
2. **Task 2: Encode the six D-06 fixtures plus rounding and ADAS-boundary tests** - `5fd875c` (test)

**Plan metadata:** committed alongside this SUMMARY.md (worktree mode — orchestrator merges and finalizes)

_Note: Plan tasks are ordered implementation-first, tests-second per the plan's own task sequencing (the formula was hand-verified against all six D-06 fixtures during planning before Task 1's `<action>` was written). This is the plan as authored, not a deviation from RED-GREEN TDD ordering._

## Files Created/Modified

- `src/lib/pricing.ts` - Server-only pricing formula module: `PRICING` constant (D-01..D-05), `adasApplies`, `computeVariant`, `computeEstimateMatrix`
- `src/lib/pricing.test.ts` - 16 Vitest assertions: six D-06 fixtures, rounding contract, ADAS boundary, matrix shape, breakdown consistency

## Decisions Made

- Combined the `@/types/vehicle` type-only and value imports into one `import { ... , type ... } from '@/types/vehicle'` statement. The plan's acceptance criteria required exactly 2 top-level import lines in `pricing.ts` (the `server-only` marker plus one `@/types/vehicle` import); a separate `import type` line would have produced 3.

## Deviations from Plan

None — plan executed exactly as written. The import-statement combination above was necessary to satisfy the plan's own acceptance criterion (`grep -cE "^import" src/lib/pricing.ts` returns exactly 2) rather than a deviation from what the plan specified.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification Results

- `npm test` — exits 0, 16 tests passing (0 failing), exceeding the plan's ≥12 requirement
- `npx tsc --noEmit` — exits 0
- `npm run lint` — exits 0
- `head -1 src/lib/pricing.ts` — exactly `import 'server-only'`
- `grep -cE "^import" src/lib/pricing.ts` — returns 2
- `grep -c "as const" src/lib/pricing.ts` — returns 1
- `grep -vE '^\s*(//|/\*|\*)' src/lib/pricing.ts | grep -c "process.env\|fetch(\|createClient"` — returns 0 (no I/O, no env access)
- `grep -vE '^\s*(//|/\*|\*)' src/lib/pricing.test.ts | grep -c "995"` — returns 0 (typo value never asserted)
- `grep -rn "lib/pricing" src/components/ src/app/` — returns nothing (no premature component/route coupling)
- Manually verified all six D-06 rows reconcile with the implemented formula before committing

## Next Phase Readiness

- `src/lib/pricing.ts` is ready to be called from the Route Handlers in plan `03-06` via `computeEstimateMatrix(modelYear)` and `adasApplies(modelYear)`
- The `server-only` marker guarantees any accidental Client Component import of this module fails the Next.js build (D-15), to be exercised for real (not the test stub) in the `npm run build` verification of plans `03-05`/`03-07`
- No blockers or concerns

---
*Phase: 03-vin-estimate*
*Completed: 2026-08-04*

## Self-Check: PASSED

- FOUND: src/lib/pricing.ts
- FOUND: src/lib/pricing.test.ts
- FOUND: 83f791e (Task 1 commit)
- FOUND: 5fd875c (Task 2 commit)
