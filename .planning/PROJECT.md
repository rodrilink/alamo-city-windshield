# Alamo City Windshield Repair

## What This Is

A modern landing page and business application for Alamo City Windshield Repair, a windshield repair and installation service in San Antonio, Texas. Users can learn about the service, get instant windshield replacement estimates by entering their VIN, book appointments via a visual calendar, and contact the business. An admin dashboard provides analytics and user management.

## Core Value

Users can enter their VIN, instantly see a windshield replacement estimate for their specific vehicle, and book an appointment — removing friction from getting a quote.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Landing page with full-page snap scroll (hero image → estimate section)
- [ ] VIN decoder integration via external API (year, make, model, windshield type)
- [ ] Formula-based windshield estimate (base price + modifiers for vehicle size, windshield type, ADAS calibration)
- [ ] Appointment booking with visual calendar showing available slots
- [ ] About page with company mission, vision, and information
- [ ] Contact form (name, last name, phone, optional address) with VIN search
- [ ] Admin login via Supabase Auth
- [ ] Admin dashboard with charts (visitors, contacts, VIN searches)
- [ ] Admin user management (add/remove users with login access)
- [ ] Responsive design with white/red/black color palette
- [ ] Top navigation: Home, About, Contact, Admin

### Out of Scope

- Mobile native app — web-first, responsive design covers mobile
- Payment processing — estimates and booking only, payment handled in person
- Multi-location support — single San Antonio location for v1
- SMS notifications — email or phone follow-up handled manually

## Context

- **Service area:** San Antonio, Texas
- **Business type:** Windshield repair and installation (mobile or shop-based)
- **Target users:** Vehicle owners needing windshield repair/replacement in the San Antonio area
- **VIN decoding:** External API (e.g., NHTSA vPIC API) decodes VIN to vehicle details; backend uses those details to compute estimate from a formula (base price + vehicle size modifier + windshield type modifier + ADAS calibration modifier)
- **Appointment system:** Visual calendar UI where users pick from available time slots, saved to Supabase
- **Admin analytics:** Track page visitors, contact form submissions, and VIN search usage with charts

## Constraints

- **Tech stack**: Next.js + React + TailwindCSS + shadcn/ui — user-specified
- **Database**: Supabase (hosted PostgreSQL with built-in auth and real-time)
- **Deployment**: Vercel — deployment-ready configuration required
- **Design**: White, red, and black color palette — strict brand constraint
- **UI Library**: shadcn/ui components — user-specified

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for database + auth | Provides hosted PostgreSQL, auth, and real-time out of the box — reduces backend complexity | ✓ Validated in Phase 5 — admin auth (login/logout/guarded routes) and `auth.users`-as-admin-list both working live |
| Formula-based pricing | More flexible than fixed price table, allows modifiers per vehicle attribute | — Pending |
| Full-page snap scroll on home | Clean modern UX, each section gets full attention | — Pending |
| Visual calendar for appointments | Better UX than a simple date/time picker, shows availability at a glance | — Pending |
| NHTSA vPIC API for VIN decoding | Free government API, reliable, no API key required | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

## Current State

**Phase 5 complete (2026-08-06) — admin backend.** 5 of 6 phases done; 39/40 plans.

Working and human-verified end to end: `/admin/login` with cookie-based Supabase SSR
auth, middleware guarding every `/admin/*` route, the `(dashboard)` sidebar shell, the
`/admin` dashboard (4 summary cards, 3 time-series charts, 2 read-only tables), and
`/admin/users` add/remove with both D-10 safety guards (self-delete and last-admin)
enforced server-side and confirmed refusing live.

Repo gates on `master`: `tsc` 0, 115/115 vitest tests, lint clean, build 12/12 pages.

**Carried into Phase 6:** the visitors (ADMIN-02) and VIN-search (ADMIN-04) charts
render a "Tracking starts in Phase 6" empty state — nothing writes `analytics_events`
rows with `event_type` `'page_view'` / `'vin_search'` yet. Phase 6 owns that producer
and **must reconcile its emitted literals against `dashboard-queries.ts`**, or those two
charts stay silently empty rather than erroring.

---
*Last updated: 2026-08-06 after Phase 5 completion*
