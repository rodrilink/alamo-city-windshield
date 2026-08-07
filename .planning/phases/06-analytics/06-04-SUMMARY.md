---
phase: 06-analytics
plan: 04
subsystem: analytics
tags: [supabase, nextjs, typescript, server-actions, analytics-events]

# Dependency graph
requires:
  - phase: 06-analytics
    provides: "06-01: ANALYTICS_EVENTS/AnalyticsEventType contract (src/lib/analytics/events.ts) and the awaited-and-swallowed trackServerEvent/trackBrowserEvent helpers (src/lib/analytics/track-event.ts)"
provides:
  - "contact_submit fired inside createContact on the confirmed-insert success path only (ANLY-04)"
  - "booking_created fired inside createBooking on the confirmed-insert success path only, past both the '23505' race and the generic error branch (ANLY-05)"
affects: [06-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-on-confirmed-success placement: the tracking call sits on the single line between the last error-branch check and the success return, never inside try-adjacent honeypot/validation/catch branches"

key-files:
  created: []
  modified:
    - src/lib/contact/contact-actions.ts
    - src/lib/booking/booking-actions.ts

key-decisions:
  - "Both calls pass a single argument (no page/vin) per D-02 -- neither event uses those columns"
  - "No redirect() introduced -- both actions continue to return state to useActionState callers exactly as before"

patterns-established: []

requirements-completed: [ANLY-04, ANLY-05, ANLY-06]

# Metrics
duration: 12min
completed: 2026-08-07
---

# Phase 6 Plan 4: Contact & Booking Conversion Tracking Summary

**`contact_submit` and `booking_created` events fired from inside the existing `createContact`/`createBooking` Server Actions, strictly past every error branch and immediately before each action's success return, using the wave-1 `trackServerEvent`/`ANALYTICS_EVENTS` contract with no new endpoint and no change to either action's returned state.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-07T17:34:00Z (approx, per prior wave completion)
- **Completed:** 2026-08-07T17:46:03Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- `createContact` (`src/lib/contact/contact-actions.ts`) now fires exactly one `await trackServerEvent(ANALYTICS_EVENTS.CONTACT_SUBMIT)` at line 73, immediately before `return { status: 'success', values }`, past the insert's `if (error)` check.
- `createBooking` (`src/lib/booking/booking-actions.ts`) now fires exactly one `await trackServerEvent(ANALYTICS_EVENTS.BOOKING_CREATED)` at line 121, immediately before `return { status: 'success', values }`, past both the `'23505'` slot-taken branch and the generic `if (error)` branch.
- Both honeypot early-returns remain completely eventless — verified by a `node -e` check that no `trackServerEvent(` substring appears anywhere before either file's `values.honeypot !== ''` check.
- The `'23505'` slot-taken race in `createBooking` remains eventless — verified the call site's index is strictly after that branch's index in the source.
- Neither action's returned state shape changed: `return {` count is unchanged at 5 (contact) and 7 (booking).

## Task Commits

Each task was committed atomically:

1. **Task 1: Fire contact_submit on createContact's real success path** - `379999b` (feat)
2. **Task 2: Fire booking_created on createBooking's real success path** - `6a6270f` (feat)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — orchestrator merges and finalizes STATE.md/ROADMAP.md centrally)

## Files Created/Modified

- `src/lib/contact/contact-actions.ts` - Added `trackServerEvent`/`ANALYTICS_EVENTS` imports; added one awaited `contact_submit` call at line 73, past the insert's error check, before the success return. Everything else (honeypot branch, Zod validation, insert-error branch, catch block, all five `return {` statements) unchanged.
- `src/lib/booking/booking-actions.ts` - Added `trackServerEvent`/`ANALYTICS_EVENTS` imports; added one awaited `booking_created` call at line 121, past both the `'23505'` and generic error branches, before the success return. Everything else (honeypot branch, Zod validation, slot-legality rejection, both error branches, catch block, all seven `return {` statements) unchanged.

## Enumerated Error Branches (evidence both events fire success-path-only)

### `createContact` (5 return points, 1 fires)

| Branch | Fires? | Verified by |
|---|---|---|
| Honeypot (`values.honeypot !== ''`) → `{ status: 'success' }`, no insert | NO | `trackServerEvent(` absent from source slice before honeypot check index |
| Zod validation failure → `{ status: 'error', fieldErrors }` | NO | Call site index is after `createContact: insert failed` log, which is emitted only inside the try block after Zod already passed |
| Post-insert `if (error)` → `{ status: 'error' }` | NO | Call site index > `createContact: insert failed` string index |
| Post-insert, no error → `{ status: 'success', values }` | **YES** | Line 73, immediately preceding this return |
| `catch` block → `{ status: 'error' }` | NO | Call site index (`lastIndexOf`) < `createContact: unexpected error` string index |

### `createBooking` (7 return points, 1 fires)

| Branch | Fires? | Verified by |
|---|---|---|
| Honeypot (`values.honeypot !== ''`) → `{ status: 'success' }`, no insert | NO | `trackServerEvent(` absent from source slice before honeypot check index |
| Zod validation failure → `{ status: 'error', fieldErrors }` | NO | Occurs before the `try` block containing the call entirely |
| `isLegalSlot` rejection → `{ status: 'error' }` | NO | Occurs before the `try` block containing the call entirely |
| `error?.code === '23505'` → `{ status: 'slot-taken' }` | NO | Call site index > `'23505'` branch index |
| Generic `if (error)` → `{ status: 'error' }` | NO | Call site index > `createBooking: insert failed` string index |
| Past both error branches → `{ status: 'success', values }` | **YES** | Line 121, immediately preceding this return |
| `catch` block → `{ status: 'error' }` | NO | Call site index (`lastIndexOf`) < `createBooking: unexpected error` string index |

## D-11 Confirmation

- **`createContact` honeypot branch (lines 34-37):** eventless. No code was added above or inside it; `trackServerEvent(` does not appear before the honeypot check anywhere in the file.
- **`createBooking` honeypot branch (lines 60-64):** eventless. Same verification, no code above or inside it.
- **`createBooking` `'23505'` slot-taken branch (lines 108-110):** eventless. The call site's string index in the file is strictly greater than the `'23505'` branch's index, confirming it sits after (not inside or before) that branch.

## Decisions Made

- Both `trackServerEvent` calls pass a single argument with no `page`/`vin` fields, per D-02 — neither `contact_submit` nor `booking_created` uses those columns.
- No deviations from the plan's specified call-site placement, signatures, or comment content.

## Deviations from Plan

None - plan executed exactly as written. Both call sites were placed at the exact positions specified in the plan and 06-PATTERNS.md, using the exact `trackServerEvent`/`ANALYTICS_EVENTS` signatures fixed by 06-01. No `redirect()` was introduced. All acceptance-criteria grep/node checks specified in the plan passed on the first implementation pass; no auto-fixes were required.

## Issues Encountered

None.

## Verification Results

- `npx tsc --noEmit` — exits 0.
- `npx vitest run` — 12 test files, 120 tests, all passing (unchanged from wave 1's baseline — this plan added no new test files).
- `npx eslint src/lib/contact/contact-actions.ts src/lib/booking/booking-actions.ts` — exits 0.
- `npm run build` — exits 0. Route `/admin` logs expected `DYNAMIC_SERVER_USAGE` console output during static-generation probing (pre-existing behavior from the `cookies()`-gated admin layout, unrelated to this plan's changes) but the build completes successfully with all 10 routes compiled.
- `grep -rn "ANALYTICS_EVENTS.CONTACT_SUBMIT\|ANALYTICS_EVENTS.BOOKING_CREATED" src/ --include=*.ts` — matches only `src/lib/analytics/events.test.ts`, `src/lib/contact/contact-actions.ts`, and `src/lib/booking/booking-actions.ts`, confirming exactly one write call site per event type repo-wide.
- Both files retain their `'use server'` directive on line 1 and their exact prior `console.error` call shapes.

## User Setup Required

None - no external service configuration required. No new dependency was installed.

## Next Phase Readiness

- Plan 06-05's manual checkpoint can now exercise both events end-to-end: a real contact submission should produce exactly one `contact_submit` row, a real booking should produce exactly one `booking_created` row, and a honeypot-triggered submission of either form should produce zero new `analytics_events` rows despite returning `status: 'success'` to the caller.
- No blockers. All four Phase 6 write sites (page_view from 06-02, vin_search from 06-03, contact_submit and booking_created from this plan) are now implemented against the shared 06-01 contract.

## Self-Check: PASSED

- FOUND: `src/lib/contact/contact-actions.ts`
- FOUND: `src/lib/booking/booking-actions.ts`
- FOUND: `.planning/phases/06-analytics/06-04-SUMMARY.md`
- FOUND commit: `379999b`
- FOUND commit: `6a6270f`

---
*Phase: 06-analytics*
*Completed: 2026-08-07*
