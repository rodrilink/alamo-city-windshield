# Phase 3: VIN Estimate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-04
**Phase:** 03-vin-estimate
**Areas discussed:** Price numbers, Result presentation, Windshield selector flow, Fallback experience

All four offered gray areas were selected for discussion.

---

## Price numbers

### Base price

| Option | Description | Selected |
|--------|-------------|----------|
| $250 | Aftermarket-glass, competitive-entry pricing; matches the Phase 2 placeholder floor | |
| $300 | Mid-market; leaves room for modifiers to stack, reads as quality install | ✓ |
| $350 | Premium / OEM-leaning; better margin but higher anchor means more top-of-funnel bounce | |

**User's choice:** $300

### Vehicle size modifier

| Option | Description | Selected |
|--------|-------------|----------|
| 3 buckets: +0 / +75 / +150 | Sedan/coupe/hatchback +$0, SUV/crossover/pickup +$75, van/oversized +$150 | ✓ |
| 4 buckets: +0 / +50 / +100 / +175 | More precise, but NHTSA BodyClass can't cleanly separate compact from midsize | |
| 2 buckets: +0 / +100 | Nearly impossible to map wrong, but loses the RAV4-vs-Sprinter distinction | |

**User's choice:** 3 buckets
**Notes:** Three tiers was framed as the sweet spot — mappable from BodyClass with confidence, and short enough to explain in the line-item breakdown.

### Windshield type modifier

| Option | Description | Selected |
|--------|-------------|----------|
| Standard +0 / Acoustic +100 / Heated +200 | Round increments; makes the selector feel meaningful | ✓ |
| Standard +0 / Acoustic +75 / Heated +150 | Gentler ladder, lower top-end totals, but selector matters less | |
| Standard +0 / Acoustic +125 / Heated +250 | Accurate for OEM glass but a heated van approaches $700 pre-calibration | |

**User's choice:** Standard +0 / Acoustic +100 / Heated +200

### ADAS calibration

| Option | Description | Selected |
|--------|-------------|----------|
| Range: +$0 low, +$250 high | Low assumes no calibration, high assumes it is; source of the range's width | ✓ |
| Flat +$250 on both ends | Simpler and margin-safe, but overcharges 2018+ vehicles with no camera | |
| Range: +$0 low, +$375 high | Covers dual static+dynamic calibration but a $300–$675 spread on a plain sedan reads as uncertainty | |

**User's choice:** Range +$0 low / +$250 high
**Notes:** Framed as the honest option — NHTSA reports model year, not whether a camera is actually fitted, so 2018+ is an inference rather than a fact.

### Range spread for pre-2018 vehicles

| Option | Description | Selected |
|--------|-------------|----------|
| ±10% baseline spread on every estimate | Consistent range on all vehicles; 10% covers moldings/clips/labor variance | ✓ |
| Flat +$75 high-end buffer | Simpler math, but the buffer is arbitrary and doesn't scale with vehicle cost | |
| Show a single price when there's no ADAS | Most precise, but two result layouts and single numbers invite quote disputes | |

**User's choice:** ±10% baseline spread
**Notes:** Raised proactively because the ADAS-only range would collapse to a single number for every pre-2018 vehicle — a degenerate case in a phase whose success criterion requires a range.

### Verification of the resulting numbers

| Option | Description | Selected |
|--------|-------------|----------|
| They look right — move on | Lock the formula as shown | ✓ |
| The ADAS spread is too wide | Revisit the 2018+ range or split calibration into a separate note | |
| Adjust a specific number | Change base, a size bucket, a glass type, ADAS, or the band | |

**User's choice:** Approved as-is
**Notes:** Six worked examples were presented as concrete quotes before locking. The 2020 Camry at $270–$580 (a 2.1× spread on the most common vehicle) was explicitly flagged and accepted.

---

## Result presentation

### Where the result renders

| Option | Description | Selected |
|--------|-------------|----------|
| Swap the form for the result in the same card | Stays within h-dvh on mobile; smallest change to the working Phase 2 layout | ✓ |
| Result slides up in a Sheet overlay | sheet.tsx already exists and scrolls independently, sidestepping overflow | |
| Result becomes its own snap section | Most room and most "product" feel, but runtime snap injection is fiddly cross-browser | |

**User's choice:** Swap the form for the result in the same card
**Notes:** ASCII mockups of all three were shown side by side. The driving constraint — surfaced during the codebase scout — is that the section is `h-dvh` inside a `snap-mandatory` container, and the real result carries far more content than the Phase 2 placeholder.

### Loading state

| Option | Description | Selected |
|--------|-------------|----------|
| Button becomes a spinner with "Decoding VIN…" | Minimal, no layout shift, least code | ✓ |
| Skeleton of the result card | Feels faster but adds states to unwind if the decode fails | |
| Spinner plus a reassurance line after 3s | Better on bad connections ahead of the 6s timeout, slightly more logic | |

**User's choice:** Button spinner

### ADAS line and notice

| Option | Description | Selected |
|--------|-------------|----------|
| Line item "up to $250" + info note below the breakdown | Ties the number directly to its explanation | ✓ |
| Amber callout banner above the breakdown | More prominent, but amber violates the locked white/red/black palette | |
| Line item only, with a tooltip on the label | Shortest card, but tooltips are missable on touch and criterion 5 wants a displayed notice | |

**User's choice:** Line item + info note
**Notes:** Mockups included. The amber option was annotated as conflicting with Phase 1 D-05.

### Estimate disclaimer

| Option | Description | Selected |
|--------|-------------|----------|
| One-line disclaimer + phone number | Sets expectations and keeps the phone path open; reuses BUSINESS.phone | ✓ |
| Disclaimer only, no phone | Keeps the card focused on the Book CTA | |
| No disclaimer — the range implies it | Shortest, but more exposure to "your site quoted me $270" | |

**User's choice:** Disclaimer + phone number
**Notes:** Prompted by the fact that Phase 2's "Estimates launching soon" hedge disappears once real dollar figures appear.

---

## Windshield selector flow

### Selector placement

| Option | Description | Selected |
|--------|-------------|----------|
| On the result, updating the price live | Keeps the form a single field; matches criterion 3's wording | ✓ |
| In the form, before submitting | First estimate is tailored, but asks an unanswerable question before delivering value | |
| Both — form defaults it, result lets you change it | Most flexible, but duplicates the control and grows an already tight card | |

**User's choice:** On the result

### Recompute mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| API returns all three variants; switching is instant | Zero latency, no extra requests, formula never ships to the browser | ✓ |
| Recompute client-side from lib/pricing.ts | Instant, but base price and modifiers become readable in the JS bundle | |
| Re-call the API with a type parameter | Formula stays server-side but adds a round-trip to a radio button | |

**User's choice:** Return all three variants
**Notes:** The pricing-confidentiality angle was the deciding framing — this choice keeps the formula values out of any client bundle.

### Helping users who don't know their glass type

| Option | Description | Selected |
|--------|-------------|----------|
| Standard preselected + one-line hint per option | Hints describe physically observable traits the customer can check | ✓ |
| Standard preselected, labels only | Shortest, but most people leave it on Standard without knowing if that's right | |
| Add a fourth "Not sure" option | Most honest, but stacked on ADAS a Camry would quote ~$270–$910 | |

**User's choice:** Standard preselected + per-option hints

---

## Fallback experience

### Manual entry fields

| Option | Description | Selected |
|--------|-------------|----------|
| Year + vehicle type only | Exactly what the formula needs; two taps to a real estimate | ✓ |
| Year + type + make/model text fields | More personal and useful downstream, but more fields when something already went wrong | |
| No manual estimate — route to phone and contact | Zero bad-data risk, but abandons a ready buyer and conflicts with criterion 4 | |

**User's choice:** Year + vehicle type only
**Notes:** Mockups included. The framing that made this tractable: the formula only ever consumes model year and size bucket, so make and model are display-only.

### Rejected VIN vs. timeout

| Option | Description | Selected |
|--------|-------------|----------|
| Separate message: "check your VIN" + manual entry link | NHTSA answered, so a typo is likely — let the user fix it first | ✓ |
| Treat identically — anything non-success goes to manual entry | One code path, but silently absorbs typos | |
| Auto-retry once, then manual entry | A bad VIN doesn't improve on retry, and NHTSA soft-blocks IPs that hammer it | |

**User's choice:** Separate message with a secondary manual-entry link

### Unmappable body class

| Option | Description | Selected |
|--------|-------------|----------|
| Show the result with vehicle type as a selector, like glass | Asks about the one unknown instead of guessing; reuses the selector pattern | ✓ |
| Default to Car (+$0) silently | Cleanest UI, but "Incomplete Vehicle" usually means the oversized case | |
| Default to SUV/Truck (+$75) silently | Margin hedge, but quietly adds $75 to cars with unpopulated body class | |

**User's choice:** Vehicle type as a live selector
**Notes:** Raised proactively — NHTSA BodyClass values are messy ("Incomplete Vehicle", "Truck-Tractor", "Low Speed Vehicle (LSV)") and this third failure mode wasn't covered by the roadmap's criteria.

### Labeling manual estimates

| Option | Description | Selected |
|--------|-------------|----------|
| Same layout, one added line noting it's based on your input | One component, one visual language, clear about self-reported data | ✓ |
| Identical — no distinction at all | Simplest, but you can't later tell verified from self-reported | |
| Visually softer — wider range or "rough estimate" heading | Honest-feeling, but the inputs are identical so widening would be theatre | |

**User's choice:** Same layout with a source line

---

## Claude's Discretion

The user did not select "you decide" on any question. The following were deliberately assigned to Claude in CONTEXT.md as implementation-level rather than business-level:

- Price rounding convention (nearest dollar vs nearest $5)
- The full NHTSA `BodyClass` → size bucket mapping table and unmappable-value detection
- `@shaggytools/nhtsa-api-wrapper` vs raw `fetch` + `AbortController`
- Selector control style (segmented buttons vs radio cards), within the palette
- Whether the price animates or cuts on selector change
- Form → result swap animation, consistent with the existing `motion/react` pattern
- `vin_cache` TTL (decoded data is immutable per VIN)
- Whether to build the result as a standalone component anticipating Phase 4 reuse
- Exact wording of the disclaimer, glass hints, and ADAS note (intent specified)

## Deferred Ideas

- **Admin-editable pricing** (`pricing_config` table) — already designed in ARCHITECTURE.md but an explicit v2 concern
- **Gating the estimate behind a phone number** — offered as a consideration, not pursued; a new capability rather than a clarification
- **Rate-limiting the VIN proxy** — NHTSA soft-blocks above ~10–15 req/s; `vin_cache` covers the common repeat case
- **Carrying the estimate into the booking record** — Phase 4
- **Contact page VIN search** — Phase 4; reuse eased via the discretion item above
- **Make/model on manual entry** — dropped from D-17 to keep the failure path short; revisit in Phase 4 if the booking record needs a vehicle description

### Areas offered but not explored

At the closing gate the user chose to proceed rather than open these:

- Whether the estimate component is built for Phase 4 contact-page reuse
- `vin_cache` entry lifetime
- Rate-limiting the proxy
- Whether the Book CTA carries the estimate forward into booking

All four are recorded above as discretion items or deferred ideas.
