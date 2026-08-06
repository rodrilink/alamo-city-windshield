# Phase 5: Admin Backend - Research

**Researched:** 2026-08-06
**Domain:** Next.js 15 App Router admin auth + Supabase Auth Admin API + shadcn/ui on Base UI (chart/dialog/table)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Build the real `analytics_events` query layer now and render an honest empty state. The charts (ADMIN-02/03/04) query the real table over the real window; because Phase 6 has not wired event tracking yet, they will return zero rows and must render a "No data yet — event tracking arrives in Phase 6" empty state rather than a broken axis or a blank box.
- **D-02:** Card totals are mixed-source, and no card ever shows a fabricated number. Contacts and bookings count real rows from the `contacts` and `bookings` tables. Visitors and VIN searches count `analytics_events` rows and will read `0` with a subtle "tracking starts Phase 6" hint.
- **D-03:** Window is the last 30 days in daily buckets. No range picker. Both the window length and the bucket granularity go in named constants so they can be tuned without touching query logic.
- **D-04:** Dashboard data is fetched in Server Components querying Supabase directly with the cookie-based SSR server client (`src/lib/supabase/server.ts`), so RLS applies as the logged-in admin. Chart components themselves must be Client Components (`'use client'`). Server Actions remain correct for this phase's mutations (add/remove user), not the initial read.
- **D-05:** `auth.users` IS the admin list. Every Supabase Auth user is a full admin. USER-01 lists them through the service-role Admin API (`auth.admin.listUsers()`). Safe because there is no public signup path anywhere in the application. Roles are not needed at v1.
- **D-06:** This phase adds NO database migration. D-05 means no roles table; existing RLS policies already grant exactly the access the dashboard needs, unchanged. Planning should not schedule schema work.
- **D-07:** The user list shows email, created date, and last sign-in — all three come free in the `listUsers()` response with no extra queries.
- **D-08:** No password-reset / forgot-password flow. AUTH-01..05 name only login and logout. Recovery path: another admin recreates the account, or the owner resets it in the Supabase dashboard. Captured as a deferred idea.
- **D-09:** Successful login always redirects to `/admin`. One fixed destination. Deliberately rejected: honoring a `?redirectTo=` param (open redirect risk).
- **D-10:** Both a self-delete guard and a last-admin guard, enforced server-side in the Server Action — not merely hidden in the UI. Refuse when the target user id equals the caller's own id. Refuse when only one admin account exists.
- **D-11:** Removal requires a confirmation dialog that names the email. No shadcn `dialog`/`alert-dialog` primitive exists yet — one must be generated.
- **D-12:** Add-user validation is Zod `min(8)` plus a matching confirm-password field, with Supabase's own password policy as the server-side backstop. The created password is shown to the admin once on success (no email delivery exists).
- **D-13:** User management lives at a dedicated `/admin/users` route holding the list, the add-user form, and per-row remove.
- **D-14:** The `(admin)` route group gets its own `layout.tsx` with a sidebar (Dashboard, Users), the signed-in admin's email, and the logout button (AUTH-05). The login page must NOT be inside that layout — it has no session.
- **D-15:** ADMIN-06 and ADMIN-07 tables are read-only. No row actions. Booking status transitions were considered and deliberately deferred.
- **D-16:** Bounded queries with limits in named constants. Contacts: newest-first, limit 10. Appointments: `appt_date >= today`, soonest-first, limit 10. No pagination.
- **D-17:** Appointment rows show date, time, name, phone, `vehicle_desc`, and status — enough to make the confirmation call without opening Supabase. No VIN re-decoding and no NHTSA calls from an internal page.

### Claude's Discretion

- Chart type per metric (area vs bar vs line) and whether zero-activity days are gap-filled to keep a continuous x-axis — standard Recharts/shadcn Chart practice is fine. With D-01 every day is currently a zero day, so the empty state, not the interpolation, is what actually gets exercised.
- Whether aggregation into daily buckets happens in SQL or in JS after the fetch.
- Sidebar styling and collapse behavior; card and table layout; whether the add-user form is inline or inside a dialog.
- Login error-message wording. Different failure causes get visibly different UI. Credential errors should stay generic (do not reveal whether an email exists).
- Exact user-facing strings. Follow the established copy-module pattern (`ESTIMATE_COPY`, `BOOKING_COPY`, `CONTACT_COPY` in `src/lib/constants.ts`) with an `ADMIN_COPY` block.

### Deferred Ideas (OUT OF SCOPE)

- Booking status transitions from the dashboard (`pending` → `confirmed` → `completed`).
- Contact row actions — mark contacted, add internal notes.
- Manual slot blocking / blackout dates by the shop owner.
- Password reset / forgot-password flow (D-08).
- An admin setting another admin's password.
- Roles beyond "admin" (e.g. a staff role that can read bookings but not manage users).
- Chart date-range picker (7 / 30 / 90 days) — D-03 fixes 30 days in a constant.
- Pagination / search on the dashboard tables — D-16 caps both at 10 rows.
- Admin-editable pricing — V2-04, explicitly a v2 requirement.
- `calendar-sizing-centering.md` (cosmetic, from Phase 4 UAT) — not folded, targets public booking-flow files outside this phase's scope.
- `requirements-traceability-stale.md` (docs, info) — not folded, project-wide tooling/docs drift.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Admin login page at `/admin/login` with email + password | Pattern 2 (Login Server Action) gives the exact `signInWithPassword` call shape; Open Question 1 flags that at least one `auth.users` row must exist to verify this at all |
| AUTH-02 | Supabase Auth session management via `@supabase/ssr` | Pattern 2 confirms the cookie-aware `server.ts` client (not `admin.ts`) is the one that must be used so `Set-Cookie` writes flow through `next/headers` |
| AUTH-03 | Middleware protects all `/admin/*` routes using `getUser()` | Already implemented in `src/lib/supabase/middleware.ts` — verify only, do not rebuild (see Architectural Responsibility Map) |
| AUTH-04 | Login page excluded from middleware redirect to avoid infinite loop | Already implemented via the `isLoginPage` check; the Recommended Project Structure section confirms the new nested route group does not change the resolved pathname the check compares against |
| AUTH-05 | Logout button clears session and redirects to login | Pattern 2's `logoutAction` gives the exact `signOut()` + `revalidatePath` + `redirect('/admin/login')` shape |
| ADMIN-01 | Dashboard route at `/admin` accessible only after login | Recommended Project Structure's nested `(dashboard)` route group places `page.tsx` correctly under the sidebar layout while AUTH-03/04 continue to gate it |
| ADMIN-02 | Chart showing visitor count over time | Pattern 5 (daily-bucket aggregation) + Package Legitimacy Audit (recharts) + Code Examples (`ChartConfig`) |
| ADMIN-03 | Chart showing contact form submissions over time | Same as ADMIN-02; Open Question 2 flags a source-of-truth ambiguity between `analytics_events` and the real `contacts` table for this specific chart |
| ADMIN-04 | Chart showing VIN search volume over time | Same as ADMIN-02, reading `analytics_events` per D-01 |
| ADMIN-05 | Summary cards with totals | Architectural Responsibility Map + System Architecture Diagram show the mixed-source card query per D-02 |
| ADMIN-06 | Table of recent contact submissions | Standard Stack's `table` primitive (zero new dependencies) + D-16's bounded/limit-10 query pattern |
| ADMIN-07 | Table of upcoming appointments | Same as ADMIN-06, plus D-17's column set (date, time, name, phone, `vehicle_desc`, status) |
| USER-01 | User list page showing all admin users | Pattern 3 gives the exact `listUsers()` signature, default `perPage` of 50, and the `User` field names for D-07 |
| USER-02 | Add new admin user via Supabase service role | Pattern 3's `createUser()` signature + Code Examples' `addUserSchema` (D-12) |
| USER-03 | Remove admin user | Pattern 3's `deleteUser()` signature + Pattern 4's pure-predicate guards (D-10) |
| USER-04 | Service role key strictly server-side | Already satisfied by `src/lib/supabase/admin.ts`'s `server-only` fence — verify only |
</phase_requirements>

## Summary

This phase is mostly mechanical wiring of already-provisioned infrastructure, not new architecture. Phase 4's `04-02-PLAN.md` already provisioned a live Supabase project, pushed the migration, and proved RLS/constraints work against real Postgres — **the blocker CONTEXT.md carried forward is resolved**, with one exception: no evidence exists that Phase 1 D-12's "create the first admin manually via Supabase dashboard" step ever ran. That is the one remaining prerequisite, and it is a human action, not a code task.

The three genuinely new technical surfaces are: (1) generating shadcn's `chart`, `dialog`/`alert-dialog`, and `table` primitives against this repo's Base UI (`@base-ui/react`) convention rather than Radix, patching each for the `render`-prop pattern already established in `sheet.tsx` and `form.tsx`; (2) calling the Supabase Auth Admin API (`listUsers`/`createUser`/`deleteUser`) through the existing `createAdminClient()`, whose exact return shapes are now confirmed against the installed `@supabase/auth-js` type definitions rather than assumed; and (3) writing the first Server Action in this repo that performs a *cookie-writing* auth operation (`signInWithPassword`, `signOut`) rather than a database insert — every existing Server Action (`createBooking`, `createContact`) writes to Postgres, none touches a session cookie.

**Primary recommendation:** Treat this phase as five sequential concerns — (0) package-approval gate mirroring `03-01`/`04-01`, (1) generate+patch three shadcn primitives, (2) admin auth (login/logout Server Actions + route-group layout split), (3) dashboard reads (Server Components, JS-side daily bucketing, honest empty state), (4) user management (Admin API + two server-side guards + confirmation dialog) — with a `checkpoint:human-action` task early in the phase to verify/create the first `auth.users` row, since every other success criterion is unverifiable without one.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route protection (`/admin/*` redirect) | Frontend Server (Middleware) | — | Already implemented in `src/lib/supabase/middleware.ts`; runs before any Server Component renders |
| Login form submission | API / Backend (Server Action) | Browser (client-side Zod via react-hook-form) | `signInWithPassword` must run server-side to write the session cookie; client validation is UX-only |
| Logout | API / Backend (Server Action) | — | `signOut()` clears the session server-side; must run in a Server Action, not a client-only call, so cookies are cleared in the response |
| Dashboard summary cards + chart data | API / Backend (Server Component query) | Database | D-04: queried directly in the Server Component via the RLS-respecting SSR client; no Route Handler hop |
| Chart rendering (Recharts) | Browser / Client | — | Recharts requires the DOM; chart components are `'use client'`, receiving plain serialized data as props |
| Recent-contacts / upcoming-appointments tables | API / Backend (Server Component query) | Database | Same as dashboard cards — bounded, read-only queries against RLS-protected tables |
| Admin user list / create / delete | API / Backend (Server Action + service-role client) | — | `auth.admin.*` calls bypass RLS by design and must never run client-side; `admin.ts` is already `server-only`-fenced |
| Last-admin / self-delete guard | API / Backend (pure predicate + Server Action) | — | Must be enforced server-side per D-10; a pure function makes it unit-testable without a live database |
| Removal confirmation dialog | Browser / Client | — | Pure UI state (open/closed, which user); no data fetching of its own |

## Package Legitimacy Audit

Phase 5 needs exactly one new **npm** package: `recharts` (pulled in by the shadcn `chart` primitive). The three other UI additions (`dialog`, `alert-dialog`, `table`) are shadcn CLI-generated **source files** written into `src/components/ui/`, not npm dependencies — `table.tsx` has zero external dependencies (a plain semantic `<table>` wrapper), and `dialog.tsx`/`alert-dialog.tsx` depend only on `@base-ui/react`, which is **already installed** (`1.3.0` in `package.json`).

**Verified against the live shadcn registry (`base-nova` style) on 2026-08-06:**
- `chart.json` registry payload declares `"dependencies": ["recharts@3.8.0"]` and `"registryDependencies": ["card"]` (card already exists locally) `[CITED: ui.shadcn.com/r/styles/base-nova/chart.json]`
- `dialog.json` declares `"registryDependencies": ["button"]`, zero new npm packages; source imports `@base-ui/react/dialog` `[CITED: ui.shadcn.com/r/styles/base-nova/dialog.json]`
- `alert-dialog.json` declares `"registryDependencies": ["button"]`, zero new npm packages; source imports `@base-ui/react/alert-dialog` and uses the `render` prop on `AlertDialogCancel` (`render={<Button variant={variant} size={size} />}`) `[CITED: ui.shadcn.com/r/styles/base-nova/alert-dialog.json]`
- `table.json` registry payload has no `dependencies` array at all — pure `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>`/`<caption>` wrappers `[CITED: ui.shadcn.com/r/styles/base-nova/table.json]`

**npm registry verification (live, 2026-08-06):**

| Package | Registry | Age / Notes | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `recharts` | npm | Latest is `3.10.1` (shadcn's registry pins `3.8.0` as a floor — `npx shadcn add chart` will install whatever `recharts@3` resolves to at install time; let the CLI manage it per CONTEXT.md's own note) | `github.com/recharts/recharts` `[VERIFIED: npm registry]` | `[OK]` (scanned 1 package, 1 OK) | Approved |

`slopcheck install recharts` ran successfully and printed `[OK]` before its own internal `npm install` sub-step failed with a Windows subprocess spawn error (`FileNotFoundError: WinError 2`) — that failure is slopcheck's own install attempt, not a rejection of the package; the legitimacy verdict (`[OK]`) was already emitted. Package name provenance: `recharts` is a well-known package present in this project's own `CLAUDE.md` recommended stack and confirmed via the official shadcn registry JSON (an authoritative source), not merely training-data recall — eligible for `[VERIFIED]` tagging.

**Packages removed due to slopcheck `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** none.

**Planner action:** mirror `03-01-PLAN.md`/`04-01-PLAN.md` — open Phase 5 with a `checkpoint:human-verify` (blocking-human gate) presenting `recharts` for approval before any `npx shadcn@latest add chart` runs. Unlike Phase 4's five-package gate, this is a single package, so the gate plan will be proportionally smaller, but the precedent (never auto-approve, always block on real human response) must still be followed exactly.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `recharts` | `^3` (registry floor `3.8.0`, npm latest `3.10.1` as of 2026-08-06) | Chart rendering engine under shadcn's `ChartContainer` | Already the project's declared stack choice (`CLAUDE.md`); shadcn's own registry pins it as the `chart` primitive's sole dependency `[VERIFIED: npm registry, CITED: shadcn registry]` |
| `@base-ui/react` | `1.3.0` (already installed; npm latest is `1.7.0`, not adopted this phase) | Headless primitives under every shadcn component in this repo | This repo's `base-nova` shadcn style is Base-UI-native, confirmed by direct inspection of `button.tsx`, `sheet.tsx`, and the live registry JSON for `dialog`/`alert-dialog` — no upgrade needed or recommended this phase `[VERIFIED: installed package.json + registry JSON]` |
| `@supabase/auth-js` | `2.x` (bundled transitively via `@supabase/supabase-js@2.103.0`, already installed) | Underlying types/implementation for `auth.admin.*`, `signInWithPassword`, `signOut` | Already present in `node_modules`; no new install required. Method signatures below are read directly from the installed `.d.ts` files `[VERIFIED: installed package]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` | `^7.84.0` (installed) | Login form + add-user form state | Already the established pattern from Phase 4 (booking/contact forms) |
| `zod` | `^4.4.3` (installed) | Login/add-user schema validation | Same shared client+server double-validation pattern as `booking-schema.ts`/`contact-schema.ts` |
| `@hookform/resolvers` | `^5.7.1` (installed) | Bridges Zod schema to `useForm({ resolver })` | Same as above |
| `date-fns` | `^4.4.0` (installed) | Daily-bucket date arithmetic for the 30-day chart window | Already installed for Phase 4's booking slot logic; `eachDayOfInterval`, `startOfDay`, `subDays`, `format` all confirmed present and importable in this exact installed version `[VERIFIED: node -e require check against installed node_modules]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQL-side daily aggregation (a view or `date_trunc` grouped query) | JS-side post-fetch bucketing with `date-fns` | D-06 forbids any migration this phase — a SQL view is itself a migration. JS bucketing needs zero schema change and is trivially unit-testable as a pure function (see Validation Architecture below). |
| Plain semantic `<table>` (no shadcn primitive) | shadcn `table.tsx` | CONTEXT.md flags this as "optional." Since `table.tsx` has zero external dependencies and is a two-minute `npx shadcn add table` with no legitimacy-gate implication (no npm package), there is no real cost to generating it — it gives consistent `data-slot` styling matching `card`/`sheet`. Recommend generating it rather than hand-rolling. |
| `dialog` for the removal confirmation | `alert-dialog` | shadcn ships both. `alert-dialog` is purpose-built for exactly this destructive-confirmation use case (it ships `AlertDialogAction`/`AlertDialogCancel` with built-in Button-variant wiring) and needs no extra composition work `dialog.tsx` would require. **Recommend `alert-dialog`, not `dialog`**, for D-11. |

**Installation:**
```bash
npx shadcn@latest add chart alert-dialog table
```
(`npm install recharts` happens as a side effect of the `chart` add — the shadcn CLI resolves and installs it automatically once the package-approval gate clears.)

**Version verification:** `npm view recharts version` → `3.10.1` (2026-08-06). `npm view @base-ui/react version` → `1.7.0` (latest; this repo stays pinned at `1.3.0`, no action needed).

## Architecture Patterns

### System Architecture Diagram

```
Browser (unauthenticated)
  │
  │  GET /admin  (no session cookie)
  ▼
Next.js Middleware (src/middleware.ts → updateSession)
  │  supabase.auth.getUser()  — revalidates JWT server-side
  │  isAdminRoute && !isLoginPage && !user → redirect
  ▼
302 → /admin/login
  │
  ▼
(admin)/admin/login/page.tsx  — OUTSIDE the sidebar layout
  │  <LoginForm> (Client Component, react-hook-form + zod resolver)
  │  onSubmit → useActionState(loginAction)
  ▼
loginAction Server Action ('use server')
  │  createClient() from src/lib/supabase/server.ts (cookie-aware SSR client)
  │  supabase.auth.signInWithPassword({ email, password })
  │  error?  → return { status: 'error', message } (generic, no email-exists leak)
  │  success → revalidatePath('/', 'layout'); redirect('/admin')  [D-09: fixed destination]
  ▼
Browser now holds sb-* session cookies (written by the SSR client's setAll during the action)
  │
  │  GET /admin  (session cookie present)
  ▼
Middleware: getUser() succeeds → passthrough
  ▼
(admin)/admin/layout.tsx  — sidebar shell (Dashboard, Users, email, logout)
  │
  ├─→ (admin)/admin/page.tsx  [Server Component]
  │     │  createClient() (RLS-respecting server client)
  │     │  Promise.all([
  │     │    supabase.from('contacts').select(...).order('created_at',{ascending:false}).limit(10),
  │     │    supabase.from('bookings').select(...).gte('appt_date', today).order(...).limit(10),
  │     │    supabase.from('analytics_events').select('created_at,event_type').gte('created_at', windowStart)
  │     │  ])
  │     │  bucketByDay(events, WINDOW_DAYS)  — pure function, JS-side aggregation
  │     ▼
  │   <DashboardCards>  (Server Component, plain data → JSX)
  │   <VisitorsChart> <ContactsChart> <VinSearchChart>  ('use client', Recharts via ChartContainer)
  │   <RecentContactsTable> <UpcomingAppointmentsTable>  (Server Component, read-only)
  │
  └─→ (admin)/admin/users/page.tsx  [Server Component + Client islands]
        │  createAdminClient() (service-role, bypasses RLS)
        │  supabase.auth.admin.listUsers()  →  { users: User[] }
        ▼
      <UserList>  (email, created_at, last_sign_in_at per row)
        │  per-row <AlertDialog> "Remove {email}? They will immediately lose access."
        │  onConfirm → useActionState(removeUserAction)
        ▼
      removeUserAction Server Action
        │  guard 1: targetId === callerId → reject "cannot remove your own account"
        │  guard 2: (await listUsers()).users.length === 1 → reject "at least one admin must remain"
        │  else → createAdminClient().auth.admin.deleteUser(id)
        ▼
      <AddUserForm>  (react-hook-form + zod: email, password min(8), confirmPassword match)
        │  onSubmit → useActionState(addUserAction)
        ▼
      addUserAction Server Action
        │  createAdminClient().auth.admin.createUser({ email, password, email_confirm: true })
        │  success → display password once: "Account created. Password: {password} (shown once)"
```

### Recommended Project Structure

Current on-disk structure under `src/app/` (verified 2026-08-06):
```
src/app/
├── layout.tsx                          # root layout (fonts, theme)
├── globals.css
├── favicon.ico
├── api/
│   ├── estimate/route.ts
│   └── vin/[vin]/route.ts
├── (public)/
│   ├── layout.tsx                      # bare passthrough
│   ├── page.tsx
│   ├── about/page.tsx
│   ├── book/page.tsx
│   └── contact/page.tsx
└── (admin)/
    └── admin/
        └── login/page.tsx              # placeholder only — no layout.tsx exists yet anywhere in (admin)
```

**The trap D-14 calls out:** a naive `src/app/(admin)/admin/layout.tsx` wraps *every* route under `admin/`, including `admin/login/`, because Next.js layouts apply to all nested segments regardless of route group. Putting the sidebar layout at that path would put a logout button and an admin email on the login screen where no session exists yet.

**Target structure** — the fix is a **second, nested route group** that excludes `login/`:
```
src/app/(admin)/admin/
├── login/
│   └── page.tsx                        # real login form; NO layout wraps this — inherits only root layout.tsx
└── (dashboard)/                        # NEW nested route group — segment adds no URL path
    ├── layout.tsx                      # NEW: sidebar shell (Dashboard, Users links; email; logout) — D-14
    ├── page.tsx                        # /admin — dashboard (ADMIN-01..07)
    └── users/
        └── page.tsx                    # /admin/users — user management (USER-01..04)
```

Route groups (`(name)`) never appear in the URL, and **nesting one route group inside another is standard Next.js App Router behavior** — `(admin)/admin/(dashboard)/page.tsx` still resolves to `/admin`, and `(admin)/admin/(dashboard)/users/page.tsx` still resolves to `/admin/users`, while `(admin)/admin/login/page.tsx` remains at `/admin/login` and sits as a sibling outside `(dashboard)`, so it inherits nothing from `(dashboard)/layout.tsx`. This is the standard resolution for "layout applies to some but not all children of a shared parent segment" — confirmed against Next.js App Router route-group semantics (multiple root layouts / selective layout inheritance is an explicitly documented use case for nested groups) `[CITED: Next.js App Router route groups documentation]`.

Middleware's existing `isLoginPage` string-equality check (`request.nextUrl.pathname === '/admin/login'`) is **unaffected** by this restructuring — route groups don't change the resolved pathname, only the filesystem layout.

### Pattern 1: Base UI `render` Prop (not Radix `asChild`)

**What:** Base UI components that need to render as a different underlying element accept a `render` prop taking a JSX element, rather than Radix's `asChild` + child-composition pattern.

**When to use:** Any time a generated shadcn primitive in this repo needs a trigger/close/action element styled as a `Button`.

**Example (from this repo's actual `sheet.tsx`, confirmed on disk):**
```tsx
// Source: src/components/ui/sheet.tsx (already in this repo)
<SheetPrimitive.Close
  data-slot="sheet-close"
  render={
    <Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />
  }
>
  <XIcon />
  <span className="sr-only">Close</span>
</SheetPrimitive.Close>
```

**Example (from the live `alert-dialog` registry payload, confirmed 2026-08-06):**
```tsx
// Source: https://ui.shadcn.com/r/styles/base-nova/alert-dialog.json
function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}
```

Both generated `dialog.tsx` and `alert-dialog.tsx` will arrive from the CLI already using this convention correctly — **no patching needed for the render-prop pattern itself**, unlike Phase 4's `calendar.tsx`, which needed the `IconPlaceholder` fix. The one thing to verify post-generation: confirm the generated files import from `@base-ui/react/dialog` / `@base-ui/react/alert-dialog`, not any `@radix-ui/*` path (there should be none, since this repo has zero Radix dependencies).

### Pattern 2: Login Server Action Writing SSR Cookies

**What:** A Server Action using the cookie-aware `createClient()` (not the service-role `createAdminClient()`) so `signInWithPassword`'s session-establishing `Set-Cookie` write flows through `next/headers`' `cookies()` API automatically.

**When to use:** AUTH-01/AUTH-02 login; AUTH-05 logout.

**Example:**
```tsx
// Source: pattern confirmed against Supabase official Next.js Server Action
// auth guide + this repo's src/lib/supabase/server.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function loginAction(prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        // error.code === 'invalid_credentials' -- confirmed present in the
        // installed @supabase/auth-js ErrorCode union. Keep the message
        // generic regardless of code: do not reveal whether the email exists.
        return { status: 'error', message: ADMIN_COPY.loginGenericError }
    }

    revalidatePath('/', 'layout')
    redirect('/admin') // D-09: always this fixed destination, never a ?redirectTo param
}

export async function logoutAction(): Promise<void> {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/admin/login')
}
```

Critically, this is **the cookie-aware `server.ts` client** (writes cookies via `next/headers`), never `createAdminClient()` — the admin client explicitly disables session persistence (`persistSession: false`) and has no cookie plumbing at all, so calling `signInWithPassword` on it would authenticate but never establish a browser session.

### Pattern 3: Supabase Auth Admin API (exact shapes, verified against installed types)

**What:** `auth.admin.listUsers()`, `createUser()`, `deleteUser()` via `createAdminClient()`.

**Confirmed method signatures** (read directly from `node_modules/@supabase/auth-js/dist/main/GoTrueAdminApi.d.ts` and `lib/types.d.ts` on 2026-08-06 — `[VERIFIED: installed package]`):

```typescript
// listUsers — defaults to 50 users per page (confirmed in the .d.ts @remarks)
listUsers(params?: { page?: number; perPage?: number }): Promise<
  | { data: { users: User[]; aud: string } & Pagination; error: null }
  | { data: { users: [] }; error: AuthError }
>

// createUser
createUser(attributes: AdminUserAttributes): Promise<{ data: { user: User }; error: AuthError | null }>
// AdminUserAttributes includes: email?, password?, email_confirm?, phone_confirm?,
// user_metadata?, app_metadata? (app_metadata: service-role only)

// deleteUser
deleteUser(id: string, shouldSoftDelete?: boolean): Promise<{ data: { user: User } | null; error: AuthError | null }>
// shouldSoftDelete defaults to false (hard delete) -- correct for USER-03, no soft-delete requirement exists
```

**`User` object fields relevant to D-07** (exact names, confirmed in `lib/types.d.ts` lines 340-367):
```typescript
export interface User {
    id: string              // needed for the self-delete guard (D-10) and deleteUser() call
    email?: string          // D-07 column 1
    created_at: string      // D-07 column 2 -- NOT NULL, always present
    last_sign_in_at?: string // D-07 column 3 -- undefined for a user who has never logged in
    // ...other fields not needed this phase (app_metadata, identities, etc.)
}
```

Note `last_sign_in_at` is **optional** — a freshly created admin who has not yet logged in will have this field `undefined`. The user-list UI must render a fallback ("Never signed in") rather than crashing on a missing value.

**Example:**
```tsx
// Source: src/lib/supabase/admin.ts (existing) + confirmed API shapes above
import { createAdminClient } from '@/lib/supabase/admin'

export async function listAdmins() {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 50 })
    if (error) {
        console.error('listAdmins: query failed', { error })
        return { users: [], failed: true as const }
    }
    return { users: data.users, failed: false as const }
}
```

D-05 makes 50-per-page the effective ceiling for "every Supabase Auth user is a full admin" — for a single-shop admin team this is not a realistic limit, but note it explicitly rather than silently relying on the default; if the team ever exceeds 50 admins, `listUsers({ perPage: 100 })` (or higher) is the one-line fix.

### Pattern 4: Last-Admin / Self-Delete Guards as Pure Predicates

**What:** D-10 requires both guards enforced server-side. Extract each as a pure, independently testable function rather than inlining the checks in the Server Action.

**Example:**
```typescript
// Recommended new file: src/lib/admin-users/admin-guards.ts
// Pure functions -- no Supabase import, no I/O. Mirrors src/lib/booking/booking-schema.ts's
// isLegalSlot() precedent: a separate, independently unit-testable predicate rather than
// logic inlined in the Server Action.

/**
 * D-10 guard 1: refuse removing your own account.
 * @param targetUserId - The id of the account being removed.
 * @param callerUserId - The id of the currently authenticated admin performing the removal.
 * @returns true if this removal must be blocked.
 */
export function isSelfDeleteAttempt(targetUserId: string, callerUserId: string): boolean {
    return targetUserId === callerUserId
}

/**
 * D-10 guard 2: refuse removing the last remaining admin account.
 * @param totalAdminCount - The count of rows currently returned by listUsers().
 * @returns true if this removal must be blocked.
 */
export function isLastAdminAttempt(totalAdminCount: number): boolean {
    return totalAdminCount <= 1
}
```

The Server Action calls `listUsers()` once (to get both the current count and confirm the target still exists), then calls both predicates before calling `deleteUser()`. Both predicates are covered directly by `vitest` with zero mocking — same pure-function pattern as `isLegalSlot`.

### Anti-Patterns to Avoid

- **Calling `createAdminClient()` from a Client Component or any code path reachable client-side.** Already structurally prevented by `import 'server-only'` in `admin.ts` — do not remove or work around that fence.
- **Using `getSession()` anywhere in this phase's new code.** Middleware already pins `getUser()` with a load-bearing comment citing CVE-2025-29927; new Server Actions must use the same SSR `createClient()` and call `getUser()` if they need the current admin's identity (e.g., for the self-delete guard's `callerUserId`), never `getSession()`.
- **A single `(admin)/admin/layout.tsx` covering `login/` too.** See Pattern/Structure section above — use the nested `(dashboard)` route group instead.
- **Reading `?redirectTo=` from the login form and redirecting there.** D-09 explicitly rejects this as an open-redirect risk not worth the complexity for a two-page admin area.
- **A SQL view/function for daily bucketing.** D-06 forbids any migration this phase; do the aggregation in JS after the fetch (see Pattern 5 below).

### Pattern 5: 30-Day Daily-Bucket Aggregation Without SQL

**What:** Fetch raw `analytics_events` rows created within the last `WINDOW_DAYS` (30), then bucket them by calendar day in JS — no `GROUP BY`, no view, no function.

**Recommendation:** JS-side bucketing is the correct fit here, for three independent reasons: (1) D-06 forbids any migration, ruling out a SQL view or `date_trunc`-based function outright; (2) the row volume is bounded and small — a single-location shop's 30-day event count will be nowhere near the range where in-database aggregation becomes necessary; (3) it produces a pure, unit-testable function with no database dependency, directly satisfying the "extract into pure modules" convention CONTEXT.md's Established Patterns section calls for.

**The pure-function seam for unit tests:**
```typescript
// Recommended new file: src/lib/analytics/bucket-by-day.ts
// Pure function -- no Supabase import, no Date.now() call inside (caller passes "now"
// explicitly, mirroring src/lib/booking/slots.ts's pattern of taking the current time
// as a parameter rather than reading it internally, which is what made that module
// testable without mocking the clock).

export const ANALYTICS_WINDOW_DAYS = 30 // D-03: named constant, tunable without touching query logic
export const ANALYTICS_BUCKET_GRANULARITY = 'day' as const // D-03: named constant

export interface DailyBucket {
    date: string   // 'yyyy-MM-dd'
    count: number
}

/**
 * D-03: buckets raw event timestamps into daily counts across a fixed trailing window.
 * Every day in the window appears in the output, including zero-count days -- this is
 * what makes the chart's x-axis continuous even though, per D-01, every day is
 * currently a zero day (event tracking arrives in Phase 6).
 *
 * @param createdAtTimestamps - ISO-8601 `created_at` strings from a Supabase row set, already filtered to one event_type.
 * @param now - The reference "today" instant, passed explicitly so this function needs no clock mock in tests.
 * @param windowDays - Defaults to ANALYTICS_WINDOW_DAYS; parameterized so tests can use a small window.
 * @returns One DailyBucket per day in the window, oldest first, zero-filled for days with no matching events.
 */
export function bucketByDay(
    createdAtTimestamps: string[],
    now: Date,
    windowDays: number = ANALYTICS_WINDOW_DAYS
): DailyBucket[] {
    // implementation: eachDayOfInterval({ start: subDays(startOfDay(now), windowDays - 1), end: startOfDay(now) })
    // then count timestamps falling within each [dayStart, dayStart + 1day) range, format each as 'yyyy-MM-dd'
    // (see date-fns eachDayOfInterval / startOfDay / subDays / format -- all confirmed installed and importable)
}
```

The Server Component calls `bucketByDay(rows.map(r => r.created_at), new Date(), ANALYTICS_WINDOW_DAYS)` once per metric (visitors, contacts-from-analytics if tracked separately, VIN searches) and passes the resulting `DailyBucket[]` as a plain serializable prop into each `'use client'` chart component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog for destructive action | A custom modal with manual focus-trap/escape-key handling | shadcn `alert-dialog` (Base UI under the hood) | Base UI's `Dialog`/`AlertDialog` primitives already handle focus trapping, escape-to-close, and portal rendering correctly; hand-rolling this reintroduces a11y bugs this repo has never had to solve |
| Chart theming / tooltip / legend | Custom Recharts wrapper components | shadcn `ChartContainer`/`ChartTooltip`/`ChartLegend` | The generated `chart.tsx` already handles dark-mode CSS variable theming, responsive sizing, and a themeable tooltip — confirmed via the actual registry source above |
| Admin session cookie management | Manual `Set-Cookie` header writing in a Route Handler | `@supabase/ssr`'s `createServerClient` + existing `src/lib/supabase/server.ts` | Already built and load-bearing for Phase 4; the cookie `getAll`/`setAll` plumbing is exactly what makes `signInWithPassword` "just work" inside a Server Action |
| Password hashing / storage | Any custom credential store | Supabase Auth's built-in `auth.users` (D-05) | Supabase Auth already hashes and stores credentials; this phase never touches a password hash directly |

**Key insight:** Every "don't hand-roll" item in this phase already has an existing, working analog elsewhere in the codebase (Phase 4's forms, Phase 1's SSR clients) — the work is applying the same patterns to a new surface, not inventing new infrastructure.

## Runtime State Inventory

Not applicable — this is feature-addition work (login, dashboard, user management), not a rename/refactor/migration phase. Skipped per the trigger condition.

## Common Pitfalls

### Pitfall 1: Route group nesting mistake re-wraps the login page
**What goes wrong:** Placing `layout.tsx` at `(admin)/admin/layout.tsx` instead of inside a nested `(dashboard)` group silently wraps `/admin/login` in the authenticated sidebar shell.
**Why it happens:** Next.js layouts apply to every page under their segment regardless of route group boundaries elsewhere in the tree; a route group only opts a folder *out* of the URL, not out of layout inheritance from its own ancestors.
**How to avoid:** Use the nested `(dashboard)` route group structure documented above; verify by visiting `/admin/login` while logged out and confirming no sidebar, no "logout" button, and no admin email render.
**Warning signs:** The login page renders a sidebar with `undefined` or empty email, or a logout button that has nothing to log out of.

### Pitfall 2: `createAdminClient()` used where the RLS-respecting client belongs (or vice versa)
**What goes wrong:** Using the service-role client for dashboard reads means RLS is bypassed and the "as the logged-in admin" framing in D-04 is not actually true; using the SSR client for `auth.admin.*` calls fails outright, since those methods only exist on a service-role-authenticated client.
**Why it happens:** Both clients are one import away from each other (`@/lib/supabase/server` vs `@/lib/supabase/admin`) and both are legitimately used within the same phase.
**How to avoid:** Dashboard reads (contacts, bookings, analytics_events) → always `createClient()` from `server.ts`. Anything under `auth.admin.*` → always `createAdminClient()` from `admin.ts`. There is no operation in this phase that legitimately needs both on the same table.
**Warning signs:** A dashboard query that "works" even when RLS should have blocked it is a sign the wrong client was used.

### Pitfall 3: Treating a failed `analytics_events` query the same as zero real events
**What goes wrong:** If the Supabase query itself errors (network blip, RLS misconfiguration), silently falling back to an empty array renders the identical "no data yet" empty state D-01 wants for the *legitimate* zero-events case — masking a real bug as expected behavior.
**Why it happens:** The simplest code path collapses both cases to `[]`.
**How to avoid:** Branch on `error` explicitly and log it server-side (mirroring `createBooking`'s `console.error` pattern), even though the UI may render the same empty state either way for v1 — at minimum, this preserves debuggability.
**Warning signs:** No `console.error` call anywhere near a dashboard Supabase query.

### Pitfall 4: `perPage` default silently truncates the admin list past 50 users
**What goes wrong:** `listUsers()` with no params returns at most 50 users; a team that somehow exceeds 50 admin accounts would see USER-01's list silently stop growing with no error.
**Why it happens:** The 50-per-page default is documented only in a `@remarks` comment in the `.d.ts` file, not in the return type itself — easy to miss.
**How to avoid:** Pass an explicit `perPage` (e.g. 100) even though 50 is almost certainly sufficient for this single-shop admin team; this makes the ceiling a visible, intentional choice rather than an implicit default.
**Warning signs:** None likely to surface in this project's actual usage, but worth the one-line insurance.

### Pitfall 5: `last_sign_in_at` is `undefined`, not `null`, for a never-logged-in user
**What goes wrong:** Code that does `user.last_sign_in_at ?? 'Never'` works, but code that does `new Date(user.last_sign_in_at).toString()` unconditionally produces `"Invalid Date"` for a freshly created admin who added a password but has not yet logged in (exactly the state right after USER-02 runs).
**Why it happens:** The `User` interface marks `last_sign_in_at?: string` — optional, not nullable-with-a-default.
**How to avoid:** Always guard with an explicit `user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never signed in'` before formatting.
**Warning signs:** "Invalid Date" text visible in the user list immediately after adding a new admin.

## Code Examples

### Login Server Action returning discriminated state (mirrors `BookingActionState`)
```typescript
// Source: pattern mirrors src/types/booking.ts's BookingActionState precedent
export type LoginActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
```

### Add-user Zod schema (D-12)
```typescript
// Source: pattern mirrors src/lib/contact/contact-schema.ts
import { z } from 'zod'

export const addUserSchema = z
    .object({
        email: z.string().trim().email('Enter a valid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(8, 'Confirm the password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })
```

### Reading the shadcn Chart primitive's `ChartConfig` contract (from the live registry source)
```typescript
// Source: https://ui.shadcn.com/r/styles/base-nova/chart.json (confirmed 2026-08-06)
export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; icon?: React.ComponentType } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  )
>
```
This is the shape each of the three chart components (visitors, contacts, VIN searches) will pass into `<ChartContainer config={...}>` — one key per data series, mapping to a CSS color token consistent with the brand red/black/white palette (e.g. `{ visitors: { label: 'Visitors', color: 'var(--primary)' } }`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| shadcn on Radix UI (`asChild` prop) | shadcn `base-nova` style on Base UI (`render` prop) | This repo's `components.json` was initialized with `"style": "base-nova"` from the start (Phase 1) | Every shadcn doc example found via generic web search that shows `asChild` is **not applicable** to this repo; only the live registry JSON (or files already in `src/components/ui/`) reflects the real convention |
| `react-day-picker` v9 (per `PROJECT.md`) | v10.0.1 (per `package.json`, installed in Phase 4) | Phase 4 research verified live against npm | Not directly relevant to Phase 5, but reinforces CONTEXT.md's warning: `PROJECT.md`'s version table is stale advisory text, `package.json` is truth |
| Radix-based `FormControl` using `@radix-ui/react-slot` | This repo's hand-adapted `form.tsx` using `React.cloneElement` directly | Documented inline in `form.tsx`'s own header comment, dated 2026-08-05 | Confirms this project has already solved the Base-UI-vs-canonical-shadcn-docs mismatch once before (Phase 4); Phase 5 is the second time it comes up (chart/dialog/table) and the resolution strategy is the same: verify against the live registry, not generic docs |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs` — abandoned, superseded by `@supabase/ssr` (already correctly avoided project-wide; not relevant to new code this phase, noted for completeness).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npx shadcn@latest add chart` will resolve `recharts` to a version satisfying `^3` at actual install time, landing on or near `3.10.1` rather than the registry's pinned floor `3.8.0` | Standard Stack / Package Legitimacy Audit | Low — both are within the same major version and the `ChartConfig`/`ChartContainer` API used here is stable across 3.x; if a breaking 3.x change existed it would surface immediately as a build failure, not a silent bug |
| A2 | Nesting a route group `(dashboard)` inside `(admin)/admin/` correctly excludes `login/` from that group's `layout.tsx`, based on documented Next.js App Router route-group semantics rather than a direct experiment against Next.js 15.5.15 in this repo | Architecture Patterns / Recommended Project Structure | Medium — if wrong, the planner should have the first Wave verify this structure renders `/admin/login` without the sidebar before building the rest of the phase on top of it; this is a five-minute manual check, not a deep investigation |

## Open Questions (RESOLVED 2026-08-06)

> Both questions below were resolved with the owner during planning and are now locked decisions in
> `05-CONTEXT.md` → "Amendments". The recommendations were accepted as written. The original analysis
> is retained for provenance; **the decisions, not this section, are authoritative.**

1. **RESOLVED — see CONTEXT.md D-19.** Recommendation accepted: plan `05-01` Task 2 is a
   `checkpoint:human-action` verifying/creating the first `auth.users` row.
   **Has Phase 1 D-12's "create the first admin manually" step actually been performed against the live Supabase project?**
   - What we know: The live database exists (Phase 4's `04-02` proved it with real INSERT/DELETE probes), `.env.local` holds real, working credentials, and `auth.users` is the mechanism D-05 relies on entirely.
   - What's unclear: No plan, summary, or state file in this repository documents anyone visiting the Supabase Auth dashboard and creating a user. `STATE.md`'s blockers list still only mentions the now-resolved "no Supabase project / no `.env.local`" item, not this narrower one.
   - Recommendation: The planner should open Phase 5 with a `checkpoint:human-action` task asking the developer to confirm (via the Supabase dashboard's Authentication → Users panel) whether at least one user exists, and to create one if not. This is a two-minute manual action, structurally identical to Phase 4's `04-02` Task 1, but much smaller in scope — it does not require creating a new project, only adding one row to an existing one.

2. **RESOLVED — see CONTEXT.md D-18.** Recommendation accepted: the contacts chart buckets the real
   `contacts` table; only the visitors and VIN-search charts read `analytics_events`. Implemented in
   plans `05-06` and `05-07`.
   **Should the three dashboard charts (visitors, contacts, VIN searches) all read from `analytics_events`, or should the "contacts over time" chart instead bucket the real `contacts` table by `created_at`?**
   - What we know: D-02 is explicit that **card totals** are mixed-source (contacts/bookings cards read the real tables; visitors/VIN-search cards read `analytics_events` and show 0). D-01 says the **charts** query "the real `analytics_events` table."
   - What's unclear: D-01's language technically applies to all three charts including ADMIN-03 ("contact form submissions over time"), which would currently show zero-days on every chart even though real contact rows already exist in the `contacts` table today (Phase 4 delivered real submissions).
   - Recommendation: Apply D-02's mixed-source reasoning to the charts too, not just the cards — bucket the **contacts chart** from the real `contacts.created_at` column (available now, no Phase-6 dependency) while leaving the **visitors** and **VIN-search** charts reading `analytics_events` (correctly empty until Phase 6). This keeps the dashboard as honest as D-02 demands: don't show a flat zero-line for contact submissions when real submitted rows already exist to chart. Flag this explicitly to the user during planning/discussion, since it is a reasonable re-interpretation of D-01's literal wording rather than a settled decision.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Live Supabase project + Postgres | Every success criterion in this phase | ✓ | Project ref `kyhvgskeihtccylpdkas`, provisioned in Phase 4's `04-02` | — |
| `.env.local` with real credentials | `createClient()`, `createAdminClient()` | ✓ | Confirmed present on disk with real (non-placeholder) values | — |
| At least one `auth.users` row | AUTH-01 (nothing to log in as), D-05 (admin list has ≥1 entry), D-10's last-admin guard (needs ≥1 to test against) | ✗ **unverified** | — | **Owned:** plan `05-01` Task 2 `checkpoint:human-action` (CONTEXT.md D-19) |
| npm registry access | `npx shadcn@latest add chart alert-dialog table`, `npm install recharts` | ✓ | Confirmed reachable — `npm view` calls succeeded live during this research session | — |
| Supabase CLI (`npx supabase`) | Not needed this phase — D-06 forbids migrations | n/a | n/a | n/a |

**Missing dependencies with no fallback:**
- At least one `auth.users` row — blocks AUTH-01 verification entirely; must be resolved by a human action task before or during Wave 1.

**Missing dependencies with fallback:**
- None — the one gap above has no code-level fallback (it is inherently a manual dashboard action, same as Phase 1's D-12 always specified).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (`signInWithPassword`, JWT-based sessions via `@supabase/ssr`); credential errors return a generic message that does not reveal account existence (confirmed: `signInWithPassword`'s official docs explicitly state the API "will not distinguish between the cases where the account does not exist or that the email/phone and password combination is wrong") |
| V3 Session Management | yes | `@supabase/ssr` cookie-based sessions; middleware revalidates via `getUser()` (JWT signature check against the auth server) on every request, never trusting a client-supplied session claim without server verification — this is exactly the CVE-2025-29927 mitigation already in place |
| V4 Access Control | yes | RLS policies (`auth.role() = 'authenticated'`) gate all dashboard reads; `auth.admin.*` calls require the service-role key, never exposed to the browser (`server-only` fence in `admin.ts`); D-10's last-admin/self-delete guards are an application-layer access-control rule beyond what RLS alone expresses |
| V5 Input Validation | yes | Zod schemas for login (email/password) and add-user (email, password `min(8)`, confirm-match) — same double-validation pattern (client resolver + server-side re-validation inside the Server Action) as Phase 4 |
| V6 Cryptography | no (delegated) | Password hashing is entirely Supabase Auth's responsibility; this phase never handles a raw password beyond passing it to `signInWithPassword`/`createUser` over the existing HTTPS connection — no custom crypto is written |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Account enumeration via differing login error messages | Information Disclosure | Generic credential-error copy regardless of `error.code` — Claude's Discretion section already anticipates this ("Credential errors should stay generic") |
| Privilege self-lockout (deleting the last admin, or your own account) | Denial of Service (against the business itself) | D-10's two server-side guards, implemented as pure predicates and enforced inside the Server Action before any `deleteUser()` call — never merely hidden in the UI |
| Service-role key exposure via accidental client import | Elevation of Privilege | Already mitigated by `import 'server-only'` in `admin.ts` (build-time failure on client import) — no new work needed, just don't circumvent it |
| Open redirect via a login `?redirectTo=` parameter | Tampering | D-09 avoids the entire class by never reading a redirect target from the request — login always redirects to the fixed `/admin` |
| Stale session after logout still valid via cached RSC payload | Session Management | `logoutAction` calls `revalidatePath('/', 'layout')` after `signOut()`, forcing a fresh Server Component render rather than serving a stale authenticated payload |

## Sources

### Primary (HIGH confidence)
- `node_modules/@supabase/auth-js/dist/main/GoTrueAdminApi.d.ts` (installed, version bundled with `@supabase/supabase-js@2.103.0`) — `listUsers`/`createUser`/`deleteUser` signatures, `PageParams`, default `perPage` of 50
- `node_modules/@supabase/auth-js/dist/main/lib/types.d.ts` (installed) — `User` interface fields, `AdminUserAttributes`, `UserResponse`
- `node_modules/@supabase/auth-js/dist/main/lib/error-codes.d.ts` (installed) — confirmed `invalid_credentials` present in `ErrorCode` union
- `node_modules/@supabase/auth-js/dist/main/lib/errors.d.ts` (installed) — `AuthError` class shape (`code`, `status`)
- `F:/2026/Projects/Windshield/src/lib/supabase/middleware.ts`, `server.ts`, `admin.ts` (existing repo code) — auth client patterns already load-bearing
- `F:/2026/Projects/Windshield/src/components/ui/sheet.tsx`, `button.tsx`, `form.tsx`, `card.tsx` (existing repo code) — confirmed Base UI + `render`-prop convention in actual use
- `F:/2026/Projects/Windshield/components.json` — confirmed `"style": "base-nova"`
- `https://ui.shadcn.com/r/styles/base-nova/chart.json`, `dialog.json`, `alert-dialog.json`, `table.json` — live registry payloads fetched 2026-08-06, full source + dependency arrays
- `npm view recharts version` / `npm view @base-ui/react version` — live registry queries, 2026-08-06
- `slopcheck install recharts` — legitimacy scan, `[OK]` verdict, 2026-08-06
- `.planning/phases/04-booking-contact/04-02-PLAN.md` + `04-02-SUMMARY.md` — proof the live Supabase project, migration push, RLS, and UNIQUE constraint are all real and verified against a live database
- `.planning/phases/01-foundation/01-CONTEXT.md` D-12 — the first-admin-creation decision, whose execution status is unverified (see Open Question 1)

### Secondary (MEDIUM confidence)
- Supabase official docs (`supabase.com/docs/guides/auth/passwords`) — Server Action `signInWithPassword` + `revalidatePath`/`redirect` pattern, matches the canonical Vercel/Supabase Next.js starter shape
- Supabase official docs (`supabase.com/docs/reference/javascript/auth-signinwithpassword`) — generic-error-on-invalid-credentials behavior statement

### Tertiary (LOW confidence)
- None used without cross-verification in this research — every claim above traces to an installed type definition, a live registry fetch, a live npm query, or existing repo code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts pinned via the live shadcn registry JSON and cross-checked against npm; all other packages already installed and version-confirmed from `package.json`
- Architecture (route groups, Server Action cookie flow, Admin API shapes): HIGH — route-group nesting is standard documented Next.js behavior, Admin API shapes read directly from installed `.d.ts` files, not training-data recall
- Pitfalls: HIGH for the Base-UI/route-group/Admin-API pitfalls (all directly observed in this session); MEDIUM for the daily-bucketing "own clock" pitfall (design guidance, not an observed bug)
- Blocker resolution: HIGH — Phase 4's `04-02-SUMMARY.md` provides direct, dated proof (HTTP status codes, Postgres error codes) that the database blocker is resolved
- First-admin-user gap: MEDIUM — absence of evidence is not proof of absence; flagged as Open Question 1 rather than asserted either way

**Research date:** 2026-08-06
**Valid until:** 2026-08-20 (14 days — this domain mixes a fast-moving CLI-generated dependency (`recharts`/shadcn registry, which can change on any `npx shadcn@latest` run) with stable, already-installed packages; treat the registry-sourced JSON as time-sensitive and re-verify if planning is delayed)
