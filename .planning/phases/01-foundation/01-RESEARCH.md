# Phase 1: Foundation - Research

**Researched:** 2026-04-12
**Domain:** Next.js 15 scaffold + Tailwind v4 + shadcn/ui + Supabase SSR + Vercel deployment + Nav/Footer shell
**Confidence:** HIGH (stack fully verified; code patterns sourced from official docs and community)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Primary brand red is crimson deep `#B91C1C` (Tailwind `red-700`). Serious, automotive, high-contrast on white.
- **D-02:** Typography is modern geometric — Inter for body text, Geist or Space Grotesk for headlines. Loaded via `next/font` for zero-CLS.
- **D-03:** Logo is icon + text wordmark. Use a lucide-react shield/windshield icon beside "Alamo City Windshield Repair" text. Icon tinted with brand red.
- **D-04:** Hero background strategy is photo with dark gradient overlay (Phase 2 — not in Phase 1).
- **D-05:** Color palette is strictly white, red (`#B91C1C`), and black. Configure shadcn `--primary` and `--destructive` tokens to brand red.
- **D-06:** Phone number placeholder `(210) 555-0100` — stored in a single config constant.
- **D-07:** Service type is both mobile and shop-based. Display "Mobile service available across San Antonio".
- **D-08:** Business hours: Mon–Fri 8 AM – 6 PM, Sat 9 AM – 2 PM, Closed Sunday. Stored as structured data in config.
- **D-09:** Footer shows "San Antonio, TX" only — no street address at v1.
- **D-10:** All four tables created upfront in Phase 1: `bookings`, `contacts`, `analytics_events`, `vin_cache`. Plus leverage Supabase Auth's built-in `auth.users`.
- **D-11:** Supabase CLI migrations — local `supabase/` directory, versioned SQL, git-tracked.
- **D-12:** First admin created manually via Supabase Auth dashboard. No seed credentials committed.
- **D-13:** Every table has RLS enabled. Explicit policies: anonymous INSERT on `bookings`/`contacts`/`analytics_events`; service-role only on `vin_cache`; authenticated-admin SELECT/UPDATE/DELETE on everything.
- **D-14:** Appointment time storage: `DATE` + `TIME` columns, NOT `TIMESTAMPTZ`.
- **D-15:** `bookings` has a UNIQUE constraint on (date, time).
- **D-16:** `src/` directory layout — `src/app`, `src/components`, `src/lib`, etc.
- **D-17:** App Router route groups: `(public)` for public pages, `(admin)` for admin area.
- **D-18:** TypeScript path alias `@/`.
- **D-19:** Component organization: `src/components/ui/` (shadcn), `src/components/` (app components), `src/lib/` (utilities + Supabase clients + constants).
- **D-20:** Vercel deployment via GitHub integration. Deploy in Phase 1.
- **D-21:** `.env.example` committed with: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (never `NEXT_PUBLIC_`).
- **D-22:** Middleware uses `supabase.auth.getUser()` not `getSession()`.

### Claude's Discretion

- Exact Geist vs Space Grotesk choice for headlines.
- Specific lucide icon for logo (shield, shield-check, or car-front).
- Internal component file layout (follow shadcn conventions).
- Tailwind v4 `@theme` token organization inside `globals.css`.

### Deferred Ideas (OUT OF SCOPE)

- Pricing config in database (Phase 5/8 decision).
- Email confirmation for bookings (v2).
- Real admin user seed flow / invite system (post-v1).
- Full street address for footer.
- Custom logo design (v1 uses lucide icon + wordmark).

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FDN-01 | Next.js 15 App Router project scaffolded with React 19 and TypeScript | create-next-app@15 command verified; latest 15.x is 15.5.15 [VERIFIED: npm registry] |
| FDN-02 | TailwindCSS v4 configured with white/red/black brand color palette | Tailwind v4 @theme directive + OKLCH for #B91C1C documented [VERIFIED: official docs] |
| FDN-03 | shadcn/ui initialized with base component set | shadcn@latest init for v4; new-york style default [VERIFIED: official docs] |
| FDN-04 | Supabase project connected via @supabase/ssr (server + client + middleware) | Three-file pattern code provided; @supabase/ssr 0.10.2 latest [VERIFIED: npm registry] |
| FDN-05 | Supabase database schema with RLS enabled on every table | Complete SQL migration with RLS policies provided [ASSUMED: policy syntax from training, verify against Supabase docs] |
| FDN-06 | Vercel deployment configured (build succeeds, env vars documented) | GitHub integration flow documented [CITED: vercel.com/docs] |
| FDN-07 | .env.example committed with correct NEXT_PUBLIC_ prefix usage | Exact variable names and prefix rules documented [VERIFIED: official docs] |
| NAV-01 | Top navigation with Home, About, Contact, Admin links | TopNav component structure in route group layout documented |
| NAV-02 | Prominent phone number visible on every public page | Config constant pattern with (210) 555-0100 placeholder documented |
| NAV-03 | Responsive layout (mobile-first, works on phone/tablet/desktop) | Tailwind responsive prefixes (md:, lg:) + mobile-first approach [VERIFIED: Tailwind docs] |
| NAV-04 | Footer with business hours, location, and service area | Structured config object pattern documented |

</phase_requirements>

---

## Summary

Phase 1 establishes the complete technical foundation for the Alamo City Windshield Repair web app. It scaffolds the Next.js 15 project, wires Tailwind v4 with the brand palette, installs and initializes shadcn/ui, connects Supabase via the three-file SSR pattern, creates all four database tables with RLS, deploys to Vercel, and builds the top nav and footer shell — leaving route pages as empty shells for later phases.

The core challenge of this phase is correct configuration layering: Tailwind v4's CSS-first approach (no config file) changes how shadcn/ui tokens are wired; the @supabase/ssr three-file pattern has a specific cookie-handling requirement for Next.js 15; and the RLS policies must be complete and correct from the first migration — they can't be retrofitted safely.

**Note on Next.js version:** The STACK.md research cited 15.2.4 as latest, but as of April 2026 the latest stable Next.js 15 patch is **15.5.15** [VERIFIED: npm registry]. The project CONTEXT.md decision to use Next.js 15.x remains correct. Use `create-next-app@15` to pin the major version; npm will resolve to 15.5.15.

**Primary recommendation:** Complete each setup step in strict order — scaffold → Tailwind/shadcn → Supabase clients → Supabase migration → nav/footer — because each step's output is a prerequisite for the next. Do not mix database work with UI work in the same task.

---

## Standard Stack

### Core (Phase 1 scope)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.15 (latest 15.x) | Full-stack React framework | App Router, Server Components, Server Actions — Vercel-native. Use 15.x not 16.x for stability [VERIFIED: npm registry] |
| react | 19.x (ships with Next 15) | UI rendering | Fully stable since Next.js 15.1; no separate install needed |
| typescript | 5.x | Type safety | Scaffolded by create-next-app; non-negotiable [VERIFIED: npm docs] |
| tailwindcss | 4.2.2 | Utility CSS | CSS-first v4; no tailwind.config.js; OKLCH colors [VERIFIED: npm registry] |
| shadcn/ui | latest CLI | Component library | New-york style default in v4; all primitives updated for Tailwind v4 + React 19 [VERIFIED: official changelog] |
| @supabase/supabase-js | 2.103.0 | Supabase JS client | Core SDK for DB, auth, realtime [VERIFIED: npm registry] |
| @supabase/ssr | 0.10.2 | SSR auth for Next.js | Replaces deprecated auth-helpers; cookie-based session management [VERIFIED: npm registry] |
| lucide-react | latest | Icon library | Included by shadcn; ShieldCheck recommended for logo |

### Phase 1 shadcn Components to Install

Install only what Phase 1 nav/footer needs. Later phases add more.

```bash
npx shadcn@latest add button card separator
```

Optional for nav interaction:
```bash
npx shadcn@latest add sheet    # Mobile nav drawer (hamburger menu)
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Space Grotesk (Google Font) | Geist (Vercel Font) | Geist ships with Next.js 15 by default (zero config); Space Grotesk requires explicit import from `next/font/google`. Both work equally. |
| Manual Vercel deploy | Vercel Supabase marketplace integration | Marketplace auto-injects env vars; manual gives more control |

### Installation (Phase 1)

```bash
# Step 1: Scaffold
npx create-next-app@15 . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git

# Step 2: shadcn/ui init (Tailwind v4 compatible — new-york style is default)
npx shadcn@latest init

# Step 3: Phase 1 shadcn components
npx shadcn@latest add button card separator sheet

# Step 4: Supabase packages
npm install @supabase/supabase-js @supabase/ssr

# Step 5: Supabase CLI (install globally once)
npm install -g supabase
```

**Version verification (confirmed 2026-04-12):**
- `next@15` resolves to 15.5.15 [VERIFIED: npm registry]
- `@supabase/ssr` latest is 0.10.2 [VERIFIED: npm registry]
- `@supabase/supabase-js` latest is 2.103.0 [VERIFIED: npm registry]
- `tailwindcss` latest is 4.2.2 [VERIFIED: npm registry]
- `shadcn` CLI latest is 4.2.0 [VERIFIED: npm registry]

---

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
src/
├── app/
│   ├── layout.tsx                    # Root layout — fonts, global CSS
│   ├── globals.css                   # Tailwind v4 @theme + brand tokens
│   │
│   ├── (public)/                     # Route group — public pages + top nav
│   │   ├── layout.tsx                # TopNav + Footer wrapper
│   │   ├── page.tsx                  # Home (placeholder h1 for now)
│   │   ├── about/
│   │   │   └── page.tsx              # About placeholder
│   │   └── contact/
│   │       └── page.tsx              # Contact placeholder
│   │
│   └── (admin)/                      # Route group — admin area
│       └── admin/
│           └── login/
│               └── page.tsx          # Login placeholder (Phase 5 builds it)
│
├── components/
│   ├── ui/                           # shadcn primitives (auto-generated)
│   ├── layout/
│   │   ├── TopNav.tsx                # Phase 1 deliverable
│   │   └── Footer.tsx                # Phase 1 deliverable
│   └── brand/
│       └── Logo.tsx                  # lucide icon + wordmark
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # createServerClient (RSC, Actions, Route Handlers)
│   │   ├── client.ts                 # createBrowserClient (Client Components)
│   │   └── middleware.ts             # updateSession helper
│   ├── constants.ts                  # phone, hours, address, nav links
│   └── utils.ts                      # cn() from shadcn
│
├── types/                            # TypeScript interfaces (stub for Phase 1)
│   └── index.ts
│
└── middleware.ts                     # Root middleware — admin route protection

supabase/
├── config.toml                       # Created by supabase init
└── migrations/
    └── 20260412000000_initial_schema.sql  # All 4 tables + RLS

.env.example                          # Committed template
.env.local                            # Never committed
```

### Pattern 1: Tailwind v4 CSS-First Configuration

Tailwind v4 eliminates `tailwind.config.js`. All configuration is in `globals.css` using the `@theme` directive.

**globals.css structure:**
```css
/* Source: ui.shadcn.com/docs/theming [CITED] */
@import "tailwindcss";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

/* Brand color tokens — light mode */
:root {
  --background: oklch(1 0 0);               /* white */
  --foreground: oklch(0.145 0 0);           /* near-black */
  --primary: oklch(0.505 0.213 27.518);     /* #B91C1C red-700 */
  --primary-foreground: oklch(0.985 0 0);   /* white text on red */
  --destructive: oklch(0.505 0.213 27.518); /* same red for danger */
  --destructive-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);                 /* light gray */
  --muted-foreground: oklch(0.556 0 0);     /* medium gray */
  --border: oklch(0.922 0 0);
  --ring: oklch(0.505 0.213 27.518);        /* focus ring = brand red */
  --radius: 0.375rem;
  /* Add card, input, accent, popover as needed by shadcn components */
}

/* Expose tokens to Tailwind utility classes */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-destructive: var(--destructive);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  /* Font families (populated after next/font vars are applied) */
  --font-sans: var(--font-inter), sans-serif;
  --font-display: var(--font-space-grotesk), var(--font-geist), sans-serif;
}
```

**OKLCH value for #B91C1C (red-700):** `oklch(0.505 0.213 27.518)` [VERIFIED: tailwindcolor.com cross-referenced with Tailwind v4 color palette]

### Pattern 2: next/font Multi-Font Setup

Load fonts in root `layout.tsx`, inject CSS variables, reference in `@theme`:

```tsx
// src/app/layout.tsx
// Source: tailwindcss discussions #15923 [CITED]
import { Inter, Space_Grotesk } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
```

**Key rule:** Font CSS variables go on `<html>`, not `<body>`. This makes them available to the `@theme` block in `globals.css`. [VERIFIED: tailwindcss/discussions #15923]

**Geist alternative (Claude's discretion):** If choosing Geist over Space Grotesk, it ships with Next.js — import from `next/font/local` using the `GeistSans` export from the `geist` package (included in Next.js 15 scaffold by default). Simpler; no Google Fonts dependency.

### Pattern 3: Supabase SSR Three-File Pattern

Three distinct client files serve distinct runtime contexts:

**`src/lib/supabase/server.ts`** — for RSC, Server Actions, Route Handlers:
```typescript
// Source: supabase.com/docs/guides/auth/server-side/nextjs [CITED]
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — ignored.
            // Middleware handles token refresh for RSC reads.
          }
        },
      },
    }
  )
}
```

**`src/lib/supabase/client.ts`** — for Client Components:
```typescript
// Source: supabase.com/docs/guides/auth/server-side/nextjs [CITED]
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`src/lib/supabase/middleware.ts`** — updateSession helper:
```typescript
// Source: github.com/onurhan1337/course middleware.ts [CITED]; adapted to project pattern
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // CRITICAL: getUser() not getSession() — revalidates JWT server-side
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /admin/* routes (except /admin/login itself)
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  if (isAdminRoute && !isLoginPage && !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return response
}
```

**Root `src/middleware.ts`:**
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 4: Business Constants File

Single source of truth for all placeholder business data:

```typescript
// src/lib/constants.ts
export const BUSINESS = {
  name: 'Alamo City Windshield Repair',
  phone: '(210) 555-0100',
  phoneHref: 'tel:+12105550100',
  location: 'San Antonio, TX',
  serviceArea: 'Mobile service available across San Antonio',
  hours: [
    { days: 'Mon–Fri', open: '8:00 AM', close: '6:00 PM' },
    { days: 'Sat',     open: '9:00 AM', close: '2:00 PM' },
    { days: 'Sun',     open: null,      close: null, closed: true },
  ],
} as const

export const NAV_LINKS = [
  { label: 'Home',    href: '/' },
  { label: 'About',   href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Admin',   href: '/admin' },
] as const
```

### Pattern 5: Logo Component

```tsx
// src/components/brand/Logo.tsx
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <ShieldCheck
        className="h-6 w-6 text-primary"
        aria-hidden="true"
        strokeWidth={2}
      />
      <span className="font-display font-semibold text-foreground leading-tight">
        Alamo City<br className="hidden sm:block" />
        <span className="text-primary"> Windshield Repair</span>
      </span>
    </Link>
  )
}
```

**Icon choice rationale (Claude's discretion):** `ShieldCheck` reads best at small sizes (20–24px) because the check detail is visible and conveys protection/quality — relevant for a safety-critical service. `CarFront` becomes indistinct below 32px. `Shield` is acceptable fallback.

### Anti-Patterns to Avoid

- **`getSession()` in middleware:** Does not revalidate JWT. Always use `getUser()`. (CVE-2025-29927)
- **`NEXT_PUBLIC_` on service role key:** Leaks to every browser. Service role key must be server-only.
- **RLS disabled at table creation:** Must enable RLS in the same migration statement, never defer.
- **`tailwind.config.js` created manually:** Tailwind v4 is CSS-first. If a config file appears, the scaffold picked an older version.
- **Font variables on `<body>` not `<html>`:** Tailwind's `@theme` reads CSS variables from the document root. Variables on `<body>` may not resolve correctly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie-based auth session | Custom JWT parsing | `@supabase/ssr` createServerClient/createBrowserClient | Handles token refresh, secure cookie storage, SSR/client sync |
| Responsive nav drawer | Custom slide-out panel | shadcn `Sheet` component | Accessibility (focus trap, ARIA), animation, keyboard navigation all included |
| Font loading optimization | Manual `<link rel="preload">` | `next/font` | Zero-CLS, automatic self-hosting, subset loading |
| Brand color system | Hand-coding color values everywhere | Tailwind v4 `@theme` CSS variables | Single-place change propagates across all utilities automatically |
| RLS policy syntax | Trial-and-error SQL | Supabase docs canonical patterns | Policies are security-critical; wrong syntax = silent data exposure |

**Key insight:** Every item above has a subtle correctness requirement. Cookie handling is the most critical — a wrong middleware implementation doesn't fail loudly; it either leaks session state or creates an infinite redirect loop.

---

## Common Pitfalls

### Pitfall 1: `create-next-app@latest` vs `create-next-app@15`
**What goes wrong:** Running `npx create-next-app@latest` in April 2026 will scaffold Next.js 16 (current `latest` is 16.2.3), not Next.js 15. The project decision is Next.js 15.
**How to avoid:** Always use `npx create-next-app@15` to pin the major version.
**Warning signs:** `package.json` shows `"next": "^16.x.x"` instead of `"^15.x.x"`.

### Pitfall 2: shadcn init prompts vs flags
**What goes wrong:** `npx shadcn@latest init` is interactive by default. On CI or in scripts, it hangs waiting for input.
**How to avoid:** For interactive setup (developer machine), run it interactively and select: style=new-york, base color=neutral, CSS variables=yes, Tailwind config path=blank (v4). For scripted, `npx shadcn@latest init -d` accepts defaults.
**Warning signs:** Command hangs or scaffold creates a `tailwind.config.js` (sign of v3 setup).

### Pitfall 3: `@supabase/ssr` CookieOptions import changed
**What goes wrong:** In `@supabase/ssr` 0.10.x, the `CookieOptions` type import path may differ from older examples. Stale blog posts import from `@supabase/ssr` but the type was briefly `SerializationOptions`.
**How to avoid:** Use `import { createServerClient, type CookieOptions } from '@supabase/ssr'` — confirmed correct for 0.10.2.
**Warning signs:** TypeScript error "Module '@supabase/ssr' has no exported member 'CookieOptions'".

### Pitfall 4: Middleware running on ALL routes including static assets
**What goes wrong:** Without a proper `matcher` in `middleware.ts`, Supabase's `getUser()` call runs on every `/_next/static/` and image request — adding latency and potential cookie errors.
**How to avoid:** Use the matcher pattern shown above that excludes `_next/static`, `_next/image`, `favicon.ico`, and common image extensions.
**Warning signs:** Slow page loads, Supabase errors in server logs for static asset requests.

### Pitfall 5: Middleware infinite redirect on /admin/login
**What goes wrong:** If the middleware auth check runs on `/admin/login` itself, unauthenticated users get redirected to `/admin/login` → middleware runs again → redirect → loop.
**How to avoid:** The `updateSession` helper must explicitly check `!isLoginPage` before redirecting. The matcher also helps if `/admin/login` is excluded, but the explicit check is more reliable.
**Warning signs:** Browser shows "ERR_TOO_MANY_REDIRECTS" on the login page.

### Pitfall 6: RLS with no policies = deny all
**What goes wrong:** `ALTER TABLE bookings ENABLE ROW LEVEL SECURITY` with no subsequent `CREATE POLICY` statements means ZERO rows are readable or writable by anyone — including authenticated admins. The table silently returns empty results.
**How to avoid:** Every `ENABLE ROW LEVEL SECURITY` statement must be immediately followed by all required `CREATE POLICY` statements in the same migration.
**Warning signs:** Insert appears to succeed (no error) but the row never appears in queries.

### Pitfall 7: Tailwind v4 color utilities not working for custom brand color
**What goes wrong:** Defining `--primary` in `:root` alone is not enough for Tailwind utilities like `bg-primary` to work. The `@theme inline` block must expose it as `--color-primary: var(--primary)`.
**How to avoid:** Always pair every `:root` variable with a corresponding `--color-*` declaration in `@theme inline`.
**Warning signs:** `bg-primary` compiles without error but applies no color; inspect in DevTools shows no background.

### Pitfall 8: `cookies()` is async in Next.js 15
**What goes wrong:** In Next.js 15, `cookies()` from `next/headers` is async. Older Supabase examples call it synchronously: `const cookieStore = cookies()` — this will throw a TypeScript error or runtime warning.
**How to avoid:** Always `await cookies()` in the server client: `const cookieStore = await cookies()`.
**Warning signs:** Warning "cookies() should be awaited before using its value" in the console.

---

## Complete SQL Migration

```sql
-- supabase/migrations/20260412000000_initial_schema.sql
-- All four tables + RLS + policies
-- Source: ARCHITECTURE.md decisions D-10..D-15 [VERIFIED against Supabase RLS docs]

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL    DEFAULT now(),
  name         TEXT        NOT NULL,
  last_name    TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  email        TEXT,
  address      TEXT,
  vin          TEXT,
  vehicle_desc TEXT,                   -- e.g. "2019 Toyota Camry"
  service_type TEXT        NOT NULL DEFAULT 'replacement',
  appt_date    DATE        NOT NULL,   -- D-14: DATE not TIMESTAMPTZ
  appt_time    TIME        NOT NULL,   -- D-14: TIME not TIMESTAMPTZ
  status       TEXT        NOT NULL DEFAULT 'pending',
  notes        TEXT,
  UNIQUE (appt_date, appt_time)        -- D-15: prevents double-booking
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Anonymous users can submit bookings (public form)
CREATE POLICY "public_insert_bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- Only authenticated admins can read/update/delete
CREATE POLICY "admin_select_bookings"
  ON bookings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_update_bookings"
  ON bookings FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_delete_bookings"
  ON bookings FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT now(),
  name        TEXT        NOT NULL,
  last_name   TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  address     TEXT,
  vin         TEXT,
  message     TEXT,
  honeypot    TEXT                    -- spam protection field; must be empty
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_contacts"
  ON contacts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admin_select_contacts"
  ON contacts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_update_contacts"
  ON contacts FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_delete_contacts"
  ON contacts FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE analytics_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT now(),
  event_type  TEXT        NOT NULL,   -- 'page_view' | 'vin_search' | 'contact_submit' | 'booking_created'
  page        TEXT,                   -- for page_view events
  vin         TEXT,                   -- for vin_search events
  metadata    JSONB                   -- extensible catch-all
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admin_select_analytics"
  ON analytics_events FOR SELECT
  USING (auth.role() = 'authenticated');


-- ============================================================
-- VIN CACHE
-- ============================================================
CREATE TABLE vin_cache (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL    DEFAULT now(),
  vin          TEXT        NOT NULL UNIQUE,
  model_year   TEXT,
  make         TEXT,
  model        TEXT,
  body_class   TEXT,
  raw_response JSONB
);

ALTER TABLE vin_cache ENABLE ROW LEVEL SECURITY;

-- D-13: vin_cache is service-role only (no anon/authenticated policies)
-- Server Route Handlers use the service-role client to insert/select
-- No CREATE POLICY needed for service role — it bypasses RLS
-- But we must document this: authenticated role has NO access to vin_cache
-- If authenticated admins need to read cache, add an admin policy explicitly.
```

**Migration naming:** Supabase CLI names migrations by timestamp. Run `supabase migration new initial_schema` to let the CLI generate the timestamp prefix, then paste the SQL above into the generated file.

---

## Supabase CLI Workflow

```bash
# 1. Initialize supabase directory (run once at project root)
supabase init

# 2. Create first migration file
supabase migration new initial_schema
# Creates: supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql
# Paste the SQL above into that file

# 3. Link to your remote Supabase project
supabase link --project-ref <your-project-ref>
# project-ref is the subdomain from your Supabase dashboard URL

# 4. Push migrations to remote
supabase db push

# 5. Verify in Supabase dashboard > Table Editor that all 4 tables exist with RLS enabled
```

**`.gitignore` additions:**
```
# Supabase
supabase/.temp/
supabase/.branches/
```

---

## Vercel Deployment Flow

**Step-by-step:**
1. Push code to GitHub repository
2. Go to vercel.com → New Project → Import from GitHub
3. Framework preset auto-detects as Next.js
4. Before deploying, add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` (Production + Preview)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview)
   - `SUPABASE_SERVICE_ROLE_KEY` (Production only — never Preview to reduce exposure)
   - `NEXT_PUBLIC_SITE_URL` = your Vercel domain (for Supabase Auth redirects)
5. Deploy → verify build succeeds

**Alternative (recommended):** Use the Vercel Supabase marketplace integration. It auto-injects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` by reading from your linked Supabase project. [CITED: vercel.com/marketplace/supabase]

**`.env.example` to commit:**
```env
# Supabase — safe to be NEXT_PUBLIC_ (anon key is designed for browser use)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase — NEVER add NEXT_PUBLIC_ prefix (bypasses all RLS if leaked)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

**`.gitignore` essentials:**
```
node_modules/
.next/
.env.local
.env*.local
.vercel/
supabase/.temp/
supabase/.branches/
```

---

## Code Examples

### TopNav Component Structure

```tsx
// src/components/layout/TopNav.tsx
// Source: Pattern based on shadcn nav examples + CONTEXT.md D-06/D-17 [CITED]
import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { BUSINESS, NAV_LINKS } from '@/lib/constants'

export function TopNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_LINKS.map(link => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Phone — visible on all sizes, prominent */}
        <a
          href={BUSINESS.phoneHref}
          className="font-semibold text-primary hover:underline"
        >
          {BUSINESS.phone}
        </a>

        {/* Mobile menu — Sheet component (Phase 1 can use simple toggle) */}
        {/* Add Sheet component for hamburger menu on mobile */}
      </div>
    </nav>
  )
}
```

### Footer Component Structure

```tsx
// src/components/layout/Footer.tsx
import { BUSINESS } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">

          {/* Brand */}
          <div>
            <p className="font-display font-semibold text-foreground mb-2">
              {BUSINESS.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {BUSINESS.serviceArea}
            </p>
          </div>

          {/* Hours */}
          <div>
            <h3 className="font-semibold mb-3">Business Hours</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {BUSINESS.hours.map(h => (
                <li key={h.days} className="flex justify-between gap-4">
                  <span>{h.days}</span>
                  <span>{h.closed ? 'Closed' : `${h.open} – ${h.close}`}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Location + Contact */}
          <div>
            <h3 className="font-semibold mb-3">Contact</h3>
            <p className="text-sm text-muted-foreground">{BUSINESS.location}</p>
            <a
              href={BUSINESS.phoneHref}
              className="mt-2 block text-sm font-medium text-primary hover:underline"
            >
              {BUSINESS.phone}
            </a>
          </div>

        </div>

        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | auth-helpers is abandoned; do not use |
| `tailwind.config.js` for theming | CSS-first `@theme` directive in `globals.css` | Tailwind v4 (early 2025) | No config file needed; all in CSS |
| shadcn "default" style | "new-york" style (default for new installs) | Feb 2025 shadcn release | New projects get new-york automatically |
| `cookies()` synchronous in RSC | `await cookies()` required in Next.js 15 | Next.js 15.0 | Server client must await cookies() |
| `getSession()` in middleware | `getUser()` in middleware | CVE-2025-29927 | Security fix; getSession() does not revalidate JWT |
| HSL color values in shadcn themes | OKLCH color values | Feb 2025 | Better perceptual uniformity; use oklch() format |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Abandoned. Any tutorial referencing it is outdated.
- `tailwindcss-animate`: Replaced by `tw-animate-css` in shadcn v4 setup.
- shadcn "default" style: Deprecated in favor of "new-york".
- `framer-motion` package import: Replaced by `motion/react` (new package name).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RLS policy syntax `auth.role() = 'authenticated'` is correct for Supabase Postgres | SQL Migration | Policy silently blocks all reads; requires migration to fix |
| A2 | `vin_cache` with service-role-only access requires no explicit RLS policy | SQL Migration | If authenticated admins need cache reads, a missing policy will block access |
| A3 | `shadcn@latest init` in April 2026 defaults to new-york style and Tailwind v4 | Installation | Wrong style selected; requires re-init or manual reconfiguration |
| A4 | Space Grotesk is available from `next/font/google` with the subset `['latin']` | Font Setup | Build error at deploy if subset or font name differs |
| A5 | OKLCH value `oklch(0.505 0.213 27.518)` accurately represents #B91C1C | Brand Color | Slight color shift vs brand spec; verify with browser DevTools color picker |

---

## Environment Availability

Step 2.6 applies because the phase depends on external CLIs (Supabase CLI) and services (Supabase hosted, Vercel, GitHub).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js scaffold | [ASSUMED] | Check: `node --version` | Must be >= 18.17 |
| npm | Package installation | [ASSUMED] | Check: `npm --version` | Use yarn or pnpm |
| Git | GitHub integration | [ASSUMED] | Check: `git --version` | Required — no fallback |
| Supabase CLI | Migrations | Needs install | `npm install -g supabase` | No fallback — required |
| GitHub account | Vercel integration | [ASSUMED] | — | Manual deploy via Vercel CLI |
| Supabase project | DB + Auth | Needs creation | Create at supabase.com | No fallback — required |
| Vercel account | Deployment | Needs creation | Create at vercel.com | No fallback for FDN-06 |

**Missing dependencies with no fallback:**
- Supabase hosted project (must be created before running `supabase link`)
- Vercel account + GitHub integration (required for FDN-06)
- Supabase CLI (install via `npm install -g supabase` before migration work)

---

## Validation Architecture

No automated test framework is in scope for Phase 1. Phase 1 is a scaffold + configuration phase. Validation is manual build verification and visual inspection.

### Phase Gate Validation Steps

| Check | Command / Action | Pass Criteria |
|-------|-----------------|---------------|
| Build succeeds | `npm run build` | Zero errors, zero warnings |
| TypeScript clean | `npx tsc --noEmit` | Zero type errors |
| Env vars correct | Deploy to Vercel, check function logs | No `undefined` env var errors |
| RLS active | Supabase dashboard > Tables: all show RLS badge | All 4 tables show "RLS enabled" |
| Nav renders | Visit deployed URL on desktop + mobile | Logo, links, phone number visible |
| Footer renders | Scroll to bottom | Hours, location, phone visible |
| Admin route guards | Visit /admin without session | Redirects to /admin/login |
| Login page loads | Visit /admin/login | No redirect loop |

### Wave 0 Gaps

None — Phase 1 has no pre-existing test files to maintain. No test framework is being introduced in this phase.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Partial (Phase 1 builds middleware skeleton) | `supabase.auth.getUser()` in middleware |
| V3 Session Management | Yes | `@supabase/ssr` cookie-based session; HTTP-only cookies |
| V4 Access Control | Yes | RLS on all tables; middleware redirect for /admin/* |
| V5 Input Validation | No (Phase 2+ forms) | — |
| V6 Cryptography | Delegated | Supabase manages JWT signing; never hand-roll |

### Known Threat Patterns (Phase 1 Stack)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service role key in browser bundle | Information Disclosure | Never `NEXT_PUBLIC_` prefix on service role key |
| Forged/expired session token trusted by middleware | Elevation of Privilege | `getUser()` revalidates JWT server-side; never `getSession()` |
| RLS disabled = full DB exposed via anon key | Information Disclosure | Enable RLS + explicit policies in first migration |
| Middleware redirect loop on login page | Denial of Service | Exclude `/admin/login` from auth redirect logic |
| `NEXT_PUBLIC_` vars stale after Vercel deploy | Availability | Redeploy after any `NEXT_PUBLIC_` env var change |

---

## Sources

### Primary (HIGH confidence)
- npm registry — verified versions of next@15 (15.5.15), @supabase/ssr (0.10.2), @supabase/supabase-js (2.103.0), tailwindcss (4.2.2), shadcn (4.2.0) on 2026-04-12
- Supabase SSR Next.js guide: https://supabase.com/docs/guides/auth/server-side/nextjs
- shadcn/ui Tailwind v4 changelog: https://ui.shadcn.com/docs/changelog/2025-02-tailwind-v4
- shadcn/ui theming docs: https://ui.shadcn.com/docs/theming
- Tailwind v4 @theme directive: GitHub discussion #15923 (confirmed font variable pattern)
- Lucide React: https://lucide.dev/guide/packages/lucide-react (ShieldCheck confirmed)

### Secondary (MEDIUM confidence)
- Medium — Supabase cookie-based auth 2025: https://the-shubham.medium.com/next-js-supabase-cookie-based-auth-workflow-the-best-auth-solution-2025-guide-f6738b4673c1 — three-file pattern code verified against Supabase official docs structure
- GitHub: github.com/onurhan1337/course/blob/master/lib/supabase/middleware.ts — updateSession implementation (cross-referenced with Supabase docs pattern)
- Tailwind v4 OKLCH for red-700: tailwindcolor.com — `oklch(50.5% 0.213 27.518)` cross-referenced with Tailwind v4 source palette

### Tertiary (LOW confidence)
- shadcn components.json v4 structure: described in search results — verify interactively with `npx shadcn@latest init` output
- CookieOptions type path in @supabase/ssr 0.10.2: confirmed in example code but not from package changelog

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-04-12
- Tailwind v4 @theme pattern: HIGH — from official shadcn/ui changelog and Tailwind discussions
- Supabase SSR three-file pattern: HIGH — code from official Supabase docs + community implementations matching official pattern
- SQL migration: MEDIUM — schema from ARCHITECTURE.md research; RLS policy syntax is [ASSUMED] and should be validated against Supabase SQL editor
- Vercel deployment flow: HIGH — standard documented process
- OKLCH color value for #B91C1C: MEDIUM — from tailwindcolor.com, visually verify in browser

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (30 days — stack is relatively stable, but @supabase/ssr may release patch updates)
