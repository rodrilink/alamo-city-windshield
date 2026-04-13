---
phase: 01-foundation
plan: "01"
subsystem: scaffold
tags: [nextjs, tailwind, shadcn, fonts, brand-theme]
dependency_graph:
  requires: []
  provides: [nextjs-project, tailwind-v4-theme, shadcn-ui, inter-font, space-grotesk-font]
  affects: [all-subsequent-plans]
tech_stack:
  added: [next@15.5.15, react@19.1.0, typescript@5.x, tailwindcss@4.x, shadcn@4.2.0, tw-animate-css]
  patterns: [css-first-tailwind, next-font-google, shadcn-new-york-style]
key_files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - postcss.config.mjs
    - eslint.config.mjs
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/lib/utils.ts
    - src/components/ui/button.tsx
    - src/components/ui/card.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/sheet.tsx
    - components.json
  modified: []
decisions:
  - "Used Tailwind v4 CSS-first config (@theme inline in globals.css) — no tailwind.config.js"
  - "Inter as body font (--font-inter), Space Grotesk as display font (--font-space-grotesk) via next/font"
  - "Font variables applied on <html> element (not <body>) per Next.js best practice"
  - "Brand red #B91C1C encoded as OKLCH: oklch(0.505 0.213 27.518)"
  - "shadcn new-york style with Tailwind v4 compatibility"
  - "Kept shadcn's tw-animate-css and shadcn/tailwind.css imports while restoring brand color tokens"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-13"
  tasks_completed: 2
  files_created: 14
requirements_satisfied: [FDN-01, FDN-02, FDN-03]
---

# Phase 1 Plan 1: Next.js 15 Scaffold with Tailwind v4 Brand Theme Summary

**One-liner:** Next.js 15.5.15 + React 19 scaffolded with Tailwind v4 CSS-first brand theme (crimson #B91C1C as OKLCH primary), Inter/Space Grotesk fonts via next/font, and shadcn/ui new-york style with Button, Card, Separator, Sheet components.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Scaffold Next.js 15 with Tailwind v4 brand theme and fonts | e1ab37f | package.json, globals.css, layout.tsx, page.tsx |
| 2 | Initialize shadcn/ui and install Phase 1 components | 9dd0941 | button.tsx, card.tsx, separator.tsx, sheet.tsx, utils.ts, components.json |

## What Was Built

A complete Next.js 15 project skeleton with:

- **Next.js 15.5.15 + React 19** — scaffolded with TypeScript, App Router, src/ directory, @/ import alias
- **Tailwind v4 CSS-first theme** — brand colors in OKLCH, @theme inline block, no tailwind.config.js
- **Brand color palette** — `--primary: oklch(0.505 0.213 27.518)` (= #B91C1C, crimson deep), white background, dark foreground
- **Typography** — Inter (body/sans) and Space Grotesk (display) loaded via next/font/google with CSS variable injection on `<html>`
- **shadcn/ui** — initialized with new-york style, Tailwind v4 compatible (shadcn@4.2.0)
- **Components** — Button, Card, Separator, Sheet in `src/components/ui/`
- **Utils** — `cn()` helper in `src/lib/utils.ts` (clsx + tailwind-merge)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Brand restoration] Restored brand theme after shadcn init overwrote globals.css**
- **Found during:** Task 2
- **Issue:** `npx shadcn@latest init -d` overwrote `globals.css` with its default neutral color palette (`--primary: oklch(0.205 0 0)`) and added Geist font to `layout.tsx`
- **Fix:** Restored `--primary: oklch(0.505 0.213 27.518)` and all brand OKLCH tokens. Kept shadcn's new imports (`tw-animate-css`, `shadcn/tailwind.css`) which are required for components. Removed Geist font from layout.tsx, restoring Inter + Space Grotesk only.
- **Files modified:** `src/app/globals.css`, `src/app/layout.tsx`
- **Commit:** 9dd0941

**2. [Rule 3 - Scaffold approach] Scaffolded in temp dir due to non-empty worktree**
- **Found during:** Task 1
- **Issue:** `create-next-app` refused to scaffold in the worktree because `.claude/`, `.planning/`, and `CLAUDE.md` already existed
- **Fix:** Scaffolded to `/tmp/nextjs-scaffold` then copied all project files to the worktree, then ran `npm install`
- **Impact:** None — identical outcome to direct scaffold

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` exit code 0 | PASS |
| `npx tsc --noEmit` zero errors | PASS |
| `--primary: oklch(0.505 0.213 27.518)` in globals.css | PASS |
| `@theme inline` block present | PASS |
| `--font-inter` and `--font-space-grotesk` in layout.tsx | PASS |
| Font variables on `<html>` element | PASS |
| No `tailwind.config.js` or `tailwind.config.ts` | PASS |
| `components.json` at project root | PASS |
| All 4 UI components (button, card, separator, sheet) | PASS |
| `cn()` export in `src/lib/utils.ts` | PASS |
| Next.js version is 15.x (not 16.x) | PASS (15.5.15) |

## Known Stubs

- `src/app/page.tsx` — Placeholder page with "Foundation scaffold — Phase 1" text. Intentional: this is a scaffold verification page that will be replaced by the actual home page in Phase 2.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced. Brand colors in CSS are public data (T-01-01 accepted, T-01-02 mitigated by verifying Next.js 15.x version post-scaffold).

## Self-Check: PASSED

All committed files verified to exist on disk. Both commit hashes confirmed in git log.
