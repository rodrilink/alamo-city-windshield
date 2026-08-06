---
phase: 05-admin-backend
reviewed: 2026-08-06T00:00:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - src/app/(admin)/admin/(dashboard)/layout.tsx
  - src/app/(admin)/admin/(dashboard)/page.tsx
  - src/app/(admin)/admin/(dashboard)/users/page.tsx
  - src/app/(admin)/admin/login/page.tsx
  - src/components/admin-users/AddUserForm.tsx
  - src/components/admin-users/RemoveUserDialog.tsx
  - src/components/admin-users/UserList.tsx
  - src/components/auth/LoginForm.tsx
  - src/components/auth/LogoutButton.tsx
  - src/components/dashboard/ActivityChart.tsx
  - src/components/dashboard/ContactsChart.tsx
  - src/components/dashboard/RecentContactsTable.tsx
  - src/components/dashboard/SummaryCards.tsx
  - src/components/dashboard/UpcomingAppointmentsTable.tsx
  - src/components/dashboard/VinSearchChart.tsx
  - src/components/dashboard/VisitorsChart.tsx
  - src/components/layout/AdminSidebar.tsx
  - src/lib/admin-users/add-user-schema.ts
  - src/lib/admin-users/add-user-schema.test.ts
  - src/lib/admin-users/admin-guards.ts
  - src/lib/admin-users/admin-guards.test.ts
  - src/lib/admin-users/admin-users-actions.ts
  - src/lib/analytics/bucket-by-day.ts
  - src/lib/analytics/bucket-by-day.test.ts
  - src/lib/auth/auth-actions.ts
  - src/lib/auth/login-schema.ts
  - src/lib/auth/login-schema.test.ts
  - src/lib/constants.ts
  - src/lib/dashboard/dashboard-queries.ts
  - src/types/admin.ts
  - src/types/auth.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-08-06
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Reviewed the admin auth/dashboard/user-management surface (Server Actions, guards, schemas,
dashboard read path, and their consuming components). The priority areas held up well under
direct inspection:

- **Auth boundary correctness**: confirmed clean. The service-role client
  (`src/lib/supabase/admin.ts`) is fenced with `import 'server-only'`, and both files that call
  it (`auth-actions.ts`, `admin-users-actions.ts`) are `'use server'` modules — unreachable from
  any Client Component. `removeUserAction` derives caller identity via `getUser()` (JWT
  revalidation), never from `formData`, and never from `getSession()`.
- **D-10 guard ordering**: `isSelfDeleteAttempt` and `isLastAdminAttempt` both run, and both run
  before `auth.admin.deleteUser()`, in `admin-users-actions.ts:189-200`. No short-circuit or
  bypass path exists in the code as written. However, see WR-01 below — the guard is a
  read-then-act check with no backing DB constraint, so a genuine (if narrow) race exists.
- **Credential/secret hygiene**: verified no `password`/`confirmPassword`/`generatedPassword`
  reaches any `console.*` call. Every error-path log in `admin-users-actions.ts` logs only
  `{ error, email }`, never a password field.
- **Account enumeration**: `loginAction` returns the identical `ADMIN_COPY.loginGenericError`
  reference for both a Zod validation failure and a Supabase credential failure — confirmed no
  branch leaks a distinguishing signal.
- **Dashboard empty/failure-state handling**: `bucketByDay` always returns a full, zero-filled
  window (verified against its own test suite), and every `dashboard-queries.ts` function
  returns a structurally distinct `{ ok: false }` on any error branch rather than collapsing to
  an empty array. `ActivityChart` checks `!result.ok` before checking "all zero," so a failure
  and a legitimate empty result render different copy.
- **Server/client boundary leakage**: no `'use client'` file in this set imports a server-only
  module; `DashboardLayout` passes only `user?.email ?? null` (a plain string) across the
  Server→Client boundary, never the full `user` object.

Three Warnings and two Info items follow — none rise to Critical (no exploitable vulnerability
or crash was found; the TOCTOU issue in WR-01 requires a narrow, admin-only race condition to
trigger and doesn't cross a boundary from outside the admin trust zone).

## Warnings

### WR-01: `isLastAdminAttempt` guard is a read-then-act check with no atomic backing — concurrent removals can delete every admin

**File:** `src/lib/admin-users/admin-users-actions.ts:178-200`
**Issue:** `removeUserAction` reads the total admin count via `listUsers()`, then separately
calls `deleteUser()` — there is no transaction, row lock, or DB-level constraint tying the two
together (confirmed against `supabase/migrations/20260412000000_initial_schema.sql`: nothing
prevents `auth.users` from reaching zero rows). With exactly two admins, A and B, a scenario
where A submits "remove B" and B submits "remove A" at nearly the same time can pass both
requests through guard 2 (`isLastAdminAttempt(2)` → `false` for both, since each reads the
pre-delete count of 2 concurrently) before either `deleteUser()` call lands. Both deletes then
succeed, leaving zero admins — exactly the outcome D-10 guard 2 exists to make impossible, and
with no surviving admin, the system has no path back in without out-of-band database access.
This is a narrow window (requires two admins to submit conflicting removals within the same
request lifetime) but it is a real defect in the stated invariant, not a hypothetical: the
`<=1` defensive framing in `isLastAdminAttempt`'s own doc comment ("a count of zero should never
be reachable but must never be treated as safe") is the exact invariant this race can violate.
**Fix:** Either (a) serialize removals with a lightweight advisory lock / re-check the count
immediately before `deleteUser()` inside the same critical section isn't sufficient either since
Supabase Admin API calls aren't transactional with each other — the more robust fix is (b) after
`deleteUser()` succeeds, re-list and verify at least one admin remains; if not, this is
unrecoverable via the API alone, so the practical mitigation is (c) accept the narrow risk but
document it explicitly in the header comment (currently the comment asserts the guards fully
prevent this, which is not quite true), or (d) reduce the window by having the two guard checks
and the delete call run against a `SELECT ... FOR UPDATE`-style single source of truth, which
Supabase Admin API doesn't expose — so at minimum, downgrade the current comment's certainty and
consider a periodic reconciliation job/alert if the admin count ever reaches zero.

### WR-02: `RemoveUserDialog` renders the same "Remove {email}?" text in both the title and the description

**File:** `src/components/admin-users/RemoveUserDialog.tsx:57-60`
**Issue:**
```tsx
<AlertDialogTitle>Remove {email}?</AlertDialogTitle>
<AlertDialogDescription>
    Remove {email}? {ADMIN_COPY.removeUserConfirmBody}
</AlertDialogDescription>
```
The description repeats the full question the title already asks, then appends the "they will
immediately lose access" body. A sighted user sees the same sentence appear twice in the dialog;
a screen-reader user hears it twice back-to-back (Base UI's `AlertDialog` wires
`aria-labelledby`/`aria-describedby` to these two elements, so both are announced together).
This reads as a copy-paste artifact from `ADMIN_COPY.removeUserConfirmBody`'s own header comment,
which describes the intended pattern as "the caller interpolates the target email before this
sentence" — implying the email should be interpolated once, in the description, not duplicated
in the title too.
**Fix:**
```tsx
<AlertDialogTitle>Remove admin account?</AlertDialogTitle>
<AlertDialogDescription>
    Remove {email}? {ADMIN_COPY.removeUserConfirmBody}
</AlertDialogDescription>
```

### WR-03: `AddUserForm` success view has no way back to the form without a full page reload

**File:** `src/components/admin-users/AddUserForm.tsx:74-76`
**Issue:**
```tsx
<Button variant="outline" size="sm" onClick={() => window.location.reload()}>
    Add another admin
</Button>
```
`window.location.reload()` triggers a full server round-trip and discards all client-side
`useActionState`/`useForm` state, which works but is a heavier-handed reset than necessary in a
Next.js App Router app, and it briefly re-renders the login-shell-less page from scratch. More
significantly: this button is the same one that carries `state.generatedPassword` and
`state.values.email` in the DOM one paint before it fires — not a bug by itself, but combined
with WR-02's UX-defect flavor, it means the only escape from the "show password once" screen is a
full reload rather than resetting local form state, which is a rougher UX than the rest of this
form's `useActionState` composition otherwise achieves. This is not a security issue (the
password isn't reachable after reload since the server never persists it beyond the one
response), but it is worth flagging as inconsistent with the surrounding pattern where every
other action in this file re-renders via React state rather than a hard navigation.
**Fix:** Reset local state instead of reloading, e.g. lift a `key` on `AddUserForm` from the
parent and bump it, or add a local `useState` "dismissed" flag that returns to rendering the
`<Form>` subtree with `form.reset()` called first. If the hard reload is intentional (e.g. to
guarantee `useActionState`'s state can't retain `generatedPassword` in memory), say so in the
header comment, since the comment currently doesn't explain this design choice.

## Info

### IN-01: `formatDate` in `UserList.tsx` uses `toLocaleDateString` with an unstated locale/timezone assumption

**File:** `src/components/admin-users/UserList.tsx:30-32`
**Issue:** `new Date(iso).toLocaleDateString('en-US', {...})` renders in the **browser's** local
timezone, not `America/Chicago` (the business timezone `src/lib/server-time.ts` establishes as
canonical elsewhere in this phase). For an admin viewing the dashboard from outside Central time,
a `created_at`/`last_sign_in_at` timestamp near midnight could display on a different calendar
day than the same value would in `UpcomingAppointmentsTable`'s `America/Chicago`-anchored
formatting. This is a Server Component's data rendered in a Client Component with no server-side
date formatting, so it's inherently browser-local — likely acceptable for an internal-only,
low-stakes "created/last sign-in" display column, but it is an inconsistency with this phase's
otherwise-careful `date-time.md`/D-06 timezone discipline. Not upgraded to Warning since no user
story or requirement in this phase specifies a required display timezone for these two columns.

### IN-02: No component-test coverage for the Server Actions' guard-ordering behavior

**File:** `src/lib/admin-users/admin-users-actions.ts`
**Issue:** `admin-guards.ts`'s pure predicates are well-covered by `admin-guards.test.ts`, but
there is no test (unit or otherwise) exercising `removeUserAction`'s actual call ordering — i.e.
that the guards are invoked before `deleteUser()` in the composed action, not just that the
predicates return the right booleans in isolation. Given this repo's stated zero
component-test-infrastructure constraint (no `@testing-library/react`/jsdom), a full Server
Action test isn't available cheaply, but a lighter option (e.g. a Jest/Vitest mock of the
Supabase admin client's `deleteUser` verifying it's called only after both guard functions have
been invoked with the right arguments, exactly mirroring the `mockSnsPublisher` pattern from the
testing standards) would catch a future refactor that reorders these calls. Noting once per this
phase's guidance; not a blocking gap given the current explicit scope decision.

---

_Reviewed: 2026-08-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
