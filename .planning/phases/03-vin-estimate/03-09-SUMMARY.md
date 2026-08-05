---
phase: 03-vin-estimate
plan: 09
subsystem: frontend
tags: [gap-closure, estimate-ui, state-derivation, deferred-test-infra]
status: partial

# Dependency graph
requires: [03-07]
provides:
  - "Manual-entry result headline derived from the same live sizeBucket state that drives pricing"
affects: [03-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derive a displayed label from the same state read that produces the number it labels, rather than passing a precomputed string, so the two cannot drift"

key-files:
  created: []
  modified:
    - src/components/home/EstimateResult.tsx
    - src/components/home/EstimateSection.tsx

key-decisions:
  - "`headlineFollowsSizeBucket` is a dedicated boolean rather than reusing `sizeBucketEditable`. The D-19 needs-vehicle-type path also sets `sizeBucketEditable: true` but carries a real decoded make/model, so reusing that flag would have made '2022 Ford F-150' mutate into '2022 SUV or Truck' when the user corrected the size bucket — trading the reported bug for a worse one."
  - "Task 2 (render regression test) deferred rather than executed: it requires @testing-library/react, jsdom, @vitejs/plugin-react and a Vitest config change. This project has zero component-test infrastructure — all 33 existing tests are pure-function tests — so adding it is a dependency decision, not part of a bug fix. User deferred it explicitly."

requirements-completed: [VIN-05, VIN-06]

# Metrics
duration: ~15min (Task 1, executed out-of-band via /gsd-fast)
completed: 2026-08-05
---

# Plan 03-09 Summary — Manual-Path Vehicle Label

## Status: PARTIAL — Task 1 complete, Task 2 deferred

## What was built

**Task 1 — Derive the manual-path vehicle label from live `sizeBucket` state. COMPLETE.**

Shipped in commit `c3eb37f`, executed inline via `/gsd-fast` rather than through this plan's
executor. The work matches this plan's Task 1 specification.

`EstimateResult` previously received `headline` as a precomputed string prop while `sizeBucket`
was separate live state. Pricing read the live state (`estimates[sizeBucket][glassType]`), so it
repriced on selector change, but the headline was a frozen string the caller built once. On the
manual path `EstimateSection` built it from `chosenBucket` at submit time, so the label stayed
pinned to the originally-submitted type while the selector and price moved on — the user could see
"2015 Car" above a Van price.

The fix adds a `headlineFollowsSizeBucket` boolean prop. On the D-20 manual path the caller now
passes the model year alone and `EstimateResult` appends `ESTIMATE_COPY.sizeLabels[sizeBucket]`
from the same `sizeBucket` read that indexes the price, so label and price cannot diverge. Both
decoded paths pass `false` and keep their literal decoded make/model.

**Task 2 — Render regression test. DEFERRED, not executed.**

The test would need four or more new dev dependencies (`@testing-library/react`, `jsdom`,
`@vitejs/plugin-react`, `@testing-library/jest-dom`) plus a `vitest.config.mts` environment
change. This project has no component-test infrastructure; all 33 existing tests are
pure-function tests. Installing a test stack is a dependency decision rather than part of a bug
fix, so it was raised to the user and explicitly deferred.

**Consequence to be aware of:** the headline/price agreement is currently protected only by
manual UAT, not by an automated test. If someone reintroduces a precomputed headline, nothing in
`npm test` will catch it.

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 33/33 pass |
| Live API check | `/api/estimate?year=2015` returns car 270/330, van-oversized 405/495 |
| UAT test 10 | **PASS** — user re-tested in-browser at 824px height and confirmed the headline follows the selector to "2015 Van" together with the $405 – $495 range |
| UAT decoded-path non-regression | VIN `1FTFW1E85NFA12345` still reads "2022 Ford F-150" |

## Deviations from Plan

**Task 1 executed out-of-band.** The user asked for the fix inline via `/gsd-fast` while this
plan's own executor had not yet run, because the bug was blocking their UAT session. The change
follows this plan's Task 1 spec, including the `headlineFollowsSizeBucket` discriminator and the
explicit protection of both decoded paths. No executor was dispatched for this plan.

**Task 2 not attempted.** See above — deferred by user decision, not a failure.

## Known Stubs

None. No placeholder or stub code was introduced.

## Follow-up

If component-test infrastructure is added later, Task 2 of `03-09-PLAN.md` remains a valid,
self-contained specification for the regression test. It asserts that changing `sizeBucket` on a
manual result updates both the price range and the rendered vehicle label together, and that the
decoded-VIN headline does NOT follow the selector.

## Self-Check: PASSED (partial scope)

- FOUND: `headlineFollowsSizeBucket` in src/components/home/EstimateResult.tsx (3 occurrences)
- FOUND: `headlineFollowsSizeBucket` in src/components/home/EstimateSection.tsx (5 occurrences)
- CONFIRMED: `sizeLabels[chosenBucket]` no longer present in EstimateSection.tsx (frozen headline gone)
- CONFIRMED: no `@/lib/pricing` import in either client component (T-03-03 holds)
- FOUND commit c3eb37f: fix(03): derive manual-path vehicle label from live sizeBucket state
- NOT DONE (deferred by user): src/components/home/EstimateResult.test.tsx and its dependencies
