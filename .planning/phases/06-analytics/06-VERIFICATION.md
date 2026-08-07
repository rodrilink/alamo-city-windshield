---
phase: 06-analytics
verified: 2026-08-07T22:15:00Z
status: human_needed
score: 6/6 must-haves verified (code + runtime), 3 human-verify items outstanding
overrides_applied: 0
human_verification:
  - test: "Honeypot-filled contact submission produces no new analytics row"
    expected: "Submitting the contact form with the hidden honeypot field populated returns status: 'success' (to fool the bot) but writes zero rows to both contacts and analytics_events"
    why_human: "Requires DevTools to un-hide a hidden form field and submit through the real browser client; static code inspection confirms the call site is correctly gated past the honeypot early-return, but this specific behavior was never exercised at runtime per the task's own runtime_evidence notes"
  - test: "Re-booking an already-taken slot produces no new booking_created row"
    expected: "Attempting to book a slot that already has a confirmed booking returns status: 'slot-taken' and writes zero new rows to bookings or analytics_events"
    why_human: "Requires two sequential real booking submissions against the same slot through the UI; static inspection confirms the tracking call sits strictly after the '23505' branch, but this was never exercised at runtime per the task's own runtime_evidence notes"
  - test: "NULL session_id rows are excluded from the Visitors KPI and chart without crashing"
    expected: "A page_view row with session_id IS NULL (pre-migration row, or a visitor with sessionStorage unavailable) does not inflate, crash, or otherwise corrupt either read; the row is silently excluded"
    why_human: "The live table currently holds zero NULL session_id rows (the 3 pre-migration NULL rows observed during 06-06 verification are no longer present), so the exclusion branch has only been proven by unit test and code inspection, never against a real NULL row in production data, per the task's own runtime_evidence notes"
---

# Phase 6: Analytics Verification Report

**Phase Goal:** Every meaningful user action fires a tracked event to Supabase in a non-blocking way, and the admin dashboard charts reflect real accumulated data.
**Verified:** 2026-08-07T22:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Page views on all public pages recorded as `page_view` without slowing page load | ✓ VERIFIED | `PageViewTracker.tsx` mounted in `(public)/layout.tsx`, fires `void trackBrowserEvent(...)` inside a guarded `useEffect`; independently confirmed 1 live `page_view` row with `page: "/"`. `npm run build` proves the client-component/server-only boundary holds |
| 2 | Successful VIN decode records `vin_search`; contact submission records `contact_submit`; booking records `booking_created` | ✓ VERIFIED | Code-inspected all three write sites (`route.ts:71,156`, `contact-actions.ts:73`, `booking-actions.ts:121`) — correctly placed past error/honeypot branches. Independently queried live DB: `vin_search:4, contact_submit:1, booking_created:1` |
| 3 | Admin dashboard charts display data from `analytics_events` (visitors, VIN searches, contacts) | ✓ VERIFIED (with documented semantic change) | `admin/(dashboard)/page.tsx` wires `getVisitorSeries`/`getVinSearchSeries`/`getContactSeries` into chart components. Visitors KPI/chart deliberately changed from all-time to trailing `ANALYTICS_WINDOW_DAYS`-window count (06-07); UI copy ("Visitors") does not claim all-time, so no misleading label exists. Contacts chart correctly reads the real `contacts` table per Phase 5 D-18 (deliberate, not a defect) |
| 4 | Tracking is fire-and-forget: failing to record an event never blocks or errors the user action | ✓ VERIFIED | `trackServerEvent`/`trackBrowserEvent` both wrap inserts in try/catch, log-or-swallow, and unconditionally return `Promise<void>` with no result the caller can branch on. Traced all 4 call sites — none can propagate a rejection into the response/action state |
| 5 | Honeypot-triggered submissions write no analytics row (D-11) | ? UNCERTAIN (human needed) | Code inspection confirms both honeypot early-returns in `contact-actions.ts`/`booking-actions.ts` sit strictly above/before the tracking call with no code path reaching it. **Never exercised at runtime** — explicitly listed as not verified in the task's runtime_evidence |
| 6 | Re-booking a taken slot writes no analytics row (D-11) | ? UNCERTAIN (human needed) | Code inspection confirms the tracking call sits after the `'23505'` branch. **Never exercised at runtime** — explicitly listed as not verified |
| 7 | NULL-session rows excluded from visitor counts without crashing (06-06 gap closure) | ? UNCERTAIN (human needed) | Unit-tested and correct by code inspection in both `getSummaryTotals` and `getVisitorSeries`. **Never proven against a real NULL row in the live table** — the only NULL rows observed (pre-migration) are gone; explicitly listed as not verified |

**Score:** 4/4 fully VERIFIED, 3/3 UNCERTAIN pending human runtime verification (0 FAILED)

### Critical Review Findings (06-REVIEW.md) — Verified Closed

| Finding | Status | Evidence |
|---|---|---|
| CR-01 (Visitors KPI/chart silent truncation at `max_rows=1000`) | ✓ CLOSED | `dashboard-queries.ts`: both visitors reads now carry `.gte('created_at', windowStartIso(now))`, `.order('created_at', {ascending:false})`, `.limit(VISITOR_ROWS_LIMIT)`; saturation (`rows.length >= VISITOR_ROWS_LIMIT`) returns `{ ok: false }` with `console.error`, never a silently truncated number. Read and confirmed in code directly |
| CR-02 (three day definitions on one data path) | ✓ CLOSED | `businessDayKey()` in `business-day.ts` is the sole day-key function, derived via `Intl.DateTimeFormat` with explicit `timeZone`. Repo-wide grep confirms zero remaining `createdAt.slice(0,10)` or `format(new Date(ts),'yyyy-MM-dd')` calls on the analytics path — only explanatory comments mention the old (removed) patterns. `bucket-by-day.ts` and `getVisitorSeries` both route through the same function |
| CR-03 (`getServerNow` host-timezone skew) | ✓ CLOSED | `getServerNow()` now returns `new Date()` directly — confirmed by direct file read. `windowStartIso` derives its boundary via `businessDayKey` + fixed-millisecond stepping, not `date-fns` host-local arithmetic. No `new Date(y, m-1, d, ...)` reconstruction remains anywhere in `dashboard-queries.ts` (independently grepped) |

Full static gate independently re-run (not trusting SUMMARY self-report): `npx tsc --noEmit` clean, `npx vitest run` 132/132 passing across 14 files, `npm run lint` clean, `npm run build` succeeds (12/12 routes). Business-day and bucket-by-day tests independently re-run under `TZ=UTC`: 15/15 passing.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/analytics/events.ts` | `ANALYTICS_EVENTS` (4 members) + `AnalyticsEventType` | ✓ VERIFIED | Exact four members confirmed, D-01/D-04 header comments present |
| `src/lib/analytics/track-event.ts` | `trackServerEvent` (awaited, logs failures) | ✓ VERIFIED | Reads exactly as documented; try/catch + `console.error('trackServerEvent: ...')` |
| `src/lib/analytics/track-browser-event.ts` | `trackBrowserEvent` (awaited, silent) | ✓ VERIFIED, ⚠️ known-open warning | Correctly silent (no console output); still discards the `{ error }` value from the insert (WR-04, open by design of this phase's plans) |
| `src/components/analytics/PageViewTracker.tsx` | Client tracker, mounted in `(public)/layout.tsx` | ✓ VERIFIED, ⚠️ known-open warning | Fires on mount + pathname change, dedupes per path+session; still sets its dedupe marker before confirming insert success (WR-03, open) |
| `src/app/api/vin/[vin]/route.ts` | `vin_search` fired on both success branches | ✓ VERIFIED | Two call sites confirmed at cache-hit (line 71) and post-NHTSA (line 156); three failure branches confirmed eventless |
| `src/lib/contact/contact-actions.ts` | `contact_submit` fired on real success only | ✓ VERIFIED | Call site at line 73, strictly past honeypot and insert-error checks |
| `src/lib/booking/booking-actions.ts` | `booking_created` fired on real success only | ✓ VERIFIED | Call site at line 121, strictly past honeypot, `'23505'`, and generic error checks |
| `src/lib/dashboard/dashboard-queries.ts` | Reads `ANALYTICS_EVENTS`, bounded/ordered/saturation-checked visitors reads, `businessDayKey` throughout | ✓ VERIFIED | All CR-01/02/03 fixes present and correct on direct read |
| `src/lib/analytics/business-day.ts` | `businessDayKey(instant)` | ✓ VERIFIED | `Intl.DateTimeFormat` with explicit `timeZone`, no host-local getters |
| `supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql` | Nullable `session_id`, indexed, RLS untouched | ✓ VERIFIED | Confirmed applied to live DB — direct REST query against `kyhvgskeihtccylpdkas` returned `session_id` column without error |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `dashboard-queries.ts` | `events.ts` | `import { ANALYTICS_EVENTS }` | ✓ WIRED | Confirmed present, all 4 `.eq('event_type', ...)` sites use the shared const |
| `PageViewTracker.tsx` | `track-browser-event.ts` | `trackBrowserEvent` call in `useEffect` | ✓ WIRED | Confirmed, `void`-prefixed per D-10 discipline |
| `route.ts` (VIN) | `track-event.ts` | `await trackServerEvent(...VIN_SEARCH...)` ×2 | ✓ WIRED | Both call sites confirmed correctly gated |
| `contact-actions.ts` | `track-event.ts` | `await trackServerEvent(...CONTACT_SUBMIT...)` | ✓ WIRED | Confirmed |
| `booking-actions.ts` | `track-event.ts` | `await trackServerEvent(...BOOKING_CREATED...)` | ✓ WIRED | Confirmed |
| `admin/(dashboard)/page.tsx` | `dashboard-queries.ts` | `getSummaryTotals`/`getVisitorSeries`/`getVinSearchSeries`/`getContactSeries` | ✓ WIRED | All four consumed and passed to chart/card components |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `VisitorsChart` | `visitorSeries` | `getVisitorSeries()` → real `analytics_events` query, `businessDayKey`-bucketed | Yes — independently confirmed 1 live `page_view` row present | ✓ FLOWING |
| `VinSearchChart` | `vinSearchSeries` | `getVinSearchSeries()` → real `analytics_events` query | Yes — independently confirmed 4 live `vin_search` rows | ✓ FLOWING |
| `ContactsChart` | `contactSeries` | `getContactSeries()` → real `contacts` table (Phase 5 D-18, deliberate) | Yes — real table, pre-existing data | ✓ FLOWING |
| `SummaryCards` | `totals` | `getSummaryTotals()` → mixed real-table + distinct-session counts | Yes — independently confirmed via live query | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Live table holds exactly 4 event types, no fifth | Direct REST query against `kyhvgskeihtccylpdkas` `analytics_events` | `{vin_search:4, booking_created:1, contact_submit:1, page_view:1}` — 7 total rows | ✓ PASS |
| `session_id` column exists and is queryable | Direct REST query `select=event_type,session_id,vin,page` | HTTP 200, returned row with `session_id:null` (a vin_search row, expected — server events don't carry session_id) | ✓ PASS |
| Full static gate (independent re-run, not SUMMARY self-report) | `npx tsc --noEmit && npx vitest run && npm run lint && npm run build` | tsc clean; 132/132 tests/14 files; lint clean; build succeeded, 12/12 routes | ✓ PASS |
| CR-02/CR-03 test suites hold under TZ=UTC (independent re-run) | `TZ=UTC npx vitest run business-day.test.ts bucket-by-day.test.ts` | 15/15 passing | ✓ PASS |
| `session_id` length/format constraint (WR-01) | `grep CHECK.*char_length supabase/migrations/*.sql` | No constraint found | ⚠️ Confirmed still open (expected, documented) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention exists in this repository and none is declared in any Phase 6 PLAN/SUMMARY. Step 7c: SKIPPED (no probe infrastructure in this project).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| ANLY-01 | 06-01, 06-05 | `analytics_events` table with JSONB metadata column | ✓ SATISFIED | Table pre-existed (Phase 1/3 migration) with `metadata JSONB`; Phase 6 correctly leaves it null (D-02) on every write |
| ANLY-02 | 06-01, 06-02, 06-05 | Track `page_view` on every public page | ✓ SATISFIED | `PageViewTracker` mounted in `(public)/layout.tsx`; live row confirmed |
| ANLY-03 | 06-01, 06-03, 06-05 | Track `vin_search` on VIN decode | ✓ SATISFIED | Both success branches fire; live rows confirmed (4) |
| ANLY-04 | 06-01, 06-04, 06-05 | Track `contact_submit` on contact form submission | ✓ SATISFIED (honeypot exclusion pending human verify) | Real-success-only call site confirmed by code; live row confirmed. Honeypot exclusion is code-correct but runtime-unverified — see human_verification |
| ANLY-05 | 06-01, 06-04, 06-05 | Track `booking_created` on successful booking | ✓ SATISFIED (duplicate-booking exclusion pending human verify) | Real-success-only call site confirmed by code; live row confirmed. Duplicate-slot exclusion is code-correct but runtime-unverified — see human_verification |
| ANLY-06 | 06-01, 06-02, 06-03, 06-04, 06-05 | Fire-and-forget non-blocking tracking | ✓ SATISFIED | All 4 call sites traced; none can propagate failure into user-facing state |

No orphaned requirements — all 6 ANLY-* IDs from REQUIREMENTS.md are claimed by at least one Phase 6 plan.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/analytics/track-browser-event.ts` | 43 | Discards `{ error }` from Supabase insert result (WR-04) | ⚠️ Warning (open, documented) | Failures are unobservable even internally; blocks a proper fix to WR-03. Not a blocker per task instructions — recorded as still-open |
| `src/components/analytics/PageViewTracker.tsx` | 55-58 | Sets sessionStorage dedupe marker unconditionally before confirming insert success (WR-03) | ⚠️ Warning (open, documented) | An ad-blocker or offline visitor silently and permanently loses that page's tracking for the session. Not a blocker per task instructions |
| `src/lib/booking/booking-actions.ts` | 88-92 | Comment says "Never read `vehicleDesc` from `formData`" directly above a line reading `serverVehicleDesc` from `formData` (WR-06) | ⚠️ Warning (pre-existing Phase 4, open) | Misleading comment; unvalidated client-supplied text reaches the DB and admin dashboard. Pre-existing, out of scope for Phase 6 per 06-07-SUMMARY's own note |
| `supabase/migrations/20260807000000_...sql` | — | No length/format bound on `session_id` (WR-01) | ⚠️ Warning (open, documented) | Confirmed no `CHECK` constraint exists; unbounded-write vector under public insert policy. Explicitly recorded as deferred by 06-07-SUMMARY |
| `src/components/dashboard/SummaryCards.tsx` | 26 | Comment says visitors/vinSearches "read 0 until Phase 6 wires the writes" — stale now that Phase 6 shipped | ℹ️ Info | Pre-existing Phase 5 comment, not touched by any Phase 6 plan, not flagged by 06-REVIEW.md, cosmetic only — not a phase gap |

No unreferenced `TBD`/`FIXME`/`XXX` markers found in any file modified by this phase (checked all 13 files from 06-REVIEW.md's file list plus session-id.ts/test.ts). No debt-marker gate violation.

### Human Verification Required

### 1. Honeypot-filled contact submission produces no analytics row

**Test:** Using DevTools, un-hide the hidden honeypot input on the `/contact` form, fill it with any value, and submit.
**Expected:** The form reports success (intended bot-fooling behavior), but zero new rows appear in both `contacts` and `analytics_events`.
**Why human:** Requires manipulating a hidden DOM field through DevTools and submitting through the real browser client. The task's own runtime_evidence explicitly lists this as NOT verified. Code inspection confirms the call site is correctly placed past the honeypot check, but that is inspection, not observed behavior.

### 2. Re-booking an already-taken slot produces no analytics row

**Test:** Book an appointment slot successfully, then attempt to book the identical slot a second time.
**Expected:** The second attempt returns "slot taken" and writes zero new rows to `bookings` or `analytics_events`.
**Why human:** Requires two sequential real submissions through the booking UI. The task's own runtime_evidence explicitly lists this as NOT verified.

### 3. NULL-session rows are excluded from the Visitors KPI/chart without crashing

**Test:** With a `page_view` row present whose `session_id IS NULL` (e.g. simulate storage failure, or wait for a pre-migration-style row), confirm the Visitors KPI and chart still render without error and do not count that row.
**Expected:** The dashboard renders normally; the NULL row is silently excluded, not counted and not causing a crash or `{ ok: false }`.
**Why human:** The live table's only observed NULL rows (from before the 06-06 migration) are no longer present — every current row carries a `session_id`. The exclusion logic is unit-tested and correct by code inspection (confirmed directly reading `dashboard-queries.ts`), but has never been proven against a real NULL row in production data. The task's own runtime_evidence explicitly lists this as NOT verified.

### Gaps Summary

No code-level gaps were found. Every observable truth backing the phase goal is either fully verified (by independent code inspection, independent test re-runs, and an independent live-database spot check that corroborates the provided runtime evidence exactly) or is blocked purely on unexecuted human runtime verification steps that the task's own instructions explicitly flagged as not yet performed.

The three outstanding items (honeypot exclusion, duplicate-booking exclusion, NULL-session exclusion against real data) are all D-11/06-06 must-have truths from `06-04-PLAN.md` and `06-06-PLAN.md`'s `must_haves.truths`, and were explicitly called out as unexercised in both `06-05-SUMMARY.md`'s "Still NOT verified — carried forward" section and this verification task's `runtime_evidence` block. Static code inspection strongly supports that all three behave correctly (the honeypot and slot-taken branches are structurally incapable of reaching the tracking call; the NULL-exclusion logic is unit-tested), but per this verifier's adversarial mandate, code inspection alone does not substitute for the runtime proof the phase's own plans (06-05, 06-06) designated as required evidence.

The three CRITICAL findings from `06-REVIEW.md` (CR-01, CR-02, CR-03) are independently confirmed closed by direct code reading and independent test execution (including under `TZ=UTC`), not by trusting `06-07-SUMMARY.md`'s self-report. The six still-open WARNING/INFO findings (WR-01 through WR-06, IN-01 through IN-04) are confirmed still present exactly as `06-07-SUMMARY.md` states they would be — none were silently dropped, and none rise to blocker severity per the task's explicit framing of them as "warnings, not blockers."

---

_Verified: 2026-08-07T22:15:00Z_
_Verifier: Claude (gsd-verifier)_
