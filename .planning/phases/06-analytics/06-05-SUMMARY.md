---
phase: 06-analytics
plan: 05
subsystem: analytics
tags: [verification, uat, supabase, analytics]
status: complete

requires:
  - phase: 06-analytics
    provides: "All four event producers from plans 06-01 through 06-04"
provides:
  - "Static gate results and write-site census for Phase 6"
  - "Runtime evidence: all four event types confirmed landing in analytics_events, including the D-15 two-branch VIN check"
affects: []

tech-stack:
  added: []
  patterns: []
---

# 06-05: End-to-End Analytics Verification — COMPLETE

**Status: COMPLETE.** All four event types are confirmed landing at runtime.

Read this document in order: the "Task 2" section below records the *interrupted
first attempt* (halted when the operator found the Visitors KPI defect that
became plan 06-06) and is kept for the audit trail. **The
"VERIFICATION COMPLETED" section at the bottom is the authoritative result** and
supersedes the partial findings above it. Three checks remain unexercised and
are listed there.

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

## Task 2: Human runtime verification — FIRST ATTEMPT (superseded below)

> **Historical record.** The table and gap list in this section reflect the state
> partway through verification. See "VERIFICATION COMPLETED" at the bottom of
> this file for the final result — all four event types passed.

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

---

## VERIFICATION COMPLETED — 2026-08-07 (supersedes the PARTIAL status above)

All four event types confirmed landing in `analytics_events`, verified by direct
service-role queries against the live database (`kyhvgskeihtccylpdkas`), not by
self-report.

| Event type | Rows | Verdict |
|---|---|---|
| `page_view` | 1 (1 distinct session, `page: "/"`) | PASS |
| `vin_search` | 4 | PASS |
| `contact_submit` | 1 (matching `contacts` row) | PASS |
| `booking_created` | 1 (matching `bookings` row) | PASS |

### D-15 — two-branch VIN check (the phase's highest-risk item): PASS

The same VIN submitted twice produced **two** `vin_search` rows, confirming BOTH
success branches fire — the fresh NHTSA decode (`route.ts:156`) and the
`vin_cache` early-return (`route.ts:71`). Proven independently twice:

| # | VIN | Timestamp | Source |
|---|---|---|---|
| 1 | `5XYP54HC8MG109196` | 20:50:13Z | operator, browser |
| 2 | `5XYP54HC8MG109196` | 20:50:48Z | operator, browser (cache hit) |
| 3 | `1HGCM82633A004352` | 20:53:46Z | curl against the Route Handler |
| 4 | `1HGCM82633A004352` | 20:53:49Z | curl (cache hit) |

Had only one branch been wired, the ADMIN-04 chart would have *dropped* as
caching improved — a silent failure. It does not.

### D-14 — invalid VIN: PASS
`00000000000000000` returned the manual-entry path and wrote **no** row.

### D-04 — taxonomy closed: PASS
Exactly four `event_type` values exist; no fifth appeared.

### Visitors KPI (06-06): PASS
Operator confirmed the card renders correctly. Every `page_view` row carries a
`session_id`; the card counts distinct sessions.

### Still NOT verified — carried forward

- **D-11 honeypot check.** A honeypot-filled contact submission must write
  neither a `contact_submit` row nor a `contacts` row. Never exercised — it
  requires un-hiding a hidden input via DevTools. The code path is confirmed by
  static inspection (`06-04-SUMMARY.md` records both honeypot early-returns as
  eventless) but has no runtime proof.
- **D-11 duplicate-booking check.** Re-booking a taken slot must write no
  `booking_created` row. Not exercised.
- **NULL-session exclusion against real data.** All current rows carry a
  session_id, so the exclusion branch never ran against live NULL rows. It is
  unit-tested and correct by inspection.

### Investigation note — a false alarm worth recording

Mid-verification the `page_view` rows read 0 and a raw-`fetch` probe returned
`42501 new row violates row-level security policy`, which was briefly reported as
an RLS defect. **That was wrong.** `pg_policies` confirms `public_insert_analytics`
(INSERT, role `public`, `WITH CHECK (true)`) is intact, and an insert through
`@supabase/supabase-js` with the anon key **succeeds**. The probe itself was
malformed. Lesson: reproduce through the application's real client path before
concluding a live-infrastructure defect exists.

### Test data left in the live database

The verification deliberately created real rows (accepted threat T-06-05-01):
1 `contacts` row, and **1 `bookings` row occupying a real appointment slot** —
the owner should remove that booking. Plus 7 `analytics_events` rows.
