---
phase: 03-vin-estimate
plan: 07
subsystem: ui
tags: [nextjs, react, fetch, vin, estimate, fallback]

# Dependency graph
requires:
  - phase: 03-vin-estimate
    provides: "EstimateResult, SegmentedControl/SegmentedControlItem, ESTIMATE_COPY from 03-05"
  - phase: 03-vin-estimate
    provides: "GET /api/vin/[vin] and GET /api/estimate Route Handlers, captured response bodies for all five statuses, from 03-06"
provides:
  - "ManualEntryForm: two-field (model year + vehicle type) fallback calling /api/estimate"
  - "EstimateSection rewired to a discriminated five-state view model (form, loading, result, not-found, manual) driven by real GET /api/vin/[vin] calls"
  - "Phase 2 placeholder (2024 Toyota Camry / $250-$400 / Estimates launching soon) fully removed from the codebase"
affects: [03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated union view state (EstimateViewState) replacing a boolean flag for a component with more than two render states"
    - "AnimatePresence mode=\"wait\" crossfade between form/manual/result branches inside a fixed-height snap card"
    - "Client fetch failure and application-level failure statuses both route through the same D-17 manual-fallback branch, never rendering raw error text (T-03-08)"

key-files:
  created:
    - "src/components/home/ManualEntryForm.tsx"
  modified:
    - "src/components/home/EstimateSection.tsx"

key-decisions:
  - "Treated a 'decoded' or 'needs-vehicle-type' response with a null vehicle/estimates payload as a defensive fallback to the manual form rather than a crash — the plan didn't specify this edge case explicitly, but the response contract in src/types/vehicle.ts allows vehicle/estimates to be null, and TypeScript's strict null checks require a branch"
  - "Consolidated the two lucide-react named imports (Info, Loader2) that were momentarily written as two separate import statements during editing into one line before committing, to keep the file lint-clean"

patterns-established:
  - "View-state-driven CardContent swap: exactly one of five branches renders at a time, matching D-07's 'replace inside the same card' requirement without any layout-shifting conditional stacking"

requirements-completed: [VIN-02, VIN-05, VIN-06]

# Metrics
duration: 45min
completed: 2026-08-05
---

# Phase 3 Plan 07: VIN Estimate End-to-End Wiring Summary

**Real VIN lookup wired into EstimateSection via GET /api/vin/[vin], branching into five distinct UI states (form, loading, result, not-found, manual), plus a new two-field ManualEntryForm serving the D-17 NHTSA-unreachable fallback.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- `ManualEntryForm.tsx` — two fields only (model year text input, `SegmentedControl` over the three D-02 size buckets), client-side year bounds validation, `fetch('/api/estimate?year=...')`, D-08-style spinner/disabled-input loading treatment, generic retry copy on any failure path, `finally`-guaranteed loading-flag reset
- `EstimateSection.tsx` rewired: `showResult` boolean replaced by a discriminated `EstimateViewState` union (`form` | `loading` | `result` | `not-found` | `manual`); `handleSubmit` is now async, keeps both original client-side validation messages verbatim, calls `GET /api/vin/${encodeURIComponent(vin)}`, and branches on all five `VinLookupResponse` statuses
- `VIN_REGEX` now imported from `@/types/vehicle` instead of a local redeclaration, so the browser check and the Route Handler's server-side check share one source of truth
- Phase 2 placeholder block (hardcoded `2024 Toyota Camry`, `$250 – $400`, "Estimates launching soon") deleted entirely — confirmed absent repo-wide
- Outer `<section>`/`<Image>`/overlay/`motion.div`/`Card`/`CardHeader`/`CardTitle` shell left byte-for-byte untouched per D-07; only `CardContent`'s state and markup changed
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm test` (33 tests) all exit 0 after both tasks

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the two-field manual entry fallback form** - `cd852bb` (feat)
2. **Task 2: Rewire EstimateSection to the real lookup with five view states** - `d469264` (feat)

**Plan metadata:** committed alongside this SUMMARY.md (worktree mode — orchestrator merges and finalizes)

## Files Created/Modified

- `src/components/home/ManualEntryForm.tsx` — New: `'use client'` component, `ManualEntryFormProps` with `onEstimate`/`onCancel`/`leadIn?`, model-year `useState<string>`, `SizeBucket` `useState` defaulting to `'car'`, submit handler validating year bounds against `MIN_MODEL_YEAR`..currentYear+1 before calling `/api/estimate`
- `src/components/home/EstimateSection.tsx` — Modified: `EstimateViewState` discriminated union, async `handleSubmit` calling `/api/vin/[vin]`, five-branch `CardContent` render wrapped in `AnimatePresence mode="wait"`, `handleReset` clearing VIN input and returning to the form view

## Decisions Made

- Guarded against a theoretically-possible but contractually-allowed `null` `vehicle`/`estimates` on the `'decoded'`/`'needs-vehicle-type'` statuses by falling back to the manual view rather than crashing — `VinLookupResponse`'s type allows this even though the Route Handler's actual implementation (per 03-06-SUMMARY.md) always populates both fields on these two statuses in practice
- Used a single combined `import { Info, Loader2 } from 'lucide-react'` statement (not two separate import lines) to match the codebase's existing named-import convention and keep the file lint-clean

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched the plan's interface notes and acceptance criteria on the first implementation pass; no Rule 1-4 auto-fixes were needed.

## Issues Encountered

None. The bash sandbox in this worktree rejects compound/piped shell commands as "too complex to verify," so multi-step verification (e.g. looping over five status strings, or backgrounding `npm run dev` with `&`) had to be split into individual `Grep`/`Bash` tool calls and the `run_in_background` parameter respectively — a tooling accommodation, not a code issue.

## Browser/API Verification (see plan's `<output>` request)

No interactive browser was available in this headless execution environment, so the five view states were verified two ways: (1) automated `npx tsc --noEmit` / `npm run lint` / `npm run build` / `npm test` (33 tests) all exit 0, confirming the component compiles, type-checks against `VinLookupResponse`/`ManualEstimateResponse`, and renders during static generation; (2) the dev server was started (`npm run dev`, background) and the underlying Route Handlers were exercised directly with `curl` to confirm the exact response shapes `EstimateSection.tsx`'s switch statement branches on:

- **`decoded`** — `GET /api/vin/1FTFW1E85NFA12345` returned `{"status":"decoded","vehicle":{"modelYear":2022,"make":"FORD","model":"F-150","sizeBucket":"suv-truck",...},"estimates":{...},"adasApplies":true}` — matches the `'decoded'` branch's field access (`data.vehicle.modelYear`, `.make`, `.model`, `.sizeBucket`) exactly.
- **`not-found`** — `GET /api/vin/ZZZZZZZZZZZZZZZZZ` returned `{"status":"not-found","vehicle":null,...}` — routes to `{ kind: 'not-found' }`, keeping the VIN form visible with the D-18 secondary manual-entry link, per plan.
- **`invalid`** — `GET /api/vin/short` returned HTTP 400 with `{"status":"invalid",...}` — `fetch` does not throw on non-2xx, so the body still parses and the `'invalid'` case (shared with `'not-found'`) fires correctly.
- **`manual`** (via `ManualEntryForm`'s own call) — `GET /api/estimate?year=2015` returned `{"status":"manual","modelYear":2015,"estimates":{"car":{"standard":{"low":270,"high":330,...}}},"adasApplies":false}`, matching D-06 row 1 exactly and satisfying `ManualEntryForm`'s success branch (`data.status === 'manual' && data.estimates !== null`).
- **`unreachable`** and **`needs-vehicle-type`** — not exercised live in this session (would require simulating an NHTSA outage or finding a motorcycle/trailer VIN, same limitation noted in `03-06-SUMMARY.md`); both branches were verified by direct source reading against the `VinLookupResponse` type contract and are structurally identical in shape to the exercised branches (`unreachable` has no vehicle/estimates payload and routes straight to `{ kind: 'manual' }`; `needs-vehicle-type` has the same vehicle/estimates shape as `decoded` but with `sizeBucket: null`, defaulting to `'car'` with `sizeBucketEditable: true`).
- The home page (`GET /`) returns HTTP 200 and its HTML contains "Get Your Free Estimate", confirming the section renders without a server error after the rewrite.

Plan `03-08` should re-verify all five states in an actual browser (the `<human-check>` block's seven numbered scenarios, including the 375×667 mobile pass and the DevTools offline simulation) since this session could not drive a real browser.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The estimate section is fully wired end-to-end: VIN entry → Route Handler → one of five UI states, with the Phase 2 placeholder completely removed
- `ManualEntryForm` and the `EstimateViewState` union are contained to `EstimateSection.tsx`'s module scope; nothing here blocks Phase 4's contact-page VIN search reuse of `EstimateResult`
- Outstanding verification: live browser confirmation of the `unreachable` and `needs-vehicle-type` code paths, and the full seven-scenario `<human-check>` walkthrough (including mobile viewport and DevTools offline simulation) — flagged for plan `03-08`
- No blockers

---
*Phase: 03-vin-estimate*
*Completed: 2026-08-05*
