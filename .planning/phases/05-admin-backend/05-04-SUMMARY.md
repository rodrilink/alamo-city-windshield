---
phase: 05-admin-backend
plan: 04
subsystem: auth
tags: [server-actions, supabase-auth, login, logout, verification]

# Dependency graph
requires:
  - phase: 05-admin-backend
    plan: 03
    provides: loginSchema, LoginFormValues, LoginActionState, ADMIN_COPY login keys
provides:
  - "src/lib/auth/auth-actions.ts: loginAction, logoutAction (Server Actions)"
  - "src/components/auth/LoginForm.tsx: client login form wired to loginAction"
  - "src/app/(admin)/admin/login/page.tsx: real login page replacing the Phase 1 placeholder"
  - "Recorded verification evidence for AUTH-03, AUTH-04, USER-04 (already implemented, unmodified)"
affects: [05-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First cookie-writing Server Action in the repo (loginAction/logoutAction) -- uses createClient() from server.ts, never createAdminClient(), because only the cookie-aware client establishes a real browser session"
    - "redirect() called outside any try/catch that could swallow its internal throw"

key-files:
  created:
    - src/lib/auth/auth-actions.ts
    - src/components/auth/LoginForm.tsx
  modified:
    - "src/app/(admin)/admin/login/page.tsx"

key-decisions:
  - "loginAction branches credential vs. reachability failures using isAuthApiError() from @supabase/supabase-js -- a non-AuthApiError (thrown before an HTTP response) or a 5xx status returns ADMIN_COPY.loginUnreachableError; everything else (including invalid_credentials) returns ADMIN_COPY.loginGenericError, the same reference a Zod validation failure returns"
  - "LoginForm does not feed useActionState's state back into useForm's values (unlike BookingForm's D-09 pattern) -- a failed login must not replay the submitted password"

requirements-completed: [AUTH-01, AUTH-02, AUTH-05]

# Metrics
duration: 24min
completed: 2026-08-06
---

# Phase 5 Plan 04: Login/Logout Server Actions and LoginForm Summary

**loginAction/logoutAction Server Actions using the cookie-aware SSR client (never the service-role client), a LoginForm wired via useActionState, and the real /admin/login page replacing the Phase 1 placeholder -- plus recorded verification that AUTH-03/AUTH-04/USER-04 were already correctly implemented and remain untouched.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-06T11:35:00-05:00 (approx, first commit 11:35:56)
- **Completed:** 2026-08-06T11:39:51-05:00
- **Tasks:** 3 completed (1 verification-only, 2 implementation)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Verified AUTH-03, AUTH-04 and USER-04 are already satisfied by pre-existing code, with all four required grep/read checks passing and the three source files (`middleware.ts`, `src/middleware.ts`, `admin.ts`) left completely unmodified
- `loginAction` and `logoutAction` implemented in `src/lib/auth/auth-actions.ts` using the cookie-aware `createClient()` from `server.ts` -- never the service-role client -- with credential failures and reachability failures returning visibly distinct messages
- `LoginForm.tsx` built using the `BookingForm.tsx` `Form`/`FormField` composition pattern, wired to `loginAction` via `useActionState`, with no password preserved across a failed attempt and no `redirectTo`/search-param handling anywhere
- `/admin/login` replaced wholesale with a real Server Component page rendering a centered `Card` + `LoginForm`, staying outside the `(dashboard)` authenticated shell
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npx vitest run` (115/115 tests) all exit 0 after every task

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify AUTH-03, AUTH-04 and USER-04 already satisfied** - verification-only, no commit (no files modified); evidence recorded below
2. **Task 2: Implement loginAction and logoutAction** - `23c3b3d` (feat)
3. **Task 3: Build LoginForm and replace the /admin/login placeholder page** - `ae9a946` (feat)

## Files Created/Modified

- `src/lib/auth/auth-actions.ts` (new) - `loginAction` (Zod re-validation -> `signInWithPassword` via `createClient()` -> credential/reachability branch -> `revalidatePath` + `redirect('/admin')`) and `logoutAction` (`signOut` -> `revalidatePath` -> `redirect('/admin/login')`)
- `src/components/auth/LoginForm.tsx` (new) - client form, `useActionState(loginAction, ...)`, `useForm` with `zodResolver(loginSchema)`, `data-testid="form-login"` / `"input-login-email"` / `"input-login-password"` / `"btn-login-submit"` / `"text-login-error"`
- `src/app/(admin)/admin/login/page.tsx` (replaced) - Server Component rendering `Card` + `LoginForm`, no `'use client'`, no sidebar/logout/nav chrome

## AUTH-03 / AUTH-04 / USER-04 Verification Evidence (Task 1)

1. **AUTH-03 -- `getUser()` not `getSession()`.** `src/lib/supabase/middleware.ts` line 45 calls `supabase.auth.getUser()`, pinned by the load-bearing comment at lines 41-42 citing CVE-2025-29927. `grep -rn "getSession" src/` returns only the two comment lines in `middleware.ts` itself (lines 41-42, explaining why `getSession()` must NOT be used) -- no functional call to `getSession()` exists anywhere in `src/`.
2. **AUTH-04 -- login page excluded.** `middleware.ts` line 49: `const isLoginPage = request.nextUrl.pathname === '/admin/login'` (exact-equality check against the literal path). Line 51's redirect condition is `if (isAdminRoute && !isLoginPage && !user)`. The `(dashboard)` route group plan 05-05 introduces does not change this: Next.js route groups (parenthesized segments) never appear in the resolved pathname, so `/admin/login` remains `/admin/login` regardless of filesystem nesting under `(admin)` or `(dashboard)`.
3. **USER-04 -- service-role key server-only.** `src/lib/supabase/admin.ts` line 1 is exactly `import 'server-only'`. Line 29 reads `process.env.SUPABASE_SERVICE_ROLE_KEY` with no `NEXT_PUBLIC_` prefix. `grep -rl "SUPABASE_SERVICE_ROLE_KEY" src/` lists only `src/lib/supabase/admin.ts`. `grep -rn "NEXT_PUBLIC_SUPABASE_SERVICE" src/` returns no matches. `git check-ignore .env.local` exits 0 (confirmed gitignored).
4. **Env-guard caveat.** `src/lib/supabase/middleware.ts` lines 8-12 return `NextResponse.next()` and skip auth entirely when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is absent -- an intentional dev escape hatch. **This means success criterion 1 ("a logged-out visit to `/admin` redirects to `/admin/login`") can only be verified with `.env.local` loaded.** Without those env vars set, the guard is silently disabled and the redirect will not fire -- this must not be mistaken for a regression when manually verifying.

All three pre-existing files (`src/lib/supabase/middleware.ts`, `src/middleware.ts`, `src/lib/supabase/admin.ts`) were read but never modified -- confirmed by `git diff --name-only` across every commit in this plan, which lists only the three files declared in the plan's `files_modified` frontmatter.

## Exported Signature (for plan 05-05)

```typescript
// src/lib/auth/auth-actions.ts
export async function loginAction(prevState: LoginActionState, formData: FormData): Promise<LoginActionState>
export async function logoutAction(): Promise<void>
```

Plan 05-05 wires `logoutAction` into the `(dashboard)` sidebar's logout control (AUTH-05).

## Decisions Made

- `loginAction`'s credential-vs-reachability branch uses `isAuthApiError()` imported from `@supabase/supabase-js` (re-exported from `@supabase/auth-js`): if the caught error is NOT an `AuthApiError` (e.g. a network failure thrown before any HTTP response), or if it IS an `AuthApiError` with a `status >= 500`, the user sees `ADMIN_COPY.loginUnreachableError`. Every other case -- including the `invalid_credentials` `AuthApiError` -- returns `ADMIN_COPY.loginGenericError`, the exact same message reference a Zod validation failure returns, so a malformed email is indistinguishable from a wrong password (T-05-04-01).
- `LoginForm` does not feed `state` back into `useForm`'s `values` (unlike `BookingForm.tsx`'s D-09 pattern for preserving customer input across a failed booking) -- a login form must never replay a submitted password after a failed attempt.
- `redirect('/admin')` sits inside the `try` block in `loginAction` but AFTER the `if (error)` early-return, so a successful sign-in's `redirect()` throw propagates uncaught to Next.js's router (the `catch` block only ever sees genuine thrown errors from `signInWithPassword` or `revalidatePath`, never the redirect's internal signal).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - acceptance-criteria false-positive] Comment text matched forbidden-string greps**

- **Found during:** Task 2 and Task 3, immediately after writing each file and running the acceptance-criteria greps.
- **Issue:** Explanatory header comments in `auth-actions.ts` (referencing "createAdminClient" and "redirectTo" to explain what the file deliberately does NOT do) and in `LoginForm.tsx` (referencing "useSearchParams()") caused `grep -c "redirectTo\|searchParams"` and `grep -c "createAdminClient"` to report non-zero counts, even though no functional code used those identifiers. This mirrors the exact same false-positive pattern plan 05-03's SUMMARY documented and resolved by inspection rather than code change.
- **Fix:** Reworded the three comments to describe the prohibited pattern in plain English instead of the literal identifier/import name (e.g. "the service-role client" instead of "`createAdminClient()`", "a caller-supplied destination parameter" instead of "`redirectTo`", "the URL's query string" instead of "`useSearchParams()`"), preserving the same explanatory intent without tripping the acceptance-criteria grep.
- **Files modified:** `src/lib/auth/auth-actions.ts`, `src/components/auth/LoginForm.tsx`
- **Commit:** Folded into `23c3b3d` and `ae9a946` respectively (edited before the task's single commit, not a separate commit).

## Issues Encountered

None blocking. The `@supabase/auth-js` package (needed to confirm `isAuthApiError`'s existence and the `invalid_credentials` error code) is hoisted to the parent repo's `node_modules` rather than duplicated in the worktree's local `node_modules` -- resolved via `require.resolve` against the parent path; no code or dependency change was needed since Node's module resolution already finds it correctly at runtime.

## User Setup Required

None. Plan 05-01's `.env.local` and `auth.users` row (verified present per upstream status) are the only external prerequisites, and both were already satisfied before this plan ran.

## Next Phase Readiness

Plan 05-05 ((admin) dashboard layout + sidebar) can now:
- Import `logoutAction` from `@/lib/auth/auth-actions` and wire it to the sidebar's logout control (AUTH-05)
- Rely on `/admin/login` being a fully functional, real login page rather than a placeholder
- Build the `(dashboard)` route group's server-side `getUser()` check following the same `createClient()` + `getUser()` idiom this plan's Task 1 verified is load-bearing in `middleware.ts`

No blockers.

---
*Phase: 05-admin-backend*
*Completed: 2026-08-06*

## Self-Check: PASSED

All 3 created/modified files verified present on disk (`src/lib/auth/auth-actions.ts`, `src/components/auth/LoginForm.tsx`, `src/app/(admin)/admin/login/page.tsx`). Both task commits (`23c3b3d`, `ae9a946`) verified present in git log.
