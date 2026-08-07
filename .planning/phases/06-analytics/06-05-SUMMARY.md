---
phase: 06-analytics
plan: 05
subsystem: analytics
tags: [verification, uat, supabase, analytics]
status: partial

requires:
  - phase: 06-analytics
    provides: "All four event producers from plans 06-01 through 06-04"
provides:
  - "Static gate results and write-site census for Phase 6"
  - "Partial runtime evidence: page_view and contact_submit confirmed landing; vin_search and booking_created NOT exercised"
affects: []

tech-stack:
  added: []
  patterns: []
---

# 06-05: End-to-End Analytics Verification — PARTIAL

**Status: PARTIAL.** Task 1 (static gate + census) passed in full. Task 2 (human
runtime verification) was **interrupted mid-run** when the operator found the
Visitors KPI defect that became plan 06-06. Two of the four event types were
never exercised. Task 3's consolidated write-up is superseded by this record.

## Task 1: Static gate and write-site census — PASSED

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run` | 124/124 across 13 files (120/12 at the time of the original run; 06-06 added 4) |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |

### Write-site census

| Census check | Expected | Observed | Verdict |
|---|---|---|---|
| Event-type literals confined to the contract | only `events.ts` + `events.test.ts` | exactly those two | PASS |
| `EVENT_TYPE_` private consts (the STATE.md blocker) | none | none | PASS |
| Tracking call sites | 5, split 2/1/1/1 | 5 | PASS |
| `book/page.tsx` tracking calls (D-16) | 0 | 0 | PASS |
| `PageViewTracker` under `(admin)` (D-06) | absent | only in `(public)/layout.tsx` | PASS |

Call sites: `api/vin/[vin]/route.ts:71` and `:156` (VIN_SEARCH, both success
branches), `PageViewTracker.tsx:45` (PAGE_VIEW), `booking-actions.ts:121`
(BOOKING_CREATED), `contact-actions.ts:73` (CONTACT_SUBMIT).

## Task 2: Human runtime verification — PARTIAL

Interrupted when the operator reported the Visitors KPI reading 1 → 2 → 3 across
Home → About → Contact. That defect was triaged and fixed in plan 06-06.

Live table state as of 2026-08-07 (queried directly, not self-reported):

| Event type | Rows observed | Verified? |
|---|---|---|
| `page_view` | 4 (2 distinct sessions) | YES — confirmed landing, with correct `page` values |
| `contact_submit` | 1 | YES — confirmed landing |
| `vin_search` | 0 | **NO — never exercised** |
| `booking_created` | 0 | **NO — never exercised** |

### Checks explicitly NOT performed

These remain unverified and must not be described as passing:

- **D-15 two-branch VIN check** — the plan's own highest-risk item. The same VIN
  submitted twice must produce two `vin_search` rows (one fresh decode, one
  `vin_cache` hit). If only one branch were wired, the ADMIN-04 chart would
  *drop* as caching improved — a silent failure. Static census confirms two call
  sites exist at `route.ts:71` and `:156`, but neither has been observed firing
  at runtime.
- **D-14 invalid-VIN check** — an invalid VIN must produce no row.
- **D-11 honeypot check** — a honeypot-filled contact submission must produce
  neither a `contact_submit` row nor a `contacts` row.
- **D-11 duplicate-booking check** — re-booking a taken slot must produce no
  `booking_created` row.
- **ADMIN-04 VIN-search chart** — cannot render data while `vin_search` has zero
  rows.
- **ADMIN-05 card cross-check and the no-regression sweep.**

## Consequences for the phase

Phase 6's code is complete and every static check passes. Runtime proof covers
half the event taxonomy. The two unverified producers are exactly the ones whose
failure mode is silent (an empty chart rather than an error), which is the risk
this plan existed to eliminate.

To close the gap, exercise a VIN search twice with the same VIN, then a booking,
and confirm both charts populate.

## Notes

- The STATE.md blocker "Analytics `event_type` literals need Phase 06
  reconciliation" is **closed** — `dashboard-queries.ts` imports
  `ANALYTICS_EVENTS` from `src/lib/analytics/events.ts`, so a producer/consumer
  mismatch is now a compile error rather than a silently empty chart.
- The Visitors card counts **distinct browser sessions** (per 06-06), not page
  views and not unique people. A new tab or a later visit counts again. No
  downstream copy may describe it as unique visitors.
- `PageViewTracker` is covered by manual UAT only. This repo still has zero
  component-test infrastructure (no `@testing-library/react`, no jsdom, no
  `@vitejs/plugin-react`); `vitest.config.mts` includes only `src/**/*.test.ts`.
  Pre-existing standing gap, not introduced by this phase.
- The four-event taxonomy is closed at `page_view`, `vin_search`,
  `contact_submit`, `booking_created` (D-04). `events.ts` is the seam if a fifth
  is ever added.
- `metadata` is `null` on every row this phase writes (D-02).
- Failed VIN searches (`not-found`, `unreachable`) are deliberately untracked
  (D-14).
