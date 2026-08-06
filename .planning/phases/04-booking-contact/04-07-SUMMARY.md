---
phase: 04-booking-contact
plan: 07
subsystem: ui
tags: [react-hook-form, zod, useActionState, nextjs, react19]

# Dependency graph
requires:
  - phase: 04-booking-contact (plan 04)
    provides: Slot/BookingFormValues/ContactFormValues/BookingActionState/ContactActionState/MonthAvailability/DayAvailability types, BOOKING_COPY/CONTACT_COPY constants, form.tsx/label.tsx primitives
  - phase: 04-booking-contact (plan 05)
    provides: createContact Server Action (honeypot -> Zod -> insert), contactSchema Zod object
provides:
  - Rewritten /contact page with real contact form and VIN search, replacing the Phase 3 placeholder
  - ContactForm.tsx -- react-hook-form + useActionState wiring to createContact, CONT-01/CONT-03/CONT-05/CONT-06
  - ContactVinSearch.tsx -- client VIN decode via the existing /api/vin/[vin] endpoint, reusing EstimateResult
  - EstimateResultProps.vin (optional) -- the one project-wide change: Book Appointment CTA now targets /book carrying the VIN (D-16/D-18/D-19)
affects: [04-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useActionState (React 19, from 'react') + react-hook-form zodResolver, with handleSubmit gating the action call so an invalid submit never reaches the Server Action"
    - "EstimateSection's discriminated view-state + fetch/switch-on-status idiom duplicated verbatim in ContactVinSearch so both VIN entry points can never diverge in outcome handling"
    - "Optional vin prop on a shared presentational component, validated with isValidVin and URL-encoded at the call site immediately before building the href -- never trusted unchecked"

key-files:
  created:
    - src/components/contact/ContactForm.tsx
    - src/components/contact/ContactVinSearch.tsx
  modified:
    - src/app/(public)/contact/page.tsx
    - src/components/home/EstimateResult.tsx
    - src/components/home/EstimateSection.tsx

key-decisions:
  - "ContactVinSearch reuses ManualEntryForm unmodified on the unreachable path -- the existing onEstimate callback shape fit without any change to that shared component, so no simpler retry-prompt alternative was needed"
  - "ContactForm builds a fresh FormData from react-hook-form's validated values inside handleSubmit's onValid callback, rather than passing the native form action directly -- this guarantees the Zod resolver runs and blocks submission before useActionState's dispatcher is ever invoked (CONT-06)"
  - "EstimateResult computes bookHref internally from the optional vin prop (validated with isValidVin, URL-encoded) rather than requiring each caller to pre-build the href -- keeps the D-19 validation gate in exactly one place"

patterns-established:
  - "Shared presentational components that need a caller-supplied value in an outgoing link should validate and encode that value inside the component itself, not trust callers to have done so"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06]

# Metrics
duration: 45min
completed: 2026-08-06
---

# Phase 4 Plan 07: Contact Page & Estimate CTA Rewire Summary

**Rewrote `/contact` with a real contact form (react-hook-form + `useActionState` wired to `createContact`) and a VIN search that reuses the Phase 3 decoder verbatim, then rewired the shared `EstimateResult` Book Appointment CTA from its Phase 3 `/contact` placeholder to `/book?vin=<vin>`.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-08-06T20:30:00Z (approx)
- **Completed:** 2026-08-06T21:15:00Z (approx)
- **Tasks:** 3
- **Files modified:** 2 created, 3 modified

## Accomplishments
- `/contact` no longer reads "Contact form will be added in a later phase" -- it now renders `ContactForm` and `ContactVinSearch` side by side inside the same `/about`-style normal-flow chrome (no snap-scroll, no overlay nav)
- `ContactForm` captures first name, last name, phone (required) and address (optional), includes a visually-hidden (not `type="hidden"`) honeypot input, surfaces client-side Zod validation errors before submission, and renders `CONTACT_COPY`'s confirmation or error message from `createContact`'s returned state
- `ContactVinSearch` decodes VINs through the exact same `/api/vin/[vin]` Route Handler and `VinLookupResponse` union the home page uses, preserving the distinct not-found/invalid (retry prompt) vs. unreachable (manual fallback) treatment, and renders the shared `EstimateResult` on success
- `EstimateResult`'s Book Appointment CTA now targets `/book` (optionally `/book?vin=<vin>` when a validated VIN is known) instead of the Phase 3 `/contact` placeholder -- the only value that travels in the URL is the raw, `isValidVin`-checked, URL-encoded VIN; no price, make, model, or vehicle description

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite the /contact page and build the contact form** - `947f43d` (feat)
2. **Task 2: Contact-page VIN search reusing the existing decoder** - `7c5b5af` (feat)
3. **Task 3: Rewire the EstimateResult Book Appointment CTA to /book** - `ebf090b` (feat)

**Plan metadata:** committed alongside this SUMMARY (worktree mode -- orchestrator handles STATE.md/ROADMAP.md centrally after merge)

## Files Created/Modified
- `src/app/(public)/contact/page.tsx` - Replaced the Phase 3 placeholder body with a two-column layout holding `ContactForm` and `ContactVinSearch`, keeping the existing `TopNav`/`main.flex-1`/`Footer` chrome
- `src/components/contact/ContactForm.tsx` - Client Component: `useActionState(createContact, initialState)` + `useForm({ resolver: zodResolver(contactSchema), values: state.values })`; renders success/error states from `CONTACT_COPY`; honeypot field visually hidden via CSS, not `type="hidden"`
- `src/components/contact/ContactVinSearch.tsx` - Client Component reusing `EstimateSection`'s discriminated view-state and fetch/switch idiom against `/api/vin/[vin]`; tracks the normalized VIN in state and passes it to `EstimateResult`
- `src/components/home/EstimateResult.tsx` - Added optional `vin?: string` prop with TSDoc explaining the D-19 constraint; computes `bookHref` via `isValidVin` + `encodeURIComponent`; CTA `Link` now points at `bookHref` instead of the hardcoded `/contact`
- `src/components/home/EstimateSection.tsx` - Threads the normalized `vin` through both decoded view-state branches (`decoded`, `needs-vehicle-type`) and passes `view.vin` into `EstimateResult`; the manual path's view-state has no `vin` field set, so the CTA there correctly omits the query parameter

## Decisions Made
- `ContactVinSearch` reuses `ManualEntryForm` unmodified on the `unreachable` path -- its existing `onEstimate` callback signature fit without requiring any change to that shared component, so the plan's "prefer a simpler retry prompt" fallback was not needed.
- `ContactForm`'s submit handler builds a fresh `FormData` object from react-hook-form's validated values inside `handleSubmit`'s `onValid` callback (rather than wiring the native `<form action={formAction}>` directly), so the Zod resolver's validation runs and can block submission entirely before `useActionState`'s dispatcher is ever invoked -- this is what makes CONT-06's "does not call the action" acceptance criterion literally true rather than merely visually true.
- `EstimateResult` validates and URL-encodes the `vin` prop internally (via `isValidVin` + `encodeURIComponent`) rather than requiring each of its two callers (`EstimateSection`, `ContactVinSearch`) to pre-validate before passing the prop down -- keeps the D-19 enforcement point singular and impossible to bypass by a future caller that forgets to validate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rewrote comments that literally contained `useFormState`/`@/lib/vin`/`@/lib/pricing` substrings, which the plan's own acceptance-criteria greps would have flagged as false-positive failures**
- **Found during:** Task 1 and Task 2, immediately after writing `ContactForm.tsx` and `ContactVinSearch.tsx`
- **Issue:** Explanatory code comments describing what the files deliberately do NOT do (e.g. "NOT the deprecated `useFormState`", "does NOT import `@/lib/vin`") contained the exact substrings the acceptance-criteria greps (`grep -c "useFormState"`, `grep -c "@/lib/vin\|@/lib/pricing"`) search for, which would make both greps return a nonzero count despite no actual import existing.
- **Fix:** Reworded both comments to describe the same constraint without using the literal disallowed strings (e.g. "the deprecated pre-19 form-state hook", "the server-only decode module").
- **Files modified:** `src/components/contact/ContactForm.tsx`, `src/components/contact/ContactVinSearch.tsx`
- **Verification:** Re-ran both greps after the edit; both return `0`. `npx tsc --noEmit` and `npm run build` re-verified clean afterward.
- **Committed in:** `947f43d` (Task 1), `7c5b5af` (Task 2) -- fixed before either task's commit, so no separate fix-up commit was needed.

---

**Total deviations:** 1 auto-fixed (1 bug fix, caught before commit)
**Impact on plan:** Cosmetic-only; no behavioral change. Both files never imported the disallowed modules or hooks — only the prose describing that absence needed rewording. No scope creep.

## Issues Encountered
None beyond the comment-wording fix documented above.

## User Setup Required
None - no external service configuration required. Reuses the live Supabase project, `createContact` Server Action, and `/api/vin/[vin]` Route Handler already in place from prior plans.

## Next Phase Readiness

Final `EstimateResultProps` contract for plan `04-08` to verify against:

```typescript
interface EstimateResultProps {
  headline: string
  headlineFollowsSizeBucket: boolean
  estimates: EstimateMatrix
  adasApplies: boolean
  glassType: GlassType
  onGlassTypeChange: (value: GlassType) => void
  sizeBucket: SizeBucket
  onSizeBucketChange: (value: SizeBucket) => void
  sizeBucketEditable: boolean
  basisNote?: string
  vin?: string          // NEW in this plan (D-16/D-18/D-19)
  onReset: () => void
}
```

- `vin` is optional; omitted or invalid values fall back to a bare `/book` href with no query parameter.
- `ManualEntryForm.tsx` was reused unmodified on `ContactVinSearch`'s `unreachable` path -- `git diff --name-only` confirms it is untouched.
- Both `/contact`'s VIN search and the home page's `EstimateSection` now pass `vin` on the `decoded`/`needs-vehicle-type` paths and omit it on the manual path.
- No blockers. `npx tsc --noEmit`, `npm run build`, and `npx vitest run` all exit 0 (70/70 tests passing, unchanged from the pre-existing baseline -- this plan added no new test files since all three tasks were UI/wiring work, not pure functions).

---
*Phase: 04-booking-contact*
*Completed: 2026-08-06*

## Self-Check: PASSED

All 5 created/modified source files verified present on disk (`src/app/(public)/contact/page.tsx`, `src/components/contact/ContactForm.tsx`, `src/components/contact/ContactVinSearch.tsx`, `src/components/home/EstimateResult.tsx`, `src/components/home/EstimateSection.tsx`). All 4 commit hashes (`947f43d`, `7c5b5af`, `ebf090b`, `4fea4d5`) verified present in git log.
