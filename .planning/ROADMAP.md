# Roadmap: Alamo City Windshield Repair

## Overview

Six phases deliver the complete site: a project foundation and layout shell, then the public pages, then the core VIN estimate feature (the product's central value), then the booking and contact transaction flows, then the admin backend (auth, dashboard, user management), and finally the analytics wiring threaded across every layer. Each phase leaves the project in a verifiably runnable state before the next begins.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Next.js project scaffolded, Supabase connected, Vercel configured, database schema with RLS in place (completed 2026-04-13)
- [x] **Phase 2: Public Pages** - Home snap-scroll layout, About page, and navigation shell visible and responsive (completed 2026-04-14)
- [x] **Phase 3: VIN Estimate** - VIN decoder, pricing formula, and estimate result fully functional end-to-end (completed 2026-08-05)
- [x] **Phase 4: Booking & Contact** - Appointment booking calendar and contact form both save to Supabase
 (completed 2026-08-06)

- [ ] **Phase 5: Admin Backend** - Admin login, protected dashboard with charts, and user management operational
- [ ] **Phase 6: Analytics** - Event tracking wired across all user actions; admin charts powered by real data

## Phase Details

### Phase 1: Foundation

**Goal**: Project is scaffolded, Supabase is connected, the database schema with RLS is live, and a successful Vercel deployment exists
**Depends on**: Nothing (first phase)
**Requirements**: FDN-01, FDN-02, FDN-03, FDN-04, FDN-05, FDN-06, FDN-07, NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):

  1. Running `npm run dev` serves a page with the top navigation (Home, About, Contact, Admin links) and the phone number visible on every page
  2. The site renders correctly on mobile, tablet, and desktop with the white/red/black color palette applied
  3. The footer displays business hours, location, and San Antonio service area on every public page
  4. A Vercel deployment URL exists where the build succeeds and environment variables are documented in `.env.example`
  5. All Supabase tables (bookings, contacts, analytics_events) exist with RLS enabled and correct insert/select policies

**Plans:** 5/5 plans complete

Plans:

- [x] 01-01-PLAN.md — Scaffold Next.js 15 + Tailwind v4 brand theme + shadcn/ui init
- [x] 01-02-PLAN.md — Supabase SSR three-file pattern + .env.example + middleware auth guard
- [x] 01-03-PLAN.md — Database migration (4 tables + RLS policies) + schema push
- [x] 01-04-PLAN.md — Navigation shell (TopNav, Footer, Logo, route groups, placeholder pages)
- [x] 01-05-PLAN.md — Git + GitHub + Vercel deployment with env var configuration

**UI hint**: yes

### Phase 2: Public Pages

**Goal**: All public-facing pages are visible with their full content and the snap-scroll home experience works on all major browsers and mobile
**Depends on**: Phase 1
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, ABOUT-01, ABOUT-02, ABOUT-03, ABOUT-04
**Success Criteria** (what must be TRUE):

  1. The home page hero section fills the full viewport with a background image and headline, and scroll-snaps to the estimate section below
  2. The VIN input field appears in the second snap section and accepts a 17-character VIN with client-side format validation
  3. A "Book Appointment" CTA appears after an estimate result is shown (estimate display is a placeholder at this phase)
  4. The About page displays the company mission, vision, service area, warranty statement, and trust signals

**Plans:** 4/4 plans complete

Plans:

- [x] 02-01-PLAN.md — Install motion, configure Unsplash, build snap scroll shell + HeroSection
- [x] 02-02-PLAN.md — VIN estimate section with form validation, fake result, and Book CTA
- [x] 02-03-PLAN.md — Services + testimonials section with service cards grid and Contact CTA
- [x] 02-04-PLAN.md — About page with mission, vision, and trust signals sections

**UI hint**: yes

### Phase 3: VIN Estimate

**Goal**: Users can enter a VIN, receive a decoded vehicle identity and a formula-based price range with line-item breakdown, with fallback for API failures
**Depends on**: Phase 2
**Requirements**: VIN-01, VIN-02, VIN-03, VIN-04, VIN-05, VIN-06, VIN-07
**Success Criteria** (what must be TRUE):

  1. Entering a valid VIN returns the vehicle year, make, and model alongside a low/high price range within a reasonable wait
  2. The estimate displays as a range (low/high) with a visible line-item breakdown (base price, vehicle size modifier, windshield type modifier, ADAS calibration modifier)
  3. A windshield type selector (standard/acoustic/heated) appears and updates the estimate when changed
  4. If the NHTSA API times out or fails, a manual entry fallback is shown instead of an error state
  5. Vehicles from 2018 or later display an ADAS calibration notice indicating the estimate includes potential calibration cost

**Plans:** 9/10 plans executed

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Package legitimacy gate for server-only + vitest (blocking human approval)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — Vitest harness + shared vehicle/estimate type contract

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-03-PLAN.md — Locked pricing formula (D-01..D-05) + six D-06 fixture tests
- [x] 03-04-PLAN.md — Service-role client, vin_cache access, NHTSA decode + 3-way classification
- [x] 03-05-PLAN.md — Segmented selector primitive + EstimateResult presentation component

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 03-06-PLAN.md — Route Handlers: GET /api/vin/[vin] and GET /api/estimate

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 03-07-PLAN.md — Manual entry fallback + EstimateSection rewired to the real lookup

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 03-09-PLAN.md — Gap closure: manual-path vehicle label must track the size-bucket selector (UAT test 10) *(Task 1 shipped in c3eb37f; Task 2 regression test blocked on component-test deps)*

**Wave 7** *(blocked on Wave 5 completion)*

- [x] 03-10-PLAN.md — Gap closure: estimate result card clipped at the top on short viewports (UAT test 14)
- [ ] 03-08-PLAN.md — End-to-end human verification of all 5 success criteria *(re-run after 03-09 and 03-10)*

### Phase 4: Booking & Contact

**Goal**: Users can book an appointment via a visual calendar and submit contact requests, both saved reliably to Supabase with no double-booking possible
**Depends on**: Phase 3
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06
**Success Criteria** (what must be TRUE):

  1. The calendar shows a month view where selecting a date reveals available time slots; already-booked slots appear visually disabled
  2. Completing a booking (name, phone, optional VIN) shows a confirmation screen; submitting the same slot a second time returns a "slot taken" message
  3. The contact form (first name, last name, phone required; address optional) submits successfully and shows a confirmation message
  4. The contact page includes a VIN search field that uses the same decoder as the home page
  5. Form validation (Zod + react-hook-form) catches missing required fields before submission

**Plans:** 12/12 plans complete

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Package legitimacy gate for five packages (blocking human approval)
- [x] 04-02-PLAN.md — [BLOCKING] Supabase project provisioning + .env.local + schema push
- [x] 04-03-PLAN.md — Slot generation from BUSINESS.hours (D-01..D-03) + America/Chicago server time (D-06)

**Wave 2** *(blocked on 04-01)*

- [x] 04-04-PLAN.md — Install packages, generate + patch shadcn Calendar/Form, booking types, BOOKING_COPY/CONTACT_COPY

**Wave 3** *(blocked on 04-02, 04-03, 04-04)*

- [x] 04-05-PLAN.md — Availability reads, Zod schemas, createBooking + createContact Server Actions

**Wave 4** *(blocked on 04-05)*

- [x] 04-06-PLAN.md — /book route: calendar, slot list, booking form, confirmation
- [x] 04-07-PLAN.md — /contact rewrite: contact form, VIN search, EstimateResult CTA rewire to /book

**Wave 5** *(blocked on 04-06, 04-07)*

- [x] 04-08-PLAN.md — End-to-end human verification of all 5 success criteria

**Wave 6** *(gap closure — blocked on 04-08 verification)*

- [x] 04-09-PLAN.md — WR-03: Zod .max() length caps on booking + contact schemas
- [x] 04-10-PLAN.md — CONT-06 gap: gate booking submit through handleSubmit; WR-02 slot deselect preserving D-09 values

**Wave 7** *(blocked on 04-10)*

- [x] 04-11-PLAN.md — WR-01: derive day-level fully-booked from refetched availability

**Wave 8** *(blocked on 04-09, 04-10, 04-11)*

- [x] 04-12-PLAN.md — Human re-verification of UAT step 24 and the slot-taken race path

**UI hint**: yes

### Phase 5: Admin Backend

**Goal**: Authenticated admins can log in, view the dashboard with summary cards and charts of site activity, and manage admin user accounts
**Depends on**: Phase 4
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, USER-01, USER-02, USER-03, USER-04
**Success Criteria** (what must be TRUE):

  1. Visiting any `/admin/*` URL while logged out redirects to `/admin/login` with no flash of admin content
  2. Logging in with valid email/password lands on the dashboard; the logout button clears the session and returns to the login page
  3. The dashboard displays summary cards (total visitors, contacts, VIN searches, bookings) and charts for each metric over time
  4. The dashboard shows a table of recent contact submissions and a table of upcoming appointments
  5. An admin user can add a new admin account (email + password) and remove an existing one from the user management page

**Plans**: 9 plans

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Package-approval gate for `recharts` + first-admin `auth.users` human action (D-19)
- [x] 05-03-PLAN.md — `ADMIN_COPY`, type contracts, both Zod schemas, D-10 guards and `bucketByDay` with unit tests

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — Generate and verify the `chart`, `alert-dialog` and `table` shadcn primitives on Base UI
- [x] 05-06-PLAN.md — `dashboard-queries.ts`: mixed-source totals, three D-03 series, two bounded tables

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-04-PLAN.md — Login/logout Server Actions, `LoginForm`, `/admin/login` page; verify AUTH-03/04 and USER-04

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 05-05-PLAN.md — `(dashboard)` nested route group, sidebar shell and logout wiring (D-14)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 05-07-PLAN.md — `/admin` dashboard: summary cards, three charts with the D-01 empty state, two read-only tables
- [x] 05-08-PLAN.md — `/admin/users`: list, add-admin, remove-admin with both D-10 guards and D-11 confirmation

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 05-09-PLAN.md — End-of-phase verification of all 5 success criteria and both D-10 guard refusals

**UI hint**: yes

### Phase 6: Analytics

**Goal**: Every meaningful user action fires a tracked event to Supabase in a non-blocking way, and the admin dashboard charts reflect real accumulated data
**Depends on**: Phase 5
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05, ANLY-06
**Success Criteria** (what must be TRUE):

  1. Page views on all public pages (Home, About, Contact) are recorded as `page_view` events in the `analytics_events` table without slowing page load
  2. Each successful VIN decode records a `vin_search` event; each contact form submission records a `contact_submit` event; each booking records a `booking_created` event
  3. The admin dashboard charts display data from the `analytics_events` table (visitor count over time, VIN searches over time, contact submissions over time)
  4. Event tracking is fire-and-forget: failing to record an event does not block or error the user action that triggered it

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/5 | Complete   | 2026-04-13 |
| 2. Public Pages | 4/4 | Complete   | 2026-04-14 |
| 3. VIN Estimate | 9/10 | In Progress|  |
| 4. Booking & Contact | 12/12 | Complete   | 2026-08-06 |
| 5. Admin Backend | 8/9 | In Progress|  |
| 6. Analytics | 0/TBD | Not started | - |
