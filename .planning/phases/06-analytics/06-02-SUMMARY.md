---
phase: 06-analytics
plan: 02
subsystem: analytics
tags: [nextjs, react, typescript, supabase, client-component, page-view-tracking]

# Dependency graph
requires:
  - phase: 06-analytics
    provides: "ANALYTICS_EVENTS/AnalyticsEventType contract and trackServerEvent/trackBrowserEvent helpers from plan 06-01"
provides:
  - "src/components/analytics/PageViewTracker.tsx — a 'use client' side-effect-only component that fires ANALYTICS_EVENTS.PAGE_VIEW on mount and on pathname change, deduped per path per session via guarded sessionStorage"
  - "src/app/(public)/layout.tsx mounts <PageViewTracker /> alongside {children} — the single insertion point covering all (public) routes (D-05)"
  - "src/lib/analytics/track-browser-event.ts — trackBrowserEvent split out of track-event.ts into its own browser-safe module, closing a server-only-leak-into-client-bundle build failure"
affects: [06-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-Component-safe module boundary: any helper consumed by a Client Component must live in a module whose entire static import graph is browser-safe — co-locating a server-only-tainted export in the same file blocks the production build even if the Client Component never calls that export"

key-files:
  created:
    - src/components/analytics/PageViewTracker.tsx
    - src/lib/analytics/track-browser-event.ts
  modified:
    - src/app/(public)/layout.tsx
    - src/lib/analytics/track-event.ts

key-decisions:
  - "Session-storage key format: SESSION_STORAGE_PREFIX ('pv:') + pathname, e.g. 'pv:/about' — one row per distinct pathname per session (D-08)"
  - "The dashboard's 'Total Visitors' card counts distinct page-visits per session, not unique people, as a direct consequence of the path+session dedupe key (D-08). This must not be described as a unique-visitor count in any future dashboard copy or documentation."
  - "trackBrowserEvent moved from track-event.ts into a new sibling module track-browser-event.ts (Rule 3 auto-fix, not in the original plan's files_modified) — see Deviations below"

patterns-established:
  - "Split-by-runtime-boundary for tracking helpers: trackServerEvent stays in track-event.ts (server-only-tainted via createAdminClient), trackBrowserEvent lives in track-browser-event.ts (browser-safe via createClient). Any future browser-consumed analytics helper should follow this file-per-runtime-boundary split rather than sharing a module with server-only code."

requirements-completed: [ANLY-02, ANLY-06]

# Metrics
duration: 25min
completed: 2026-08-07
---

# Phase 6 Plan 2: Page-View Tracking via Layout-Mounted Client Tracker Summary

**A `'use client'` `PageViewTracker` mounted once in `(public)/layout.tsx` fires `page_view` on every public-route visit and pathname change, deduped per path per session via guarded `sessionStorage` — and a build-breaking `server-only` leak from the shared Phase-6-wave-1 tracking module was split out along the way.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-07T17:27:00Z (approx, per worktree base state)
- **Completed:** 2026-08-07T17:52:34Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Created `src/components/analytics/PageViewTracker.tsx` — a `'use client'` component rendering `null`, firing `trackBrowserEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: pathname })` on mount and on every `usePathname()` change, with dedupe and storage-failure handling entirely swallowed per D-07/D-08/D-12.
- Mounted `<PageViewTracker />` in `src/app/(public)/layout.tsx` alongside `{children}` — the single structural insertion point covering `/`, `/about`, `/contact`, and `/book`, with `(admin)` excluded structurally by having its own separate layout tree (D-06).
- Discovered and fixed a production-build failure: `PageViewTracker`'s import of `trackBrowserEvent` transitively pulled in `trackServerEvent`'s `createAdminClient` (which carries `import 'server-only'`) because both functions lived in the same `track-event.ts` module. Split `trackBrowserEvent` into a new `src/lib/analytics/track-browser-event.ts` so the Client Component's import graph never touches server-only code, while every existing and future server-side `trackServerEvent` import path (`@/lib/analytics/track-event`, used by 06-01/06-03/06-04) is unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the PageViewTracker client component** - `0d5336a` (feat)
2. **Task 2: Mount the tracker in the public layout** - `da27de0` (feat) — includes the Rule 3 module-split fix required to pass this task's own `npm run build` acceptance criterion

**Plan metadata:** committed alongside this SUMMARY (worktree mode — orchestrator merges and finalizes STATE.md/ROADMAP.md centrally)

## Files Created/Modified

- `src/components/analytics/PageViewTracker.tsx` - `'use client'` component, `usePathname()` + `useEffect([pathname])`, guarded `sessionStorage` dedupe keyed `pv:` + pathname, calls `trackBrowserEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: pathname })`, returns `null`, no console output.
- `src/app/(public)/layout.tsx` - Added the `PageViewTracker` import and mounted it in a fragment alongside `{children}`; `PublicLayout`'s name, default export, and prop signature preserved exactly.
- `src/lib/analytics/track-browser-event.ts` (new) - `trackBrowserEvent(eventType, fields?)`, identical signature and behavior to the one previously in `track-event.ts`, importing only `createClient` from `@/lib/supabase/client` — no server-only transitive dependency.
- `src/lib/analytics/track-event.ts` - Removed `trackBrowserEvent` and its `createClient` import; kept `trackServerEvent` unchanged; updated the module-header comment to explain the split and why re-merging the two functions would silently reintroduce the build failure.

## Decisions Made

- Session-storage key format is `SESSION_STORAGE_PREFIX + pathname` where `SESSION_STORAGE_PREFIX = 'pv:'`, e.g. `pv:/about`, `pv:/`. This is a module-scope named constant, not an inline literal, per the repo's established convention (`bucket-by-day.ts`'s `ANALYTICS_WINDOW_DAYS`, etc.).
- Recorded explicitly per plan's `<output>` instruction: the "Total Visitors" summary card and the visitors chart, once this plan's rows accumulate, count **distinct page-visits per session**, not unique people — Home → About → Home writes two rows, not three, and no future dashboard copy should describe this as a unique-visitor metric (D-08).
- `trackBrowserEvent` now lives in its own file rather than beside `trackServerEvent`. This is a narrower, mechanical version of D-09's "split write path" principle — extended one level further, by runtime boundary rather than by write-target, because the wave-1 file layout accidentally combined a server-only-tainted export with a browser-consumed one in a single module.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Split `trackBrowserEvent` out of `track-event.ts` into a new `track-browser-event.ts` to fix a production build failure**
- **Found during:** Task 2 (Mount the tracker in the public layout) — running the task's own `npm run build` acceptance criterion
- **Issue:** `src/lib/analytics/track-event.ts` (created in plan 06-01) exported both `trackServerEvent` (imports `createAdminClient` from `@/lib/supabase/admin`, which carries `import 'server-only'`) and `trackBrowserEvent` from the same module. `PageViewTracker.tsx`, a Client Component, imports only `trackBrowserEvent`, but because `server-only`'s marker is evaluated by the bundler at module-graph-inclusion time (not call time), the entire module — including its `createAdminClient` import — was pulled into the browser bundle's dependency graph, and `npm run build` failed with: *"You're importing a component that needs 'server-only'... Import trace: `./src/lib/supabase/admin.ts` → `./src/lib/analytics/track-event.ts` → `./src/components/analytics/PageViewTracker.tsx`"*. This is exactly the failure mode the plan's own threat model (T-06-02-04) names `npm run build` as the enforcing check for.
- **Fix:** Created `src/lib/analytics/track-browser-event.ts` containing only `trackBrowserEvent` and its browser-safe import (`createClient` from `@/lib/supabase/client`) — byte-identical function body and signature to the original. Removed `trackBrowserEvent` and the now-unused `createClient` import from `track-event.ts`, leaving it with only `trackServerEvent` and `createAdminClient`. Updated `PageViewTracker.tsx`'s import to `from '@/lib/analytics/track-browser-event'`. Confirmed via grep that no other file in the repo imports `trackBrowserEvent` (before this fix, `PageViewTracker.tsx` was its only consumer), so the existing `@/lib/analytics/track-event` import path used by plan 06-01's own code and by sibling plans 06-03/06-04 (which import only `trackServerEvent` from that same path, for server-side call sites) is completely unaffected.
- **Files modified:** `src/lib/analytics/track-event.ts` (removed `trackBrowserEvent` + its import, updated header comment), `src/lib/analytics/track-browser-event.ts` (new), `src/components/analytics/PageViewTracker.tsx` (updated one import line)
- **Verification:** `npm run build` now exits 0 (previously failed with a webpack compile error). `npx tsc --noEmit` exits 0. `npx eslint src/components/analytics src/lib/analytics "src/app/(public)/layout.tsx"` exits 0. `npx vitest run` — all 12 pre-existing test files / 120 tests still pass (the split touched no test-covered logic; `trackServerEvent`'s body and signature are unchanged). Manually confirmed via `grep -rln "trackBrowserEvent" src` that only `PageViewTracker.tsx` and `track-browser-event.ts` reference the function post-split, and `grep -rln "trackServerEvent"` shows the server-side consumers unaffected.
- **Committed in:** `da27de0` (Task 2 commit — bundled with the layout mount since the build failure was discovered while verifying that same task, and the fix has no independent behavior of its own to warrant a separate commit)

---

**Total deviations:** 1 auto-fixed (1 blocking / Rule 3)
**Impact on plan:** Necessary to satisfy the plan's own Task 2 acceptance criterion (`npm run build` exits 0) and its threat model's T-06-02-04 mitigation. No scope creep — the fix is a mechanical module split with identical exported signatures and behavior; no sibling plan's file (`contact-actions.ts`, `booking-actions.ts`, `route.ts`, `dashboard-queries.ts`) was touched, and their existing/future imports of `trackServerEvent` from `@/lib/analytics/track-event` continue to resolve exactly as before.

## Issues Encountered

None beyond the build failure documented above, which was resolved within this plan's own execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 06-05 (end-to-end manual UAT checkpoint) can now exercise `page_view` tracking across all four public routes: visiting `/`, `/about`, `/contact`, `/book` and navigating between them client-side should each write exactly one `analytics_events` row per distinct path per browser session, with no rows for `/admin/*`.
- The ADMIN-02 visitors chart and the "Total Visitors" summary card (Phase 5, currently reading zero rows) will begin showing real data once this tracker fires in a live session — no further code change needed on the read side.
- `PageViewTracker` itself remains untestable by unit test — this repo has zero component-test infrastructure (no `@testing-library/react`, no `jsdom`), a standing gap recorded in `STATE.md` and unchanged by this plan. Runtime behavior verification is deferred to plan 06-05's manual checkpoint, consistent with the plan's own `<verification>` section.
- Downstream plans 06-03 (VIN-search tracking) and 06-04 (contact/booking tracking) import only `trackServerEvent` from `@/lib/analytics/track-event`, which this plan's fix left fully intact — no action needed on their part when merged.

## Self-Check: PASSED

- FOUND: `src/components/analytics/PageViewTracker.tsx`
- FOUND: `src/app/(public)/layout.tsx` (contains `PageViewTracker`)
- FOUND: `src/lib/analytics/track-browser-event.ts`
- FOUND: `src/lib/analytics/track-event.ts`
- FOUND commit: `0d5336a`
- FOUND commit: `da27de0`

---
*Phase: 06-analytics*
*Completed: 2026-08-07*
