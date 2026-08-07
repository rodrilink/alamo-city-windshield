---
phase: 06-analytics
plan: 06
subsystem: analytics
tags: [nextjs, react, typescript, supabase, dashboard, session-tracking, gap-closure]

# Dependency graph
requires:
  - phase: 06-analytics
    provides: "PageViewTracker.tsx, trackBrowserEvent, and dashboard-queries.ts read layer from plans 06-02 and 06-05"
provides:
  - "supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql -- nullable, indexed session_id column on analytics_events"
  - "src/lib/analytics/session-id.ts -- getOrCreateSessionId(), a browser-safe, storage-failure-tolerant session identifier returning null (never a throwaway id) on failure"
  - "Visitors KPI (getSummaryTotals) and Visitors chart (getVisitorSeries) now count distinct browser sessions instead of page_view rows"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NULL-exclusion rule for client-controlled identifiers: rows lacking session_id (pre-migration, or storage-unavailable) are excluded from distinct-session counts rather than counted individually or collapsed into one -- exclusion undercounts, never inflates, and is documented once and referenced from every consuming call site"
    - "Distinct-count via row select + TS Set, not head:true count: when a Supabase count needs DISTINCT semantics that select(*, {count:'exact', head:true}) cannot express, select only the discriminating column and dedupe in TypeScript, preserving the existing all-or-nothing Promise.all error shape"

key-files:
  created:
    - supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql
    - src/lib/analytics/session-id.ts
    - src/lib/analytics/session-id.test.ts
  modified:
    - src/lib/analytics/track-browser-event.ts
    - src/components/analytics/PageViewTracker.tsx
    - src/lib/dashboard/dashboard-queries.ts

key-decisions:
  - "session_id storage key is 'analytics:sid', deliberately distinct from PageViewTracker's existing 'pv:' dedupe prefix -- no collision, two independent sessionStorage concerns"
  - "getOrCreateSessionId() returns null (never a fresh per-call id) on storage failure -- a per-call id would silently reproduce the exact page-views-as-visitors bug this plan fixes"
  - "NULL session_id rows are excluded from distinct-session counts in both getSummaryTotals and getVisitorSeries -- the same rule, stated once on SummaryTotals.visitors's TSDoc and referenced from getVisitorSeries, rather than re-derived twice"
  - "getSummaryTotals's visitors branch changed from select('*', {count:'exact', head:true}) to select('session_id') + a TS Set, because head:true cannot express DISTINCT -- the Promise.all shape and all-or-nothing {ok:false} error rule are preserved exactly"

requirements-completed: [ANLY-01, ANLY-02, ADMIN-02, ADMIN-05]

# Metrics
duration: 55min
completed: 2026-08-07
---

# Phase 6 Plan 6: Distinct-Session Visitor Counting (Gap Closure) Summary

**Tasks 1-5 complete: the Visitors KPI and chart now count distinct `session_id` values instead of `page_view` rows, via a new nullable migration column and a storage-failure-tolerant session helper — Task 6 (human verification) is a blocking checkpoint awaiting the migration being applied live and a real-browser UAT pass.**

## Status: AWAITING TASK 6 HUMAN CHECKPOINT

This plan has a `gate="blocking"` `checkpoint:human-verify` task (Task 6) that requires applying a migration to the live Supabase dashboard and testing in a real browser session across two incognito windows. That task was **not attempted** by this executor per its instructions. Tasks 1-5 are complete, committed, and verified by the full static gate (tsc, vitest, lint, build).

## Performance

- **Duration:** 55 min (Tasks 1-5 only)
- **Tasks:** 5 of 6 completed (Task 6 is the human checkpoint, not started)
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- **Task 1:** Created `supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql` — additive, nullable `session_id TEXT` column plus a covering index on `(event_type, created_at, session_id)`, `IF NOT EXISTS` guarded, RLS untouched (documented why in the migration header).
- **Task 2:** Created `src/lib/analytics/session-id.ts`'s `getOrCreateSessionId()` — reads/writes a stable id under `sessionStorage['analytics:sid']`, generates via `crypto.randomUUID()` with a `Math.random`-based fallback for non-secure contexts, and returns `null` (never a fresh per-call id) if storage throws. 4 unit tests in `session-id.test.ts` cover stability, fresh-generation, null-on-failure, and no-throw, using stubbed globals (no jsdom in this repo).
- **Task 3:** Widened `trackBrowserEvent`'s `fields` to accept optional `sessionId`, written to the row's `session_id` column; kept the D-12 silent-failure catch unchanged. `PageViewTracker` now calls `getOrCreateSessionId()` inside the existing D-08 dedupe effect and passes the result through (including `null`).
- **Task 4:** Restructured `getSummaryTotals`'s visitors branch from a `head: true` count (cannot express DISTINCT) to selecting `session_id` for `page_view` rows and counting unique non-null values in TypeScript, preserving the `Promise.all` shape and all-or-nothing `{ ok: false }` error rule. Restructured `getVisitorSeries` to select `created_at` + `session_id`, collapse to one timestamp per distinct session per day, then hand off to `bucketByDay` unchanged. The NULL-exclusion rule is documented once on `SummaryTotals.visitors`'s TSDoc and referenced from `getVisitorSeries`.
- **Task 5:** Rewrote the stale D-08 comment block in `PageViewTracker.tsx`, which previously asserted the dashboard counts distinct page-visits per session and told future readers never to describe it as visitors — now states D-08 still governs which rows are written, while the KPI/chart count distinct sessions, and records the surviving new-tab/later-visit caveat plus the NULL-exclusion note. Comment-only change, verified via repo-wide grep that no other file still claims page-visit counting.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the session_id column** — `5ea763b` (feat)
2. **Task 2: Session identifier helper** — `5ad442e` (feat)
3. **Task 3: Send session_id with page_view** — `5a2afd0` (feat)
4. **Task 4: Count distinct sessions in both reads** — `68c5d1d` (fix)
5. **Task 5: Correct the stale D-08 comments** — `f1b72b5` (docs)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — orchestrator merges and finalizes STATE.md/ROADMAP.md centrally)

## Files Created/Modified

- `supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql` (new) — additive migration; nullable `session_id TEXT` + covering index; no RLS change.
- `src/lib/analytics/session-id.ts` (new) — `getOrCreateSessionId(): string | null`, browser-safe (no `server-only` import anywhere in its graph).
- `src/lib/analytics/session-id.test.ts` (new) — 4 tests: stability, fresh-generation, null-on-storage-failure, no-throw.
- `src/lib/analytics/track-browser-event.ts` — `fields.sessionId?: string | null` added, written to `session_id`; D-12 catch unchanged.
- `src/components/analytics/PageViewTracker.tsx` — imports `getOrCreateSessionId`, calls it inside the existing effect, passes result to `trackBrowserEvent`; D-08 comment block rewritten (Task 5).
- `src/lib/dashboard/dashboard-queries.ts` — `getSummaryTotals`'s visitors branch and `getVisitorSeries` both restructured to count distinct non-null `session_id` values; `SummaryTotals.visitors` TSDoc rewritten.

## Decisions Made

- Storage key `analytics:sid` chosen to be visibly distinct from the existing `pv:` dedupe prefix — no risk of key collision between the two independent `sessionStorage` concerns (dedupe vs. session identity).
- `getOrCreateSessionId()`'s failure mode is `null`, never a generated-but-unpersisted id — a per-call fallback id would make every page view in a storage-failure session count as a separate "session," reproducing the exact bug being fixed, invisibly. `null` flows through to `session_id: null` on the row, which both reads then exclude.
- The NULL-exclusion rule (rows with `session_id IS NULL` are excluded from distinct-session counts, in both the KPI and the chart) is documented once — on `SummaryTotals.visitors`'s TSDoc — and `getVisitorSeries`'s TSDoc references it rather than re-explaining it, avoiding duplicated rationale that could drift out of sync.
- `getSummaryTotals`'s visitors branch necessarily changed shape (row select instead of `head: true` count) because Supabase's `count: 'exact', head: true` mode cannot express `DISTINCT`. The function's all-or-nothing error contract (`{ ok: false }` if any of the four counts fails) was preserved exactly — only the visitors branch's query shape changed, not its position in the `Promise.all` or its error-check ordering.

## Deviations from Plan

None — plan executed exactly as written for Tasks 1-5. Every acceptance criterion in each task was met without needing an auto-fix, architectural question, or scope deviation.

## Issues Encountered

None. The full static gate (tsc, vitest, lint, build) passed cleanly after every task, matching the plan's own per-task verification commands.

## User Setup Required

**Yes — required before Task 6 can be verified.** The migration `supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql` must be applied to the live Supabase project (`kyhvgskeihtccylpdkas`) via the SQL editor before the human checkpoint can pass. See the checkpoint details returned to the orchestrator for the exact migration contents and verification steps.

## Next Phase Readiness

- Tasks 1-5 are complete, committed, and pass the full static gate. Nothing further is needed from an implementation standpoint.
- **Blocked on Task 6**, a `gate="blocking"` human-verify checkpoint: the migration must be applied live, then a human must confirm in a real browser (two incognito windows) that one session across three pages reads Visitors = 1, a second session increments to 2, revisiting a seen path adds nothing, the chart is consistent, and nothing else regressed.
- This plan closes a gap discovered during 06-05's human verification (the Visitors KPI reading 1 → 2 → 3 for one visitor). Once Task 6 is approved, Phase 6 (and the phase's success criteria around ADMIN-02/ADMIN-05) should be considered fully closed.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20260807000000_add_session_id_to_analytics_events.sql`
- FOUND: `src/lib/analytics/session-id.ts`
- FOUND: `src/lib/analytics/session-id.test.ts`
- FOUND: `src/lib/analytics/track-browser-event.ts` (contains `sessionId`)
- FOUND: `src/components/analytics/PageViewTracker.tsx` (contains `getOrCreateSessionId`)
- FOUND: `src/lib/dashboard/dashboard-queries.ts` (contains `distinctSessionIds`)
- FOUND commit: `5ea763b`
- FOUND commit: `5ad442e`
- FOUND commit: `5a2afd0`
- FOUND commit: `68c5d1d`
- FOUND commit: `f1b72b5`

---
*Phase: 06-analytics*
*Completed (Tasks 1-5): 2026-08-07 — awaiting Task 6 human checkpoint*

## Task 6: Human Verification — APPROVED (2026-08-07)

The operator approved after the migration was applied and the dashboard re-checked.

### Migration application — deviation from plan

The plan's Task 6 step 0 assumed the operator would paste the migration into the
Supabase SQL editor. Three attempts did not reach the database (the `42703`
`column analytics_events.session_id does not exist` error persisted, confirmed
by direct REST query each time, not inferred from the UI).

Resolution: the Supabase CLI was already authenticated with the project linked
(`supabase projects list` showed `"linked":true` for `kyhvgskeihtccylpdkas`), so
`npx supabase db push --linked` applied the migration in seconds. **This should
have been checked before routing the operator to manual SQL paste.** Record for
future phases: check `supabase projects list` first — this project has a working
CLI migration path and does not need hand-pasted DDL.

### Observed evidence (queried directly from the live DB post-approval)

| Metric | Observed |
|---|---|
| `page_view` rows | 4 |
| Rows carrying a `session_id` | 4 (0 NULL) |
| Distinct paths | `/`, `/about`, `/contact` |
| **Distinct sessions (the Visitors card)** | **2** |

Under the pre-06-06 code this card would have read **4**. Success criteria 1, 2
and 3 are met: one session spanning three pages contributes 1, and a second
session still counts separately (the fix does not collapse traffic into a single
visitor).

### Success criteria not exercised

- **Criterion 4 (NULL-session exclusion) — NOT exercised against live data.**
  The 3 pre-migration NULL rows observed before approval are no longer in the
  table, so every remaining row carries a session_id. The exclusion code path is
  correct by inspection and unit-tested, but was never proven against real NULL
  rows.
- The chart's daily-bucket consistency (plan step 4) and the no-regression sweep
  (step 5) were not separately reported by the operator.
