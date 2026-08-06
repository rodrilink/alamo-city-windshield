---
status: pending
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
