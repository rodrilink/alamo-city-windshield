# Technology Stack

**Project:** Alamo City Windshield Repair
**Researched:** 2026-04-12

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x (15.2.4 latest stable) | Full-stack React framework | App Router, Server Components, Server Actions, Vercel-native deployment. v16 is already out but v15 is the stable LTS-equivalent target. Use 15 for stability. |
| React | 19.x | UI rendering | Ships with Next.js 15. React 19 is fully stable since Next.js 15.1. |
| TypeScript | 5.x | Type safety | Non-negotiable for a maintainable project; Next.js scaffolds it by default. |
| TailwindCSS | 4.x | Utility-first CSS | v4 is the current major — CSS-first config (no tailwind.config.js), OKLCH colors, significantly faster build. shadcn/ui has updated all components for v4. |
| shadcn/ui | latest CLI | Copy-paste component library | Builds on Radix UI primitives. Tailwind v4 + React 19 compatible as of mid-2025. Components live in your repo — fully owned, no black-box dependency. |

**Confidence: HIGH** — All are user-specified, all verified compatible as a group.

---

### Database & Auth

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | ^2.103.0 | Supabase JS client | Core SDK for database queries, auth, and realtime subscriptions. |
| @supabase/ssr | ^0.10.2 | Server-side auth for Next.js | Replaces the deprecated `@supabase/auth-helpers-nextjs`. Manages cookie-based sessions, exposes both a browser client and a server client, and provides the required middleware helper. The auth-helpers package is abandoned — do not use it. |

**Integration pattern (critical):**
- `lib/supabase/server.ts` — for Server Components, Server Actions, Route Handlers. Uses `@supabase/ssr`'s `createServerClient` with Next.js `cookies()`.
- `lib/supabase/client.ts` — for Client Components. Uses `@supabase/ssr`'s `createBrowserClient`.
- `middleware.ts` — calls `supabase.auth.getUser()` to refresh tokens and write updated cookies to the response before Server Components read them. **Never call `getSession()` inside middleware — it does not revalidate the token.**

**Confidence: HIGH** — Verified against current Supabase official docs (Nov 2025 API version 3.66 referenced).

---

### VIN Decoding

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| NHTSA vPIC API | v3.66 (gov service) | VIN decode | Free, no API key, no registration, no rate limit enforced (practical limit ~10-15 req/s before temporary IP block). Returns year, make, model, vehicle type, body class. |
| @shaggytools/nhtsa-api-wrapper | latest | JS wrapper for vPIC | 3 kB gzipped, TypeScript-native, works Node.js ≥ 18 and browser. Eliminates manual URL construction and response parsing. |

**Decode endpoint:** `GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{VIN}?format=json`

**Implementation decision:** Call from a Next.js **Route Handler** (`app/api/decode-vin/route.ts`), not directly from the browser. Reasons:
1. Keeps the downstream formula logic server-side.
2. Allows caching decoded VINs in Supabase to avoid re-fetching the same VIN.
3. Insulates the client from NHTSA's occasional downtime.

**Confidence: HIGH** — API confirmed free, no-auth, v3.66 as of Nov 2025.

---

### Calendar & Appointment Booking

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shadcn/ui Calendar | (copy-paste, rdp v9) | Date selection UI | Built on react-day-picker v9. Ships with the stack, no extra dependency. Native timezone prop. Supports disabled dates, single/range/multiple modes. |
| react-day-picker | ^9.x | Calendar primitive under shadcn | v9 required for React 19 / Next.js 15 compatibility — v8 does not work with them. shadcn upgraded its Calendar to rdp v9 in June 2025. |
| date-fns | ^4.x | Date manipulation | Peer dependency of react-day-picker v9. Tree-shakeable, TypeScript-native. |

**Do NOT use:**
- `react-big-calendar` — overkill (drag-drop event management), poor visual slot display for simple booking.
- `fullcalendar` — same problem, large bundle.
- Mobiscroll / Syncfusion — paid, enterprise-oriented.

**Booking UI pattern:** Split-panel layout — shadcn Calendar on left, scrollable time-slot list (shadcn ScrollArea + Button) on right. User picks date → available slots load from Supabase → user selects slot → booking saved. Keep it simple: no real-time websocket needed for slot selection.

**Confidence: HIGH** — rdp v9 + shadcn compatibility verified from shadcn changelog (June 2025).

---

### Form Handling & Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-hook-form | ^7.72.1 | Form state management | Zero re-renders on input change (ref-based), integrates with shadcn Form components via the `FormField` wrapper, native Server Action support. |
| zod | ^4.3.6 | Schema validation | TypeScript-first. v4 is stable and significantly faster than v3. shadcn's form primitives use `@hookform/resolvers` + zod as the canonical pattern. |
| @hookform/resolvers | ^3.x | Bridge react-hook-form + zod | Required to pass a zod schema as the RHF resolver. |

**Confidence: HIGH** — This is the explicitly documented official shadcn/ui form pattern.

---

### Charts (Admin Dashboard)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shadcn/ui Chart | (copy-paste) | Chart component wrapper | Built on Recharts. Provides ChartContainer, ChartTooltip, ChartLegend with automatic Tailwind theming and dark mode. 53 pre-built chart variants. |
| recharts | ^2.x (shadcn manages version) | Underlying chart engine | React-native SVG charts. shadcn updated its chart primitive to Recharts v3 (PR #8486) — let shadcn CLI manage the recharts dependency to avoid version mismatch. |

**Charts needed for the admin dashboard:**
- `AreaChart` — page visitors over time
- `BarChart` — contact form submissions per day/week
- `BarChart` — VIN searches per day/week

**Do NOT use:**
- Tremor — even though it also wraps Recharts, it adds a separate design system that will conflict with shadcn/ui's Tailwind theming. Redundant abstraction.
- Chart.js — Canvas-based (not SVG), harder to style with Tailwind, no React-native component model.
- ApexCharts — large bundle, more suited for BI tools than small admin dashboards.

**Confidence: HIGH** — shadcn Chart component is the natural fit; verified Recharts v3 upgrade in shadcn PR #8486.

---

### Animation (Full-Page Snap Scroll)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS scroll-snap utilities | built-in | Full-page snap scrolling | `snap-y snap-mandatory` on the container + `snap-start snap-always` on each section. Zero JS, zero extra dependency, 100% browser-native. Best performance possible. |
| motion (formerly Framer Motion) | ^12.x | Section entrance animations | Used for `whileInView` fade/slide animations as sections snap into view. Import from `motion/react` (the rebranded package). Do NOT import from `framer-motion` — it's the old package name. |

**Recommended approach:** CSS scroll-snap handles the snapping mechanic natively — no JS library needed for that. Motion handles the visual entrance animations (opacity, translateY) triggered as each section enters the viewport. This gives full-page snap behavior without the bundle cost of fullPage.js (which requires a commercial license for paid projects) or react-full-snap (unmaintained).

**Do NOT use:**
- `fullPage.js` — Requires a commercial license for commercial use. GPL-only for free use.
- `react-scroll-snapper` / `react-full-snap` — Small community, low maintenance.
- GSAP ScrollTrigger — Overkill for this use case; GSAP has license considerations too.

**Confidence: HIGH for CSS approach** — Tailwind v4 has built-in scroll-snap utilities (`snap-y`, `snap-mandatory`, `snap-start`, `snap-always`). MEDIUM for Motion — library is current and actively maintained but "motion/react" rebranding is recent; verify import path at implementation time.

---

### Deployment & Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | — | Hosting + CDN | User-specified. Native Next.js runtime, zero-config deployment, Edge Network. |
| Supabase | hosted | PostgreSQL + Auth + Realtime | User-specified. Free tier sufficient for v1 (500 MB DB, 50K MAU auth). |

**Vercel + Supabase integration:** Use Vercel's Supabase integration (marketplace) to auto-inject `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables. Do not commit `.env.local` to git.

**Confidence: HIGH** — Both are user-specified and well-documented.

---

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

---

## Installation

```bash
# Bootstrap
npx create-next-app@15 alamo-windshield --typescript --tailwind --app --src-dir --import-alias "@/*"

# shadcn/ui init (Tailwind v4 compatible)
npx shadcn@latest init

# Add shadcn components used in this project
npx shadcn@latest add button calendar form input label scroll-area select sheet table textarea toast chart

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# VIN wrapper
npm install @shaggytools/nhtsa-api-wrapper

# Forms
npm install react-hook-form zod @hookform/resolvers

# Animation
npm install motion

# Date utilities (rdp v9 peer dep)
npm install date-fns
```

**Dev dependencies:**
```bash
npm install -D @types/node
```

---

## Environment Variables

```env
# .env.local (never commit)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both are safe to be `NEXT_PUBLIC_` — the anon key is designed for browser use. Row-Level Security (RLS) on Supabase tables enforces actual access control.

---

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
