# Phase 1: Foundation - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the Next.js 15 + React 19 + TypeScript project with TailwindCSS v4, shadcn/ui, and Supabase connected via `@supabase/ssr`. Create the complete database schema with RLS enabled. Deploy to Vercel with a passing build and documented env vars. Build the top navigation and footer shell that will host future feature pages.

Covers requirements: FDN-01..07 (scaffolding, stack, Supabase, RLS, Vercel, env) + NAV-01..04 (top nav, phone, responsive, footer).

Public pages content (home hero, about body, contact form) is Phase 2+. Phase 1 builds the empty route shells so navigation works.

</domain>

<decisions>
## Implementation Decisions

### Brand Identity

- **D-01:** Primary brand red is **crimson deep** `#B91C1C` (Tailwind `red-700`). Serious, automotive, high-contrast on white.
- **D-02:** Typography is **modern geometric** — Inter for body text, Geist or Space Grotesk for headlines. Loaded via `next/font` for zero-CLS.
- **D-03:** Logo is **icon + text wordmark**. Use a lucide-react shield/windshield icon beside "Alamo City Windshield Repair" text. Icon tinted with brand red.
- **D-04:** Hero background strategy is **photo with dark gradient overlay** so white headline text reads cleanly. Stock photos (Unsplash/Pexels) for v1; owner can swap to owned photography later.
- **D-05:** Color palette is strictly white, red (`#B91C1C`), and black. No accent or secondary colors. Configure shadcn `--primary` and `--destructive` tokens to the brand red.

### Business Content (nav + footer)

- **D-06:** Phone number displayed as placeholder `(210) 555-0100` for v1 scaffolding. Owner swaps to real number before launch. Store in a single config constant so it's a one-place change.
- **D-07:** Service type is **both mobile and shop-based**. Display "Mobile service available across San Antonio" alongside shop reference.
- **D-08:** Business hours displayed as: **Mon–Fri 8 AM – 6 PM, Sat 9 AM – 2 PM, Closed Sunday**. Store as structured data in config.
- **D-09:** Address/location shows **"San Antonio, TX"** in the footer (city + state only). No street address at v1 — works for both mobile service and pending shop location. Add full address later via config.

### Database Schema

- **D-10:** Create **all tables upfront in Phase 1** — `bookings`, `contacts`, `analytics_events`, `vin_cache`, and leverage Supabase Auth's built-in `auth.users` for admin accounts (plus a custom `profiles` or `admin_roles` table if roles are needed). One migration, all RLS policies set at once, no schema churn across later phases.
- **D-11:** Manage migrations with the **Supabase CLI** — local `supabase/` directory with versioned SQL migrations, git-tracked, reproducible across environments.
- **D-12:** First admin user created **manually via Supabase Auth dashboard** by the owner. No seed credentials committed to the repo. Document this step in the README.
- **D-13:** Every table has **Row Level Security (RLS) enabled** from the first migration. Explicit policies:
  - `bookings`, `contacts`: anonymous INSERT allowed, authenticated-admin-only SELECT/UPDATE/DELETE.
  - `analytics_events`: anonymous INSERT allowed, authenticated-admin-only SELECT.
  - `vin_cache`: service-role INSERT/SELECT only (written/read from server Route Handlers).
  - Admin-related tables: authenticated-admin-only for all operations.
- **D-14:** Appointment time storage uses **`DATE` + `TIME` columns separately**, not `TIMESTAMPTZ`, to avoid timezone off-by-one bugs for San Antonio (America/Chicago) users.
- **D-15:** `bookings` table has a **UNIQUE constraint on (date, time)** to prevent double-booking at the database level.

### Route Structure

- **D-16:** Use a **`src/` directory** — `src/app`, `src/components`, `src/lib`, etc. Cleaner project root.
- **D-17:** App Router uses **`(public)` and `(admin)` route groups**:
  - `src/app/(public)/` — home, about, contact with top nav + footer layout
  - `src/app/(admin)/admin/` — admin dashboard with sidebar layout
  - Root `layout.tsx` provides global providers (theme, fonts, Supabase client)
- **D-18:** TypeScript path alias is **`@/`** — `@/components`, `@/lib`, `@/app`. Next.js + shadcn default.
- **D-19:** Component organization:
  - `src/components/ui/` — shadcn primitives (Button, Input, Card, etc.)
  - `src/components/` — composed app components (Nav, Footer, etc.)
  - `src/lib/` — utilities, Supabase clients, constants
  - `src/lib/supabase/server.ts`, `client.ts`, and root `middleware.ts` — per research pattern

### Environment & Deployment

- **D-20:** Vercel deployment configured via GitHub integration. Initial deployment happens in Phase 1 so every later phase deploys automatically.
- **D-21:** `.env.example` committed with correct prefix usage:
  - `NEXT_PUBLIC_SUPABASE_URL` — public, build-time embedded
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, build-time embedded
  - `SUPABASE_SERVICE_ROLE_KEY` — **NEVER** `NEXT_PUBLIC_` (would leak to every browser visitor)
- **D-22:** Middleware implementation uses `supabase.auth.getUser()` (not `getSession()`) per research pitfall — revalidates JWT server-side on every admin route.

### Claude's Discretion

- Exact Geist vs Space Grotesk choice for headlines (either works; pick whichever ships cleanest with `next/font/google`)
- Specific lucide icon for logo (shield, shield-check, or car-front — pick whichever reads best at small sizes)
- Exact Unsplash/Pexels photo selection for hero (Claude picks tasteful options in Phase 2)
- Internal component file layout (co-location vs shared folder) — follow shadcn conventions
- Tailwind v4 `@theme` token organization inside `globals.css`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` §v1 Requirements — FDN-01..07 and NAV-01..04 specs
- `.planning/ROADMAP.md` §Phase 1 — Success criteria

### Research (stack + architecture + pitfalls)
- `.planning/research/STACK.md` — Next.js 15 + React 19 + Tailwind v4 + shadcn versions, install commands, Supabase `@supabase/ssr` three-file pattern
- `.planning/research/ARCHITECTURE.md` — Route groups `(public)` and `(admin)`, Supabase table design with RLS, middleware skeleton, data flow
- `.planning/research/PITFALLS.md` — **Critical:** Supabase RLS policies must exist before launch (170+ prod breaches in 2025); `getUser()` not `getSession()` in middleware (CVE-2025-29927); `NEXT_PUBLIC_` rules on service role key; `DATE`+`TIME` not `TIMESTAMPTZ`; UNIQUE constraint on booking slots
- `.planning/research/SUMMARY.md` — Synthesized cross-cutting findings

### External references (read at implementation time)
- Supabase SSR docs (`@supabase/ssr` v0.10.2) — server/client/middleware three-file pattern
- Next.js App Router docs §Route Groups — `(folder)` convention
- shadcn/ui installation docs — Tailwind v4 + Next.js 15 flow
- Tailwind v4 `@theme` directive docs — CSS-first theming

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

None — greenfield project. No existing code at the start of Phase 1.

### Established Patterns

None yet. Phase 1 establishes the patterns that later phases build on:
- Folder layout (src/ + route groups)
- Path alias (@/)
- Supabase client pattern (server.ts / client.ts / middleware.ts)
- Env var naming convention
- Migration workflow (Supabase CLI)

### Integration Points

- Vercel ↔ GitHub: deployment triggered per push
- Vercel ↔ Supabase: env vars configured in Vercel dashboard for preview + production
- Next.js middleware ↔ every `/admin/*` route: auth guard
- `src/lib/constants.ts` (or similar) ↔ nav/footer components: single source of truth for phone, hours, address

</code_context>

<specifics>
## Specific Ideas

- The placeholder phone `(210) 555-0100` follows the 555 reserved-for-fiction convention — safe to commit, obvious that it's a placeholder.
- "Serious, automotive" aesthetic guided the red-700 choice over the brighter red-600 — windshield repair is a safety-critical service, the palette should feel professional rather than alarm-like.
- Business hours format (Mon–Fri 8–6, Sat 9–2) matches standard auto service conventions and mirrors what local San Antonio competitors display — customers won't have to translate it.
- Footer address stops at city/state because this is a mobile-first service with no fixed storefront at launch. Keeps the site honest — we don't want customers driving to a shop that doesn't exist yet.

</specifics>

<deferred>
## Deferred Ideas

- **Pricing config in database** — Research flagged this as a Phase 5/8 decision (admin-editable pricing modifiers). For now, pricing constants live in `src/lib/pricing.ts`.
- **Email confirmation for bookings** — Not in Phase 1 scope; tracked as v2 requirement.
- **Real admin user seed flow / invite system** — v1 has one admin created manually via Supabase dashboard; future invite flow is a post-v1 enhancement.
- **Full street address for footer** — Owner adds this when the shop location is finalized; Phase 1 uses city/state only.
- **Custom logo design** — v1 uses icon-from-lucide + wordmark; swapping in custom artwork is a later content task.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-12*
