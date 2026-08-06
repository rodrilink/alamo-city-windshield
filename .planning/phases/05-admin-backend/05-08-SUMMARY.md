---
phase: 05-admin-backend
plan: 08
subsystem: auth
tags: [server-actions, supabase-auth-admin-api, alert-dialog, base-ui, react-hook-form, zod]

# Dependency graph
requires:
  - phase: 05-admin-backend
    plan: 03
    provides: "isSelfDeleteAttempt/isLastAdminAttempt (D-10), addUserSchema (D-12), AddUserActionState/RemoveUserActionState, ADMIN_COPY user-management keys"
  - phase: 05-admin-backend
    plan: 02
    provides: "alert-dialog.tsx and table.tsx primitives (Base UI, not Radix)"
  - phase: 05-admin-backend
    plan: 05
    provides: "the (dashboard) layout.tsx shell this page renders inside"
provides:
  - "src/lib/admin-users/admin-users-actions.ts: listAdmins, addUserAction, removeUserAction (Server Actions)"
  - "src/app/(admin)/admin/(dashboard)/users/page.tsx: the /admin/users route"
  - "src/components/admin-users/UserList.tsx, RemoveUserDialog.tsx, AddUserForm.tsx"
affects: ["05-09 (verification of D-10 guard refusals and full user-management flow)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First Server Actions in this repo calling auth.admin.* (Supabase Auth Admin API) rather than a table insert -- createAdminClient() used exclusively for listUsers/createUser/deleteUser, never for the caller-identity read"
    - "Caller identity for a destructive guard derived server-side via getUser() through the cookie-aware server.ts client, never accepted from formData -- the untrusted-target-id / trusted-caller-id split is the load-bearing security property of this plan"
    - "A prop-passed test-id template (triggerTestId) lets a parent list component own its per-row data-testid naming while a reusable dialog component stays generic"

key-files:
  created:
    - src/lib/admin-users/admin-users-actions.ts
    - src/app/(admin)/admin/(dashboard)/users/page.tsx
    - src/components/admin-users/UserList.tsx
    - src/components/admin-users/RemoveUserDialog.tsx
    - src/components/admin-users/AddUserForm.tsx
  modified: []

key-decisions:
  - "listUsers() is called once per removeUserAction invocation and its result backs both guard 2's total count and (implicitly) confirms the caller can reach the Admin API -- no separate existence check was added for the target id beyond what deleteUser() itself would report, since the plan's guard sequence only requires the count and the caller's own id"
  - "last_sign_in_at is normalized from undefined to null inside listAdmins() (AdminListItem.lastSignInAt: string | null) so every downstream consumer (UserList) has one consistent 'no value' shape to check, rather than re-deriving the undefined-vs-null distinction in the component"
  - "RemoveUserDialog accepts triggerTestId as a prop rather than constructing btn-remove-user-${userId} internally, so the row-user-/btn-remove-user- test-id templates the plan's acceptance criteria expect to find in UserList.tsx are genuinely authored there, while the dialog component itself stays reusable and untied to a specific naming scheme"

requirements-completed: [USER-01, USER-02, USER-03, USER-04]

# Metrics
duration: ~45min
completed: 2026-08-06
---

# Phase 5 Plan 08: Admin User Management (/admin/users) Summary

**Three Server Actions (listAdmins/addUserAction/removeUserAction) calling the Supabase Auth Admin API through createAdminClient(), with both D-10 guards (self-delete, last-admin) enforced server-side before any deleteUser() call, wired to a new /admin/users page with a table list, an alert-dialog removal confirmation naming the target email, and an add-admin form showing the generated password exactly once.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 3 completed
- **Files modified:** 5 (all created, none modified)

## Accomplishments

- `src/lib/admin-users/admin-users-actions.ts` created with `listAdmins`, `addUserAction`, `removeUserAction` — all three Supabase Auth Admin API calls (`listUsers`, `createUser`, `deleteUser`) run exclusively through `createAdminClient()`; the caller's own identity for the self-delete guard is derived server-side via `getUser()` through the cookie-aware `server.ts` client, never read from `formData`.
- Both D-10 guards (`isSelfDeleteAttempt`, `isLastAdminAttempt`, imported unmodified from plan 05-03) run inside `removeUserAction` before any `deleteUser()` call, confirmed by direct grep of the source ordering.
- `src/app/(admin)/admin/(dashboard)/users/page.tsx` created as an async Server Component (no `'use client'`) at exactly the path that resolves to `/admin/users` inside the existing `(dashboard)` sidebar shell; renders a distinct error message rather than an empty list when `listAdmins()` fails.
- `UserList.tsx`, `RemoveUserDialog.tsx`, `AddUserForm.tsx` built as Client Components: the list guards the optional `last_sign_in_at` field before formatting (Pitfall 5), the removal dialog composes the Base UI `alert-dialog` primitives and interpolates the actual target email into the confirmation text (D-11), and the add-user form follows `BookingForm.tsx`'s `useActionState` + `react-hook-form` + `zodResolver` wiring, displaying the created password exactly once in a distinct success subtree.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npx vitest run` (115/115) all exit 0 after every task, with no regression to the pre-existing suite.

## Task Commits

Each task was committed atomically:

1. **Task 1: The three admin-user Server Actions with both D-10 guards** - `f7fd0ae` (feat)
2. **Task 2: The /admin/users page, UserList and RemoveUserDialog** - `239d72d` (feat)
3. **Task 3: AddUserForm with D-12 validation and the show-once password** - `ac5375a` (feat)

## Files Created/Modified

- `src/lib/admin-users/admin-users-actions.ts` (new) — `listAdmins` (maps `auth.admin.listUsers({ perPage: 100 })` to a plain `AdminListItem[]`, never the raw `User` object), `addUserAction` (Zod re-validation → `auth.admin.createUser({ email, password, email_confirm: true })` → returns `generatedPassword` once on success), `removeUserAction` (`getUser()` for caller identity → `listUsers({ perPage: 100 })` once → both D-10 guards → `auth.admin.deleteUser(targetId)`)
- `src/app/(admin)/admin/(dashboard)/users/page.tsx` (new) — async Server Component calling `listAdmins()`, rendering `UserList` on success or a distinct query-failed message on failure, plus `AddUserForm`
- `src/components/admin-users/UserList.tsx` (new) — Client Component table (email, created date, guarded last-sign-in) with `row-user-${id}` row test-ids and `btn-remove-user-${id}` passed into each row's `RemoveUserDialog`
- `src/components/admin-users/RemoveUserDialog.tsx` (new) — Client Component composing `alert-dialog` primitives; description interpolates the actual email; confirm control submits only `userId` to `removeUserAction` via `useActionState`; surfaces guard-refusal messages inline
- `src/components/admin-users/AddUserForm.tsx` (new) — Client Component; `useActionState(addUserAction)` + `useForm(zodResolver(addUserSchema))`; both password fields carry `autoComplete="new-password"`; success subtree shows `generatedPassword` exactly once via `data-testid="text-generated-password"`, never logged or persisted

## Exported Signatures (for plan 05-09)

```typescript
// src/lib/admin-users/admin-users-actions.ts
export interface AdminListItem { id: string; email: string; createdAt: string; lastSignInAt: string | null }
export type ListAdminsResult = { ok: true; data: AdminListItem[] } | { ok: false }
export async function listAdmins(): Promise<ListAdminsResult>
export async function addUserAction(prevState: AddUserActionState, formData: FormData): Promise<AddUserActionState>
export async function removeUserAction(prevState: RemoveUserActionState, formData: FormData): Promise<RemoveUserActionState>
```

## data-testid List

`table-admin-users`, `row-user-${id}`, `btn-remove-user-${id}`, `dialog-remove-user`, `btn-confirm-remove-user`, `btn-cancel-remove-user`, `text-remove-user-error`, `form-add-user`, `input-add-user-email`, `input-add-user-password`, `input-add-user-confirm-password`, `btn-add-user-submit`, `text-add-user-error`, `text-generated-password`, `text-add-user-success`, `text-users-query-error`

## Decisions Made

- `listAdmins()` normalizes `last_sign_in_at` from `undefined` to `null` in the returned `AdminListItem`, so `UserList.tsx` checks one consistent falsy value rather than re-deriving the `undefined`-for-never-logged-in distinction (RESEARCH.md Pitfall 5) itself.
- `RemoveUserDialog` takes a `triggerTestId` prop (set by `UserList` to `btn-remove-user-${admin.id}`) instead of constructing that string internally — this keeps the plan's required `row-user-`/`btn-remove-user-` test-id templates genuinely authored in `UserList.tsx` (as the acceptance criteria check) while leaving the dialog component reusable.
- `removeUserAction` calls `listUsers({ perPage: 100 })` exactly once per invocation, using its result for both guard 2's total count and (implicitly) proof the Admin API is reachable before attempting the guarded delete — no second existence-check query was added, matching the plan's explicit instruction to call `listUsers` once.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - acceptance-criteria false-positive] Comment text tripped forbidden-string greps**

- **Found during:** Task 2, immediately after writing `RemoveUserDialog.tsx` and running the acceptance-criteria greps.
- **Issue:** An explanatory header comment referenced the literal phrase `"this user"` (to describe what the rendered description must NOT say), which tripped the acceptance-criteria grep checking that the file contains no literal string `"this user"` in its rendered output. This is the same false-positive pattern documented and resolved in `05-04-SUMMARY.md` and `05-05-SUMMARY.md`.
- **Fix:** Reworded the comment to describe the prohibited pattern without using the literal quoted phrase ("never a generic, unnamed reference to the account" instead of `"this user"`), preserving the same explanatory intent.
- **Files modified:** `src/components/admin-users/RemoveUserDialog.tsx`
- **Commit:** Folded into `239d72d` (edited before the task's single commit, not a separate commit).

**2. [Rule 1 - acceptance-criteria alignment] Moved the `btn-remove-user-` test-id template into `UserList.tsx`**

- **Found during:** Task 2, after first drafting `RemoveUserDialog.tsx` with the `btn-remove-user-${userId}` template constructed internally.
- **Issue:** The plan's acceptance criteria explicitly check that `UserList.tsx` (not `RemoveUserDialog.tsx`) contains the `row-user-` and `btn-remove-user-` test-id template strings. Constructing the test-id inside the dialog component satisfied the *rendered* requirement but not the *file-content* check, since the template literal itself lived in the wrong file.
- **Fix:** Added a `triggerTestId` prop to `RemoveUserDialog`, with `UserList.tsx` passing `` `btn-remove-user-${admin.id}` `` at the call site — the template now genuinely lives in `UserList.tsx` while the dialog stays a generic, reusable component.
- **Files modified:** `src/components/admin-users/UserList.tsx`, `src/components/admin-users/RemoveUserDialog.tsx`
- **Commit:** Folded into `239d72d`.

---

**Total deviations:** 2 auto-fixed (both Rule 1, both acceptance-criteria alignment — no bugs, no scope creep, no architectural change).
**Impact on plan:** Purely cosmetic/structural fixes to satisfy the plan's own written acceptance criteria; no behavior changed and no additional files beyond the plan's declared `files_modified` were touched.

## Issues Encountered

None blocking. `npm run build`'s static-generation pass logged one expected `listAdmins: unexpected error` (missing `NEXT_PUBLIC_SUPABASE_URL`) — this worktree has no `.env.local` copied in, so `createAdminClient()` correctly hard-fails per its own documented behavior, and `listAdmins()`'s try/catch correctly converted that into `{ ok: false }`, which the page rendered as `ADMIN_COPY.queryFailedMessage` rather than crashing the build. This is the designed failure path working as intended, not a defect — it was not treated as a blocker and no `.env.local` copy was performed in this plan (unlike 05-05, which needed a live server for a human-verify checkpoint; this plan has no checkpoint and no live-server requirement).

## User Setup Required

None — no external service configuration required for this plan's own execution. Live verification against the real Supabase project (exercising both D-10 guard refusals with the existing single `auth.users` row, then creating and removing a second account) is explicitly deferred to plan `05-09` per `STATE.md`'s carried-forward note.

## Threat Flags

None — every new trust boundary this plan introduces (browser → `addUserAction`, browser → `removeUserAction`, `createAdminClient()` → Supabase Auth, `addUserAction` → browser's one-time password) was already anticipated and dispositioned `mitigate` in the plan's own `<threat_model>` (T-05-08-01 through T-05-08-09), and each mitigation was verified present during this execution (grep evidence above). T-05-08-10 (no audit trail) is an accepted risk per the plan, requiring no code change.

## Next Phase Readiness

- `/admin/users` is fully wired: list, add, and remove all function against the live Supabase Auth Admin API once `.env.local` is present.
- Plan `05-09` (or equivalent final verification) can now: (1) log in as the existing single admin, (2) attempt to remove that account and confirm `ADMIN_COPY.lastAdminError` is returned, (3) attempt to remove one's own id and confirm `ADMIN_COPY.selfDeleteError` is returned, (4) create a second admin via `AddUserForm` and confirm the password displays exactly once, (5) then successfully remove the second account now that more than one admin exists.
- No blockers. No `ADMIN_COPY` key was added in this plan — every string used (`selfDeleteError`, `lastAdminError`, `passwordShownOnceNotice`, `neverSignedIn`, `addUserGenericError`, `removeUserConfirmBody`, `queryFailedMessage`, `navUsersLabel`) already existed from plan 05-03/05-05, so no conflict risk with plan 05-07's concurrent edits to `src/lib/constants.ts`.

---
*Phase: 05-admin-backend*
*Completed: 2026-08-06*

## Self-Check: PASSED

All 5 created files verified present on disk (`src/lib/admin-users/admin-users-actions.ts`, `src/app/(admin)/admin/(dashboard)/users/page.tsx`, `src/components/admin-users/UserList.tsx`, `src/components/admin-users/RemoveUserDialog.tsx`, `src/components/admin-users/AddUserForm.tsx`). All 3 task commits (`f7fd0ae`, `239d72d`, `ac5375a`) verified present in `git log --oneline`.
