# Phase 2: Public Pages - Research

**Researched:** 2026-04-14
**Domain:** Full-page snap scroll landing page + About page (Next.js 15, Tailwind v4, motion/react)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hero Section (Snap Section 1)**
- D-01: Headline is "San Antonio's Trusted Windshield Repair & Replacement"
- D-02: Single CTA button: "Get Free Estimate" — scrolls smoothly to VIN form section. Brand red background, white text.
- D-03: Background is a stock auto/windshield photo with dark gradient overlay at 50-60% opacity. Text in white.
- D-04: Entrance animations via motion/react — subtle fade-in + slight slide-up as the hero loads. Import from `motion/react`.
- D-05: Animated bouncing down-arrow at the bottom of the hero.

**Snap Scroll Flow**
- D-06: 3 full-page snap sections using CSS `snap-y snap-mandatory` on the container, `snap-start snap-always` on each section: (1) Hero, (2) VIN Estimate, (3) Services + Testimonials.
- D-07: Each section is exactly `h-screen` (full viewport height). Page container: `overflow-y-auto snap-y snap-mandatory`.
- D-08: Sections use motion/react `whileInView` for subtle entrance animations (fade-in + slide-up).

**VIN Estimate Section (Snap Section 2)**
- D-09: Background is a different auto-related stock photo with same dark gradient overlay style.
- D-10: Centered white card over dark background. Card contains: heading, VIN input (17-char), "Get Estimate" button (brand red).
- D-11: Placeholder fake result card on valid VIN submit (e.g., "2024 Toyota Camry — Estimated: $250–$400").
- D-12: "Book Appointment" CTA after fake result (navigates to `/contact` in Phase 2).
- D-13: VIN validation client-side only: reject inputs not exactly 17 alphanumeric characters. No API call.

**Services + Testimonials Section (Snap Section 3)**
- D-14: 3-4 service cards in responsive grid with lucide-react icon + title + 1-2 sentence description.
- D-15: 2-3 testimonial quotes (placeholder text). No rating stars.
- D-16: Final CTA: "Contact Us" button linking to `/contact`.

**About Page**
- D-17: Alternating full-width sections with white and light-gray backgrounds: (1) Mission (white), (2) Vision (gray), (3) Trust signals (white).
- D-18: Trust signals: lifetime warranty badge, "Serving all of San Antonio" service area list, insurance mention.
- D-19: About page content is placeholder text for v1.
- D-20: No ADAS calibration callout on About page.

### Claude's Discretion
- Exact stock photo selection from Unsplash/Pexels
- Animation timing/easing for motion/react `whileInView` and hero entrance
- Exact spacing, padding, and section proportions within snap sections
- Testimonial placeholder names and quote text
- Service card icon choices (lucide-react)
- About page placeholder paragraph text for mission/vision
- Whether to use shadcn Card for service cards or custom styled divs

### Deferred Ideas (OUT OF SCOPE)
- ADAS calibration callout on About page
- Real customer testimonials (placeholder for v1)
- Real company mission/vision copy (placeholder for v1)
- Google Maps embed for service area
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOME-01 | Full-screen hero section with background image and headline | Snap section 1: background-image + dark gradient overlay via Tailwind, `h-dvh` for full-screen |
| HOME-02 | Full-page snap scroll with CSS scroll-snap (mandatory snap) | `snap-y snap-mandatory` on scroll container, `snap-start snap-always` on sections — Tailwind v4 built-in |
| HOME-03 | Second section reveals new background image and VIN estimate form | Snap section 2 with separate stock photo, white card overlay, zod validation |
| HOME-04 | VIN input field with validation (17-character VIN format) | Regex `^[A-HJ-NPR-Z0-9]{17}$`, controlled React state, inline error feedback |
| HOME-05 | Estimate result displays vehicle info (year/make/model) and price | Fake result card in Phase 2 (hard-coded sample), real API in Phase 3 |
| HOME-06 | "Book Appointment" CTA after estimate is shown | Button navigating to `/contact` in Phase 2; Phase 4 wires to booking calendar |
| ABOUT-01 | Company mission statement section | White-bg full-width section, Space Grotesk display font, placeholder copy |
| ABOUT-02 | Vision statement section | Light-gray bg full-width section, alternating pattern |
| ABOUT-03 | Company information (service area, warranty, years in business) | Trust signals section with BUSINESS constants from `lib/constants.ts` |
| ABOUT-04 | Trust signals (warranty, "we serve San Antonio", insurance-friendly) | Badge/icon + statement pattern, serviceArea from BUSINESS constant |
</phase_requirements>

---

## Summary

Phase 2 builds the home page (3 full-page snap scroll sections) and the About page on top of the Phase 1 foundation. The core technical challenge is the snap scroll layout architecture: the existing `(public)/layout.tsx` uses `flex min-h-screen flex-col` with `<main className="flex-1">`, which means the scroll container for snap must be created *inside* `page.tsx`, not at the layout level. This avoids affecting other public routes (About, Contact) that use standard scrolling.

The motion/react library (`npm install motion`, import from `motion/react`) is NOT yet installed. It must be added in Wave 0. The `viewport={{ root: scrollRef }}` prop is required for `whileInView` to fire correctly inside a custom scroll container — without it, IntersectionObserver targets the window viewport, which will never trigger since the window itself does not scroll (only the inner container does).

Zod is installed but at v3.25.76 (not v4 as CLAUDE.md targets). The VIN validation in Phase 2 is simple enough to use Zod v3 syntax OR a plain regex state check — no breaking difference for this use case. react-hook-form is also NOT installed; for the simple one-field VIN form, a plain controlled `useState` approach avoids adding a dependency for a single input.

**Primary recommendation:** Implement snap scroll inside `page.tsx` using a `useRef`-attached scroll container div, use `h-dvh` (not `h-screen`) for iOS Safari compatibility, pass `viewport={{ root: scrollRef }}` to every `motion` element, and use Unsplash direct URLs via `next/image` with `images.unsplash.com` added to `next.config.ts` `remotePatterns`.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|------------|
| Tech stack | Next.js + React + TailwindCSS + shadcn/ui only |
| Database | Supabase (no other DB) |
| Deployment | Vercel |
| Design | White, red (`#B91C1C`), black ONLY — no accent colors |
| UI Library | shadcn/ui components — use existing components first |
| Supabase auth | `@supabase/ssr`, `getUser()` in middleware, never `getSession()` |
| Import path | `motion/react` — NOT `framer-motion` |
| Font | Inter (body via `--font-sans`), Space Grotesk (display via `--font-display`) |
| Brand red | CSS token `--primary` already set to `oklch(0.505 0.213 27.518)` ≈ `#B91C1C` |
| Scroll snap | CSS snap utilities only — no fullPage.js, GSAP |

---

## Standard Stack

### Core (already installed)
| Library | Installed Version | Purpose | Phase 2 Usage |
|---------|------------------|---------|---------------|
| Next.js | 15.5.15 | Framework | App Router pages, `next/image` for photos |
| React | 19.1.0 | UI | All components |
| TailwindCSS | ^4 | Styling | Snap utilities, dvh heights, gradient overlays |
| shadcn/ui (base-ui) | 1.3.0 | UI primitives | Button, Card for VIN form + service cards |
| lucide-react | 1.8.0 | Icons | Service card icons, bouncing arrow, warranty badge |
| zod | 3.25.76 | Validation | VIN format schema (v3 syntax — see note below) |

[VERIFIED: package.json in codebase]

### Must Install (not yet in package.json)
| Library | Version | Purpose | Install Command |
|---------|---------|---------|-----------------|
| motion | ^12.37.0 | Entrance animations, whileInView | `npm install motion` |

[VERIFIED: npm registry via WebSearch — latest 12.37.0 published Mar 2026]

**Zod version note:** CLAUDE.md targets zod v4.3.6 but v3.25.76 is installed. For Phase 2's simple 17-char VIN validation, both versions have identical syntax for `z.string().length(17).regex(...)`. No upgrade needed in this phase; upgrade when installing react-hook-form in Phase 4 (contact form).

**react-hook-form note:** NOT installed and NOT needed for Phase 2. The VIN form is a single field — use `useState` + manual validation. RHF is overkill here; reserve it for the multi-field contact form in Phase 4.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `h-dvh` | `h-screen` | `h-screen` = `100vh` — breaks on iOS Safari where toolbar shrinks/expands; `h-dvh` = `100dvh` adjusts dynamically. Use `h-dvh`. |
| Direct Unsplash URLs via `next/image` | Download + `/public` folder | Remote URLs work with Next.js image optimization; downloading adds 2-5 MB to repo with no benefit. Use remote URLs. |
| `useState` VIN validation | react-hook-form + zod | RHF adds ~25 kB for one input field. Plain state is sufficient. |
| Custom scroll container in `page.tsx` | `overflow-y-auto` on `<html>` or `<body>` | Modifying html/body breaks Next.js scroll reset on navigation. Keep snap inside page. |

---

## Architecture Patterns

### Critical Layout Architecture: Snap Scroll vs. Public Layout

The existing `(public)/layout.tsx` structure is:
```tsx
<div className="flex min-h-screen flex-col">
  <TopNav />          {/* sticky, h-16 = 64px */}
  <main className="flex-1">{children}</main>
  <Footer />
</div>
```

The home page snap scroll **cannot** use this flex-col wrapper as the scroll container. The snap container must be a dedicated full-height `div` inside `page.tsx` that establishes its own scroll context.

**Two valid approaches:**

**Option A — Snap container inside `<main>` (recommended):**
The `<main className="flex-1">` element already grows to fill remaining space. The home page creates a snap container inside it with `h-[calc(100vh-4rem)]` or simply `h-full overflow-y-auto snap-y snap-mandatory`. TopNav stays sticky above it.

**Option B — Override layout for home page only:**
Create a nested layout for `(public)/` that detects snap pages and passes different wrapper props. More complex — avoid.

**Chosen approach for this phase:** Option A. Home page `page.tsx` renders a `div` that fills `<main>` and acts as the snap container. Other public pages (About, Contact) inherit the normal `flex-1` flow without snap.

### Recommended File Structure
```
src/
├── app/(public)/
│   ├── page.tsx                  # 3-section snap scroll home
│   └── about/
│       └── page.tsx              # Alternating section About page
├── components/
│   ├── home/
│   │   ├── HeroSection.tsx       # Snap section 1
│   │   ├── EstimateSection.tsx   # Snap section 2 + VIN form state
│   │   └── ServicesSection.tsx   # Snap section 3
│   ├── about/
│   │   ├── MissionSection.tsx
│   │   ├── VisionSection.tsx
│   │   └── TrustSection.tsx
│   └── ui/                       # existing shadcn components
└── lib/
    └── constants.ts              # already has BUSINESS data (serviceArea, phone)
```

Components must be Client Components (`'use client'`) when they use `useRef`, `useState`, or `motion`.

### Pattern 1: Snap Scroll Container with Sticky Nav

```tsx
// src/app/(public)/page.tsx
'use client'
import { useRef } from 'react'
import { HeroSection } from '@/components/home/HeroSection'
import { EstimateSection } from '@/components/home/EstimateSection'
import { ServicesSection } from '@/components/home/ServicesSection'

export default function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    // h-full fills the <main className="flex-1"> parent
    // overflow-y-auto snap-y snap-mandatory = the snap container
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto snap-y snap-mandatory"
    >
      <HeroSection scrollRef={scrollRef} />
      <EstimateSection scrollRef={scrollRef} />
      <ServicesSection scrollRef={scrollRef} />
    </div>
  )
}
```

**Key insight:** Passing `scrollRef` to child sections enables `viewport={{ root: scrollRef }}` on `motion` elements. Without this, `whileInView` never fires because the window does not scroll — only the inner container does. [VERIFIED: motion.dev official docs]

### Pattern 2: Full-Screen Section with h-dvh

```tsx
// Each snap section
<section className="snap-start snap-always h-dvh relative overflow-hidden flex items-center justify-center">
  {/* Background photo */}
  <Image
    src="https://images.unsplash.com/photo-[ID]?w=1920&q=80"
    alt="Windshield repair"
    fill
    className="object-cover"
    priority  // only on Section 1 (hero)
  />
  {/* Dark gradient overlay 50-60% */}
  <div className="absolute inset-0 bg-black/55" />
  {/* Content above overlay */}
  <div className="relative z-10 ...">...</div>
</section>
```

**Why `h-dvh` not `h-screen`:** `h-screen` = `100vh`, which is calculated once on page load on iOS Safari and does NOT adjust when the browser toolbar appears/disappears. `h-dvh` = `100dvh` (dynamic viewport height) updates in real time. [VERIFIED: Tailwind CSS docs + multiple iOS Safari reports]

**Why `fill` on next/image:** Background photos need to cover the entire section. `fill` + `object-cover` is the Next.js pattern for full-bleed background images. Requires `position: relative` on the parent and `overflow-hidden`. [VERIFIED: Next.js image docs]

### Pattern 3: motion/react whileInView (with viewport root)

```tsx
// Source: motion.dev/docs/react-motion-component
'use client'
import { motion } from 'motion/react'

// In a section component receiving scrollRef prop:
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
  viewport={{ root: scrollRef, once: true, amount: 0.3 }}
>
  {/* content */}
</motion.div>
```

**Props explained:**
- `initial` — starting state before entering viewport
- `whileInView` — animate to these values when element enters viewport
- `viewport.root` — required when scroll container is not the window
- `viewport.once: true` — animate in once, don't re-animate on scroll back
- `viewport.amount: 0.3` — trigger when 30% of element is visible

**Hero entrance (no whileInView — animates on mount):**
```tsx
<motion.h1
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
>
  San Antonio's Trusted Windshield Repair & Replacement
</motion.h1>
```

### Pattern 4: Bouncing Arrow

The `tw-animate-css` package is already installed (in `globals.css` as `@import "tw-animate-css"`). Tailwind v4's built-in `animate-bounce` class is also available.

```tsx
// Use Tailwind's animate-bounce — already available, no extra dependency
<div className="animate-bounce text-white/80 absolute bottom-8 left-1/2 -translate-x-1/2">
  <ChevronDown className="h-8 w-8" />
</div>
```

Alternatively, use motion/react for a more controlled bounce:
```tsx
<motion.div
  animate={{ y: [0, 12, 0] }}
  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
  className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80"
>
  <ChevronDown className="h-8 w-8" />
</motion.div>
```

**Recommendation:** Use Tailwind `animate-bounce` — zero extra JS, already available in the project.

### Pattern 5: VIN Validation

```tsx
// VIN regex: 17 chars, uppercase A-Z excluding I, O, Q + digits 0-9
// Source: NIST/automotive standards, verified via multiple VIN validation references
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/

function validateVin(vin: string): boolean {
  return VIN_REGEX.test(vin.toUpperCase().trim())
}
```

**Character class breakdown:**
- `A-H` — letters A through H
- `J-N` — letters J through N (skips I)
- `P-Z` — letters P through Z (skips O and Q)
- `0-9` — all digits

This is a format check only — no checksum validation. Sufficient for Phase 2 client-side guard before Phase 3 adds the NHTSA API call. [VERIFIED: NHTSA official VIN specification + regex101 VIN library]

### Pattern 6: Unsplash Photos via next/image

**Required next.config.ts change:**
```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
```

**Usage:**
```tsx
<Image
  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80"
  alt="Auto glass repair technician working on windshield"
  fill
  className="object-cover"
  priority
/>
```

Recommended search terms for hero photos: `windshield repair`, `auto glass`, `car window`. Pick dark/dramatic photos that work well with a 50-60% black overlay. [VERIFIED: Next.js image optimization docs]

### Pattern 7: About Page Alternating Sections

```tsx
// Alternating white / light-gray full-width sections
// No snap scroll on About page — standard document flow
<section className="bg-background py-16 lg:py-24">
  <div className="container mx-auto px-4 max-w-4xl">
    <h2 className="font-display text-3xl font-bold text-foreground">Our Mission</h2>
    <p className="mt-4 text-muted-foreground leading-relaxed">...</p>
  </div>
</section>

<section className="bg-muted py-16 lg:py-24">
  {/* bg-muted = light gray (--muted = oklch(0.97 0 0)) */}
  ...
</section>
```

**Why `bg-muted` for alternating gray:** The existing `globals.css` defines `--muted: oklch(0.97 0 0)` which is the off-white/light-gray in the brand palette. Using this token instead of `bg-gray-50` stays within the token system. [VERIFIED: globals.css in codebase]

### Anti-Patterns to Avoid

- **`h-screen` on snap sections:** Use `h-dvh` instead. `h-screen` = `100vh` breaks on iOS Safari when the browser toolbar is visible.
- **`snap-y` on `<html>` or `<body>`:** Breaks Next.js scroll-to-top on navigation. Always use a dedicated container div.
- **`whileInView` without `viewport={{ root: scrollRef }}`:** IntersectionObserver targets the window. Window never scrolls (the inner div does), so animations never fire.
- **`priority` on all sections:** Only use `priority` (which disables lazy loading) on Section 1's background image. Other sections should lazy-load.
- **`framer-motion` import:** The package moved to `motion`. Import from `motion/react`, not `framer-motion`.
- **Absolute positioning without `relative` parent:** `fill` on `next/image` requires `position: relative` + `overflow-hidden` on the parent element.
- **Dark overlay using opacity on the image:** Apply the overlay as a separate `<div className="absolute inset-0 bg-black/55">` — not via `opacity` on the image itself, which would also fade the content.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-page snap scrolling | Custom JS scroll detection | CSS `snap-y snap-mandatory` | Zero JS, browser-native, best perf |
| Bouncing scroll indicator | Custom keyframe component | Tailwind `animate-bounce` | Already in project, zero bytes added |
| Section entrance animations | Manual Intersection Observer | `motion/react` `whileInView` | Handles IntersectionObserver, viewport detection, cleanup |
| Background photo optimization | Manual resizing/CDN | `next/image` with `fill` | Responsive images, WebP conversion, lazy load — built into Next.js |
| VIN character filtering | Custom character exclusion logic | Single regex `^[A-HJ-NPR-Z0-9]{17}$` | One line covers all edge cases |
| Alternating section colors | JavaScript state | CSS `bg-background` / `bg-muted` | Pure CSS token system, no JS needed |

**Key insight:** The project already has `tw-animate-css` and Tailwind v4's animation utilities installed. No animation library is needed for the bouncing arrow — but `motion` IS needed for the `whileInView` section entrance animations.

---

## Common Pitfalls

### Pitfall 1: whileInView Never Fires in Snap Container
**What goes wrong:** All three section animations appear stuck at `initial` state (invisible or offset). The `whileInView` prop is set but nothing triggers.
**Why it happens:** The IntersectionObserver created by motion/react targets the window viewport by default. Since the snap container div is what scrolls (not the window), the window's viewport never changes — so no intersection events fire.
**How to avoid:** Always pass `viewport={{ root: scrollRef }}` where `scrollRef` is a React ref attached to the snap container div. Pass this ref from `page.tsx` down to each section component.
**Warning signs:** Hero animates fine (it animates on mount with `animate`, not `whileInView`), but sections 2 and 3 never animate in.

### Pitfall 2: Content Cut Off on iOS Safari
**What goes wrong:** The third section's footer CTA or the hero's bouncing arrow is clipped at the bottom edge on iPhone.
**Why it happens:** `h-screen` = `100vh` is calculated when the page loads with the Safari toolbar visible. When the user starts scrolling and the toolbar collapses, the viewport gets taller — but sections remain sized at the original `vh` calculation, leaving a gap or clip.
**How to avoid:** Use `h-dvh` on all snap sections. `dvh` = dynamic viewport height, recomputed as browser UI changes.
**Warning signs:** Content looks correct in Chrome DevTools responsive mode but is clipped on real iPhone. Gap at bottom of sections on iOS.

### Pitfall 3: next/image "Unconfigured Hostname" Error
**What goes wrong:** Build or runtime error: "Invalid src prop on next/image, hostname 'images.unsplash.com' is not configured under images in your next.config.js"
**Why it happens:** Next.js image optimization requires explicit allowlisting of remote hostnames for security.
**How to avoid:** Add `images.remotePatterns` to `next.config.ts` BEFORE adding any `next/image` with Unsplash `src`. This must be done in Wave 0 (setup tasks).
**Warning signs:** Works in `<img>` tags but fails with `<Image>` component.

### Pitfall 4: "Get Free Estimate" Button Smooth Scroll to Section 2
**What goes wrong:** The CTA button's scroll-to-section behavior conflicts with snap scroll. A standard `scrollIntoView()` or anchor `href="#estimate"` may snap past section 2 or behave unexpectedly with mandatory snap.
**Why it happens:** Mandatory snap overrides the browser's smooth scroll behavior — scroll positions that land between snap points snap to the nearest snap position.
**How to avoid:** Use `scrollRef.current.scrollTo({ top: window.innerHeight, behavior: 'smooth' })` rather than `scrollIntoView`. With `snap-y snap-mandatory`, the snap container will naturally complete the snap to section 2. Alternatively, use the section's element ref and `scrollIntoView({ behavior: 'smooth', block: 'start' })` which works with snap containers.
**Warning signs:** Button click scrolls to a partial position, then snaps unpredictably.

### Pitfall 5: motion Server Component Conflict
**What goes wrong:** Build error: "You're importing a component that needs 'use client'" when motion components are in Server Components.
**Why it happens:** motion/react components use browser APIs and React hooks — they cannot render on the server.
**How to avoid:** Any component using `motion.div` or similar must have `'use client'` at the top. The section components (`HeroSection`, `EstimateSection`, `ServicesSection`) will all be Client Components. The `page.tsx` itself also needs `'use client'` because it uses `useRef`.
**Warning signs:** Build fails with module-level error about browser APIs.

### Pitfall 6: Layout h-full Not Propagating to Snap Container
**What goes wrong:** The snap container div renders at `height: 0` or the sections don't fill the viewport.
**Why it happens:** `h-full` on a flex child requires the parent chain to have explicit heights. The public layout `<main className="flex-1">` grows within the flex column but its height may not be inherited by `h-full` children without explicit CSS.
**How to avoid:** Set `min-h-0` on `<main>` (prevents flex overflow from blocking height inheritance) and ensure the snap container uses `h-full overflow-y-auto`. Alternatively, use `h-dvh` on the snap container directly instead of `h-full`.
**Warning signs:** Snap sections don't fill the screen — they appear to be their content height only.

---

## Code Examples

Verified patterns from official sources:

### Snap Container (home page.tsx)
```tsx
// Source: motion.dev/docs + Tailwind CSS scroll-snap docs
'use client'
import { useRef } from 'react'

export default function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={scrollRef}
      className="h-dvh overflow-y-auto snap-y snap-mandatory"
    >
      <HeroSection scrollRef={scrollRef} />
      <EstimateSection scrollRef={scrollRef} />
      <ServicesSection scrollRef={scrollRef} />
    </div>
  )
}
```

### Full-Screen Snap Section Shell
```tsx
// Source: Tailwind CSS docs (scroll-snap-align, h-dvh)
<section className="snap-start snap-always h-dvh relative overflow-hidden">
  {/* Background */}
  <Image src="..." alt="..." fill className="object-cover" priority />
  {/* Overlay */}
  <div className="absolute inset-0 bg-black/55" />
  {/* Content */}
  <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
    {/* ... */}
  </div>
</section>
```

### motion whileInView with scroll container root
```tsx
// Source: motion.dev/docs/react-motion-component
import { motion } from 'motion/react'
import type { RefObject } from 'react'

interface SectionProps {
  scrollRef: RefObject<HTMLDivElement>
}

export function EstimateSection({ scrollRef }: SectionProps) {
  return (
    <section className="snap-start snap-always h-dvh relative overflow-hidden">
      {/* ... background ... */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        viewport={{ root: scrollRef, once: true, amount: 0.3 }}
        className="relative z-10 w-full max-w-md mx-auto"
      >
        {/* VIN card content */}
      </motion.div>
    </section>
  )
}
```

### VIN Validation
```tsx
// Source: NHTSA VIN specification + regex101 VIN library
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/

const [vin, setVin] = useState('')
const [vinError, setVinError] = useState('')
const [result, setResult] = useState<'idle' | 'loading' | 'shown'>('idle')

function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const normalized = vin.trim().toUpperCase()
  if (!VIN_REGEX.test(normalized)) {
    setVinError('Please enter a valid 17-character VIN (no I, O, or Q)')
    return
  }
  setVinError('')
  setResult('shown')
}
```

### next.config.ts for Unsplash
```ts
// Source: Next.js image optimization docs
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
```

### Fake Result Card (Phase 2 placeholder)
```tsx
// Phase 2 only — replaced by real API data in Phase 3
{result === 'shown' && (
  <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
    <p className="font-semibold text-foreground">2024 Toyota Camry</p>
    <p className="text-muted-foreground">Estimated replacement: $250 – $400</p>
    <p className="mt-2 text-xs text-muted-foreground italic">
      Estimates launching soon — call {BUSINESS.phone} for an immediate quote.
    </p>
    <Button className="mt-3 w-full" asChild>
      <Link href="/contact">Book Appointment</Link>
    </Button>
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` import | `motion/react` import, `npm install motion` | 2024 (rebranding) | Must use new package name; framer-motion still works but is legacy |
| `h-screen` (100vh) | `h-dvh` (100dvh) for mobile snap sections | Tailwind v3.4+ (2023) | Fixes iOS Safari toolbar height bug — critical for this project |
| scroll-snap on `<html>` | scroll-snap on dedicated container div | N/A — always best practice | Prevents Next.js navigation scroll-reset issues |
| Radix UI primitives | Base UI primitives via `@base-ui/react` | This project's Phase 1 | Existing Button/Card use `@base-ui/react` — not Radix |

**Important discovery:** The installed shadcn components use `@base-ui/react` (v1.3.0) rather than traditional Radix UI. This is visible in `button.tsx` (`import { Button as ButtonPrimitive } from "@base-ui/react/button"`). This is the newer shadcn/ui generation. No impact on Phase 2 — just use the existing `Button` and `Card` components as-is.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `h-full` on snap container div inside `<main className="flex-1">` will inherit height correctly | Architecture Patterns | Sections won't fill viewport — use `h-dvh` as fallback |
| A2 | Unsplash photo URLs (images.unsplash.com) remain stable for production use | Code Examples | Photos could 404; mitigation: download to `/public` before launch |
| A3 | `tw-animate-css` package's `animate-bounce` class behaves identically to Tailwind v4 built-in | Common Pitfalls | Bouncing arrow may need custom keyframe instead |

---

## Open Questions (RESOLVED)

1. **Snap container height: `h-full` vs `h-dvh`**
   - What we know: `<main className="flex-1">` grows in the flex column. `h-full` on a child should work when parent has defined height.
   - What's unclear: Whether Next.js App Router's flex chain reliably passes height to `h-full` children without extra `min-h-0` fixes on intermediate elements.
   - Recommendation: Default to `h-dvh` on the snap container (`h-dvh overflow-y-auto snap-y snap-mandatory`) — it is explicit, always correct, and doesn't depend on parent height propagation. This means the snap container will be exactly one viewport tall and scroll internally, which is the correct behavior.

2. **Footer visibility on home page**
   - What we know: The snap scroll home page uses a dedicated scroll container inside `<main>`. The Footer from `layout.tsx` renders outside the snap container.
   - What's unclear: Does the Footer appear below all snap sections (requiring an extra scroll past section 3 in normal flow)?
   - Recommendation: The snap container at `h-dvh` occupies exactly the viewport. The Footer will render below it in the flex column but won't be reachable via snap — this is acceptable since section 3 has a "Contact Us" CTA. The Footer is technically there for HTML semantics and non-snap contexts. If this is undesirable, the Footer can be hidden on the home page via CSS (`[data-page="home"] .footer { display: none }`), but this is out of scope for Phase 2.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build | Assumed | — | — |
| motion (npm) | Section animations | NOT installed | — | `npm install motion` in Wave 0 |
| images.unsplash.com | Hero/estimate backgrounds | External | — | Pexels URLs or downloaded PNGs |
| next.config.ts `remotePatterns` | `next/image` with Unsplash | NOT configured | — | Add in Wave 0 |
| lucide-react | Service card icons, arrow | Installed | 1.8.0 | — |
| zod | VIN validation schema | Installed | 3.25.76 (v3) | Use plain regex (no zod dependency) |

[VERIFIED: package.json + node_modules inspection]

**Missing dependencies with no fallback:**
- `motion` package — required for `whileInView` animations (D-04, D-08). Must be installed in Wave 0.

**Missing configuration with no fallback:**
- `images.remotePatterns` for `images.unsplash.com` in `next.config.ts` — required for `next/image` with Unsplash src. Must be added in Wave 0.

---

## Sources

### Primary (HIGH confidence)
- motion.dev/docs/react-installation — confirmed `npm install motion`, import from `motion/react`
- motion.dev/docs/react-motion-component — confirmed `whileInView`, `viewport={{ root }}` API
- motion.dev/docs/react-scroll-animations — confirmed `viewport.root` for custom scroll containers
- tailwindcss.com/docs/height — confirmed `h-dvh` = `100dvh`, `h-screen` = `100vh`
- tailwindcss.com/docs/scroll-snap-type — confirmed `snap-y snap-mandatory`, `snap-start snap-always` class names
- Codebase `package.json` — confirmed motion NOT installed, zod at v3.25.76
- Codebase `src/app/(public)/layout.tsx` — confirmed flex-col structure, `<main className="flex-1">`
- Codebase `globals.css` — confirmed `--primary`, `--muted`, `--background` tokens
- Codebase `node_modules/@base-ui/react` — confirmed Base UI v1.3.0 (not Radix)
