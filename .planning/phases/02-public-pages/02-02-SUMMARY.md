---
phase: 02-public-pages
plan: "02"
subsystem: home-page
tags: [vin-form, estimate-section, snap-scroll, motion, client-validation]
dependency_graph:
  requires: [02-01]
  provides: [EstimateSection, VIN-form-UI]
  affects: [src/app/(public)/page.tsx]
tech_stack:
  added: []
  patterns: [whileInView-with-viewport-root, controlled-input-validation, fake-result-card]
key_files:
  created:
    - src/components/home/EstimateSection.tsx
  modified:
    - src/app/(public)/page.tsx
decisions:
  - "VIN validation uses plain useState + VIN_REGEX rather than react-hook-form (overkill for single field)"
  - "Book Appointment wraps Button in Link tag — Button uses @base-ui/react which has no asChild prop"
  - "Fake result card hardcoded to 2024 Toyota Camry/$250-$400 as Phase 2 placeholder (D-11)"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-14T07:07:08Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
requirements:
  - HOME-03
  - HOME-04
  - HOME-05
  - HOME-06
---

# Phase 02 Plan 02: VIN Estimate Section Summary

**One-liner:** Snap section 2 with client-side VIN validation (NHTSA regex, excludes I/O/Q), fake result card (2024 Toyota Camry, $250–$400), and Book Appointment CTA linking to /contact, wired into the snap scroll container.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create EstimateSection component | `94ad9d8` | src/components/home/EstimateSection.tsx |
| 2 | Wire EstimateSection into page.tsx | `901517b` | src/app/(public)/page.tsx |

## What Was Built

### EstimateSection.tsx
- Full-height snap section (`h-dvh snap-start snap-always`) with different Unsplash background from hero (`photo-1489824904134-891ab64532f1` — vehicle windshield close-up)
- Dark overlay (`bg-black/55`) matching hero style
- `motion.div` with `whileInView` + `viewport={{ root: scrollRef, once: true, amount: 0.3 }}` — fires correctly in snap scroll container (critical: without `viewport.root`, animation never triggers)
- Centered white `Card` containing:
  - "Get Your Free Estimate" heading
  - VIN input with `maxLength={17}`, forced uppercase on change, `autoComplete="off"`, `spellCheck={false}`
  - Helper text ("Find your VIN on the driver-side dashboard or door jamb")
  - Inline error with `role="alert"` on invalid submit
  - "Get Estimate" brand-red submit button
- Fake result card on valid VIN: "2024 Toyota Camry", "Estimated replacement: $250 – $400", business phone from `BUSINESS.phone`
- "Book Appointment" button (`<Link href="/contact"><Button>`) appears after result

### page.tsx
- Added `import { EstimateSection } from '@/components/home/EstimateSection'`
- Replaced Section 2 placeholder with `<EstimateSection scrollRef={scrollRef} />`
- Section 3 placeholder preserved for Plan 03

## VIN Validation Logic

```
VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/
```

- `A-H`: letters A–H
- `J-N`: letters J–N (skips I)
- `P-Z`: letters P–Z (skips O and Q)
- `0-9`: all digits
- Format check only — no checksum. Phase 3 adds NHTSA API call with server-side validation.

## Decisions Made

1. **Plain useState over react-hook-form:** Single field form doesn't warrant the 25kB dependency. Direct state management is simpler and sufficient.
2. **Link wrapping Button (not asChild):** The `@base-ui/react` Button primitive has no `asChild` prop. Using `<Link href="..."><Button>` achieves the same result cleanly.
3. **Fake result stays hardcoded:** D-11 explicitly calls for a Phase 2 placeholder. Phase 3 wires this to real NHTSA API data.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| Fake result: "2024 Toyota Camry" | EstimateSection.tsx | ~103 | Intentional Phase 2 placeholder per D-11; Phase 3 replaces with NHTSA API response |
| Book Appointment → /contact | EstimateSection.tsx | ~112 | Intentional per D-12; Phase 4 rewires to booking calendar |

## Threat Flags

None. VIN input is client-side only; no data is persisted or sent to any API in Phase 2 (T-02-03 accepted, T-02-04 accepted per plan threat model).

## Self-Check: PASSED

- `src/components/home/EstimateSection.tsx` — FOUND
- `src/app/(public)/page.tsx` — FOUND (contains EstimateSection)
- Commit `94ad9d8` — FOUND (feat(02-02): EstimateSection...)
- Commit `901517b` — FOUND (feat(02-02): wire EstimateSection...)
- `npm run build` — PASSED (8/8 static pages, no errors)
