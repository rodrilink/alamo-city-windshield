---
phase: 06-analytics
verified: 2026-08-07T22:50:00Z
status: passed
score: 7/7 must-haves verified (code + runtime)
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: "6/6 code+static must-haves verified, 3 human-verify items outstanding"
  gaps_closed:
    - "Honeypot-triggered submissions write no analytics row (D-11) — now proven at runtime against the live Supabase project, not just by code inspection"
    - "Re-booking a taken slot writes no analytics row (D-11) — now proven at runtime against the live Supabase project"
    - "NULL-session rows excluded from visitor counts without crashing (06-06 gap closure) — now proven with a real NULL-session_id row inserted into the live table"
  gaps_remaining: []
  regressions: []
---

# Phase 6: Analytics Verification Report

**Phase Goal:** Every meaningful user action fires a tracked event to Supabase in a non-blocking way, and the admin dashboard charts reflect real accumulated data.
**Verified:** 2026-08-07T22:50:00Z
**Status:** passed
**Re-verification:** Yes — after human-verification runtime evidence was supplied for the three items the initial verification (2026-08-07T22:15:00Z) left outstanding.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Page views on all public pages recorded as `page_view` without slowing page load | ✓ VERIFIED | `PageViewTracker.tsx` mounted in `(public)/layout.tsx`, fires `void trackBrowserEvent(...)` inside a guarded `useEffect`; live `page_view` rows confirmed present |
| 2 | Successful VIN decode records `vin_search`; contact submission records `contact_submit`; booking records `booking_created` | ✓ VERIFIED | Re-read all three write sites (`route.ts:71,156`, `contact-actions.ts:73`, `booking-actions.ts:121`) — correctly placed past error/honeypot branches. Live DB rows confirmed |
| 3 | Admin dashboard charts display data from `analytics_events` (visitors, VIN searches, contacts) | ✓ VERIFIED (with documented semantic change) | `admin/(dashboard)/page.tsx` wires `getVisitorSeries`/`getVinSearchSeries`/`getContactSeries` into chart components. **Visitors KPI/chart is deliberately a trailing `ANALYTICS_WINDOW_DAYS` (30-day) window count, not an all-time count** — this is a documented, intentional semantic change from 06-07 (CR-01 closure), not a defect. UI copy ("Visitors") does not claim all-time, so no misleading label exists. Contacts chart correctly reads the real `contacts` table per Phase 5 D-18 (deliberate, not a defect) |
| 4 | Tracking is fire-and-forget: failing to record an event never blocks or errors the user action | ✓ VERIFIED | `trackServerEvent`/`trackBrowserEvent` both wrap inserts in try/catch, log-or-swallow, and unconditionally return `Promise<void>` with no result the caller can branch on. Traced all 4 call sites — none can propagate a rejection into the response/action state |
| 5 | Honeypot-triggered submissions write no analytics row (D-11) | ✓ VERIFIED | **Runtime-proven.** The real `createContact` Server Action was invoked against the live Supabase project (`kyhvgskeihtccylpdkas`) with `honeypot` set to a non-empty value. It returned `status: success` (intended bot-fooling response) and wrote NOTHING: `contact_submit` events stayed at 1, `contacts` rows stayed at 1, against a captured baseline. Recorded in `06-HUMAN-UAT.md` test 1, result: passed. Code-level cause confirmed on re-read: rejection occurs at `contact-actions.ts:37`, strictly before any DB call |
| 6 | Re-booking a taken slot writes no analytics row (D-11) | ✓ VERIFIED | **Runtime-proven.** The real `createBooking` Server Action was invoked against the already-occupied slot 2026-08-08 10:30 on the live project. It returned a non-success status and wrote NOTHING: `bookings` stayed at 1, `booking_created` events stayed at 1. Recorded in `06-HUMAN-UAT.md` test 2, result: passed. Code-level cause confirmed on re-read: the tracking call in `booking-actions.ts:121` sits strictly after the `'23505'` unique-constraint branch |
| 7 | NULL-session rows excluded from visitor counts without crashing (06-06 gap closure) | ✓ VERIFIED | **Runtime-proven.** A real `page_view` row with `session_id = NULL` was inserted into the live `analytics_events` table. With 5 page_view rows present (4 carrying a session_id, 1 NULL), the distinct-session count evaluated to 2 — proving the NULL row was neither counted as its own visitor nor collapsed into a phantom session. Probe row deleted afterward; final live state confirmed at page_view 4, vin_search 4, contact_submit 1, booking_created 1 (exactly four event types, no fifth). Recorded in `06-HUMAN-UAT.md` test 3, result: passed. Code-level cause re-confirmed directly reading `dashboard-queries.ts:186-188` (`getSummaryTotals`) and `:418-421` (`getVisitorSeries`) — both filter `sessionId !== null` before building the distinct-session `Set`/dedupe map |

**Score:** 7/7 truths VERIFIED (0 FAILED, 0 UNCERTAIN). All three previously-outstanding items now carry direct runtime evidence against the live Supabase project, captured in `06-HUMAN-UAT.md` (status: complete, 3 passed / 0 pending / 0 issues).

### Critical Review Findings (06-REVIEW.md) — Re-confirmed Closed on Direct Re-Read

| Finding | Status | Evidence |
|---|---|---|
| CR-01 (Visitors KPI/chart silent truncation at `max_rows=1000`) | ✓ CLOSED | Re-read `dashboard-queries.ts` directly (not from memory of the prior verification pass). Both visitors reads (`getSummaryTotals` line 141-147, `getVisitorSeries` line 383-389) carry `.gte('created_at', windowStartIso(now))`, `.order('created_at', {ascending:false})`, `.limit(VISITOR_ROWS_LIMIT)`. Saturation check (`rows.length >= VISITOR_ROWS_LIMIT` / `visitorRows.length >= VISITOR_ROWS_LIMIT`) present in both functions and returns `{ ok: false }` with `console.error`, never a silently truncated number |
| CR-02 (three day definitions on one data path) | ✓ CLOSED | Re-read `business-day.ts` directly. `businessDayKey()` is the sole day-key function, derived via `Intl.DateTimeFormat` with explicit `timeZone: BUSINESS_TIME_ZONE`, never `getFullYear()`/`getMonth()`/`getDate()`. Repo-wide grep re-run: the only remaining occurrences of `createdAt.slice(0, 10)` and `format(new Date(...))` are in explanatory comments/tests documenting the removed historical bug (`business-day.ts` header, `bucket-by-day.ts` header, two test files, two comments in `dashboard-queries.ts`) — zero occurrences in live logic. `bucket-by-day.ts` (re-read directly, lines 76 and 81) and `getVisitorSeries` (line 423) both route through the identical `businessDayKey` function for both counting and axis-building |
| CR-03 (`getServerNow` host-timezone skew) | ✓ CLOSED | Re-read `dashboard-queries.ts` lines 315-317 directly: `getServerNow()` now returns `new Date()` with no wall-clock reconstruction. `windowStartIso` (lines 345-348) derives its boundary via `businessDayKey(new Date(now.getTime() - (ANALYTICS_WINDOW_DAYS - 1) * MILLISECONDS_PER_DAY))` — fixed-millisecond stepping, not `date-fns` host-local arithmetic (`startOfDay`/`subDays`). Repo-wide grep for `new Date(year, month - 1, ...)`-style wall-clock reconstruction on the analytics path returned zero hits (the four hits found are all in the unrelated booking-calendar subsystem — `BookingCalendar.tsx`, `booking-availability.ts`, `booking-schema.ts` — which is a different, pre-existing, out-of-scope code path, not a regression of CR-03) |

Full static gate independently re-run in this verification pass (not trusting any SUMMARY self-report):
- `npx tsc --noEmit` — clean
- `npx vitest run` — 132/132 tests passing across 14 files
- `npm run lint` — clean
- `npm run build` — succeeded, all 12 routes generated (10 App Router routes + `/_not-found` + shared chunks; "Generating static pages (12/12)" confirmed in build output)
- `TZ=UTC npx vitest run business-day.test.ts bucket-by-day.test.ts` — 15/15 passing

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/analytics/events.ts` | `ANALYTICS_EVENTS` (4 members) + `AnalyticsEventType` | ✓ VERIFIED | Exact four members confirmed, D-01/D-04 header comments present |
| `src/lib/analytics/track-event.ts` | `trackServerEvent` (awaited, logs failures) | ✓ VERIFIED | Reads exactly as documented; try/catch + `console.error('trackServerEvent: ...')` |
| `src/lib/analytics/track-browser-event.ts` | `trackBrowserEvent` (awaited, silent) | ✓ VERIFIED, ⚠️ known-open warning | Correctly silent (no console output); still discards the `{ error }` value from the insert result at line 43 (WR-04, open by design — recorded, not a blocker) |
| `src/components/analytics/PageViewTracker.tsx` | Client tracker, mounted in `(public)/layout.tsx` | ✓ VERIFIED, ⚠️ known-open warning | Fires on mount + pathname change, dedupes per path+session; still sets its dedupe marker (line 58) without awaiting/confirming the tracking call's success (WR-03, open — recorded, not a blocker) |
| `src/app/api/vin/[vin]/route.ts` | `vin_search` fired on both success branches | ✓ VERIFIED | Two call sites confirmed at cache-hit (line 71) and post-NHTSA (line 156); three failure branches confirmed eventless |
| `src/lib/contact/contact-actions.ts` | `contact_submit` fired on real success only | ✓ VERIFIED | Call site at line 73, strictly past honeypot and insert-error checks. Runtime-confirmed honeypot exclusion (see Truth 5) |
| `src/lib/booking/booking-actions.ts` | `booking_created` fired on real success only | ✓ VERIFIED | Call site at line 121, strictly past honeypot, `'23505'`, and generic error checks. Runtime-confirmed duplicate-slot exclusion (see Truth 6) |
| `src/lib/dashboard/dashboard-queries.ts` | Reads `ANALYTICS_EVENTS`, bounded/ordered/saturation-checked visitors reads, `businessDayKey` throughout | ✓ VERIFIED | All CR-01/02/03 fixes re-confirmed present and correct on direct re-read (this pass) |
| `src/lib/analytics/business-day.ts` | `businessDayKey(instant)` | ✓ VERIFIED | `Intl.DateTimeFormat` with explicit `timeZone`, no host-local getters, re-confirmed on direct re-read |
| `supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql` | Nullable `session_id`, indexed, RLS untouched | ✓ VERIFIED | Applied to live DB. No length/format `CHECK` constraint found on re-grep — WR-01 remains open as recorded, not a blocker |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `dashboard-queries.ts` | `events.ts` | `import { ANALYTICS_EVENTS }` | ✓ WIRED | Confirmed present, all `.eq('event_type', ...)` sites use the shared const |
| `PageViewTracker.tsx` | `track-browser-event.ts` | `trackBrowserEvent` call in `useEffect` | ✓ WIRED | Confirmed, `void`-prefixed per D-10 discipline |
| `route.ts` (VIN) | `track-event.ts` | `await trackServerEvent(...VIN_SEARCH...)` ×2 | ✓ WIRED | Both call sites confirmed correctly gated |
| `contact-actions.ts` | `track-event.ts` | `await trackServerEvent(...CONTACT_SUBMIT...)` | ✓ WIRED | Confirmed; runtime-proven correctly gated past honeypot |
| `booking-actions.ts` | `track-event.ts` | `await trackServerEvent(...BOOKING_CREATED...)` | ✓ WIRED | Confirmed; runtime-proven correctly gated past duplicate-slot rejection |
| `admin/(dashboard)/page.tsx` | `dashboard-queries.ts` | `getSummaryTotals`/`getVisitorSeries`/`getVinSearchSeries`/`getContactSeries` | ✓ WIRED | All four consumed and passed to chart/card components |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `VisitorsChart` / Visitors KPI card | `visitorSeries` / `totals.visitors` | `getVisitorSeries()` / `getSummaryTotals()` → real `analytics_events` query, `businessDayKey`-bucketed, windowed to trailing `ANALYTICS_WINDOW_DAYS`, distinct-session, NULL-excluded | Yes — runtime-proven: live distinct-session count evaluated to 2 with 5 rows (4 non-null + 1 NULL) present, matching the exact expected exclusion behavior | ✓ FLOWING |
| `VinSearchChart` | `vinSearchSeries` | `getVinSearchSeries()` → real `analytics_events` query | Yes — live table holds 4 `vin_search` rows | ✓ FLOWING |
| `ContactsChart` | `contactSeries` | `getContactSeries()` → real `contacts` table (Phase 5 D-18, deliberate) | Yes — real table, pre-existing data | ✓ FLOWING |
| `SummaryCards` | `totals` | `getSummaryTotals()` → mixed real-table + distinct-session counts | Yes — live query confirmed | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Honeypot-filled `createContact` writes zero rows | Real Server Action invocation against live project, `honeypot` non-empty | `status: success` returned; `contact_submit` stayed at 1, `contacts` stayed at 1 | ✓ PASS (runtime, `06-HUMAN-UAT.md` test 1) |
| Duplicate-slot `createBooking` writes zero rows | Real Server Action invocation against live project, already-occupied 2026-08-08 10:30 slot | Non-success status returned; `bookings` stayed at 1, `booking_created` stayed at 1 | ✓ PASS (runtime, `06-HUMAN-UAT.md` test 2) |
| NULL `session_id` row excluded from distinct-session count | Real row inserted with `session_id = NULL`, live count re-read | 5 page_view rows (4 + 1 NULL) → distinct count = 2, not 1 (collapsed) and not 3 (counted as own session) | ✓ PASS (runtime, `06-HUMAN-UAT.md` test 3) |
| Live table holds exactly 4 event types after all probes cleaned up | Final live state check | `page_view: 4, vin_search: 4, contact_submit: 1, booking_created: 1` | ✓ PASS |
| Full static gate (independently re-run this pass) | `npx tsc --noEmit && npx vitest run && npm run lint && npm run build` | tsc clean; 132/132 tests/14 files; lint clean; build succeeded, 12/12 routes | ✓ PASS |
| CR-02/CR-03 test suites hold under TZ=UTC (independently re-run this pass) | `TZ=UTC npx vitest run business-day.test.ts bucket-by-day.test.ts` | 15/15 passing | ✓ PASS |
| `session_id` length/format constraint (WR-01) | `grep CHECK.*char_length supabase/migrations/*.sql` | No constraint found | ⚠️ Confirmed still open (expected, documented, not a blocker) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention exists in this repository and none is declared in any Phase 6 PLAN/SUMMARY. Step 7c: SKIPPED (no probe infrastructure in this project).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| ANLY-01 | 06-01, 06-05 | `analytics_events` table with JSONB metadata column | ✓ SATISFIED | Table pre-existed (Phase 1/3 migration) with `metadata JSONB`; Phase 6 correctly leaves it null (D-02) on every write |
| ANLY-02 | 06-01, 06-02, 06-05 | Track `page_view` on every public page | ✓ SATISFIED | `PageViewTracker` mounted in `(public)/layout.tsx`; live rows confirmed |
| ANLY-03 | 06-01, 06-03, 06-05 | Track `vin_search` on VIN decode | ✓ SATISFIED | Both success branches fire; live rows confirmed (4) |
| ANLY-04 | 06-01, 06-04, 06-05 | Track `contact_submit` on contact form submission | ✓ SATISFIED | Real-success-only call site confirmed by code; live row confirmed. Honeypot exclusion now runtime-verified (see Truth 5) |
| ANLY-05 | 06-01, 06-04, 06-05 | Track `booking_created` on successful booking | ✓ SATISFIED | Real-success-only call site confirmed by code; live row confirmed. Duplicate-slot exclusion now runtime-verified (see Truth 6) |
| ANLY-06 | 06-01, 06-02, 06-03, 06-04, 06-05 | Fire-and-forget non-blocking tracking | ✓ SATISFIED | All 4 call sites traced; none can propagate failure into user-facing state |

No orphaned requirements — all 6 ANLY-* IDs from REQUIREMENTS.md are claimed by at least one Phase 6 plan, and all 6 are now fully SATISFIED with no pending human-verification caveats.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/analytics/track-browser-event.ts` | 43 | Discards `{ error }` from Supabase insert result (WR-04) | ⚠️ Warning (open, documented) | Failures are unobservable even internally; blocks a proper fix to WR-03. Not a blocker — recorded as still-open |
| `src/components/analytics/PageViewTracker.tsx` | 55-58 | Sets sessionStorage dedupe marker unconditionally before confirming insert success (WR-03) | ⚠️ Warning (open, documented) | An ad-blocker or offline visitor silently and permanently loses that page's tracking for the session. Not a blocker |
| `src/lib/booking/booking-actions.ts` | 88-92 | Comment says "Never read `vehicleDesc` from `formData`" directly above a line reading `serverVehicleDesc` from `formData` (WR-06) | ⚠️ Warning (pre-existing Phase 4, open) | Misleading comment; unvalidated client-supplied text reaches the DB and admin dashboard. Pre-existing, out of scope for Phase 6 |
| `supabase/migrations/20260807000000_...sql` | — | No length/format bound on `session_id` (WR-01) | ⚠️ Warning (open, documented) | Confirmed no `CHECK` constraint exists on re-grep; unbounded-write vector under public insert policy. Explicitly recorded as deferred |
| `src/components/dashboard/SummaryCards.tsx` | 26 | Comment says visitors/vinSearches "read 0 until Phase 6 wires the writes" — stale now that Phase 6 shipped | ℹ️ Info | Pre-existing Phase 5 comment, not touched by any Phase 6 plan, cosmetic only — not a phase gap |

No unreferenced `TBD`/`FIXME`/`XXX` markers found in `src/lib/analytics/`, `src/lib/dashboard/`, `src/lib/booking/booking-actions.ts`, or `src/lib/contact/contact-actions.ts` (re-checked this pass). No debt-marker gate violation.

**Deliberate semantic note (carried forward, not a gap):** The Visitors KPI card and chart intentionally count distinct sessions within the trailing `ANALYTICS_WINDOW_DAYS` (30-day) window, not all-time — this was a deliberate 06-07 fix for CR-01's unbounded-growth truncation risk. It is documented in `SummaryTotals`'s TSDoc and `getVisitorSeries`'s TSDoc, and the UI copy does not claim an all-time total, so no user-facing inconsistency exists.

### Human Verification Required

None. All three items outstanding from the initial verification pass now carry direct runtime evidence against the live Supabase project, recorded in `06-HUMAN-UAT.md` (status: complete, 3 passed / 0 pending / 0 issues / 0 skipped / 0 blocked).

### Gaps Summary

No gaps remain. The initial verification pass (2026-08-07T22:15:00Z) found all code-level truths, artifacts, and key links VERIFIED, with exactly three D-11/06-06 must-have truths pending runtime proof: honeypot exclusion, duplicate-booking exclusion, and NULL-session exclusion against real data. All three have now been exercised against the live Supabase project (`kyhvgskeihtccylpdkas`) by invoking the real Server Actions and inserting/observing real rows, with results captured in `06-HUMAN-UAT.md` and cross-checked against this verification pass's own independent re-read of the corresponding code paths. All three passed with no discrepancy between the code-level reasoning and the observed runtime behavior.

The three CRITICAL findings from `06-REVIEW.md` (CR-01, CR-02, CR-03) were re-confirmed closed by direct code re-reading in this verification pass (not by trusting the prior verification's own findings or any SUMMARY self-report) — `dashboard-queries.ts`, `business-day.ts`, and `bucket-by-day.ts` were all re-read in full. The static gate (`tsc`, `vitest`, `lint`, `build`) and the TZ=UTC-specific test re-run were both independently re-executed in this pass and remain green.

The four still-open WARNING-level findings (WR-01 session_id length constraint, WR-03 dedupe marker set before insert confirmation, WR-04 trackBrowserEvent discards error, WR-06 misleading booking-actions.ts comment) remain confirmed present exactly as previously recorded — none were silently dropped, none were fixed, and none rise to blocker severity. They are carried forward as recorded warnings, not gaps, per the task's explicit instruction.

With every observable truth now VERIFIED (7/7), every artifact and key link WIRED, the static gate green, and zero outstanding human-verification items, the phase goal — "every meaningful user action fires a tracked event to Supabase in a non-blocking way, and the admin dashboard charts reflect real accumulated data" — is achieved.

---

_Verified: 2026-08-07T22:50:00Z_
_Verifier: Claude (gsd-verifier)_
