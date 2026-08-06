---
phase: 05-admin-backend
plan: 09
subsystem: verification
tags: [uat, success-criteria, d-10-guards, human-verify]

requires:
  - phase: 05-admin-backend
    plan: 04
    provides: "login/logout Server Actions"
  - phase: 05-admin-backend
    plan: 05
    provides: "(dashboard) sidebar shell"
  - phase: 05-admin-backend
    plan: 07
    provides: "/admin dashboard page"
  - phase: 05-admin-backend
    plan: 08
    provides: "/admin/users management surface"
provides:
  - "Human-confirmed pass on all five Phase 5 ROADMAP success criteria"
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "Verification run inline by the orchestrator rather than via a spawned executor: this plan writes no code, and its automatable portions are HTTP/markup assertions the orchestrator could run directly while relaying the live checks to the human"
  - "AUTH-04 verified at the markup level (absence of all four sidebar data-testid markers in the served HTML), not merely by HTTP status -- closes the visual check left open at 05-05's checkpoint"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, USER-01, USER-02, USER-03, USER-04]
requirements-partial: []

duration: ~10 min
completed: 2026-08-06
---

# Phase 5 Plan 09: Live Verification Summary

**All five Phase 5 ROADMAP success criteria confirmed against the running application
with `.env.local` loaded; both D-10 guard refusals exercised live; no admin lockout.**

## Status: COMPLETE (2/2 tasks)

## Human verdict

Verbatim:

> approved, all worked ok

Confirmed against a dev server freshly restarted on the fully-merged Wave 4 code
(`.next` cleared first, so no stale build was under test).

## Success Criteria Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Any `/admin/*` URL while logged out redirects to `/admin/login`, no flash of admin content | **PASS** | Automated: `/admin` → 307 → `/admin/login`; `/admin/users` → 307 → `/admin/login`. Markup: none of `link-admin-dashboard`, `link-admin-users`, `btn-logout`, `text-admin-email` appear in the served `/admin/login` HTML, so there is no authenticated chrome to flash |
| 2 | Login lands on the dashboard; logout clears session and returns to login | **PASS** | Human-confirmed. Logout was separately confirmed working at 05-05's checkpoint |
| 3 | Dashboard shows summary cards and a chart per metric over time | **PASS** | Human-confirmed. Visitors and VIN-search charts correctly display the `trackingStartsHint` empty state -- see Known Limitation below |
| 4 | Dashboard shows recent-contacts and upcoming-appointments tables | **PASS** | Human-confirmed |
| 5 | An admin can add a new admin account and remove an existing one | **PASS** | Human-confirmed |

## D-10 Guard Refusals (live)

| Guard | Predicate (05-03) | Enforcement site | Result |
|-------|-------------------|------------------|--------|
| Self-delete | `isSelfDeleteAttempt` | `admin-users-actions.ts:189` | **Refused live** |
| Last-admin | `isLastAdminAttempt` | `admin-users-actions.ts:194` | **Refused live** |

Both guards sit ahead of `adminSupabase.auth.admin.deleteUser()` (line 200), which is
unreachable until both pass. Caller identity is derived server-side via `getUser()`
(line 171) -- never read from client-submitted `formData`, so the self-delete guard
cannot be bypassed by forging a `callerId`. Verified by reading the source, not by
trusting the executor's report.

**No admin lockout.** Human confirmed continued ability to log in after the removal
tests. This mattered more than usual: D-08 leaves no password-reset flow and no email
delivery, so a lockout would have been recoverable only from the Supabase dashboard.

## Design Decisions Verified

| Decision | Verification |
|----------|--------------|
| D-06 — no migration this phase | `git diff --name-only 3350382 HEAD -- supabase/` returns empty |
| D-09 — login lands on `/admin` | `redirect('/admin')` at `auth-actions.ts:84`, fixed destination with no query-string read |
| D-10 — both refusals exercised live | See table above |
| D-14 — `/admin/login` outside the sidebar shell | Markup-level absence of all four sidebar markers |
| D-15 — dashboard tables carry no row actions | No `onClick`/`button`/`Link` in either table component |

## Repository-wide Gate State

Run on the merged tree immediately before this verification:

```
npx tsc --noEmit   -> exit 0
npx vitest run     -> 115/115 passing (11 files)
npm run lint       -> exit 0, clean
npm run build      -> exit 0, 12/12 pages
```

Build route table confirms all three admin routes: `/admin` (109 kB, dynamic -- correct,
it reads cookies), `/admin/login` (3.33 kB), `/admin/users` (6.88 kB).

## Known Limitation (not a defect)

The **visitors** (ADMIN-02) and **VIN-search** (ADMIN-04) charts render
`ADMIN_COPY.trackingStartsHint` ("Tracking starts in Phase 6") rather than data.
`dashboard-queries.ts` reads `analytics_events` rows with `event_type` values
`'page_view'` and `'vin_search'`, and **nothing writes those rows yet** -- the event
producer is Phase 6 work. `ActivityChart` treats an all-zero series as empty via
`.some(bucket => bucket.count > 0)`, so this presents as a deliberate empty state
rather than a broken axis.

Criterion 3 is therefore satisfied structurally (a chart exists per metric, each
handling read-failure, empty, and populated states) while two of the three series stay
empty until Phase 6. The **contacts** chart (ADMIN-03) reads the real `contacts` table
per the D-18 amendment and shows live data.

**Phase 6 must reconcile its emitted `event_type` literals against these two
consumers.** A mismatch produces silently empty charts, not an error. Tracked in
STATE.md.

## Bug Found Earlier in This Phase (context for the record)

05-05's checkpoint surfaced a blocking defect that all automated checks had missed:
`LoginForm.tsx` dispatched its Server Action outside a transition, so a **successful**
login threw a client-side exception instead of navigating. Fixed in `680656a`. Root
cause was `05-PATTERNS.md` prescribing a form pattern valid only for non-redirecting
actions. The fix is confirmed still holding here against the real dashboard page rather
than the temporary probe used at the time.

This is the strongest argument for this plan existing: `curl`-based checks passed
throughout, because they never exercise the authenticated success path.

## Deviations

**Execution method.** The plan anticipated a spawned executor walking the human
through verification. Run inline by the orchestrator instead: the plan modifies no
files, and its automatable portions (HTTP status assertions, markup grep for sidebar
markers, D-06/D-09/D-15 source checks) were faster to run directly than to delegate,
while the human-only portions had to be relayed to the developer regardless. No
acceptance criterion was weakened -- if anything AUTH-04 was verified more strictly
than specified, at the markup level rather than by status code alone.

No repository files were modified by this plan, as designed.

## Self-Check: PASSED

- [x] All five ROADMAP success criteria recorded with a result
- [x] Human confirmation recorded verbatim
- [x] Both D-10 guard refusals exercised live and recorded
- [x] Post-run admin access confirmed -- no lockout
- [x] D-06, D-09, D-10, D-14, D-15 each verified with concrete evidence
- [x] No credential material recorded anywhere in this summary
- [x] `git status --porcelain` clean -- no repository file modified by this plan

---
*Phase: 05-admin-backend*
*Status: complete -- human approved 2026-08-06*
