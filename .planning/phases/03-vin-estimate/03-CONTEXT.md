# Phase 3: VIN Estimate - Context

**Gathered:** 2026-08-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Phase 2 placeholder estimate with a working end-to-end VIN estimate. Deliver a server-side Route Handler that proxies NHTSA vPIC with a 6-second timeout, reads/writes the existing `vin_cache` table via the service-role client, computes a low/high price range from a pure formula in `lib/pricing.ts`, and renders a result with vehicle identity, a four-line breakdown, a live windshield-type selector, an ADAS calibration notice for 2018+ vehicles, and a manual-entry fallback when the decode fails.

Covers requirements: VIN-01..VIN-07.

**NOT in scope:**
- Booking calendar and the real Book Appointment destination (Phase 4) — the CTA continues to link to `/contact` per D-12
- Contact page VIN search field (Phase 4)
- `vin_search` analytics events (Phase 6)
- Admin-editable `pricing_config` table (explicit v2 concern per ARCHITECTURE.md)

</domain>

<decisions>
## Implementation Decisions

### Pricing Formula (values are LOCKED — hardcode in `lib/pricing.ts`)

- **D-01:** Base price for a standard windshield replacement is **$300**.
- **D-02:** Vehicle size modifier uses **three buckets** mapped from NHTSA `BodyClass`:
  - Car — sedan, coupe, hatchback, wagon, convertible → **+$0**
  - SUV / Truck — SUV, crossover, MPV, pickup → **+$75**
  - Van / Oversized — van, minivan, cargo van, oversized → **+$150**
- **D-03:** Windshield type modifier: **Standard +$0, Acoustic +$100, Heated +$200**.
- **D-04:** ADAS calibration is a **range contribution, not a flat add**: for `ModelYear >= 2018` it adds **$0 to the low end and $250 to the high end**. Pre-2018 vehicles get no ADAS contribution. The low end assumes no calibration is needed; the high end assumes it is.
- **D-05:** Every estimate carries a **±10% baseline spread** so the range never collapses to a single number. Final formula:

  ```
  subtotal = 300
           + sizeModifier      (0 | 75 | 150)
           + glassModifier     (0 | 100 | 200)

  low      = subtotal * 0.90
  high     = subtotal * 1.10 + (modelYear >= 2018 ? 250 : 0)
  ```

- **D-06:** Worked examples the user reviewed and approved — use these as test fixtures:

  | Vehicle | Glass | Expected quote |
  |---|---|---|
  | 2015 Honda Civic (sedan) | Standard | $270 – $330 |
  | 2020 Toyota Camry (sedan) | Standard | $270 – $580 |
  | 2020 Toyota Camry (sedan) | Acoustic | $360 – $690 |
  | 2022 Ford F-150 (pickup) | Standard | $338 – $663 |
  | 2023 Honda Odyssey (van) | Heated | $585 – $965 |
  | 2016 Chevy Silverado (pickup) | Standard | $338 – $413 |

  > **Correction (2026-08-04, during Phase 3 research):** the Odyssey row originally read
  > `$585 – $995`. Phase 3 research found this to be the only row of the six that does not
  > reconcile with the D-05 formula, which computes `650 * 1.10 + 250 = 965`. The low end
  > ($585) matched, confirming the $650 subtotal, so the discrepancy was isolated to the high
  > end and consistent with a 6↔9 transposition. User confirmed **the formula is
  > authoritative** and the table was the typo. D-05 is implemented exactly as written; all
  > six rows above now reconcile with it. Rounding is half-up (`Math.round`), which rows 4
  > and 6 depend on ($337.50 → $338, $412.50 → $413).

### Result Presentation

- **D-07:** On a successful decode the **VIN form is replaced by the result inside the same card** — not a modal, not a sheet, not a new snap section. An "Estimate another vehicle" link returns to the form. Rationale: the section is `h-dvh` inside a `snap-mandatory` container, and swapping keeps the total footprint within the viewport on mobile.
- **D-08:** Loading state is the **submit button becoming an inline spinner reading "Decoding VIN…"** with the input locked. No skeleton, no layout shift.
- **D-09:** The line-item breakdown is **always visible** (required by success criterion 2) and shows four rows: base price, vehicle size, glass type, camera recalibration.
- **D-10:** ADAS is presented as a breakdown line reading **"Camera recalibration — up to $250"** plus an **info-icon note below the breakdown**: vehicles from 2018 or later often have a camera mounted behind the windshield, and if it needs recalibration that cost is included in the upper estimate. Shown only for `ModelYear >= 2018`.
- **D-11:** A **one-line muted disclaimer sits under the CTA** stating this is an estimate rather than a final quote, that final pricing is confirmed on seeing the vehicle, and offering the phone number. Pull the number from `BUSINESS.phone` in `src/lib/constants.ts` — never hardcode it.
- **D-12:** The Phase 2 "Estimates launching soon" placeholder line is **removed**.

### Windshield Type Selector

- **D-13:** The selector lives **on the result, not in the form**. The VIN form stays a single field so the first step has minimal friction; the selector appears with the result and updates the range live.
- **D-14:** **Standard is preselected** — most common, and it produces the lowest number so the first price shown isn't inflated.
- **D-15:** The Route Handler **computes and returns all three glass variants in one response**. Toggling is a pure client state change: zero latency, no extra requests, and the pricing formula never ships to the browser. Do NOT import `lib/pricing.ts` into a Client Component.
- **D-16:** A **one-line hint describes the active option** using physically observable traits, so a customer can actually check: acoustic reduces road noise and is common on newer and luxury trims; heated has visible heating elements or a wiper de-icer strip at the base of the glass.

### Fallback and Failure Handling

Three distinct failure modes, handled differently:

- **D-17:** **NHTSA unreachable** (6s timeout, network error, 5xx) → show a **manual entry form asking for model year and vehicle type only**. Vehicle type is three buttons — Car / SUV or Truck / Van — mirroring the D-02 size buckets exactly. These two values are all the formula needs. No make/model fields. Result header reads e.g. "2020 SUV".
- **D-18:** **NHTSA responds but rejects the VIN** (bad checksum, no data on file) → this is a **different message, not the manual form**: tell the user the vehicle wasn't found and to double-check the characters, with "enter your vehicle details manually" available as a secondary link. Rationale: NHTSA answered, so a typo is the likely cause — pushing straight to manual entry would hide a fixable mistake.
- **D-19:** **NHTSA decodes but `BodyClass` is missing or unmappable** (e.g. "Incomplete Vehicle", "Truck-Tractor", "Low Speed Vehicle (LSV)") → **show the result with vehicle type as a live selector** alongside the glass selector, defaulting to Car. Do not guess a bucket silently. Reuses the D-13 selector pattern and asks only about the value that couldn't be determined.
- **D-20:** A manual-entry estimate uses the **same card layout and the same math**, with **one added line noting it's based on the details you entered**. No wider range and no "rough estimate" relabel — the inputs are the same two values the decoder produces, so softening it would be theatre.
- **D-21:** Failed lookups are **never written to `vin_cache`** — only successful decodes are cached.

### Claude's Discretion

- Rounding convention for displayed prices (nearest dollar vs nearest $5) — pick whichever reads cleanest against the D-06 fixtures
- Exact `BodyClass` string → size bucket mapping table, including which NHTSA values land in each bucket and the unmappable-value detection that triggers D-19
- Whether to use `@shaggytools/nhtsa-api-wrapper` or a raw `fetch` with `AbortController` against `decodevinvalues` — raw fetch is one fewer dependency and the timeout is required either way
- Control style for both selectors (segmented buttons vs radio cards) — must stay within the white/red/black palette
- Whether the price animates or cuts when the selector changes
- Entrance/exit animation for the form → result swap (keep consistent with the existing `motion/react` `whileInView` + `viewport={{ root: scrollRef }}` pattern)
- `vin_cache` TTL — decoded VIN data is immutable per VIN, so indefinite caching is acceptable
- Whether to build the result as a standalone component anticipating Phase 4 reuse on the contact page
- Exact disclaimer, hint, and ADAS note wording (intent is specified in D-10, D-11, D-16)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope
- `.planning/PROJECT.md` — Core value, constraints, Key Decisions table
- `.planning/REQUIREMENTS.md` — VIN-01..VIN-07 specs (lines 38–44) and the traceability table
- `.planning/ROADMAP.md` §Phase 3 — Goal and the 5 success criteria this phase is verified against

### Prior phase decisions (carry forward, do not re-litigate)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01/D-05 brand palette (`#B91C1C`, white/red/black only), D-10/D-13 schema and RLS strategy including `vin_cache` service-role-only access, D-21 env var prefix rules (`SUPABASE_SERVICE_ROLE_KEY` must never be `NEXT_PUBLIC_`)
- `.planning/phases/02-public-pages/02-CONTEXT.md` — D-09/D-10 estimate section layout, D-11 the placeholder this phase replaces, D-12 Book Appointment links to `/contact` until Phase 4, D-13 client-side VIN validation already shipped

### Architecture and stack (authoritative on approach)
- `.planning/research/ARCHITECTURE.md` §Pricing Formula (lines 328–348) — formula shape and the Route Handler's 4-step sequence
- `.planning/research/ARCHITECTURE.md` §Patterns to Follow, Pattern 5 (lines 392–396) — VIN decoding is a Route Handler, not a Server Action, because it's idempotent and cacheable
- `.planning/research/ARCHITECTURE.md` §Patterns to Follow, Pattern 3 — the three Supabase client contexts; `lib/supabase/admin.ts` (service role) does not exist yet and this phase needs it for `vin_cache`
- `.planning/research/ARCHITECTURE.md` lines 280–310 — `pricing_config` table definition and the explicit note that hardcoding in `lib/pricing.ts` is correct for v1
- `.planning/research/STACK.md` §VIN Decoding (lines 40–52) — NHTSA vPIC endpoint, the ~10–15 req/s practical rate limit before temporary IP blocking, and why the call must be server-side

### Live code and schema
- `supabase/migrations/20260412000000_initial_schema.sql` lines 102–122 — `vin_cache` table shape (`vin`, `model_year`, `make`, `model`, `body_class`, `raw_response`) and the RLS-enabled-with-no-policies pattern that makes it service-role-only
- `src/components/home/EstimateSection.tsx` — the component this phase rewires; already contains `VIN_REGEX`, uppercase normalization, error display, and the card-in-snap-section layout
- `src/lib/constants.ts` — `BUSINESS.phone` for the D-11 disclaimer

### External references
- NHTSA vPIC decode endpoint: `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/{vin}?format=json` — flat response shape; check `ErrorCode` to distinguish D-18 from D-17
- NHTSA vPIC API docs: https://vpic.nhtsa.dot.gov/api/

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/home/EstimateSection.tsx` — already a Client Component with `VIN_REGEX` (`/^[A-HJ-NPR-Z0-9]{17}$/`, correctly excluding I/O/Q), uppercase-on-change normalization, inline error rendering with `role="alert"`, and `maxLength={17}`. The form half needs no rework; the result half is replaced.
- `src/lib/supabase/server.ts` — cookie-based server client. The `vin_cache` writes need a **service-role** client instead, which does not exist yet — `lib/supabase/admin.ts` must be created this phase per ARCHITECTURE.md Pattern 3.
- `src/components/ui/card.tsx`, `button.tsx`, `separator.tsx` — shadcn primitives already installed. `separator.tsx` suits the breakdown/total divider.
- `src/lib/constants.ts` — `BUSINESS` object holds the phone number used by the D-11 disclaimer.
- `lucide-react` 1.8.0 is installed — supplies the info icon for the D-10 ADAS note.

### Established Patterns
- Brand red via `text-primary` / `bg-primary`; palette is strictly white/red/black (Phase 1 D-05), so no amber/yellow warning colors are available for the ADAS note or error states — use muted gray or brand red.
- `motion/react` (not `framer-motion`) with `whileInView` + `viewport={{ root: scrollRef, once: true, amount: 0.3 }}` — the `root: scrollRef` prop is required because the snap container, not the window, is the scroll parent.
- Snap sections are `snap-start snap-always h-dvh` on the section, `overflow-y-auto snap-y snap-mandatory` on the container. Anything that grows past `h-dvh` breaks the snap experience — the D-07 swap decision exists specifically to avoid this.
- No form library is installed. `react-hook-form` and `zod` are in the stack research but not in `package.json`; Phase 2 D-43 chose plain `useState` for the single VIN field. The manual-entry form (D-17) is only two fields, so plain state remains reasonable.

### Integration Points
- `src/app/api/vin/[vin]/route.ts` — new Route Handler, the phase's central piece
- `src/lib/pricing.ts` — new pure function holding D-01..D-05
- `src/lib/vin.ts` — new NHTSA fetch + response parsing with the 6s `AbortController` timeout
- `src/lib/supabase/admin.ts` — new service-role client for `vin_cache`
- `src/types/vehicle.ts` — new shared types for the decoded vehicle and the estimate response (must carry all three glass variants per D-15)
- `src/components/home/EstimateSection.tsx` — rewired from placeholder to real flow
- No changes needed to `src/app/(public)/page.tsx` — the section is already mounted as snap section 2

</code_context>

<specifics>
## Specific Ideas

- The user reviewed the D-06 worked examples explicitly and confirmed they match what the business would quote by phone. The 2020 Camry at **$270–$580** — a 2.1× spread on the most common vehicle — was called out and accepted as the cost of being honest about the ADAS unknown. Do not narrow the range without asking.
- D-15's "return all three variants" choice was made partly to keep the pricing formula off the client. Treat the formula values as non-public: they must not appear in any client bundle.
- D-18 exists because the user wanted a mistyped VIN to be surfaced as a typo rather than silently absorbed by the fallback. The two failure paths are deliberately distinct — collapsing them into one is a regression, not a simplification.
- D-19 continues the pattern from D-13: when the system can't determine something, ask about exactly that one thing inline rather than guessing. Applies to vehicle type the same way it applies to glass type.
- The `±10%` band (D-05) is doing double duty — it prevents the degenerate single-number case for pre-2018 vehicles and it covers real moldings/clips/labor variance.

</specifics>

<deferred>
## Deferred Ideas

- **Admin-editable pricing** — the `pricing_config` table is already designed in `ARCHITECTURE.md` lines 280–310 but is explicitly a v2 concern. All values stay hardcoded in `lib/pricing.ts` this phase.
- **Gating the estimate behind a phone number** — capturing a lead before revealing the price was considered and not pursued; it would be a new capability rather than a clarification of this phase.
- **Rate-limiting the VIN proxy** — NHTSA soft-blocks IPs above roughly 10–15 req/s. Not addressed this phase; `vin_cache` absorbs repeat lookups of the same VIN, which is the common case. Revisit if traffic warrants it.
- **Carrying the estimate into the booking record** — passing the computed range and chosen glass type through to the appointment is Phase 4's concern.
- **Contact page VIN search** — Phase 4 (BOOK/CONT criteria) reuses this decoder on `/contact`. Building the result as a standalone reusable component is left to Claude's discretion so Phase 4 has an easier time.
- **Make/model on manual entry** — rejected for D-17 to keep the failure path to two fields. If the booking record later needs a vehicle description for manually-entered estimates, revisit in Phase 4.

</deferred>

---

*Phase: 03-vin-estimate*
*Context gathered: 2026-08-04*
