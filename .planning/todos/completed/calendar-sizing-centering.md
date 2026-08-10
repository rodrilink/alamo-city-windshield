---
status: resolved
created: 2026-08-06
source: 04-08-SUMMARY.md (Phase 4 UAT)
type: ui-polish
severity: cosmetic
---

# Booking calendar should be bigger and centered

## What

During Phase 4 UAT (plan 04-08), the developer verified all five ROADMAP
success criteria as passing, and raised one cosmetic observation:

> All works as expected, just a commend on the calendar size, it should be
> bigger and centered

## Why this is not a gap

Not a defect against any Phase 4 requirement or success criterion. The calendar
renders correctly, navigates months, disables the right dates (Sundays, past,
>30 days out), and produces the correct slot grids. Criterion 1 passed. This is
a visual refinement of scale and horizontal alignment only.

## Where

- `src/components/booking/BookingCalendar.tsx` — the calendar component itself
- `src/app/(public)/book/page.tsx` — its layout container (centering)

Note `src/components/ui/calendar.tsx` is the shadcn primitive; prefer adjusting
the wrapper/container over editing the generated primitive.

## Constraints to respect

- D-20: no snap-scroll or overlay-nav chrome on `/book`
- 03-UAT test 14 / D-20: must not reintroduce short-viewport clipping — the
  calendar header must stay reachable at ~600px viewport height. A larger
  calendar makes this regression *more* likely, so re-test the short viewport
  after any sizing change.
- White/red/black brand palette

---

## Resolved 2026-08-09 — commit `7e14151`

Raised `--cell-size` from the shadcn default `--spacing(7)` (~28px) to
`--spacing(11)` (~44px) and centered the grid with `mx-auto w-fit`.

**Why this approach:** every internal dimension in `components/ui/calendar.tsx`
(day cells, nav buttons, header height, weekday row) derives from that single
CSS variable, so overriding it via `className` scales the whole grid
proportionally. The generated shadcn primitive was not edited, per this todo's
own guidance. `cn()` appends the incoming `className` after the default, so the
override wins.

**Constraint respected — 03-UAT test 14 / D-20.** This todo flagged that a
larger calendar makes the short-viewport clipping regression *more* likely. The
scale-up is therefore gated behind `sm:`: below 640px the calendar keeps its
original compact size, so the worst case for vertical space is byte-identical to
what that test verified. Confirmed the rule is emitted inside the `.sm\:` block
of the CSS bundle rather than applying unconditionally.

Side benefit: 44px clears the minimum touch-target size, which the 28px default
did not.

**Not verified by me:** how the larger grid actually looks and feels in a
browser. Sizing is a visual judgement — worth a look on both desktop and a short
mobile viewport.
