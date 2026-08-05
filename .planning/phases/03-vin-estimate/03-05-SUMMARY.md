---
phase: 03-vin-estimate
plan: 05
subsystem: ui
tags: [react, base-ui, radiogroup, shadcn, tailwind, nextjs]

# Dependency graph
requires:
  - phase: 03-vin-estimate
    provides: EstimateMatrix/GlassType/SizeBucket contract from 03-02 (src/types/vehicle.ts)
provides:
  - "SegmentedControl / SegmentedControlItem shadcn-style primitive wrapping @base-ui/react radio-group + radio"
  - "ESTIMATE_COPY constant with all client-facing estimate copy (labels, hints, breakdown labels, disclaimer, failure messages)"
  - "EstimateResult presentational component: headline, live low/high range, four-row breakdown, glass selector, conditional vehicle-type selector, ADAS note, CTA, disclaimer, reset"
affects: [03-06, 03-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Segmented single-select control built on @base-ui/react RadioGroup + Radio.Root (not Radix) — generic over Value, className accepts state-function form for selected/unselected styling"
    - "Presentational result components stay free of fetch/pricing imports; all displayed numbers come from a precomputed matrix prop"

key-files:
  created:
    - src/components/ui/segmented-control.tsx
    - src/components/home/EstimateResult.tsx
  modified:
    - src/lib/constants.ts

key-decisions:
  - "Kept the D-10 ADAS note wording ('vehicles from 2018 or later...') exactly as specified even though it trips the acceptance-criteria pricing-literal grep as a false positive — the year appears only as descriptive prose, not a gating constant; see Deviations."

patterns-established:
  - "Segmented control primitive: generic <Value> component, RadioGroup wrapper carries container styling, Radio.Root children carry per-item state.checked-driven styling, no Radio.Indicator dot"

requirements-completed: [VIN-05, VIN-06, VIN-07]

# Metrics
duration: 25min
completed: 2026-08-04
---

# Phase 3 Plan 05: Segmented Control + EstimateResult Summary

**Mutually-exclusive segmented control on @base-ui/react radio primitives, plus a fully presentational EstimateResult card rendering a live price range, four-row breakdown, glass/vehicle-type selectors, ADAS notice, and phone-sourced disclaimer.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Built the project's first segmented/toggle selector (`SegmentedControl`/`SegmentedControlItem`), generic over value type, using `@base-ui/react/radio-group` + `@base-ui/react/radio` per the verified (non-Radix) interface documented in the plan
- Added `ESTIMATE_COPY` to `src/lib/constants.ts` with all glass/size labels, D-16 physically-observable hints, breakdown labels, ADAS note, disclaimer, and failure messages — no pricing value or gating constant included
- Built `EstimateResult.tsx`, a purely presentational component satisfying ROADMAP success criteria 2 (four-row breakdown), 3 (live glass selector), and 5 (2018+ ADAS notice) — it derives every number from the `estimates` prop and cannot import `@/lib/pricing`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add estimate copy to constants and build the segmented control primitive** - `6643e19` (feat)
2. **Task 2: Build the presentational EstimateResult component** - `0c1e240` (feat)

**Plan metadata:** (pending — this summary's commit)

## Files Created/Modified
- `src/lib/constants.ts` - Added `ESTIMATE_COPY` export alongside existing `BUSINESS`; no pricing/threshold literals
- `src/components/ui/segmented-control.tsx` - New: `SegmentedControl`/`SegmentedControlItem`, generic over `Value`, brand-red selected styling, radiogroup semantics via Base UI
- `src/components/home/EstimateResult.tsx` - New: presentational result card; `EstimateResultProps` interface with `headline`, `estimates`, `adasApplies`, `glassType`/`onGlassTypeChange`, `sizeBucket`/`onSizeBucketChange`, `sizeBucketEditable`, `basisNote?`, `onReset`

### Final `EstimateResultProps` member list (for plan 03-07, the sole caller)

```typescript
interface EstimateResultProps {
  headline: string
  estimates: EstimateMatrix
  adasApplies: boolean
  glassType: GlassType
  onGlassTypeChange: (value: GlassType) => void
  sizeBucket: SizeBucket
  onSizeBucketChange: (value: SizeBucket) => void
  sizeBucketEditable: boolean
  basisNote?: string
  onReset: () => void
}
```

### `SegmentedControl` / `SegmentedControlItem` prop names (for plan 03-07)

```typescript
// SegmentedControl<Value>
{ value, onValueChange, 'aria-label', className, children }

// SegmentedControlItem<Value>
{ value, className, children }
```
Both are generic over `Value`, so `SegmentedControl<GlassType>` and `SegmentedControl<SizeBucket>` type-check without casts.

## Decisions Made
- Followed the plan's explicit interface guidance for Base UI (not Radix): `RadioGroup` yields a scalar value/`onValueChange`; `Radio.Root` requires `value` and exposes `state.checked` via the function form of `className`. No `Radio.Indicator` rendered — selection is conveyed by the segment's own background per the plan.
- `ESTIMATE_COPY.breakdownLabels` uses key `adas` (not `adasNotice`/`adasRow`) for the fourth breakdown row label, matching the plan's D-09 "Camera recalibration" row description.
- Phone number rendered as a `tel:` link (`BUSINESS.phoneHref`) around `BUSINESS.phone` display text in the disclaimer, consistent with the existing `TopNav.tsx` pairing convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected export style to match acceptance-criteria literal grep**
- **Found during:** Task 1 verification
- **Issue:** Initial implementation used `function SegmentedControl(...) { ... }` plus a trailing `export { SegmentedControl, SegmentedControlItem }`, which functionally satisfies "export function X" in spirit but fails the acceptance criterion's literal grep for `export function SegmentedControl` / `export function SegmentedControlItem`.
- **Fix:** Changed both to inline `export function SegmentedControl<Value>(...)` / `export function SegmentedControlItem<Value>(...)` declarations.
- **Files modified:** `src/components/ui/segmented-control.tsx`
- **Verification:** `grep -c "export function SegmentedControl"` and `grep -c "export function SegmentedControlItem"` both return 1; `tsc`/`lint`/`build` all pass.
- **Committed in:** `6643e19` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — export style)
**Impact on plan:** Cosmetic/structural only; no behavior change. No scope creep.

## Issues Encountered

- **Acceptance-criteria heuristic false positive (not fixed — documented per plan intent):** The plan's Task 1 acceptance criteria include a grep for pricing literals/year threshold (`\b(300|250|75|150|2018)\b`) expected to return 0 in `src/lib/constants.ts`. The plan's own Task 1 action text explicitly mandates the `adasNote` copy read "vehicles from 2018 or later often have a camera mounted behind the windshield..." (D-10), which necessarily contains the digit sequence `2018`. This produces exactly one match — the `2018` inside the prose sentence, not a gating constant or comparison operand. The actual threat this criterion guards against (T-03-03: no pricing formula or gating logic in the client bundle) is not violated: `2018` appears only as descriptive text; the real gating decision is the `adasApplies` boolean passed in as a prop, computed server-side. Same situation recurs in `EstimateResult.tsx` Task 2, where the digit `2018` appears only inside a JSX comment (`{/* 6. ADAS info note — only for 2018+ vehicles... */}`), which the acceptance criteria's own grep pattern (`grep -v '^\s*[/*]|^\s*\*'`) explicitly excludes from the count — that check passed cleanly (0 matches in executable lines). Kept the D-10-mandated wording as written; flagging this here rather than silently weakening the required copy.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 03-07 (or whichever plan wires `EstimateSection.tsx` to the real VIN flow) can now import `EstimateResult`, `SegmentedControl`/`SegmentedControlItem`, and `ESTIMATE_COPY` directly — all three are typed, build-clean, and satisfy ROADMAP success criteria 2/3/5 in isolation once fed a real `EstimateMatrix`.
- No blockers. `EstimateResult` takes no data-fetching responsibility, so its wiring is orthogonal to the Route Handler / `lib/pricing.ts` / `lib/vin.ts` work tracked in sibling plans of this same phase.

---
*Phase: 03-vin-estimate*
*Completed: 2026-08-04*
