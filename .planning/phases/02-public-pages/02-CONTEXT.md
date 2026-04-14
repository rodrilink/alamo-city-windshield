# Phase 2: Public Pages - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the home page with 3-section full-page snap scroll (hero → VIN estimate form → services + testimonials) and the About page with mission/vision/trust content. Both pages use the existing `(public)/layout.tsx` with TopNav + Footer from Phase 1.

Covers requirements: HOME-01..06 (home page snap scroll, hero, VIN form UI, estimate placeholder, booking CTA) + ABOUT-01..04 (mission, vision, company info, trust signals).

**NOT in scope:** VIN decode API integration (Phase 3), appointment booking logic (Phase 4), contact form backend (Phase 4). The VIN form exists as UI with a placeholder fake result card.

</domain>

<decisions>
## Implementation Decisions

### Hero Section (Snap Section 1)
- **D-01:** Headline is **"San Antonio's Trusted Windshield Repair & Replacement"** — direct, tells visitors what the business does immediately.
- **D-02:** Single CTA button: **"Get Free Estimate"** — scrolls smoothly to the VIN form section (second snap). Brand red background, white text.
- **D-03:** Background is a stock auto/windshield photo with **dark gradient overlay at 50-60% opacity**. Text in white for contrast.
- **D-04:** Entrance animations via **motion/react** — subtle **fade-in + slight slide-up** as the hero loads. Import from `motion/react` (not `framer-motion`).
- **D-05:** **Animated bouncing down-arrow** at the bottom of the hero to signal "scroll down for your estimate."

### Snap Scroll Flow
- **D-06:** Home page has **3 full-page snap sections** using CSS `snap-y snap-mandatory` on the container with `snap-start snap-always` on each section:
  1. **Hero** — full viewport background photo + headline + CTA + scroll indicator
  2. **VIN Estimate** — different background photo + dark gradient + centered form card
  3. **Services + Testimonials** — services row on top, testimonial quotes below, final CTA at bottom
- **D-07:** Each section is exactly `h-screen` (full viewport height). The page container has `overflow-y-auto snap-y snap-mandatory`.
- **D-08:** Sections use **motion/react `whileInView`** for subtle entrance animations (fade-in + slide-up) as they snap into view.

### VIN Estimate Section (Snap Section 2)
- **D-09:** Background is a **different auto-related stock photo** with the same dark gradient overlay style as the hero — creates visual contrast between sections while maintaining consistency.
- **D-10:** Form layout is a **centered white card** over the dark background. Card contains:
  - Section heading ("Get Your Free Estimate")
  - VIN input field with 17-character validation + helper text ("Enter your 17-character VIN")
  - "Get Estimate" submit button (brand red)
- **D-11:** **Placeholder behavior (Phase 2 only):** When user submits a valid VIN, show a **fake result card** displaying a sample result (e.g., "2024 Toyota Camry — Estimated: $250–$400") with a note "Estimates launching soon — call (210) 555-0100 for an immediate quote." This previews the UI that Phase 3 will wire to real data.
- **D-12:** After the fake result displays, show a **"Book Appointment" CTA button** (navigates to `/contact` for now; Phase 4 wires to the real booking calendar).
- **D-13:** VIN validation is client-side only in Phase 2: reject inputs that aren't exactly 17 alphanumeric characters. No API call yet.

### Services + Testimonials Section (Snap Section 3)
- **D-14:** Top portion: **3-4 service cards** in a responsive grid — Windshield Repair, Full Replacement, ADAS Calibration (if offered), Mobile Service. Each card has a lucide-react icon + title + brief 1-2 sentence description.
- **D-15:** Bottom portion: **2-3 testimonial quotes** (placeholder text for v1). Simple quote marks + name + brief review text. No rating stars needed.
- **D-16:** Final CTA at the bottom: **"Contact Us"** button linking to `/contact`.

### About Page
- **D-17:** Layout is **alternating full-width sections** with white and light-gray backgrounds:
  1. **Mission section** (white bg) — company mission statement, professional tone
  2. **Vision section** (light-gray bg) — where the company is headed, values
  3. **Trust signals section** (white bg) — warranty badge, service area, insurance mention
- **D-18:** Trust signals include:
  - **Lifetime warranty on installation** — badge/icon + statement. Industry standard.
  - **Service area: "Serving all of San Antonio"** — list of covered neighborhoods/areas.
  - **Insurance mention: "We work with all major insurance providers"** — not filing claims, just acknowledgment.
- **D-19:** About page content is **placeholder text** for v1. Owner replaces with real copy before launch. Structure and layout are the deliverables.
- **D-20:** No ADAS calibration callout on the About page (user chose not to include it in trust signals).

### Claude's Discretion
- Exact stock photo selection from Unsplash/Pexels (auto glass, windshield, San Antonio imagery)
- Animation timing/easing for motion/react `whileInView` and hero entrance
- Exact spacing, padding, and section proportions within snap sections
- Testimonial placeholder names and quote text
- Service card icon choices (lucide-react has multiple options for each service type)
- About page placeholder paragraph text for mission/vision
- Whether to use shadcn Card for service cards or custom styled divs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` §v1 Requirements — HOME-01..06 and ABOUT-01..04 specs
- `.planning/ROADMAP.md` §Phase 2 — Success criteria (4 items)

### Phase 1 decisions (carry forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Brand decisions D-01..D-05 (red #B91C1C, Inter + Space Grotesk, icon+wordmark logo, photo+gradient hero, white/red/black only)

### Research (stack + architecture)
- `.planning/research/STACK.md` — motion/react usage (import from `motion/react` not `framer-motion`), CSS scroll-snap utilities (Tailwind v4 `snap-y snap-mandatory`), react-day-picker v9 for future calendar
- `.planning/research/FEATURES.md` — Table stakes: clear CTA above fold, service descriptions, trust signals (warranty, insurance-friendly). VIN estimate is differentiator.
- `.planning/research/ARCHITECTURE.md` — Route structure `(public)/page.tsx` for home, `(public)/about/page.tsx` for about

### External references
- Tailwind scroll-snap: `snap-y`, `snap-mandatory`, `snap-start`, `snap-always` utilities
- motion/react docs: `whileInView`, `initial`, `animate` patterns for entrance animations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/layout/TopNav.tsx` — sticky nav with 4 links + phone CTA + mobile menu
- `src/components/layout/Footer.tsx` — three-column footer with hours/location/phone
- `src/components/brand/Logo.tsx` — ShieldCheck icon + wordmark
- `src/components/ui/button.tsx` — shadcn Button (brand red primary variant)
- `src/components/ui/card.tsx` — shadcn Card (for VIN form and service cards)
- `src/lib/constants.ts` — BUSINESS data (phone, hours, location, serviceArea, NAV_LINKS)

### Established Patterns
- Brand red via `text-primary` / `bg-primary` CSS classes (mapped from `--primary` token)
- Responsive breakpoints: `md:` for tablet, `lg:` for desktop (from TopNav pattern)
- `next/font/google` variables: `--font-inter` (body), `--font-space-grotesk` (display) on `<html>`

### Integration Points
- `src/app/(public)/page.tsx` — currently placeholder, will become the 3-section snap scroll home page
- `src/app/(public)/about/page.tsx` — currently placeholder, will become the full About page
- `src/app/(public)/layout.tsx` — wraps both pages with TopNav + Footer

</code_context>

<specifics>
## Specific Ideas

- The 3-section snap scroll (hero → estimate → services+testimonials) follows the "answer 3 questions in 10 seconds" pattern from the features research: "Can you help me today?" (hero), "How much does it cost?" (estimate), "Can I trust you?" (services + testimonials).
- Fake result card in Phase 2 gives visitors a preview of the estimate experience before Phase 3 wires real data — sets expectations and keeps the UX coherent during incremental delivery.
- "Book Appointment" CTA after the estimate routes to `/contact` temporarily — Phase 4 will redirect it to the visual calendar instead.
- Alternating white/gray sections on the About page avoid visual monotony without introducing new colors outside the palette.

</specifics>

<deferred>
## Deferred Ideas

- **ADAS calibration callout** — User chose not to include on About page trust signals. Could be reconsidered in a future content update if the business offers ADAS calibration.
- **Real customer testimonials** — v1 uses placeholder quotes. Owner provides real testimonials before launch.
- **Real company mission/vision copy** — v1 uses placeholder professional text. Owner replaces with authentic messaging.
- **Google Maps embed for service area** — A visual map was discussed but not selected; the list-based service area approach was chosen.

</deferred>

---

*Phase: 02-public-pages*
*Context gathered: 2026-04-13*
