---
plan: 02-01
phase: 02-public-pages
status: complete
commits:
  - 0c559c9
  - e78bced
key_files:
  created:
    - src/components/home/HeroSection.tsx
  modified:
    - next.config.ts
    - package.json
    - src/app/(public)/page.tsx
---

# Plan 02-01: Snap Scroll Shell + HeroSection — Summary

## What Was Built

Installed `motion` package, configured `next.config.ts` for Unsplash images, built the 3-section full-page snap scroll container, and implemented the HeroSection with background photo, dark gradient overlay, headline, CTA, entrance animations, and bouncing scroll arrow.

## Tasks

### Task 1 (0c559c9): Install motion + Unsplash config + snap scroll shell

- Installed `motion@12.38.0` via npm
- Added `images.unsplash.com` to `next.config.ts` `remotePatterns`
- Built 3-section snap scroll container in `src/app/(public)/page.tsx`:
  - Container: `snap-y snap-mandatory overflow-y-auto`
  - Each section: `h-dvh snap-start snap-always` (h-dvh not h-screen per iOS Safari research)
  - Sections 2 and 3 are placeholders for Wave 2 plans

### Task 2 (e78bced): HeroSection component

- `src/components/home/HeroSection.tsx` with:
  - Unsplash background photo via `next/image` (fill, priority)
  - Dark gradient overlay `bg-black/55` (50-60% opacity per D-03)
  - Headline: "San Antonio's Trusted Windshield Repair & Replacement" (D-01)
  - "Get Free Estimate" CTA button in brand red (D-02)
  - Animated bouncing ChevronDown arrow at bottom (D-05)
  - motion/react `animate` with staggered fade-in delays for headline, subtext, CTA

## Key Decisions Honored

- D-01: Service-focused headline
- D-02: "Get Free Estimate" CTA scrolls to estimate section
- D-03: 50-60% dark gradient overlay (bg-black/55)
- D-04: Subtle fade-in + slide-up entrance animations
- D-05: Animated bouncing down-arrow
- D-06: 3-section snap scroll
- D-07: h-dvh sections (not h-screen per research)

## Verification

- `npm run build` passes cleanly
- 8 static pages generated
- motion/react animations render on page load

## Notes

- Used `animate` (mount-based) instead of `whileInView` for the hero since it's the first visible section
- Sections 2 and 3 are placeholder divs — Wave 2 plans 02-02 and 02-03 will replace them
