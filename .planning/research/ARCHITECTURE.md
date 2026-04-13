# Architecture Patterns

**Project:** Alamo City Windshield Repair — Web App
**Domain:** Service business web app (estimate + booking + admin)
**Researched:** 2026-04-12
**Confidence:** HIGH (stack well-established; patterns verified against official docs and community)

---

## Recommended Architecture

A server-first Next.js App Router application with Supabase as the sole backend
(database + auth). Public-facing pages are React Server Components that pre-render
fast. Client interactivity (calendar picker, VIN input, charts) is isolated to
Client Components. Server Actions handle all form mutations. Admin routes are
protected by middleware that validates the Supabase session on every request.

There is no separate API layer. Supabase's hosted Postgres handles persistence;
Next.js Server Actions and Route Handlers handle all server-side logic.

```
Browser
  │
  ├── Public pages (RSC, pre-rendered)
  │     ├── Home (snap scroll hero → estimate section)
  │     ├── About
  │     └── Contact
  │
  ├── Client islands (interactive widgets, hydrated in browser)
  │     ├── VinDecoder (input + fetch → pricing result)
  │     ├── BookingCalendar (slot picker)
  │     └── ContactForm (controlled form → Server Action)
  │
  ├── /admin/* (protected, SSR)
  │     ├── Login page
  │     ├── Dashboard (charts, counts)
  │     └── User management
  │
  └── Next.js Middleware
        └── Validates Supabase session; redirects unauthenticated
              requests to /admin/login

Next.js Server Layer
  ├── Server Actions  → Supabase insert/update (bookings, contacts, events)
  ├── Route Handlers  → VIN proxy (/api/vin/[vin]) → NHTSA vPIC API
  └── Server Components → Supabase select (admin reads)

Supabase (hosted Postgres + Auth)
  ├── auth.users (Supabase-managed)
  ├── bookings
  ├── contacts
  ├── analytics_events
  └── pricing_config
```

---

## Component Boundaries

| Component | Type | Responsibility | Communicates With |
|-----------|------|---------------|-------------------|
| `app/(public)/page.tsx` | RSC | Home page shell, snap scroll sections | VinDecoder (Client), BookingCalendar (Client) |
| `app/(public)/about/page.tsx` | RSC | Static about content | — |
| `app/(public)/contact/page.tsx` | RSC | Contact page shell | ContactForm (Client) |
| `app/(admin)/admin/login/page.tsx` | RSC | Login form + Supabase Auth sign-in | Supabase Auth |
| `app/(admin)/admin/dashboard/page.tsx` | RSC | Fetch aggregate counts for charts | Supabase DB, DashboardCharts (Client) |
| `app/(admin)/admin/users/page.tsx` | RSC | List auth users; add/remove | Supabase Auth Admin API |
| `middleware.ts` | Middleware | Session check on /admin/* routes | Supabase Auth (cookie) |
| `VinDecoder` | Client Component | Text input, calls /api/vin/[vin], renders estimate | Route Handler |
| `PricingResult` | Client Component | Displays computed estimate breakdown | Receives data from VinDecoder |
| `BookingCalendar` | Client Component | Month/week grid, shows available slots, submits booking | Server Action (createBooking) |
| `ContactForm` | Client Component | Controlled form, submits to Server Action | Server Action (createContact) |
| `DashboardCharts` | Client Component | Recharts/Chart.js wrappers for visitor/contact/VIN data | Receives data from RSC parent |
| `app/api/vin/[vin]/route.ts` | Route Handler | Proxies to NHTSA vPIC, returns decoded vehicle + computed price | NHTSA vPIC API (external) |

**Key boundary rule:** Server Components own data fetching and pass data down as
props to Client Components. Client Components own user interaction and dispatch
to Server Actions or Route Handlers. Never import a Client Component into a Server
Component's data-fetching path.

---

## Data Flow

### VIN Estimate Flow
```
User types VIN in <VinDecoder> (Client)
  → fetch('/api/vin/{vin}')
  → Route Handler: GET /api/vin/[vin]
      → NHTSA vPIC API: https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/{vin}?format=json
      → Extract: ModelYear, Make, Model, VehicleType, ErrorCode
      → Apply pricing formula (see Pricing Formula section)
      → Return: { vehicle, estimate }
  → <PricingResult> renders breakdown
  → analytics_events INSERT (via Server Action, fire-and-forget)
```

### Booking Flow
```
User selects date/slot in <BookingCalendar> (Client)
  → Supabase query for available slots (directly from client via supabase-js, public RLS policy)
  → User confirms → calls Server Action: createBooking(formData)
      → Server Action: validate inputs
      → Supabase INSERT into bookings
      → Return success/error
  → Calendar UI updates
```

### Contact Form Flow
```
User fills <ContactForm> (Client)
  → On submit: Server Action createContact(formData)
      → Validate fields
      → Supabase INSERT into contacts
      → Supabase INSERT into analytics_events (type: 'contact_submit')
      → Return success
  → Form shows success state
```

### Admin Dashboard Flow
```
Browser hits /admin/dashboard
  → middleware.ts: supabase.auth.getUser() — redirects if no session
  → RSC: parallel Supabase queries for counts (bookings, contacts, vin_searches)
  → Pass data as props to <DashboardCharts> (Client Component)
  → Charts render client-side
```

### Auth Flow
```
Admin hits /admin/login
  → LoginForm calls Supabase signInWithPassword (client-side)
  → Supabase sets HTTP-only session cookie via @supabase/ssr
  → Redirect to /admin/dashboard
  → middleware validates cookie on every subsequent /admin/* request via getUser()
```

**Critical:** Always use `supabase.auth.getUser()` in middleware and Server
Components, never `getSession()`. `getSession()` does not re-validate the JWT
with Supabase Auth servers. This was underscored by CVE-2025-29927. (Source:
Supabase docs, verified HIGH confidence)

---

## Next.js App Router Route Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (font, global CSS, Toaster)
│   ├── globals.css                 # Tailwind base + brand CSS vars
│   │
│   ├── (public)/                   # Route group — public pages, shared public layout
│   │   ├── layout.tsx              # Top nav (Home, About, Contact, Admin link)
│   │   ├── page.tsx                # Home: snap-scroll hero + estimate + booking sections
│   │   ├── about/
│   │   │   └── page.tsx
│   │   └── contact/
│   │       └── page.tsx
│   │
│   ├── (admin)/                    # Route group — admin, separate layout (no public nav)
│   │   ├── layout.tsx              # Admin shell (sidebar nav)
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   │   └── page.tsx        # Login form (public, no auth check)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx        # Analytics charts (protected)
│   │   │   └── users/
│   │   │       └── page.tsx        # User management (protected)
│   │
│   └── api/
│       └── vin/
│           └── [vin]/
│               └── route.ts        # VIN decode proxy + pricing computation
│
├── components/
│   ├── ui/                         # shadcn/ui generated components (Button, Card, Input…)
│   ├── layout/
│   │   ├── TopNav.tsx
│   │   └── AdminSidebar.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── VinDecoder.tsx          # "use client"
│   │   ├── PricingResult.tsx       # "use client"
│   │   └── BookingCalendar.tsx     # "use client"
│   ├── contact/
│   │   └── ContactForm.tsx         # "use client"
│   └── admin/
│       ├── DashboardCharts.tsx     # "use client"
│       ├── UserTable.tsx           # "use client"
│       └── LoginForm.tsx           # "use client"
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # createServerClient (RSC, Server Actions, Route Handlers)
│   │   ├── client.ts               # createBrowserClient (Client Components)
│   │   └── middleware.ts           # createServerClient for middleware
│   ├── pricing.ts                  # Pricing formula pure function
│   ├── vin.ts                      # NHTSA API fetch + response parsing
│   └── utils.ts                    # cn() from shadcn + misc helpers
│
├── actions/
│   ├── booking.ts                  # createBooking Server Action
│   ├── contact.ts                  # createContact Server Action
│   └── analytics.ts                # trackEvent Server Action
│
├── types/
│   ├── booking.ts
│   ├── contact.ts
│   ├── vehicle.ts                  # Decoded VIN + estimate shape
│   └── analytics.ts
│
└── middleware.ts                   # Root middleware — protects /admin/* routes
```

---

## Supabase Table Schema

### `bookings`
```sql
CREATE TABLE bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  name          TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  address       TEXT,
  vin           TEXT,
  vehicle_desc  TEXT,            -- e.g. "2019 Toyota Camry"
  service_type  TEXT NOT NULL,   -- 'repair' | 'replacement'
  slot_start    TIMESTAMPTZ NOT NULL,
  slot_end      TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'cancelled'
  notes         TEXT
);

-- RLS: allow anonymous INSERT (public booking form); restrict SELECT to auth'd admin
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read bookings" ON bookings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can update bookings" ON bookings FOR UPDATE USING (auth.role() = 'authenticated');
```

### `contacts`
```sql
CREATE TABLE contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  name        TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT,
  vin         TEXT,
  message     TEXT
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert contacts" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read contacts" ON contacts FOR SELECT USING (auth.role() = 'authenticated');
```

### `analytics_events`
```sql
CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type  TEXT NOT NULL,   -- 'page_view' | 'vin_search' | 'contact_submit' | 'booking_created'
  page        TEXT,            -- for page_view events
  vin         TEXT,            -- for vin_search events
  metadata    JSONB            -- extensible catch-all
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert events" ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read events" ON analytics_events FOR SELECT USING (auth.role() = 'authenticated');
```

### `pricing_config`
```sql
CREATE TABLE pricing_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  base_price    NUMERIC(10,2) NOT NULL DEFAULT 250.00,
  -- Vehicle size modifiers (multipliers or flat add-ons)
  size_compact  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  size_sedan    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  size_suv      NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  size_truck    NUMERIC(10,2) NOT NULL DEFAULT 75.00,
  size_van      NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  -- Windshield type modifiers
  type_standard  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  type_acoustic  NUMERIC(10,2) NOT NULL DEFAULT 80.00,
  type_heated    NUMERIC(10,2) NOT NULL DEFAULT 120.00,
  -- ADAS calibration
  adas_none      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  adas_static    NUMERIC(10,2) NOT NULL DEFAULT 175.00,
  adas_dynamic   NUMERIC(10,2) NOT NULL DEFAULT 250.00,
  adas_both      NUMERIC(10,2) NOT NULL DEFAULT 375.00
);
-- Single-row config table; seed with one row on deploy
-- Admin can UPDATE values; no public access
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can read config" ON pricing_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can update config" ON pricing_config FOR UPDATE USING (auth.role() = 'authenticated');
```

**Note on pricing_config:** Starting with hardcoded formula values in `lib/pricing.ts`
is simpler for v1. Add the `pricing_config` table only when the admin needs to
adjust prices without a deploy. Flag this as a Phase 2 decision.

### Availability / Slots Design

For v1, use a lightweight implicit-slot model rather than a pre-generated slot table:

- The business operates defined hours (e.g., Mon–Fri 8am–5pm, slots every 2 hours).
- `bookings.slot_start` / `slot_end` record what was booked.
- The calendar UI queries `bookings` for a given day and computes which slots are
  already taken client-side, marking the rest as available.
- This avoids a complex slot-generation migration and works well at low booking volume.

If booking volume grows and concurrency conflicts become an issue, add a `time_slots`
table with a `is_available` boolean and a Postgres function to atomically claim a slot.

---

## Pricing Formula

Computed in `lib/pricing.ts` as a pure function — no database round-trip needed
for the estimate display:

```
estimate = base_price
         + vehicle_size_modifier(vehicle_type)
         + windshield_type_modifier(windshield_type)
         + adas_modifier(has_adas, adas_type)
```

The Route Handler at `/api/vin/[vin]` calls this after decoding the VIN:
1. Fetch NHTSA vPIC: `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/{vin}?format=json`
2. Extract `ModelYear`, `Make`, `Model`, `BodyClass` (maps to vehicle size), `ErrorCode`
3. Infer `has_adas` from model year (2018+ vehicles likely have ADAS; present as "may require calibration")
4. Apply formula → return `{ vehicle, estimateLow, estimateHigh, lineItems }`

Return a range (low/high) rather than a single number to account for ADAS uncertainty —
this is more honest and matches how real auto glass shops quote.

---

## Supabase Auth — Admin Setup

- Only admins can log in — not a public sign-up flow.
- Provision admin accounts manually via Supabase Dashboard or the Auth Admin API.
- The "user management" admin page uses the `supabase-admin` client (service role key)
  to call `auth.admin.listUsers()`, `auth.admin.createUser()`, `auth.admin.deleteUser()`.
- The service role key MUST only be used in Server Actions / Route Handlers — never
  in Client Components or exposed to the browser.

```
lib/supabase/admin.ts   ← createClient with SUPABASE_SERVICE_ROLE_KEY
                          Only imported in server-side code
```

---

## Patterns to Follow

### Pattern 1: Route Groups for Layout Separation
Use `(public)` and `(admin)` route groups to apply different layouts without
affecting the URL structure. Public pages get the top nav; admin pages get the
sidebar nav.

### Pattern 2: Server Actions for All Mutations
All INSERT/UPDATE operations go through Server Actions (`actions/*.ts`), not
client-side Supabase calls. This keeps the anon key from being used for writes
directly from the browser, and allows server-side validation before DB access.
Exception: booking slot availability reads can be done client-side with the
anon key under RLS (read-only, non-sensitive).

### Pattern 3: Supabase Client Separation
Three distinct client creation contexts:
- `lib/supabase/server.ts` — for RSC, Server Actions, Route Handlers (uses cookies)
- `lib/supabase/client.ts` — for Client Components (browser, anon key)
- `lib/supabase/admin.ts` — for admin operations needing service role

### Pattern 4: Analytics as Fire-and-Forget
Track events via a Server Action that does not block the user flow. Call it
with `startTransition` on the client side or from within another Server Action
after the main operation completes. Do not await it in the critical path.

### Pattern 5: VIN as Route Handler (not Server Action)
VIN decoding is a GET operation (idempotent, cacheable). Use a Route Handler
`/api/vin/[vin]` rather than a Server Action. This allows `fetch` with caching
headers, and the client can call it directly without needing form semantics.
Add `revalidate` caching: same VIN + model year combo is stable.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using getSession() for Auth in Middleware
`getSession()` does not re-validate the JWT. Use `getUser()` which calls the
Supabase Auth server on every request. This was surfaced as a security issue
in CVE-2025-29927 (middleware auth bypass).

### Anti-Pattern 2: Service Role Key in Client Components
Never import `lib/supabase/admin.ts` in any `"use client"` file. The service
role key bypasses all RLS — if it leaks to the browser, all data is exposed.
Enforce via ESLint rule or code review.

### Anti-Pattern 3: Generating Slots Pre-emptively
Pre-generating thousands of time slot rows (one per slot per day for years ahead)
creates operational complexity with no benefit at v1 scale. Compute availability
dynamically from booked slots instead.

### Anti-Pattern 4: Blocking Estimate on Database Lookup
The pricing formula should run in-memory from hardcoded (or env-configured)
values. Do not make a database round-trip for each estimate — it adds latency
to the core user flow. Load config once at startup if needed.

### Anti-Pattern 5: Client-Side Supabase for Admin Reads
Admin dashboard data (contact counts, booking counts, event aggregates) must be
fetched in RSC on the server where the auth session is validated. Never fetch
sensitive aggregate data from the browser.

---

## Suggested Build Order

Dependencies between components drive this order. Each phase's output is a
prerequisite for the next.

```
1. Foundation
   ├── Next.js + Tailwind + shadcn/ui scaffolding
   ├── Supabase project + env vars
   ├── lib/supabase/{server,client,admin}.ts
   └── middleware.ts (auth protection skeleton)

2. Database Schema
   ├── bookings table + RLS
   ├── contacts table + RLS
   ├── analytics_events table + RLS
   └── Seed admin user via Supabase Dashboard

3. Public Pages Shell
   ├── (public) layout with TopNav
   ├── Home page snap-scroll structure (no interactivity yet)
   ├── About page
   └── Contact page (static)

4. VIN + Pricing Core
   ├── lib/vin.ts (NHTSA fetch + parse)
   ├── lib/pricing.ts (formula)
   ├── /api/vin/[vin] Route Handler
   └── VinDecoder + PricingResult Client Components

5. Booking Calendar
   ├── BookingCalendar Client Component (slot grid UI)
   ├── Supabase availability query (read booked slots)
   └── actions/booking.ts (createBooking Server Action)

6. Contact Form
   ├── ContactForm Client Component
   └── actions/contact.ts (createContact Server Action)

7. Analytics Tracking
   ├── actions/analytics.ts (trackEvent)
   └── Wire into: page views, VIN searches, contact submits, bookings

8. Admin Auth
   ├── /admin/login page + LoginForm
   └── Validate middleware guards work end-to-end

9. Admin Dashboard
   ├── Supabase aggregate queries in RSC
   ├── DashboardCharts Client Component (Recharts)
   └── /admin/dashboard page

10. Admin User Management
    ├── lib/supabase/admin.ts (service role client)
    ├── UserTable Client Component
    └── /admin/users page + Server Actions for create/delete
```

**Rationale for this order:**
- Schema before app code — everything depends on it
- Public shell before interactivity — validate layout before wiring state
- VIN/Pricing before Calendar — Calendar's UX benefits from showing estimate alongside slots
- Auth before Admin Dashboard — no point building the dashboard before the door has a lock
- User management last — least critical, most sensitive (service role key)

---

## Scalability Considerations

This is a local San Antonio service business. Traffic will be low (hundreds of
monthly visitors, not millions). Architecture decisions should optimize for
simplicity and maintainability, not scale.

| Concern | At current scale | If traffic grows 10x |
|---------|-----------------|----------------------|
| Booking conflicts | Supabase RLS + unique constraint on slot_start sufficient | Add DB-level slot locking or a `time_slots` table with atomic claim |
| Analytics queries | Simple COUNT(*) GROUP BY queries on small tables are instant | Add Postgres indexes on `event_type` + `created_at`; consider partitioning by month |
| VIN API rate limits | NHTSA vPIC is unlimited, no key required | Add Redis/Vercel KV caching per VIN (stable data) |
| Admin concurrency | Single admin, no conflicts | No change needed |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-only, never prefixed NEXT_PUBLIC_

# NHTSA vPIC (no key needed — free public API)
# No env var required; base URL hardcoded in lib/vin.ts

# App
NEXT_PUBLIC_SITE_URL=             # For Supabase Auth redirect URLs
```

---

## Sources

- Next.js App Router project structure: https://nextjs.org/docs/app/getting-started/project-structure
- Supabase Auth + Next.js App Router: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase Auth getUser() requirement: https://supabase.com/docs/guides/auth/server-side/nextjs (getUser vs getSession)
- CVE-2025-29927 / middleware auth bypass: https://the-shubham.medium.com/next-js-supabase-cookie-based-auth-workflow-the-best-auth-solution-2025-guide-f6738b4673c1
- NHTSA vPIC API (free, no key): https://vpic.nhtsa.dot.gov/api/
- nhtsa-api-wrapper JS library: https://github.com/ShaggyTech/nhtsa-api-wrapper
- Supabase calendar availability with generate_series: https://dev.to/ivaaan/managing-calendar-availability-in-supabase-307d
- Supabase analytics tracking patterns: https://www.rapidevelopers.com/supabase-tutorial/how-to-track-analytics-with-supabase
- ADAS calibration pricing ranges 2025: https://www.caliber.com/services/auto-glass/auto-glass-calibration/how-much-does-adas-calibration-cost
- Windshield replacement cost factors 2025: https://autoglassestimator.com/blog/windshield-replacement-cost-in-2025/
- Next.js 15 project structure best practices: https://medium.com/better-dev-nextjs-react/inside-the-app-router-best-practices-for-next-js-file-and-directory-structure-2025-edition-ed6bc14a8da3
- Supabase booking system (Next.js 15): https://www.udemy.com/course/nextjs-15-supabase-build-a-salon-spa-booking-app/
