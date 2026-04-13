# Requirements: Alamo City Windshield Repair

**Defined:** 2026-04-12
**Core Value:** Users can enter their VIN, instantly see a windshield replacement estimate for their specific vehicle, and book an appointment — removing friction from getting a quote.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FDN-01**: Next.js 15 App Router project scaffolded with React 19 and TypeScript
- [ ] **FDN-02**: TailwindCSS v4 configured with white/red/black brand color palette
- [ ] **FDN-03**: shadcn/ui initialized with base component set
- [ ] **FDN-04**: Supabase project connected via `@supabase/ssr` (server + client + middleware pattern)
- [ ] **FDN-05**: Supabase database schema with RLS enabled on every table
- [ ] **FDN-06**: Vercel deployment configured (build succeeds, env vars documented)
- [ ] **FDN-07**: `.env.example` committed with correct `NEXT_PUBLIC_` prefix usage

### Navigation & Layout

- [ ] **NAV-01**: Top navigation with Home, About, Contact, Admin links
- [ ] **NAV-02**: Prominent phone number visible on every public page
- [ ] **NAV-03**: Responsive layout (mobile-first, works on phone/tablet/desktop)
- [ ] **NAV-04**: Footer with business hours, location, and service area (San Antonio, TX)

### Home Page

- [ ] **HOME-01**: Full-screen hero section with background image and headline
- [ ] **HOME-02**: Full-page snap scroll with CSS scroll-snap (mandatory snap)
- [ ] **HOME-03**: Second section reveals new background image and VIN estimate form
- [ ] **HOME-04**: VIN input field with validation (17-character VIN format)
- [ ] **HOME-05**: Estimate result displays vehicle info (year/make/model) and price
- [ ] **HOME-06**: "Book Appointment" CTA after estimate is shown

### VIN Decode & Pricing

- [ ] **VIN-01**: Server-side Route Handler (`/api/vin/[vin]`) calls NHTSA vPIC API
- [ ] **VIN-02**: NHTSA call has 6-second timeout with graceful failure + manual entry fallback
- [ ] **VIN-03**: Decoded VIN results cached in Supabase to avoid repeat API calls
- [ ] **VIN-04**: Pricing formula: base price + vehicle size modifier + windshield type modifier + ADAS calibration modifier
- [ ] **VIN-05**: Estimate displayed as a range (low/high) with line-item breakdown
- [ ] **VIN-06**: Windshield type selector (standard/acoustic/heated) since NHTSA doesn't return it
- [ ] **VIN-07**: ADAS calibration flag auto-detected for 2018+ vehicles

### About Page

- [ ] **ABOUT-01**: Company mission statement section
- [ ] **ABOUT-02**: Vision statement section
- [ ] **ABOUT-03**: Company information (service area, warranty statement, years in business)
- [ ] **ABOUT-04**: Trust signals (warranty, "we serve San Antonio", insurance-friendly)

### Contact Page

- [ ] **CONT-01**: Contact form with fields: first name, last name, phone (required), address (optional)
- [ ] **CONT-02**: VIN search field on contact page (same decoder as home)
- [ ] **CONT-03**: Honeypot field for spam protection
- [ ] **CONT-04**: Server Action saves contact submission to Supabase
- [ ] **CONT-05**: Success confirmation message after submission
- [ ] **CONT-06**: Form validation with Zod + react-hook-form

### Appointment Booking

- [ ] **BOOK-01**: Visual calendar UI (shadcn Calendar / react-day-picker v9)
- [ ] **BOOK-02**: Available time slots displayed per selected date
- [ ] **BOOK-03**: Booked slots visually disabled on the calendar
- [ ] **BOOK-04**: Appointment dates stored as `DATE` + `TIME` columns (not `TIMESTAMPTZ`)
- [ ] **BOOK-05**: Database UNIQUE constraint on (date, time) to prevent double-booking
- [ ] **BOOK-06**: Booking captures customer name, phone, VIN (optional), vehicle info
- [ ] **BOOK-07**: Confirmation screen after successful booking

### Admin Authentication

- [ ] **AUTH-01**: Admin login page at `/admin/login` with email + password
- [ ] **AUTH-02**: Supabase Auth session management via `@supabase/ssr`
- [ ] **AUTH-03**: Middleware protects all `/admin/*` routes using `getUser()` (not `getSession()`)
- [ ] **AUTH-04**: Login page excluded from middleware redirect to avoid infinite loop
- [ ] **AUTH-05**: Logout button clears session and redirects to login

### Admin Dashboard

- [ ] **ADMIN-01**: Dashboard route at `/admin` accessible only after login
- [ ] **ADMIN-02**: Chart showing visitor count over time (shadcn Chart / Recharts)
- [ ] **ADMIN-03**: Chart showing contact form submissions over time
- [ ] **ADMIN-04**: Chart showing VIN search volume over time
- [ ] **ADMIN-05**: Summary cards with totals (visitors, contacts, VIN searches, bookings)
- [ ] **ADMIN-06**: Table of recent contact submissions
- [ ] **ADMIN-07**: Table of upcoming appointments

### Admin User Management

- [ ] **USER-01**: User list page showing all admin users
- [ ] **USER-02**: Add new admin user (email + password) via Supabase service role
- [ ] **USER-03**: Remove admin user
- [ ] **USER-04**: Service role key strictly server-side (never in `NEXT_PUBLIC_`)

### Analytics

- [ ] **ANLY-01**: `analytics_events` Supabase table with JSONB metadata column
- [ ] **ANLY-02**: Track `page_view` events on every public page
- [ ] **ANLY-03**: Track `vin_search` events on VIN decode
- [ ] **ANLY-04**: Track `contact_submit` events on contact form submission
- [ ] **ANLY-05**: Track `booking_created` events on successful booking
- [ ] **ANLY-06**: Fire-and-forget tracking (non-blocking Server Actions)

## v2 Requirements

Deferred to future release.

### Enhanced Features

- **V2-01**: Embedded Google Reviews widget
- **V2-02**: Service area ZIP-based messaging ("We're available in your area today")
- **V2-03**: Blog / SEO content pages
- **V2-04**: Pricing config editable from admin (moves from constants to DB)
- **V2-05**: Email confirmation for bookings

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Online payment / card processing | Adds PCI compliance; payment happens in person |
| Customer account portal | Overkill for single-location shop; session-less booking sufficient |
| SMS / text notifications | Twilio integration + TCPA compliance out of scope |
| Insurance claim filing | Operational process, not web feature; months of compliance work |
| Live chat / AI chatbot | Phone + contact form covers same need reliably |
| Multi-location support | v1 is single San Antonio location |
| Inventory / parts catalog | Service-first offering; no retail parts |
| Before/after photo gallery | Stale gallery undermines trust; hero photos only |
| Mobile native app | Web-first, responsive covers mobile |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FDN-01..07 | TBD | Pending |
| NAV-01..04 | TBD | Pending |
| HOME-01..06 | TBD | Pending |
| VIN-01..07 | TBD | Pending |
| ABOUT-01..04 | TBD | Pending |
| CONT-01..06 | TBD | Pending |
| BOOK-01..07 | TBD | Pending |
| AUTH-01..05 | TBD | Pending |
| ADMIN-01..07 | TBD | Pending |
| USER-01..04 | TBD | Pending |
| ANLY-01..06 | TBD | Pending |

**Coverage:**
- v1 requirements: 56 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 56 ⚠️

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after initial definition*
