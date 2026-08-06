# Phase 5: Admin Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-06
**Phase:** 05-admin-backend
**Areas discussed:** Empty-chart data source, Who counts as an admin, User management safety rails, Dashboard shell + tables

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Empty-chart data source | ADMIN-02/03/04 chart analytics_events, which stays empty until Phase 6 | ✓ |
| Who counts as an admin | No roles table exists; every `authenticated` user is a full admin | ✓ |
| User management safety rails | What stops the last admin locking everyone out | ✓ |
| Dashboard shell + tables | Admin chrome; how much the two tables do | ✓ |

**User's choice:** all four areas.

---

## Empty-chart data source

### Chart data source

| Option | Description | Selected |
|--------|-------------|----------|
| Real queries + empty state | Build the real analytics_events query layer; charts render zero-data with an honest "tracking arrives Phase 6" empty state. Phase 6 needs no chart-code changes. | ✓ |
| Seed fake rows into analytics_events | Charts look populated during UAT, but seed data must be deleted before launch or the dashboard shows lies. | |
| Derive charts from bookings/contacts | Use tables that have real rows; visitors and VIN searches still have no source. | |

**User's choice:** Real queries + empty state → **D-01**

### Summary card totals

| Option | Description | Selected |
|--------|-------------|----------|
| Mixed: real where real exists | Contacts/bookings count real table rows; visitors/VIN searches read 0 from analytics_events with a hint. No fabricated numbers. | ✓ |
| All four from analytics_events | Uniform source, but shows "0 bookings" when bookings has rows — looks broken. | |
| All four from their own tables | Not achievable — visitors and VIN searches have no table of their own. | |

**User's choice:** Mixed → **D-02**

### Time window

| Option | Description | Selected |
|--------|-------------|----------|
| Last 30 days, daily buckets | ~30 readable points, cheap query, window in a named constant. | ✓ |
| Selectable 7 / 30 / 90 days | More useful long-term; more UI, state, and query paths in an already-full phase. | |
| All time | Simplest query, but the x-axis degrades as data accumulates. | |

**User's choice:** Last 30 days → **D-03**

### Fetch layer

| Option | Description | Selected |
|--------|-------------|----------|
| Server Components, direct query | Async Server Component queries Supabase via the SSR server client (RLS-enforced), passes plain data to Client Component charts. | ✓ |
| Route Handlers + client fetch | Mirrors Phase 3, but those were public GETs from client forms; the dashboard is server-rendered behind auth. | |
| Server Actions | Mirrors Phase 4's D-13, but those are for mutations; using them for reads means rendering an empty shell then filling it. | |

**User's choice:** Server Components → **D-04**

**Notes:** No follow-up questions requested; moved to next area.

---

## Who counts as an admin

### Admin identity model

| Option | Description | Selected |
|--------|-------------|----------|
| auth.users IS the admin list | No migration. Every auth.users row is an admin; listed via service-role `auth.admin.listUsers()`. Safe because no public signup path exists. Existing RLS policies work unchanged. | ✓ |
| Add an admin_roles / profiles table | Enables future non-admin roles, but costs a migration, policy rewrites on 3 tables, and an auth.users↔role-row sync problem. | |
| Use Supabase user_metadata flag | No migration, but RLS must parse JWT claims — roles-table complexity without the table. | |

**User's choice:** auth.users IS the admin list → **D-05**, and consequently **D-06** (no migration this phase)

**Notes:** This resolves the question Phase 1's D-10 deliberately left open ("plus a custom `profiles` or `admin_roles` table **if roles are needed**").

### User list columns

| Option | Description | Selected |
|--------|-------------|----------|
| Email, created date, last sign-in | All free in the `listUsers()` response; last sign-in is what makes removal decisions possible. | ✓ |
| Email only | Minimum for USER-01, but gives no basis for deciding which account to remove. | |
| + confirmation status | Only relevant with Supabase email confirmation, which needs SMTP that is out of scope. | |

**User's choice:** Email, created, last sign-in → **D-07**

### Password reset

| Option | Description | Selected |
|--------|-------------|----------|
| No — out of scope, note it | AUTH-01..05 name only login/logout; reset needs SMTP + email template. Recovery via another admin or the Supabase dashboard. | ✓ |
| Yes — add forgot-password | Reset page, callback route, SMTP config — scope expansion beyond the five AUTH requirements. | |
| Admin sets another admin's password | Cheap via the Admin API, but lets any admin silently take over another account. | |

**User's choice:** No → **D-08** (deferred idea recorded)

### Post-login destination

| Option | Description | Selected |
|--------|-------------|----------|
| Always /admin | Matches success criterion 2 exactly; one redirect target. | ✓ |
| Back to the blocked page | Nicer UX, but `?redirectTo=` is attacker-controllable and needs same-origin validation to avoid an open redirect. | |

**User's choice:** Always /admin → **D-09**

**Notes:** No follow-up questions requested; moved to next area.

---

## User management safety rails

### Delete guards

| Option | Description | Selected |
|--------|-------------|----------|
| Both self-delete and last-admin guards | Two cheap server-side comparisons that close both routes to a total lockout. | ✓ |
| Last-admin guard only | Allows deliberate self-removal, but also easy accidental self-removal with no undo. | |
| Self-delete guard only | Stops the misclick but still allows deleting the other admin. | |
| No guards | Lockout is recoverable via the Supabase dashboard, but it's a bad afternoon. | |

**User's choice:** Both → **D-10**

### Removal confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation dialog naming the email | Destructive and irreversible with no undo, so it deserves a deliberate second action. Requires generating a shadcn dialog primitive. | ✓ |
| Type the email to confirm | Maximum friction; heavy for a 2-admin shop. | |
| No confirmation | Fast, and the guards prevent the worst case, but accidental removal means recreating the account. | |

**User's choice:** Confirmation dialog → **D-11**

### Password rules for add-user

| Option | Description | Selected |
|--------|-------------|----------|
| Zod min 8 + Supabase default | Client Zod min-length plus a confirm field; Supabase policy as server backstop. Consistent with the Phase 4 form pattern. Password shown once (no email delivery). | ✓ |
| Stronger: 12 chars + complexity | More secure for an account that reads every customer's contact details; more friction, and complexity rules push people to write passwords down. | |
| Generate the password automatically | No weak passwords possible, but closing the page before copying means recreating the account. | |

**User's choice:** Zod min 8 → **D-12**

### Route placement

| Option | Description | Selected |
|--------|-------------|----------|
| /admin/users | Dedicated route with list, add form, per-row remove. Keeps the dashboard focused on metrics. | ✓ |
| A section on the /admin dashboard | Fewer routes, but mixes read-only analytics with destructive account actions on a very long page — invites the 03-UAT test 14 clipping problem. | |

**User's choice:** /admin/users → **D-13**

**Notes:** No follow-up questions requested; moved to next area.

---

## Dashboard shell + tables

### Admin chrome

| Option | Description | Selected |
|--------|-------------|----------|
| Own (admin) layout, sidebar nav | Real layout.tsx with sidebar (Dashboard, Users), admin email, logout. Matches Phase 1's D-17. Login page must sit outside it. | ✓ |
| Reuse public TopNav + Footer | Zero new components, but shows a customer phone CTA and service-area footer to an operator, with nowhere for logout. | |
| Minimal top bar, no sidebar | Less to build, fine for two pages, but diverges from D-17. | |

**User's choice:** Own (admin) layout with sidebar → **D-14**

### Table capability

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only lists | ADMIN-06/07 say "table of…"; no requirement mentions acting on rows. Row actions become a clean follow-up phase. | ✓ |
| Read-only + booking status change | Genuinely useful since D-12 writes every booking as `pending`, but it is a new capability with its own Server Action, RLS write path, and tests. | |
| Full row actions | Mark contacted, cancel bookings, add notes — clearly its own phase. | |

**User's choice:** Read-only → **D-15**

**Notes:** Booking status transitions were explicitly recognized as useful and recorded as a strong follow-up-phase candidate rather than dropped.

### Table scope

| Option | Description | Selected |
|--------|-------------|----------|
| Latest 10 contacts / next 10 appointments | Bounded queries, no pagination, answers "what needs my attention". Limits in named constants. | ✓ |
| Same 30-day window as the charts | Consistent, but "upcoming" is forward-looking while the chart window is backward-looking — would show the wrong thing. | |
| All rows, paginated | More querying, state, and UI than the requirements ask for. | |

**User's choice:** Latest 10 / next 10 → **D-16**

### Appointment row fields

| Option | Description | Selected |
|--------|-------------|----------|
| Date, time, name, phone, vehicle_desc, status | Everything needed to make the confirmation call without opening Supabase. Uses the D-12 denormalization as intended — no VIN re-decoding. | ✓ |
| Date, time, name, phone only | Leaves vehicle_desc unused, wasting Phase 4's deliberate denormalization. | |
| Every bookings column | Complete but wide; raw VIN adds nothing beside a human-readable description. | |

**User's choice:** Date, time, name, phone, vehicle_desc, status → **D-17**

---

## Claude's Discretion

- Chart type per metric (area vs bar vs line) and zero-day gap filling on the x-axis
- Whether daily bucketing happens in SQL or in JS after the fetch
- Sidebar styling and collapse behavior; card and table layout; inline vs dialog add-user form
- Login error-message wording (must follow the Phase 3 D-17/D-18 distinct-failure-cause principle; credential errors stay generic)
- Exact user-facing copy strings, following the `ESTIMATE_COPY` / `BOOKING_COPY` / `CONTACT_COPY` module pattern

## Deferred Ideas

- Booking status transitions from the dashboard (`pending` → `confirmed` → `completed`) — strongest follow-up candidate
- Contact row actions (mark contacted, internal notes)
- Manual slot blocking / blackout dates — carried over from Phase 4, which pointed at "the admin work in Phase 5"; still out of scope as a booking-availability capability
- Password reset / forgot-password flow (needs SMTP)
- An admin setting another admin's password (needs a role distinction first)
- Roles beyond "admin" (staff read-only role)
- Chart date-range picker (7 / 30 / 90 days)
- Pagination / search on the dashboard tables
- Admin-editable pricing — V2-04

## Todos reviewed but not folded

- `calendar-sizing-centering.md` — targets `/book` and `BookingCalendar.tsx`, outside the `(admin)` scope of this phase. Quick-task material.
- `requirements-traceability-stale.md` — project-wide docs/tooling drift; Phase 5 will inherit the same problem on completion. Best fixed at the mechanism level.

## Not discussed (offered, declined)

At the final gate the user was offered three further gray areas and chose to proceed to context:
- Login failure/error-state handling (wrong password vs Supabase unreachable)
- The Supabase-project / `.env.local` blocker
- Chart type per metric and zero-day gap filling

The first and third were folded into Claude's Discretion above; the blocker is recorded as a warning section in CONTEXT.md.
