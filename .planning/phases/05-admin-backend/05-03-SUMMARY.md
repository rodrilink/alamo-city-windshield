---
phase: 05-admin-backend
plan: 03
subsystem: auth
tags: [zod, vitest, date-fns, admin, auth, guards, analytics]

# Dependency graph
requires:
  - phase: 04-booking-contact
    provides: contact-schema.ts / booking-schema.ts pattern (Zod validation shape), Server Action discriminated-state shape, pure-predicate precedent (isLegalSlot)
provides:
  - "ADMIN_COPY copy block in src/lib/constants.ts (login, dashboard, user-management strings)"
  - "src/types/auth.ts: LoginFormValues, LoginActionState"
  - "src/types/admin.ts: DailyBucket, DashboardReadResult<TData>, AddUserFormValues, AddUserActionState, RemoveUserActionState"
  - "src/lib/auth/login-schema.ts: loginSchema (no min(8) on password, avoids account-enumeration signal)"
  - "src/lib/admin-users/add-user-schema.ts: addUserSchema (min(8) + confirmPassword .refine() match, D-12)"
  - "src/lib/admin-users/admin-guards.ts: isSelfDeleteAttempt, isLastAdminAttempt (D-10)"
  - "src/lib/analytics/bucket-by-day.ts: bucketByDay, ANALYTICS_WINDOW_DAYS, ANALYTICS_BUCKET_GRANULARITY (D-03)"
affects: [05-04, 05-06, 05-07, 05-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure, dependency-free modules under src/lib/ tested with vitest against non-React modules (no @testing-library/react, no jsdom) -- extends the established zero-component-test-infra pattern from Phase 4"
    - "Clock passed as an explicit parameter (now: Date), never read internally via new Date()/Date.now() -- mirrors src/lib/booking/slots.ts's generateSlotsForDate idiom"
    - "Zod schemas NOT server-only fenced -- run as both the react-hook-form resolver (client) and the Server Action re-validation gate (server), mirroring contact-schema.ts/booking-schema.ts"

key-files:
  created:
    - src/types/auth.ts
    - src/types/admin.ts
    - src/lib/auth/login-schema.ts
    - src/lib/auth/login-schema.test.ts
    - src/lib/admin-users/add-user-schema.ts
    - src/lib/admin-users/add-user-schema.test.ts
    - src/lib/admin-users/admin-guards.ts
    - src/lib/admin-users/admin-guards.test.ts
    - src/lib/analytics/bucket-by-day.ts
    - src/lib/analytics/bucket-by-day.test.ts
  modified:
    - src/lib/constants.ts

key-decisions:
  - "loginSchema deliberately carries no min(8) or any length rule on password -- a validation error for a too-short password would leak that the credential shape doesn't match a real password, which is the account-enumeration signal V2 Authentication requires avoiding (T-05-03-01)"
  - "isLastAdminAttempt uses totalAdminCount <= 1, not === 1, so a defensive zero count also blocks a delete (T-05-03-04)"
  - "bucketByDay never calls new Date()/Date.now() internally -- now is always caller-supplied, making the function pure and clock-mock-free in tests, matching slots.ts's precedent"
  - "DashboardReadResult<TData> is defined independently in src/types/admin.ts rather than importing AvailabilityReadResult from src/types/booking.ts, so the dashboard module has no dependency on the booking module's types (same shape, deliberately duplicated)"

patterns-established:
  - "ADMIN_COPY follows the exact ESTIMATE_COPY/BOOKING_COPY/CONTACT_COPY shape in src/lib/constants.ts -- every phase-5 user-facing string lives there, none inline in a component"
  - "D-03/D-16-style named constants (ANALYTICS_WINDOW_DAYS, ANALYTICS_BUCKET_GRANULARITY) co-located with their consuming pure function, not centralized in constants.ts -- matches SLOT_DURATION_MINUTES's precedent in slots.ts"

requirements-completed: [AUTH-01, AUTH-05, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, USER-02, USER-03]

# Metrics
duration: 25min
completed: 2026-08-06
---

# Phase 5 Plan 03: Pure Modules (Copy, Types, Schemas, Guards, Analytics) Summary

**ADMIN_COPY copy block, LoginActionState/AddUserActionState/DashboardReadResult type contracts, loginSchema/addUserSchema Zod validation, and a zero-clock-read bucketByDay daily aggregator with D-10 self-delete/last-admin guard predicates -- all pure, dependency-free, and vitest-covered.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-06T15:00:00Z
- **Completed:** 2026-08-06T15:25:00Z
- **Tasks:** 3 completed
- **Files modified:** 11 (1 modified, 10 created)

## Accomplishments
- `ADMIN_COPY` added to `src/lib/constants.ts` with all 12 required keys (login errors, dashboard empty states, user-management copy), following the established `ESTIMATE_COPY`/`BOOKING_COPY`/`CONTACT_COPY` shape exactly
- `src/types/auth.ts` and `src/types/admin.ts` created with every type contract downstream plans 05-04/05-06/05-07/05-08 need, neither importing Supabase
- `loginSchema` (no `min(8)` -- avoids leaking a credential-enumeration signal) and `addUserSchema` (D-12's `min(8)` + `confirmPassword` cross-field `.refine()`) both built and unit-tested via full RED/GREEN TDD gates
- `isSelfDeleteAttempt`/`isLastAdminAttempt` (D-10) and `bucketByDay`/`ANALYTICS_WINDOW_DAYS`/`ANALYTICS_BUCKET_GRANULARITY` (D-03) built as pure, clock-free, unit-tested functions via full RED/GREEN TDD gates
- Full test suite grew from 33 to 115 passing tests; `npx tsc --noEmit` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ADMIN_COPY and the shared type contracts** - `843d3aa` (feat)
2. **Task 2: Login schema, add-user schema, and their unit tests** - `b0a4516` (test, RED) then `7c51398` (feat, GREEN)
3. **Task 3: D-10 guard predicates and the D-03 daily-bucket aggregator, with tests** - `c92ee29` (test, RED) then `0c4db4b` (feat, GREEN)

**Plan metadata:** committed alongside this SUMMARY.md (see final commit)

## Files Created/Modified
- `src/lib/constants.ts` - added `ADMIN_COPY` block (12 keys: login/logout/dashboard/user-management copy)
- `src/types/auth.ts` - `LoginFormValues`, `LoginActionState` (2-state: `idle` | `error`)
- `src/types/admin.ts` - `DailyBucket`, `DashboardReadResult<TData>`, `AddUserFormValues`, `AddUserActionState`, `RemoveUserActionState`
- `src/lib/auth/login-schema.ts` - `loginSchema` (email `.trim().email()`, password `.min(1)`, no length cap)
- `src/lib/auth/login-schema.test.ts` - 5 tests (valid parse, malformed/empty email, empty password, whitespace trim)
- `src/lib/admin-users/add-user-schema.ts` - `addUserSchema` (email, password `.min(8)`, confirmPassword `.min(8)`, `.refine()` cross-field match with `path: ['confirmPassword']`)
- `src/lib/admin-users/add-user-schema.test.ts` - 6 tests (valid parse, malformed email, whitespace trim, 8/7-char boundary, confirm-mismatch path)
- `src/lib/admin-users/admin-guards.ts` - `isSelfDeleteAttempt(targetUserId, callerUserId)`, `isLastAdminAttempt(totalAdminCount)` (`<= 1`)
- `src/lib/admin-users/admin-guards.test.ts` - 7 tests (self-delete match/mismatch/format-independence, last-admin 0/1/2/50)
- `src/lib/analytics/bucket-by-day.ts` - `bucketByDay(createdAtTimestamps, now, windowDays = ANALYTICS_WINDOW_DAYS)`, `ANALYTICS_WINDOW_DAYS = 30`, `ANALYTICS_BUCKET_GRANULARITY = 'day'`
- `src/lib/analytics/bucket-by-day.test.ts` - 7 tests (window length, ordering, zero-fill, same-day count, window exclusion, late-same-day inclusion, purity)

## Exact Exported Signatures (for downstream plans 05-04, 05-06, 05-07, 05-08)

```typescript
// src/lib/analytics/bucket-by-day.ts
export const ANALYTICS_WINDOW_DAYS = 30
export const ANALYTICS_BUCKET_GRANULARITY = 'day' as const
export function bucketByDay(
    createdAtTimestamps: string[],
    now: Date,
    windowDays?: number // defaults to ANALYTICS_WINDOW_DAYS
): DailyBucket[]

// src/lib/admin-users/admin-guards.ts
export function isSelfDeleteAttempt(targetUserId: string, callerUserId: string): boolean
export function isLastAdminAttempt(totalAdminCount: number): boolean

// src/lib/auth/login-schema.ts
export const loginSchema: ZodObject<{ email: ZodString; password: ZodString }>

// src/lib/admin-users/add-user-schema.ts
export const addUserSchema: ZodEffects<...> // email, password (min 8), confirmPassword (min 8), refined to match

// src/types/auth.ts
export interface LoginFormValues { email: string; password: string }
export type LoginActionState = { status: 'idle' } | { status: 'error'; message: string }

// src/types/admin.ts
export interface DailyBucket { date: string; count: number }
export type DashboardReadResult<TData> = { ok: true; data: TData } | { ok: false }
export interface AddUserFormValues { email: string; password: string; confirmPassword: string }
export interface AddUserActionState { status: 'idle' | 'success' | 'error'; values: AddUserFormValues; fieldErrors?: ...; message?: string; generatedPassword?: string }
export interface RemoveUserActionState { status: 'idle' | 'success' | 'error'; message?: string }
```

## ADMIN_COPY Key List

`loginGenericError`, `loginUnreachableError`, `logoutLabel`, `dashboardEmptyStateHint`, `trackingStartsHint`, `queryFailedMessage`, `removeUserConfirmBody`, `selfDeleteError`, `lastAdminError`, `passwordShownOnceNotice`, `neverSignedIn`, `addUserGenericError`

## Decisions Made
- `loginSchema` carries no `min(8)` on password (or any length rule) -- rejecting a short password with a distinct validation error at login would leak a credential-enumeration signal (T-05-03-01). Length constraints live only on `addUserSchema` (account creation).
- `isLastAdminAttempt` uses `<= 1` rather than `=== 1` so a defensive zero-count also blocks deletion (T-05-03-04); asserted directly by a dedicated `isLastAdminAttempt(0) === true` test.
- `DashboardReadResult<TData>` is defined independently in `src/types/admin.ts` rather than imported from `src/types/booking.ts`'s `AvailabilityReadResult`, per the plan's explicit instruction to avoid a dashboard-to-booking type dependency, even though the shape is identical.
- `bucketByDay` takes `now: Date` as a required parameter and never reads the clock internally, matching `slots.ts`'s `generateSlotsForDate` idiom -- this is what makes both new test suites mock-free.

## Deviations from Plan

None - plan executed exactly as written. Both TDD tasks (Task 2, Task 3) followed the full RED -> GREEN gate sequence: failing test commits (`b0a4516`, `c92ee29`) confirmed via `Cannot find package` errors before any implementation existed, then passing implementation commits (`7c51398`, `0c4db4b`).

Two acceptance-criteria greps (`grep -c "min(8)" login-schema.ts` and `grep -c "new Date()\|Date.now()" bucket-by-day.ts`, plus `grep -c "server-only" bucket-by-day.ts`) reported non-zero matches, but in every case the match was inside an explanatory header comment describing what the file deliberately does NOT do (e.g. "Deliberately NO `min(8)`... on `password`"), not an actual `.min(8)` call, clock read, or `import 'server-only'` in the executable code. Verified by reading each matched line directly -- no code change was needed.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All pure modules this phase's downstream plans need are built, tested, and exported with stable signatures:
- Plan 05-04 (login form + Server Actions) can import `loginSchema`, `LoginFormValues`, `LoginActionState`, and `ADMIN_COPY`'s login keys.
- Plan 05-06 (dashboard reads) can import `bucketByDay`, `ANALYTICS_WINDOW_DAYS`, `ANALYTICS_BUCKET_GRANULARITY`, `DailyBucket`, and `DashboardReadResult<TData>`.
- Plan 05-07/05-08 (user management) can import `addUserSchema`, `AddUserFormValues`, `AddUserActionState`, `RemoveUserActionState`, `isSelfDeleteAttempt`, `isLastAdminAttempt`, and `ADMIN_COPY`'s user-management keys.

No blockers. The two D-16 table-limit constants (`RECENT_CONTACTS_LIMIT`, `UPCOMING_APPOINTMENTS_LIMIT`) are explicitly deferred to plan 05-06 per this plan's `<success_criteria>`, co-located with the queries that consume them.

---
*Phase: 05-admin-backend*
*Completed: 2026-08-06*

## Self-Check: PASSED

All 10 created source files verified present on disk (src/types/auth.ts, src/types/admin.ts, src/lib/auth/login-schema.ts + .test.ts, src/lib/admin-users/add-user-schema.ts + .test.ts, src/lib/admin-users/admin-guards.ts + .test.ts, src/lib/analytics/bucket-by-day.ts + .test.ts). All 5 task commits (843d3aa, b0a4516, 7c51398, c92ee29, 0c4db4b) verified present in git log.
