---
phase: 03-vin-estimate
plan: 10
subsystem: ui
tags: [tailwind, css, layout, motion, framer-motion, responsive, scroll-snap]

# Dependency graph
requires:
  - phase: 03-vin-estimate
    provides: 03-07's EstimateSection wiring (form/loading/result/not-found/manual view states) that this plan's card exceeds viewport height on short screens
provides:
  - Conditional inner scroll wrapper (`max-h-dvh overflow-y-auto overscroll-contain`) around the estimate card so it stays fully reachable on short viewports without disturbing the section's absolute backdrop layers
affects: [03-UAT gap 2 / test 14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional scroll wrapper (max-h-dvh, not h-full) placed as a sibling of absolute inset-0 backdrop layers but a parent of the animated card, so a section that must stay a fixed-size relative/overflow-hidden padding box for its backdrop can still let taller-than-viewport content scroll without the backdrop scrolling away with it."

key-files:
  created: []
  modified:
    - src/components/home/EstimateSection.tsx

key-decisions:
  - "Chose option (d) from the plan's four candidates: keep the <section> `relative overflow-hidden h-dvh` unchanged, and put the scroll behavior on a new inner wrapper around the card instead. Rejected (a) overflow-y-auto on the section + resized backdrop (highest blast radius, requires restructuring the layer stack and re-deriving z-index with no clean CSS length for 'scroll content height'); (b) sticky backdrop wrapper (forces the card out of the section's own centering flexbox, changing desktop layout mechanics to fix a mobile-only defect); (c) items-start + padding (stops top clipping but changes desktop appearance and leaves the bottom — disclaimer, reset button — still clipped with no scroller)."
  - "Wrapper uses max-h-dvh, not h-full, so the scroller is conditional: only engages once the card's natural content height exceeds the viewport. Desktop and >=~824px-tall viewports never reach the cap, so the wrapper produces no scrollbar and captures no wheel/touch events there — pixel-identical to before."
  - "New wrapper placed OUTSIDE the motion.div (between the bg-black/55 overlay and the motion.div), not on the motion.div itself, so the scrollRef IntersectionObserver root remains the outer snap container."
  - "SUPERSEDED AFTER CHECKPOINT — `amount: 0.3` was NOT safe to leave untouched and was changed to `amount: 'some'` in commit 0c697f5. The executor flagged (correctly) that it could not verify whether whileInView still fires with a new scroll parent inserted between the IO root and the observed element. Reasoning it through: `amount: 0.3` requires 30% of the motion.div to intersect the root, but this plan's whole purpose is to allow a card TALLER than the viewport — at which point 30% may never be simultaneously visible. Combined with `once: true`, a single miss is permanent and strands the card at opacity 0, i.e. invisible: strictly worse than the clipping bug this plan set out to fix. `amount: 'some'` fires on any intersection and is satisfiable at any card height, with no visual change where 0.3 already fired."
  - "ADDED AFTER CHECKPOINT — the card's top padding went from `py-6` to `pt-20 pb-6` in commit b31e578, after the user reported at 375x667 that the overlay nav was covering the 'Get Your Free Estimate' heading. TopNav is `absolute top-0` on the home route (quick task 260805-i19) so it reserves NO vertical space, and its inner bar is `h-16` (64px); with only 24px of top padding the card's first line scrolled up underneath it. `pt-20` (80px) clears the nav with a 16px gap. EstimateSection renders only on `/`, so /about and /contact (nav in normal flow) are unaffected."
  - "The <section> className (`snap-start snap-always h-dvh relative overflow-hidden flex items-center justify-center`) was deliberately left unchanged. This is load-bearing, not an oversight: relative + h-dvh + overflow-hidden is what keeps the two absolute inset-0 backdrop layers (`<Image fill>` and `<div className=\"absolute inset-0 bg-black/55\" />`) resolving against an exactly-viewport-sized padding box. If a future reader 'aligns' this section with ServicesSection's own `h-dvh overflow-y-auto` on the section itself, the backdrop layers would scroll away with the content and expose bare body background beneath the card — reintroducing the exact seam this plan avoided by choosing option (d) over (a)."
  - "A render regression test asserting the card never clips at short viewport heights is DEFERRED, same as 03-09's outstanding Task 2 — it needs @testing-library/react + jsdom + @vitejs/plugin-react, which the user has explicitly deferred (no new npm dependencies allowed this plan). Cross-reference 03-09-PLAN.md / 03-09-SUMMARY.md for the pending dependency decision."

requirements-completed: [VIN-05]

human_verification: approved 2026-08-05 by user at 375x667 and desktop. Confirmed: heading visible above the card, card scrolls internally to the reset button, backdrop covers with no seam, card fades in, footer renders as the final snap stop, snapping works across all four sections, desktop unchanged.

# Metrics
duration: 25min + 2 post-checkpoint fixes
completed: 2026-08-05
---

# Phase 03 Plan 10: Estimate Card Short-Viewport Clipping Fix Summary

**Added a `max-h-dvh overflow-y-auto overscroll-contain` inner wrapper around the estimate card so it scrolls instead of clipping at both ends on viewports under ~700px tall, while leaving the section-level `relative overflow-hidden` backdrop layer untouched.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-05T19:50:00Z
- **Completed:** 2026-08-05T20:16:37Z
- **Tasks:** 1 of 2 (Task 2 is a human-verify checkpoint, not executable by the agent)
- **Files modified:** 1

## Accomplishments
- Diagnosed-and-planned fix (option d of four candidates) implemented exactly as specified: new inner scroll wrapper inserted between the `bg-black/55` overlay and the `motion.div`, with the section's own `relative overflow-hidden h-dvh` and both absolute backdrop layers left byte-identical to before.
- All four automated gates pass: `npx tsc --noEmit` exit 0, `npm run lint` exit 0, `npm test` 33/33, `npm run build` exit 0.
- Non-visual verification confirmed via served HTML on a fresh dev server (port 3010, since port 3000 was serving stale code from the main checkout): the new wrapper class, the unchanged section class, and both backdrop layers are all present in the rendered markup.
- Task 2 (browser verification at 375x667 and 375x824) is a `checkpoint:human-verify` gate this agent cannot complete — see "Checkpoint Status" below.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add an inner scroll wrapper around the estimate card, leaving the backdrop layers untouched** - `781704a` (fix)

Task 2 is a `checkpoint:human-verify` — no commit; awaiting human browser verification (see below).

## Files Created/Modified
- `src/components/home/EstimateSection.tsx` - Inserted `<div className="relative z-10 w-full max-h-dvh overflow-y-auto overscroll-contain">` between the `bg-black/55` overlay and the `motion.div`; changed the `motion.div` className from `relative z-10 w-full max-w-md mx-auto px-4` to `w-full max-w-md mx-auto px-4 py-6` (dropped `relative z-10`, now owned by the new wrapper; added `py-6` for scroll breathing room); closed the new wrapper after the `motion.div`. No other lines changed except re-indentation of the JSX one level deeper for everything inside the new wrapper.

## Decisions Made
See `key-decisions` in frontmatter. Summary: option (d) — inner wrapper with `max-h-dvh`, not `h-full`, placed outside the `motion.div` — was the only candidate that (1) keeps the section's padding box viewport-sized for the backdrop `inset-0` layers, (2) doesn't force the card out of the section's own flexbox centering, (3) doesn't leave either end of the card permanently clipped, and (4) doesn't change desktop rendering.

## Deviations from Plan

None — plan executed exactly as written. Both edits (new wrapper div, `motion.div` className change) match the plan's `<action>` block verbatim. No auto-fixes were needed; no architectural questions arose.

## Issues Encountered

- The dev server already running on port 3000 was serving stale code from the main checkout (a `curl` grep for the new wrapper class returned nothing against it). Per the verification-environment instructions, I did not kill a server I didn't start; instead I started a fresh `npm run dev -- -p 3010` from inside this worktree to perform non-visual HTML verification. That server is left running for the human verifier — direct them to `http://localhost:3010` (not 3000) if they want to see this worktree's actual code; port 3000 needs to be restarted from this branch or merged first to reflect the fix.

## Checkpoint Status: AWAITING HUMAN VERIFICATION

**This plan is NOT complete.** Task 2 is a `checkpoint:human-verify` (`gate="blocking"`) requiring a real browser at two viewport heights. Per the executor's checkpoint protocol, I did not self-approve and did not infer the outcome from Task 1's passing automated gates — automated gates (tsc/lint/test/build) cannot confirm the two mechanisms this plan reasoned about:
1. Backdrop coverage inside a scroller (does the photo + overlay still cover the full visible area at every inner scroll position, with no gap/seam?)
2. IntersectionObserver geometry with a new scroll parent introduced between `scrollRef` (the IO root) and the observed `motion.div` (does `whileInView` still fire?)

### What a human must verify

Dev server: **`http://localhost:3010`** (this worktree's code; port 3000 is stale).

**A — the failing case, 375x667 (DevTools device toolbar, Responsive, 375 x 667):**
1. Scroll/snap to the estimate section.
2. Trigger the manual-entry fallback: set DevTools Network throttling to Offline and submit any valid-format VIN (e.g. `1FTFW1E85NFA12345`), OR submit `ZZZZZZZZZZZZZZZZZ` and click the manual-entry link. Reset throttling to No throttling afterward.
3. Enter year `2015`, choose Car, submit.
4. Confirm "Get Your Free Estimate" (card heading) is visible.
5. Confirm "2015 Car" (vehicle headline) is visible.
6. Confirm the price `$270 – $330` renders below the heading/headline, not above them.
7. Scroll down inside the card; confirm the disclaimer with `(210) 555-0100` and the "Estimate another vehicle" button are both reachable.
8. Confirm all four breakdown rows are present (base replacement, vehicle size, glass type, camera recalibration reading "not required for this vehicle" for a 2015).
9. Confirm the background photo and dark overlay cover the entire visible section at every scroll position inside the card — no gap, seam, or detached edge.
10. Swipe/scroll hero → estimate → services → footer and back; confirm each still snaps.

**B — non-regression at 824px height (Responsive, 375 x 824):**
11. Repeat the manual result. Confirm the card is centered with no inner scrollbar, looking the same as before this change.

**C — desktop non-regression (exit device toolbar, normal window):**
12. Submit valid VIN `1FTFW1E85NFA12345`. Confirm "2022 Ford F-150" / $338 – $663, card optically centered, no inner scrollbar.
13. Reload and scroll from hero to the estimate section. Confirm the card still fades in and slides up as it enters view (proves the `scrollRef` IntersectionObserver root survived the new scroll wrapper). If it appears instantly with no animation, that is a regression — report it.

### Resume signal
Type "approved" if every criterion above holds. Otherwise report which numbered step failed and what was observed instead — especially step 9 (backdrop coverage) or step 13 (entrance animation), the two mechanisms this plan reasoned about rather than directly observed by the agent.

### Non-visual verification already performed by this agent (does NOT substitute for the above)
- `grep -c 'h-dvh relative overflow-hidden flex items-center justify-center' src/components/home/EstimateSection.tsx` → 1 (section className unchanged)
- `grep -c 'max-h-dvh overflow-y-auto overscroll-contain' src/components/home/EstimateSection.tsx` → 1 (new wrapper present exactly once)
- `grep -c 'root: scrollRef' src/components/home/EstimateSection.tsx` → 1 (IO root prop unchanged)
- `git diff --stat` → exactly `src/components/home/EstimateSection.tsx` (1 file)
- `git diff package.json package-lock.json` → empty (no dependency added)
- `git diff` inspection confirmed the `<Image fill>` and `bg-black/55` overlay lines are outside the changed hunk — byte-identical to pre-fix
- Served HTML from a fresh dev server on port 3010 contains `max-h-dvh overflow-y-auto overscroll-contain`, `h-dvh relative overflow-hidden flex items-center justify-center`, and `bg-black/55` — confirming the built output matches source

## Gate Output (actual, not asserted)

```
npx tsc --noEmit
EXIT_CODE=0

npm run lint
EXIT_CODE=0

npm test
Test Files  2 passed (2)
     Tests  33 passed (33)
EXIT_CODE=0

npm run build
✓ Compiled successfully in 6.9s
✓ Generating static pages (9/9)
EXIT_CODE=0
```

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Task 1 (the code fix) is complete and committed. Task 2 (human browser verification) is the blocking gate before this plan — and `03-UAT.md` gap 2 / test 14 — can be marked resolved.
- Do NOT flip `03-UAT.md` test 14 to `status: resolved` until a human confirms all 13 acceptance criteria in the checkpoint above, particularly step 9 (backdrop coverage) and step 13 (entrance animation).
- The deferred render-regression test (cross-referenced against 03-09's outstanding Task 2) remains blocked on the same component-test dependency decision (`@testing-library/react`, `jsdom`, `@vitejs/plugin-react`) the user has not yet made.

---
*Phase: 03-vin-estimate*
*Completed: 2026-08-05 (Task 1 only; Task 2 awaiting human verification)*

## Self-Check: PASSED

- FOUND: `.planning/phases/03-vin-estimate/03-10-SUMMARY.md`
- FOUND: commit `781704a` in `git log --oneline --all`
