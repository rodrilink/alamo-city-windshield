---
phase: 04-booking-contact
verified: 2026-08-06T22:10:00Z
status: gaps_found
score: 4/5 roadmap success criteria fully verified; 1 partial (client-side validation gap on booking form)
overrides_applied: 0
gaps:
  - truth: "Form validation (Zod + react-hook-form) catches missing required fields before submission — Roadmap Success Criterion 5, applies to BOTH /contact and /book per 04-08-PLAN.md step 24"
    status: partial
    reason: "src/components/booking/BookingForm.tsx wires react-hook-form's useForm + zodResolver(bookingSchema) but never calls form.handleSubmit(). The <form> element uses `action={formAction}` (the raw React 19 useActionState dispatcher) with no `onSubmit` handler, no `required` HTML attributes, and no `noValidate`+manual gate. Clicking submit with empty firstName/lastName/phone invokes createBooking directly — react-hook-form's Zod resolver never runs client-side, so formState.errors never populates, and every <FormMessage /> in the file renders empty regardless of input. This is functionally identical to having no client-side validation on the booking form at all. Contrast with src/components/contact/ContactForm.tsx, which correctly uses `onSubmit={handleSubmit(onValidSubmit)}` — the pattern this file was supposed to establish (04-06-PLAN.md explicitly cites RESEARCH.md Pattern 4, 'the useActionState + react-hook-form wiring') is present in name (useForm, zodResolver, FormMessage) but not functionally wired for pre-submission blocking."
    artifacts:
      - path: "src/components/booking/BookingForm.tsx"
        issue: "Line 85: `<form action={formAction} ...>` with no `onSubmit`/`handleSubmit` wrapper. `form.handleSubmit` is imported from useForm's return value but never called anywhere in the file (grep confirms zero occurrences of `handleSubmit` in this file, versus ContactForm.tsx which calls it once on line 71)."
    missing:
      - "Wire the booking form's submit path through react-hook-form's handleSubmit, mirroring ContactForm.tsx's onValidSubmit pattern: build FormData from validated values inside handleSubmit's onValid callback, call formAction(formData) only after client-side Zod validation passes."
      - "Alternatively (if native form-action submission is intentionally preferred for the booking form specifically), add a client-side pre-submit gate — e.g. call `form.trigger()` in an onSubmit handler and block dispatch on failure — and render `errors.firstName`/`errors.lastName`/`errors.phone`/`errors.vin` inline via the existing <FormMessage/> elements, which currently only reflect server round-trip state via `state.fieldErrors` (itself never read in this file either)."
      - "Re-run 04-08's step 23-24 human walkthrough specifically for the /book form after the fix, since the original PASS verdict for Criterion 5 did not distinguish behavior between the two forms in its recorded evidence."
---

# Phase 4: Booking & Contact Verification Report

**Phase Goal:** Users can book an appointment via a visual calendar and submit contact requests, both saved reliably to Supabase with no double-booking possible
**Verified:** 2026-08-06T22:10:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Calendar shows month view; selecting a date reveals slots; booked slots visually disabled | ✓ VERIFIED | `src/components/booking/BookingCalendar.tsx` disabled matcher combines fully-booked (from `getMonthAvailability`), before-today, after-30-day-window, and Sunday. `src/components/booking/SlotList.tsx` disables both `booked` and `past` slots identically (D-05). Human UAT confirmed Saturday yields exactly 9:00/10:30/12:00, no 1:30. Build + 70/70 tests pass. |
| 2 | Completing a booking shows confirmation; duplicate slot submission returns "slot taken" | ✓ VERIFIED | `src/lib/booking/booking-actions.ts` attempts insert directly, branches on `error.code === '23505'` only, returns distinct `slot-taken` vs `error` states preserving submitted `values` (D-09/D-10). `BookingConfirmation.tsx` renders date/time/name/phone/vehicle + promised call-back line (D-11/BOOK-07). Human UAT confirmed a real live duplicate insert rejected with exactly one surviving DB row, entered data preserved, slot disabled without reload. |
| 3 | Contact form (first/last name, phone required; address optional) submits and shows confirmation | ✓ VERIFIED | `src/lib/contact/contact-schema.ts` matches required/optional fields to `contacts` NOT NULL columns. `src/components/contact/ContactForm.tsx` correctly gates submission via `onSubmit={handleSubmit(onValidSubmit)}`, renders `CONTACT_COPY.successMessage` on success. Human UAT confirmed a live `contacts` row landed. |
| 4 | Contact page VIN search uses the same decoder as home page | ✓ VERIFIED | `src/components/contact/ContactVinSearch.tsx` fetches `/api/vin/[vin]` (the identical Route Handler `EstimateSection.tsx` uses), consumes the same `VinLookupResponse` union, renders the shared `EstimateResult`. `EstimateResult.tsx`'s CTA now targets `/book?vin=<vin>` (D-16/D-18), carrying only the validated, URL-encoded VIN (D-19) — confirmed by grep: no `vehicle_desc`/price/make/model ever placed in the URL. Human UAT confirmed the VIN pre-fills the booking form on `/book`. |
| 5 | Form validation (Zod + react-hook-form) catches missing required fields before submission | ⚠ PARTIAL | **Contact form: VERIFIED.** `ContactForm.tsx` uses `handleSubmit(onValidSubmit)` — an invalid submit is blocked client-side and `createContact` is never invoked. **Booking form: FAILED.** `BookingForm.tsx` never calls `handleSubmit`; its `<form action={formAction}>` submits directly to the `createBooking` Server Action on every click regardless of field state. `formState.errors` never populates (nothing triggers RHF's resolver), so all four `<FormMessage/>` elements render empty for any input. Server-side Zod re-validation still catches missing fields (returns `status: 'error'`), but this is a round-trip, not a "before submission" client-side catch, and the returned `fieldErrors` are never rendered per-field — only a generic `state.message` string is shown. See Gaps. |

**Score:** 4/5 truths fully verified, 1 partial (booking-form half of criterion 5 fails)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/booking/slots.ts` | Pure slot generation from `BUSINESS.hours` | ✓ VERIFIED | D-02 expressed as `start + SLOT_DURATION_MINUTES <= closeMinutes`; no duplicated schedule; Saturday/Sunday/weekday fixtures pass (58 tests incl. server-time) |
| `src/lib/server-time.ts` | Timezone-correct server now (America/Chicago) | ✓ VERIFIED | `Intl.DateTimeFormat` + `formatToParts`, `import 'server-only'` present, midnight-24 normalized, no `toISOString()` |
| `.env.local` | Live Supabase credentials | ✓ VERIFIED | Gitignored per `.gitignore`; not visible to this verifier by design (expected — matches execution context) |
| `src/components/ui/calendar.tsx` | shadcn Calendar wrapping react-day-picker v10 | ✓ VERIFIED | Zero `IconPlaceholder`, direct `lucide-react` chevron imports, zero v9-deprecated props |
| `src/components/ui/form.tsx` | Hand-written shadcn Form primitive | ✓ VERIFIED | react-hook-form Context bridge present, no `@radix-ui/react-slot` (documented deviation, accepted) |
| `src/types/booking.ts` | Slot/BookingFormValues/BookingActionState/ContactFormValues contracts | ✓ VERIFIED | No `server-only`, no `vehicle_desc` field, 4-way status union, discriminated availability failure variant |
| `src/lib/booking/booking-availability.ts` | Month/day availability reads | ✓ VERIFIED | `{ok:false}` failure variant distinct from empty result; fully-booked computed per-date via `generateSlotsForDate`, never hardcoded; selects only `appt_date`/`appt_time` |
| `src/lib/booking/booking-actions.ts` | `createBooking` Server Action | ✓ VERIFIED | Honeypot → Zod → slot-legality → insert order; branches on `error.code==='23505'` only; never leaks raw Postgres text; preserves `values` on every non-success path |
| `src/lib/contact/contact-actions.ts` | `createContact` Server Action | ✓ VERIFIED | Honeypot → Zod → insert; writes submitted honeypot value to `contacts.honeypot` column |
| `src/app/(public)/book/page.tsx` | `/book` route, normal-flow chrome | ✓ VERIFIED | `/about`-identical chrome; zero snap-scroll classes; server-side VIN re-decode; graceful degradation on decode/availability failure |
| `src/components/booking/BookingCalendar.tsx` | Month grid with disabled matcher | ✓ VERIFIED | Combines fully-booked/past/window/Sunday; today selectable; 30-day window is a named constant |
| `src/components/booking/BookingConfirmation.tsx` | BOOK-07 confirmation screen | ✓ VERIFIED | Renders date/time/name/phone/conditional vehicle line + D-11 call-back copy; zero data fetching |
| `src/components/booking/BookingForm.tsx` | Booking form wired to `createBooking` | ⚠ ORPHANED VALIDATION | Component exists, is wired to the Server Action, and renders confirmation/slot-taken/error states correctly — but the react-hook-form validation machinery it imports (`useForm`, `zodResolver`, `FormMessage`) is never actually invoked before submission. See Gaps. |
| `src/app/(public)/contact/page.tsx` | `/contact` route replacing placeholder | ✓ VERIFIED | Placeholder text gone; renders `ContactForm` + `ContactVinSearch`; `/about`-style chrome |
| `src/components/contact/ContactForm.tsx` | CONT-01 form wired to `createContact` | ✓ VERIFIED | `handleSubmit(onValidSubmit)` correctly gates submission; honeypot present, not `type="hidden"` |
| `src/components/contact/ContactVinSearch.tsx` | CONT-02 VIN search reusing `/api/vin/[vin]` | ✓ VERIFIED | Fetches existing endpoint; imports neither `@/lib/vin` nor `@/lib/pricing`; renders shared `EstimateResult` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `booking-actions.ts` | `bookings` table | `createAdminClient` insert, catch `23505` | ✓ WIRED | No check-then-insert (grep confirms); branches on `error.code`, never `error.message` |
| `booking-actions.ts` | `slots.ts` | `generateSlotsForDate` re-run (D-15) | ✓ WIRED | `isLegalSlot` in `booking-schema.ts` calls it; 12 schema tests cover off-grid/Saturday/Sunday cases |
| `ContactVinSearch.tsx` | `/api/vin/[vin]` | client fetch | ✓ WIRED | Same endpoint and response union as home page |
| `EstimateResult.tsx` | `/book` | `Link` carrying validated VIN | ✓ WIRED | `isValidVin` + `encodeURIComponent`; omits param on manual path |
| `BookingForm.tsx` | `createBooking` | `useActionState` | ✓ WIRED (submission path) / ✗ NOT WIRED (validation path) | The Server Action call itself is correctly wired; the client-side validation blocking that `useActionState` + react-hook-form is supposed to provide together is not — see truth #5 |
| `ContactForm.tsx` | `createContact` | `useActionState` + `handleSubmit` gate | ✓ WIRED | Both the action dispatch and the pre-submission validation gate are wired correctly |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| BOOK-01 | 04-01, 04-04 | Visual calendar UI (react-day-picker) | ✓ SATISFIED | `calendar.tsx` + `BookingCalendar.tsx` |
| BOOK-02 | 04-03, 04-06 | Available time slots displayed per date | ✓ SATISFIED | `slots.ts` + `SlotList.tsx` |
| BOOK-03 | 04-05, 04-06 | Booked slots visually disabled | ✓ SATISFIED | `booking-availability.ts` + calendar/slot disabled matchers |
| BOOK-04 | 04-02 | `DATE`+`TIME` columns, not `TIMESTAMPTZ` | ✓ SATISFIED | Migration line 19-20; human-verified live (`date`/`time without time zone`) |
| BOOK-05 | 04-02, 04-05 | UNIQUE constraint prevents double-booking | ✓ SATISFIED | Migration line 23; human-verified live `23505` on duplicate |
| BOOK-06 | 04-05, 04-06 | Booking captures name, phone, VIN, vehicle info | ✓ SATISFIED | `bookingSchema` + `createBooking` insert columns |
| BOOK-07 | 04-06 | Confirmation screen after booking | ✓ SATISFIED | `BookingConfirmation.tsx` |
| CONT-01 | 04-07 | Contact form fields (first/last/phone required, address optional) | ✓ SATISFIED | `contactSchema` + `ContactForm.tsx` |
| CONT-02 | 04-07 | VIN search, same decoder as home | ✓ SATISFIED | `ContactVinSearch.tsx` |
| CONT-03 | 04-05, 04-07 | Honeypot spam protection | ✓ SATISFIED | `contacts.honeypot` column + form + `createContact` check-first order |
| CONT-04 | 04-05 | Server Action saves contact to Supabase | ✓ SATISFIED | `createContact` insert |
| CONT-05 | 04-07 | Success confirmation message | ✓ SATISFIED | `CONTACT_COPY.successMessage` rendered on `state.status === 'success'` |
| CONT-06 | 04-01, 04-04, 04-05, 04-07 | Form validation Zod + react-hook-form | ⚠ PARTIAL | Contact form fully satisfies this (client-side blocking works). The booking form (governed by the same "Zod + react-hook-form" validation expectation restated at the phase level in Roadmap SC5, and explicitly re-tested per-form in 04-08's UAT script step 24) does not — see Gaps. |

**No orphaned requirements** — all 13 declared requirement IDs plus CONT-03 are traceable to at least one plan.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/booking/BookingForm.tsx` | 47-59, 84-224 | react-hook-form wired (`useForm`, `zodResolver`, `FormMessage`) but validation never triggered before submission | 🛑 Blocker | Client-side validation is cosmetically present but functionally inert; contradicts Roadmap SC5 and 04-08's own UAT script for this exact form |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` markers found in any phase-modified file. No stray console.log-only implementations. No hardcoded empty-data stubs found beyond intentional test fixtures.

### Human Verification Required

None additional — the phase's own 04-08 human UAT already covered live-database and visual behaviors per the verified execution context. However, given the code-level contradiction found for Criterion 5's booking-form half, a **targeted re-verification** of that specific step is recommended once the gap is closed (see gap's `missing` list) — this is procedural closure, not a net-new open-ended human-verification need, so it does not change the phase status determination on its own.

### Gaps Summary

Four of five ROADMAP success criteria are fully substantiated by the codebase, matching both the SUMMARY.md narratives and the human UAT report — the double-booking guarantee, the calendar's disabled-state logic, the contact form, and the VIN-search handoff to `/book` are all genuinely wired and functioning, not stubs.

The one gap is narrow but real: **`BookingForm.tsx` never calls `handleSubmit`**, so `useForm` + `zodResolver(bookingSchema)` — imported and configured correctly — never actually runs before the native `<form action={formAction}>` dispatches to `createBooking`. This means the booking form has no client-side pre-submission validation despite appearing to. `ContactForm.tsx`, built one plan later in the same phase, correctly wires `onSubmit={handleSubmit(onValidSubmit)}` and does not have this problem — the pattern was established correctly once, just not applied consistently to both forms. Server-side Zod re-validation inside `createBooking` still prevents bad data from reaching Postgres (D-08/D-15's core guarantees are unaffected), so this is a UX/requirements gap, not a data-integrity gap.

This surfaced only through direct code reading of the submit-wiring mechanics — it does not show up in `npm run build`, `tsc --noEmit`, `lint`, or the 70/70 Vitest suite (none of which exercise React 19 form-action submission semantics), and a UAT walkthrough focused on the happy path and the double-booking race could easily complete without a tester deliberately leaving all booking fields blank and clicking submit to see if an inline error appears before the network round-trip.

---

*Verified: 2026-08-06T22:10:00Z*
*Verifier: Claude (gsd-verifier)*
