---
phase: 05-admin-backend
plan: 05
subsystem: auth
tags: [route-groups, admin-layout, sidebar, logout, checkpoint-pending]

# Dependency graph
requires:
  - phase: 05-admin-backend
    plan: 04
    provides: "logoutAction (src/lib/auth/auth-actions.ts)"
provides:
  - "src/app/(admin)/admin/(dashboard)/layout.tsx: D-14 authenticated admin shell (Server Component)"
  - "src/components/layout/AdminSidebar.tsx: Dashboard/Users nav + admin email + logout slot"
  - "src/components/auth/LogoutButton.tsx: client form action wired to logoutAction"
affects: [05-07, 05-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First real (non-passthrough) layout.tsx in this repo -- (public)/layout.tsx remains a bare passthrough"
    - "First Server Component in this repo calling supabase.auth.getUser() directly (identity read for chrome, no redirect duplication)"
    - "Nested route group ((admin)/admin/(dashboard)/) used to exclude /admin/login from a shared-parent layout"

key-files:
  created:
    - "src/app/(admin)/admin/(dashboard)/layout.tsx"
    - "src/components/layout/AdminSidebar.tsx"
    - "src/components/auth/LogoutButton.tsx"
  modified:
    - "src/lib/constants.ts"

key-decisions:
  - "Layout renders no redirect() when user is null -- the middleware (AUTH-03) remains the single owner of that enforcement path, per T-05-05-05's mitigation"
  - "Only user.email (never the full user object, id, or token) is passed as a prop into AdminSidebar, per T-05-05-02"
  - "Added ADMIN_COPY.navDashboardLabel/navUsersLabel (not in this plan's files_modified) to keep sidebar nav labels in the established copy-module convention and resolve an unused-import lint warning -- documented as a deviation below"

requirements-completed: []
requirements-partial: [AUTH-05, ADMIN-01]

# Metrics
duration: pending (checkpoint reached mid-plan)
completed: pending
---

# Phase 5 Plan 05: (dashboard) Route Group Layout, Sidebar, and Logout Summary

**The D-14 authenticated admin shell -- a nested `(dashboard)` route group with a sidebar layout reading identity via `getUser()`, wired to the existing `logoutAction` -- built and automated-verified; a blocking human-verify checkpoint is now open to confirm `/admin/login` renders with none of this chrome.**

## Status: CHECKPOINT REACHED (Task 2 of 2)

Task 1 is complete and committed. Task 2 is a `checkpoint:human-verify` with `gate="blocking"` (per `05-05-PLAN.md` and Assumptions Log A2's MEDIUM-confidence flag on the nested-route-group claim). The automated half of Task 2 is done and both results are recorded below; the visual half requires a human to open a browser, which this agent cannot do.

## Performance

- **Tasks:** 1 of 2 completed; Task 2 automated-portion complete, human-portion pending
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments (Task 1)

- Created `src/app/(admin)/admin/(dashboard)/layout.tsx` -- an async Server Component that calls `createClient()` from `@/lib/supabase/server` then `supabase.auth.getUser()` (never `getSession()`), renders `<AdminSidebar adminEmail={user?.email ?? null} />` alongside `{children}` in a two-column shell, and performs no redirect of its own.
- Did NOT create `src/app/(admin)/admin/layout.tsx` -- confirmed absent. `src/app/(admin)/admin/login/page.tsx` was not touched (`git status --short` on that path showed nothing after Task 1's commit).
- Created `src/components/layout/AdminSidebar.tsx` -- a Server Component rendering "Dashboard" (`/admin`) and "Users" (`/admin/users`) nav links (`data-testid="link-admin-dashboard"` / `"link-admin-users"`), the admin's email (`data-testid="text-admin-email"`, rendered only when present), and `<LogoutButton />`. Styled with theme tokens only (`bg-background`, `border-border`, `text-foreground`, `text-primary`, `text-muted-foreground`) -- no new color literals.
- Created `src/components/auth/LogoutButton.tsx` -- a Client Component rendering `<form action={logoutAction}>` with a submit `Button` (`data-testid="btn-logout"`). Contains no `signOut` call; the sign-out itself is entirely `logoutAction`'s responsibility (05-04).
- All acceptance-criteria greps and `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx vitest run` (115/115) pass -- see verification evidence below.

## Automated Verification (Task 2, before the checkpoint)

- Copied `.env.local` from the parent repo into this worktree (it is gitignored and therefore not carried into a fresh worktree by git) so the middleware auth guard is genuinely active rather than silently disabled, per `05-04-SUMMARY.md`'s recorded caveat that verifying against a disabled guard proves nothing.
- Started `npm run dev` on port 3000.
- `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" http://localhost:3000/admin` → **`307 http://localhost:3000/admin/login`** -- confirms AUTH-03 fires while logged out.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/login` → **`200`**, no redirect -- confirms AUTH-04's exclusion still holds under the new nested-route-group structure.

Both automated results match the plan's acceptance criteria exactly.

## Task Commits

1. **Task 1: Create the (dashboard) route group layout with sidebar and logout** - `546e932` (feat)

## Files Created/Modified

- `src/app/(admin)/admin/(dashboard)/layout.tsx` (new) - async Server Component; `getUser()` identity read; two-column shell (`AdminSidebar` + `main`); no `redirect()`
- `src/components/layout/AdminSidebar.tsx` (new) - Server Component; Dashboard/Users links; conditional admin-email text; embeds `LogoutButton`
- `src/components/auth/LogoutButton.tsx` (new) - Client Component; `<form action={logoutAction}>`; no client-side `signOut()`
- `src/lib/constants.ts` (modified, not in this plan's `files_modified`) - added `ADMIN_COPY.navDashboardLabel` / `navUsersLabel` (see Deviations below)

## Verification Evidence (Task 1 acceptance criteria)

All checks re-run after final edits, in the worktree:

```
test -f "src/app/(admin)/admin/(dashboard)/layout.tsx"        -> exists
test ! -f "src/app/(admin)/admin/layout.tsx"                  -> confirmed absent
git status --short src/app/(admin)/admin/login/page.tsx       -> no output (untouched)
grep -c "getUser()" layout.tsx                                -> 2
grep -c "getSession" layout.tsx                                -> 0
grep -c "from '@/lib/supabase/server'" layout.tsx              -> 1
grep -c "redirect(" layout.tsx                                 -> 0
grep -c 'href="/admin"' AdminSidebar.tsx                       -> 1
grep -c 'href="/admin/users"' AdminSidebar.tsx                 -> 1
grep -c 'data-testid="link-admin-dashboard"' AdminSidebar.tsx  -> 1
grep -c 'data-testid="link-admin-users"' AdminSidebar.tsx      -> 1
grep -c 'data-testid="text-admin-email"' AdminSidebar.tsx      -> 1
head -1 LogoutButton.tsx                                       -> 'use client'
grep -c "action={logoutAction}" LogoutButton.tsx                -> 1
grep -c 'data-testid="btn-logout"' LogoutButton.tsx             -> 1
grep -c "signOut" LogoutButton.tsx                              -> 0
grep -c "TopNav\|Footer" layout.tsx AdminSidebar.tsx            -> 0, 0
npx tsc --noEmit    -> exit 0
npm run lint        -> exit 0 (0 errors, 0 warnings)
npm run build       -> exit 0 (10/10 static pages generated)
npx vitest run      -> 115/115 passing
```

## Decisions Made

- The layout performs no `redirect()` when `user` is null -- the middleware (`src/lib/supabase/middleware.ts`, AUTH-03) remains the single enforcement point for the `/admin/*` guard, avoiding two redirect paths that could drift apart (T-05-05-05).
- Only `user.email` (never the full `user` object, `user.id`, or any token) is passed as a prop into `AdminSidebar` -- no identifier beyond the display email is serialized into the Client Component's RSC payload (T-05-05-02).
- `getUser()` (not `getSession()`) is used for the identity read, mirroring `src/lib/supabase/middleware.ts`'s load-bearing CVE-2025-29927 comment (T-05-05-01).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - false-positive comment text tripping acceptance-criteria greps]**

- **Found during:** Task 1, immediately after writing `layout.tsx` and `AdminSidebar.tsx` and running the acceptance-criteria greps.
- **Issue:** Explanatory comments referencing "getSession()", "redirect()", and "TopNav/Footer" (to describe what the code deliberately does NOT do) tripped the literal-string greps that check those patterns are absent from the functional code -- the exact same false-positive pattern `05-04-SUMMARY.md` documented and resolved.
- **Fix:** Reworded the three comments to describe the prohibited pattern in plain English (e.g. "the session-cookie-only read that call has a comment warning against" instead of "`getSession()`", "no navigation-away call" instead of "no `redirect()`", "public nav/site-footer components" instead of "TopNav/Footer"), preserving the same explanatory intent without tripping the grep.
- **Files modified:** `src/app/(admin)/admin/(dashboard)/layout.tsx`, `src/components/layout/AdminSidebar.tsx`
- **Commit:** Folded into `546e932` (edited before the task's single commit, not a separate commit).

**2. [Rule 1 - unused-import lint warning] Added ADMIN_COPY nav-label keys**

- **Found during:** Task 1, `npm run lint` after the first draft of `AdminSidebar.tsx`.
- **Issue:** `AdminSidebar.tsx` imported `ADMIN_COPY` but the initial draft used inline string literals ("Dashboard", "Users") for the two nav labels, per the plan's "if inline, keep them in `ADMIN_COPY` anyway for consistency" instruction -- which I had not yet done, producing an unused-import lint warning.
- **Fix:** Added `ADMIN_COPY.navDashboardLabel` and `ADMIN_COPY.navUsersLabel` to `src/lib/constants.ts` (a file not in this plan's declared `files_modified`, but an explicitly instructed extension of the plan's own copy-module requirement) and referenced them from `AdminSidebar.tsx` instead of the inline literals.
- **Files modified:** `src/lib/constants.ts`, `src/components/layout/AdminSidebar.tsx`
- **Commit:** Folded into `546e932`.

**3. [Rule 3 - blocking environment gap] Copied `.env.local` into the worktree**

- **Found during:** Task 2's automated pre-checkpoint verification.
- **Issue:** `.env.local` is gitignored (correctly) and therefore was not carried into this fresh worktree by git -- only `.env.example` was present. Without it, `src/lib/supabase/middleware.ts`'s env guard silently disables the entire auth check (`NextResponse.next()` passthrough), which would make both `curl` checks pass or fail for the wrong reason and prove nothing, per `05-04-SUMMARY.md`'s recorded caveat.
- **Fix:** Copied `.env.local` from the parent repo (`F:/2026/Projects/Windshield/.env.local`) into this worktree's root. Confirmed it remains gitignored in the worktree (`git check-ignore .env.local` still exits 0) so it will never be staged or committed. No key values were read, printed, or logged.
- **Files modified:** none tracked by git (a local, gitignored file copy only).

## Issues Encountered

None blocking beyond the checkpoint itself. `git status --short` initially appeared to omit `src/app/(admin)/admin/login/page.tsx` from the diff -- this is the desired state (the file is untouched by this plan), not an issue.

## User Setup Required

None beyond the checkpoint's own request below.

## CHECKPOINT: Task 2 -- Confirm the route-group split leaves /admin/login bare

**Automated results (already gathered above):**
1. `curl` against `/admin` while logged out: **`307`**, redirect target `/admin/login` -- PASS
2. `curl` against `/admin/login`: **`200`**, no redirect -- PASS

**What remains -- the human visual check this checkpoint exists for:**

The dev server is running on `http://localhost:3000` with `.env.local` (real Supabase credentials) loaded, so the middleware guard is genuinely active.

1. Open `http://localhost:3000/admin/login` in a logged-out browser (or a private window).
2. Confirm you see the login form and confirm you do NOT see: a sidebar, a "Dashboard" link, a "Users" link, an email address, or a logout button.
3. Confirm no empty or stray element sits where a sidebar would be.
4. Log in using the admin credentials from plan `05-01`. You should land at `/admin`. Because `05-07` has not run yet, expect a **404 page** there -- but confirm whether that 404 renders WITH the sidebar shell around it (correct: the layout applies to the group) or without.
5. Report: "login page is bare" plus what you saw at `/admin` after logging in, or describe exactly what chrome appeared on the login page.

If the human reports sidebar chrome on the login page, this plan is not done -- the layout must be relocated and this checkpoint re-run.

## Next Phase Readiness

Blocked on the human confirmation above. Once received, a continuation agent will:
- Record the human's verbatim confirmation in this SUMMARY
- Finalize duration/completion metrics
- Hand off readiness notes to `05-07`/`05-08`, which place their `page.tsx` files inside this now-verified `(dashboard)` structure

## Self-Check: PASSED

All 3 created files verified present on disk in the worktree (`src/app/(admin)/admin/(dashboard)/layout.tsx`, `src/components/layout/AdminSidebar.tsx`, `src/components/auth/LogoutButton.tsx`). Commit `546e932` verified present in `git log --oneline`.

---
*Phase: 05-admin-backend*
*Status: checkpoint pending human verification*
