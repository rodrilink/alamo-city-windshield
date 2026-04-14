---
phase: 02-public-pages
plan: "03"
subsystem: home-page
tags: [snap-scroll, service-cards, testimonials, cta, motion, lucide-react]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [services-section, testimonials-section, contact-cta]
  affects: [src/app/(public)/page.tsx]
tech_stack:
  added: []
  patterns: [whileInView-viewport-root, responsive-grid, shadcn-card]
key_files:
  created:
    - src/components/home/ServicesSection.tsx
  modified:
    - src/app/(public)/page.tsx
decisions:
  - D-14 implemented: 4 service cards in responsive grid (1col/2col/4col)
  - D-15 implemented: 3 placeholder testimonial quotes, no stars
  - D-16 implemented: Contact Us CTA linking to /contact
  - Button used directly inside Link (no asChild needed — not Radix)
metrics:
  duration: "~15 minutes"
  completed: "2026-04-14T07:11:27Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 2 Plan 03: Services + Testimonials Section Summary

**One-liner:** ServicesSection snap section with 4 service cards (lucide icons), 3 testimonial quotes, and Contact Us CTA wired into the snap scroll home page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ServicesSection component | 61133e2 | src/components/home/ServicesSection.tsx |
| 2 | Wire ServicesSection into page.tsx | 1c8a9d9 | src/app/(public)/page.tsx |

## What Was Built

### ServicesSection.tsx

The third snap section (`snap-start snap-always h-dvh`) with `overflow-y-auto` to handle small viewports. Uses `bg-background` (white) per D-06 — no background photo on section 3.

**Service cards grid (D-14):** 4 cards using shadcn `Card` + `CardContent`. Responsive layout: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Each card has a lucide-react icon (`Wrench`, `Replace`, `ScanLine`, `Car`), title, and 1-2 sentence description.

**Testimonials (D-15):** 3 placeholder quotes in a responsive `grid-cols-1 md:grid-cols-3` grid. Curly-quote HTML entities (`&ldquo;`/`&rdquo;`), em-dash attribution. No rating stars.

**Contact CTA (D-16):** `<Link href="/contact"><Button size="lg">Contact Us</Button></Link>`. Button wraps directly in Link — no `asChild` needed since the base-ui Button renders as a `<button>` element and Next.js Link accepts child buttons for click delegation.

**Animations (D-08):** Three `motion.div` blocks each with `whileInView`, `initial={{ opacity: 0, y: 30 }}`, and critically `viewport={{ root: scrollRef, once: true, amount: 0.2 }}`. The `root: scrollRef` prop is required for whileInView to fire inside the snap container (window never scrolls — only the inner div does).

### page.tsx

Added import for `ServicesSection`, replaced the section 3 placeholder `<section>` with `<ServicesSection scrollRef={scrollRef} />`. Final state has all 3 snap sections: HeroSection, EstimateSection, ServicesSection.

## Deviations from Plan

None - plan executed exactly as written.

All icons confirmed available in lucide-react@1.8.0 before implementation. All plan code used verbatim.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Testimonial quotes | ServicesSection.tsx | Placeholder names/text — owner replaces with real customer testimonials before launch (T-02-05: accepted risk) |

## Verification

- `src/components/home/ServicesSection.tsx` exists with `'use client'` directive
- All 4 service card titles present (Windshield Repair, Full Replacement, ADAS Calibration, Mobile Service)
- TESTIMONIALS array with 3 entries
- Contact Us button links to `/contact`
- whileInView with `viewport={{ root: scrollRef }}` on all motion elements
- `h-dvh` class (not h-screen) on section
- `npm run build` passes (8/8 static pages, no errors)

## Self-Check: PASSED

- `src/components/home/ServicesSection.tsx` — FOUND
- `src/app/(public)/page.tsx` — modified, FOUND
- Commit 61133e2 — FOUND (ServicesSection component)
- Commit 1c8a9d9 — FOUND (page.tsx wiring)
- Build output: all 8 routes static, 0 errors
