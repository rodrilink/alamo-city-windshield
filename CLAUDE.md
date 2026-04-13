<!-- GSD:project-start source:PROJECT.md -->
## Project

**Alamo City Windshield Repair**

A modern landing page and business application for Alamo City Windshield Repair, a windshield repair and installation service in San Antonio, Texas. Users can learn about the service, get instant windshield replacement estimates by entering their VIN, book appointments via a visual calendar, and contact the business. An admin dashboard provides analytics and user management.

**Core Value:** Users can enter their VIN, instantly see a windshield replacement estimate for their specific vehicle, and book an appointment — removing friction from getting a quote.

### Constraints

- **Tech stack**: Next.js + React + TailwindCSS + shadcn/ui — user-specified
- **Database**: Supabase (hosted PostgreSQL with built-in auth and real-time)
- **Deployment**: Vercel — deployment-ready configuration required
- **Design**: White, red, and black color palette — strict brand constraint
- **UI Library**: shadcn/ui components — user-specified
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x (15.2.4 latest stable) | Full-stack React framework | App Router, Server Components, Server Actions, Vercel-native deployment. v16 is already out but v15 is the stable LTS-equivalent target. Use 15 for stability. |
| React | 19.x | UI rendering | Ships with Next.js 15. React 19 is fully stable since Next.js 15.1. |
| TypeScript | 5.x | Type safety | Non-negotiable for a maintainable project; Next.js scaffolds it by default. |
| TailwindCSS | 4.x | Utility-first CSS | v4 is the current major — CSS-first config (no tailwind.config.js), OKLCH colors, significantly faster build. shadcn/ui has updated all components for v4. |
| shadcn/ui | latest CLI | Copy-paste component library | Builds on Radix UI primitives. Tailwind v4 + React 19 compatible as of mid-2025. Components live in your repo — fully owned, no black-box dependency. |
### Database & Auth
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | ^2.103.0 | Supabase JS client | Core SDK for database queries, auth, and realtime subscriptions. |
| @supabase/ssr | ^0.10.2 | Server-side auth for Next.js | Replaces the deprecated `@supabase/auth-helpers-nextjs`. Manages cookie-based sessions, exposes both a browser client and a server client, and provides the required middleware helper. The auth-helpers package is abandoned — do not use it. |
- `lib/supabase/server.ts` — for Server Components, Server Actions, Route Handlers. Uses `@supabase/ssr`'s `createServerClient` with Next.js `cookies()`.
- `lib/supabase/client.ts` — for Client Components. Uses `@supabase/ssr`'s `createBrowserClient`.
- `middleware.ts` — calls `supabase.auth.getUser()` to refresh tokens and write updated cookies to the response before Server Components read them. **Never call `getSession()` inside middleware — it does not revalidate the token.**
### VIN Decoding
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| NHTSA vPIC API | v3.66 (gov service) | VIN decode | Free, no API key, no registration, no rate limit enforced (practical limit ~10-15 req/s before temporary IP block). Returns year, make, model, vehicle type, body class. |
| @shaggytools/nhtsa-api-wrapper | latest | JS wrapper for vPIC | 3 kB gzipped, TypeScript-native, works Node.js ≥ 18 and browser. Eliminates manual URL construction and response parsing. |
### Calendar & Appointment Booking
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shadcn/ui Calendar | (copy-paste, rdp v9) | Date selection UI | Built on react-day-picker v9. Ships with the stack, no extra dependency. Native timezone prop. Supports disabled dates, single/range/multiple modes. |
| react-day-picker | ^9.x | Calendar primitive under shadcn | v9 required for React 19 / Next.js 15 compatibility — v8 does not work with them. shadcn upgraded its Calendar to rdp v9 in June 2025. |
| date-fns | ^4.x | Date manipulation | Peer dependency of react-day-picker v9. Tree-shakeable, TypeScript-native. |
- `react-big-calendar` — overkill (drag-drop event management), poor visual slot display for simple booking.
- `fullcalendar` — same problem, large bundle.
- Mobiscroll / Syncfusion — paid, enterprise-oriented.
### Form Handling & Validation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-hook-form | ^7.72.1 | Form state management | Zero re-renders on input change (ref-based), integrates with shadcn Form components via the `FormField` wrapper, native Server Action support. |
| zod | ^4.3.6 | Schema validation | TypeScript-first. v4 is stable and significantly faster than v3. shadcn's form primitives use `@hookform/resolvers` + zod as the canonical pattern. |
| @hookform/resolvers | ^3.x | Bridge react-hook-form + zod | Required to pass a zod schema as the RHF resolver. |
### Charts (Admin Dashboard)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shadcn/ui Chart | (copy-paste) | Chart component wrapper | Built on Recharts. Provides ChartContainer, ChartTooltip, ChartLegend with automatic Tailwind theming and dark mode. 53 pre-built chart variants. |
| recharts | ^2.x (shadcn manages version) | Underlying chart engine | React-native SVG charts. shadcn updated its chart primitive to Recharts v3 (PR #8486) — let shadcn CLI manage the recharts dependency to avoid version mismatch. |
- `AreaChart` — page visitors over time
- `BarChart` — contact form submissions per day/week
- `BarChart` — VIN searches per day/week
- Tremor — even though it also wraps Recharts, it adds a separate design system that will conflict with shadcn/ui's Tailwind theming. Redundant abstraction.
- Chart.js — Canvas-based (not SVG), harder to style with Tailwind, no React-native component model.
- ApexCharts — large bundle, more suited for BI tools than small admin dashboards.
### Animation (Full-Page Snap Scroll)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS scroll-snap utilities | built-in | Full-page snap scrolling | `snap-y snap-mandatory` on the container + `snap-start snap-always` on each section. Zero JS, zero extra dependency, 100% browser-native. Best performance possible. |
| motion (formerly Framer Motion) | ^12.x | Section entrance animations | Used for `whileInView` fade/slide animations as sections snap into view. Import from `motion/react` (the rebranded package). Do NOT import from `framer-motion` — it's the old package name. |
- `fullPage.js` — Requires a commercial license for commercial use. GPL-only for free use.
- `react-scroll-snapper` / `react-full-snap` — Small community, low maintenance.
- GSAP ScrollTrigger — Overkill for this use case; GSAP has license considerations too.
### Deployment & Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | — | Hosting + CDN | User-specified. Native Next.js runtime, zero-config deployment, Edge Network. |
| Supabase | hosted | PostgreSQL + Auth + Realtime | User-specified. Free tier sufficient for v1 (500 MB DB, 50K MAU auth). |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| VIN decoding | NHTSA vPIC (direct) | CarMD, Auto.dev, Carfax API | Paid APIs with rate limits. NHTSA is free, government-maintained, sufficient for year/make/model/body class. |
| Calendar | shadcn Calendar (rdp v9) | react-big-calendar | Drag-drop event manager — wrong abstraction for appointment slot selection. |
| Calendar | shadcn Calendar (rdp v9) | Mobiscroll | Paid license required. |
| Charts | shadcn Chart (Recharts) | Tremor | Separate design system conflicts with shadcn theming; Tremor is acquired by Vercel but still adds redundant layer. |
| Charts | shadcn Chart (Recharts) | Chart.js | Canvas-based, harder Tailwind integration, no React component model. |
| Snap scroll | CSS scroll-snap | fullPage.js | Commercial license required for paid sites; heavy JS overhead. |
| Snap scroll | CSS scroll-snap | GSAP ScrollTrigger | Overkill; GSAP has commercial license requirements at scale. |
| Forms | react-hook-form + zod | Formik | RHF is faster (ref-based, no re-renders) and is the shadcn/ui canonical choice. Formik uses controlled inputs. |
| Animation | motion/react | react-spring | Motion has better Next.js SSR story and scroll animation API (`useInView`, `whileInView`). |
## Installation
# Bootstrap
# shadcn/ui init (Tailwind v4 compatible)
# Add shadcn components used in this project
# Supabase
# VIN wrapper
# Forms
# Animation
# Date utilities (rdp v9 peer dep)
## Environment Variables
# .env.local (never commit)
## Sources
- NHTSA vPIC API: https://vpic.nhtsa.dot.gov/api/ (API v3.66, updated Nov 2025)
- @shaggytools/nhtsa-api-wrapper: https://vpic.shaggytech.com/
- Supabase SSR setup for Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
- @supabase/ssr (v0.10.2): https://www.npmjs.com/package/@supabase/ssr
- @supabase/supabase-js (v2.103.0): https://www.npmjs.com/package/@supabase/supabase-js
- shadcn/ui Calendar (rdp v9 upgrade): https://ui.shadcn.com/docs/changelog/2025-06-calendar
- shadcn/ui Chart (Recharts v3 update): https://github.com/shadcn-ui/ui/pull/8486
- shadcn/ui Tailwind v4 guide: https://ui.shadcn.com/docs/tailwind-v4
- react-day-picker v9 upgrade guide: https://daypicker.dev/upgrading
- react-hook-form (v7.72.1): https://www.npmjs.com/package/react-hook-form
- zod (v4.3.6): https://www.npmjs.com/package/zod
- motion/react: https://motion.dev/docs/react
- Tailwind scroll-snap: https://tailwindcss.com/docs/scroll-snap-type
- Next.js 15.2.4 stable: https://www.abhs.in/blog/nextjs-current-version-march-2026-stable-release-whats-new
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
