# Alamo City Windshield Repair

## What This Is

A modern landing page and business application for Alamo City Windshield Repair, a windshield repair and installation service in San Antonio, Texas. Users can learn about the service, get instant windshield replacement estimates by entering their VIN, book appointments via a visual calendar, and contact the business. An admin dashboard provides analytics and user management.

## Core Value

Users can enter their VIN, instantly see a windshield replacement estimate for their specific vehicle, and book an appointment — removing friction from getting a quote.

## Requirements

### Validated

- ✓ Landing page with full-page snap scroll (hero image → estimate section) — v1.0
- ✓ VIN decoder integration via external API (year, make, model, windshield type) — v1.0 (NHTSA vPIC through a server-side proxy with 6s timeout, `vin_cache`, and a manual fallback)
- ✓ Formula-based windshield estimate (base price + modifiers for vehicle size, windshield type, ADAS calibration) — v1.0
- ✓ Appointment booking with visual calendar showing available slots — v1.0 (race-safe via a `UNIQUE (appt_date, appt_time)` constraint, not check-then-insert)
- ✓ About page with company mission, vision, and information — v1.0
- ✓ Contact form (name, last name, phone, optional address) with VIN search — v1.0 (honeypot-protected; runtime-verified to write nothing on a bot submission)
- ✓ Admin login via Supabase Auth — v1.0 (`@supabase/ssr`, `getUser()` in middleware, fails closed if env is unset)
- ✓ Admin dashboard with charts (visitors, contacts, VIN searches) — v1.0
- ✓ Admin user management (add/remove users with login access) — v1.0 (last-admin-removal guard, race-narrowed not race-free)
- ✓ Responsive design with white/red/black color palette — v1.0
- ✓ Top navigation: Home, About, Contact, Admin — v1.0

### Active

(None — v1.0 shipped. Next milestone's requirements are defined by `/gsd:new-milestone`.)

Carried forward as known work, not yet scoped into requirements:

- [ ] Replace placeholder marketing copy — "since 2020" founding year and three invented testimonials
- [ ] Verify Phase 02 (the only phase with no VERIFICATION.md artifact)
- [ ] Close open review warnings WR-01, WR-03, WR-04 (analytics robustness), WR-06 (misleading comment)
- [ ] Add component-test infrastructure — all 135 tests are currently pure-function

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

**v1.0 SHIPPED 2026-08-10.** All 6 phases complete; 47/47 plans. Milestone audit
`passed` — 63/63 requirements, 23/23 cross-phase integrations, 5/5 E2E flows.

**Live:** https://alamo-city-windshield.vercel.app/
**Repository:** https://github.com/rodrilink/alamo-city-windshield (public)
**Supabase project:** `kyhvgskeihtccylpdkas` (RLS enabled on all four tables)

Verified in production, not self-reported: all public routes return 200; `/admin`
correctly returns `307 → /admin/login` when unauthenticated; a live VIN decode of a
2003 Honda Accord returns a full estimate and wrote a real `vin_search` row to
`analytics_events`.

Repo gates on `master`: `tsc` 0, **135/135 vitest tests across 15 files**, lint clean,
build 12/12 pages — all passing under both `TZ=UTC` and `TZ=America/Chicago`.

### What v1.0 proved about this codebase

Three separate times, work was "complete and fully green" before it was actually
right — each caught by human use or adversarial review, never by static checks:

1. The Visitors KPI counted page views as people (one visitor browsing three pages
   read as 3). Found by human UAT.
2. The fix for that then would have silently frozen at Supabase's `max_rows = 1000`
   cap — PostgREST returns HTTP 200 with a truncated body, so no error fires. Found
   by code review.
3. Two timezone defects double-counted sessions crossing UTC midnight and skewed the
   analytics window by 5 hours on Vercel — invisible on a Chicago-set dev machine.
4. A missing Supabase env var would have served every `/admin/*` route
   **unauthenticated with no error and no log**. Found by the milestone audit, fixed
   before the first deploy.

**Lesson for the next milestone:** the failure mode in this project is silent
wrongness, not crashes. Green gates are necessary and not sufficient — runtime
verification against live data, and testing under the production timezone, caught
everything that mattered.

**Deferred, tracked in `MILESTONES.md`:** placeholder marketing copy retained by
owner decision; Phase 02 has no VERIFICATION.md; four open review warnings; no
component-test infrastructure; one verification booking occupying a real slot.

---
*Last updated: 2026-08-10 after v1.0 milestone*
