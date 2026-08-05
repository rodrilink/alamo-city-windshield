# Phase 4: Booking & Contact - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-05
**Phase:** 04-booking-contact
**Areas discussed:** Slot generation & availability, Double-booking race handling, Booking abuse protection, Contact page composition

---

## Area selection

All four proposed gray areas were selected for discussion.

| Option | Description | Selected |
|--------|-------------|----------|
| Slot generation & availability | Slot length, lead time, booking window, live vs cached availability | ✓ |
| Double-booking race handling | What the losing user sees when the UNIQUE constraint rejects an insert | ✓ |
| Booking abuse protection | `bookings` has public_insert RLS; how far to go on protection now | ✓ |
| Contact page composition | VIN search placement, and whether an estimate leads into booking | ✓ |

---

## Slot generation & availability

### Q1 — Slot length

| Option | Description | Selected |
|--------|-------------|----------|
| 90 minutes | Full replacement incl. adhesive cure. ~6 slots Mon–Fri, 3 Sat | ✓ |
| 60 minutes | Standard replacement, thinner buffer. 10 slots Mon–Fri | |
| 2 hours | Covers replacement + ADAS recalibration. 5 slots Mon–Fri | |
| You decide | Claude picks from the pricing model | |

**User's choice:** 90 minutes
**Notes:** Research presented beforehand noted that windshield replacement is typically 60–90 min including cure time, and that slots shorter than the job create overlapping commitments.

### Q2 — Saturday's partial slot (9:00–2:00 doesn't divide by 90 min)

| Option | Description | Selected |
|--------|-------------|----------|
| Only slots that fit fully | Sat = 9:00, 10:30, 12:00. No slot may end after closing | ✓ |
| Allow last slot past close | Adds a 1:30 slot ending at 3:00, an hour past posted close | |
| You decide | Claude applies the fits-fully rule as a general invariant | |

**User's choice:** Only slots that fit fully
**Notes:** Raised proactively — the arithmetic gap (5 hours ÷ 90 min leaves 30 min) would otherwise have been resolved silently by whoever implemented it. Recorded as a general invariant rather than a Saturday special case.

### Q3 — Lead time and booking window

| Option | Description | Selected |
|--------|-------------|----------|
| 24h lead, 30 days ahead | A day to order the specific glass the VIN identified | |
| 48h lead, 60 days ahead | Safer on parts sourcing for uncommon vehicles | |
| Same-day allowed, 30 days ahead | Maximum convenience; captures urgent cracked-windshield customers | ✓ |
| You decide | Claude picks 24h/30 days | |

**User's choice:** Same-day allowed, 30 days ahead
**Notes:** Claude flagged the consequence rather than letting it pass silently — because the VIN decode identifies the exact glass, a same-day booking may arrive before that windshield is in stock. User accepted; handled by phone follow-up using the existing `status`/`notes` columns.

### Q4 — Slots already past on today's date

| Option | Description | Selected |
|--------|-------------|----------|
| Hide past slots, live clock | Only future slots offered today | |
| Show them disabled | Same visual treatment as booked slots | ✓ |
| Add a small buffer | Hide past slots plus the next one starting soon | |
| You decide | Claude picks hide-with-buffer | |

**User's choice:** Show them disabled
**Notes:** Reuses one disabled state for two reasons, simplifying the UI. Claude added a non-negotiable constraint: the *server* must decide what "past" means, in `America/Chicago`, because a wrong or manipulated browser clock would otherwise allow booking a slot that has already gone.

### Q5 — How the calendar learns which slots are booked

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch per selected date | One small query per interaction, always current | |
| Fetch the visible month upfront | Enables disabling fully-booked dates on the grid | |
| Month upfront + refresh on select | Grid signal plus freshest slot list; two query paths | ✓ |
| You decide | Claude picks based on BOOK-03 | |

**User's choice:** Month upfront + refresh on select
**Notes:** The refresh-on-select path is reused by the race-collision handling decided in the next area, so it is not additional machinery.

---

## Double-booking race handling

### Q1 — What the losing user sees

| Option | Description | Selected |
|--------|-------------|----------|
| Message + refreshed slots | Stay on the form, refresh availability, preserve entered data | ✓ |
| Message + back to calendar | Return to month view; simpler, but loses their place | |
| Message only | Satisfies the criterion literally; leaves a stale slot list | |
| You decide | Claude specifies message-plus-refresh | |

**User's choice:** Message + refreshed slots
**Notes:** Research beforehand established the correct pattern is attempt-insert-and-catch, never check-then-insert, because any read-then-write has a race window.

### Q2 — Non-race failures (network, unreachable, bad payload, RLS)

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct message, keep data | Only `23505` means slot taken; others get their own message and do not disable the slot | ✓ |
| Same message for all failures | Simplest, but tells the customer something false during an outage | |
| You decide | Claude specifies code-23505-only | |

**User's choice:** Distinct message, keep data
**Notes:** Explicitly mirrors the D-17/D-18 lesson from Phase 3 — different failures deserve different screens, and a fixable problem must never be disguised as a permanent one.

### Q3 — Confirmation screen content (BOOK-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Details + what happens next | Date/time/vehicle plus "we'll call you" and the shop phone | ✓ |
| Details only | Clean, but the customer leaves with no artifact | |
| Details + booking reference | Adds the row UUID; unfriendly and no lookup UI exists in v1 | |
| You decide | Claude specifies details plus what-happens-next | |

**User's choice:** Details + what happens next
**Notes:** Weighted by the fact that email confirmation is V2-05 and out of scope, so the confirmation screen is the customer's only signal that the booking is real.

### Q4 — Booking row field values

| Option | Description | Selected |
|--------|-------------|----------|
| pending + decoded vehicle | `status: 'pending'`, store both `vin` and denormalised `vehicle_desc` | ✓ |
| pending, VIN only | Avoids duplication; forces Phase 5 admin to re-decode every VIN | |
| You decide | Claude specifies both fields | |

**User's choice:** pending + decoded vehicle
**Notes:** A deliberate denormalisation — one text column saves Phase 5's recent-bookings table from adding NHTSA calls (and rate-limit exposure) to an internal admin page load.

---

## Booking abuse protection

Claude raised this area proactively in the opening analysis, before the gray-area selection: `bookings` carries `public_insert` RLS with `WITH CHECK (true)`, so unauthenticated inserts write to the real schedule, and the `UNIQUE` constraint means each scripted insert permanently blocks a slot from real customers until manually deleted.

### Q1 — How far to go this phase

| Option | Description | Selected |
|--------|-------------|----------|
| Honeypot on booking too | Cheap, no new dependencies; stops naive bots | ✓ |
| Honeypot + per-phone limit | Also rejects N pending bookings from one phone; uses existing Postgres | |
| Accept the risk, defer | Contact-form honeypot only, document as residual risk | |
| You decide | Claude picks honeypot plus per-phone limit | |

**User's choice:** Honeypot on booking too
**Notes:** Research noted that Vercel serverless has no shared memory, so genuine rate limiting needs external state (Upstash Redis) or a Postgres counter table. Residual risk explicitly recorded: a targeted script that skips the honeypot can still occupy slots.

### Q2 — Where the booking honeypot lives

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side only, never stored | No schema migration needed | |
| Add a honeypot column to bookings | Mirrors `contacts`; requires editing the un-pushed migration | |
| You decide | Claude decides | ✓ |

**User's choice:** You decide → Claude chose **server-side only, no schema change**
**Notes:** The Phase 01 migration has not been pushed to a live database, so adding a column means editing a pending migration to store junk that would never be read. `contacts` keeps its existing column since that migration is already written.

### Q3 — Write path

| Option | Description | Selected |
|--------|-------------|----------|
| Server Actions | CONT-04 already locks this for contacts; one pattern for both | ✓ |
| Route Handlers for both | Matches Phase 3, but contradicts CONT-04 | |
| You decide | Claude specifies Server Actions | |

**User's choice:** Server Actions
**Notes:** Differs from Phase 3's Route Handlers, but those were GETs consumed by client `fetch` — a genuinely different case. Splitting patterns inside one phase would be worse.

### Not asked, but recorded

When the user advanced past this area, Claude captured one item from the unasked follow-ups rather than dropping it: **the server must re-validate that a submitted slot is legal** (inside business hours, on the 90-minute grid, not Sunday). Neither the honeypot nor the `UNIQUE` constraint prevents a crafted payload writing `appt_time = 03:00`. Recorded as D-15.

---

## Contact page composition

### Q1 — Where the calendar lives, and where the estimate CTA points

| Option | Description | Selected |
|--------|-------------|----------|
| Calendar on /contact, CTA scrolls to it | One page, no new route; /contact holds three things | |
| Dedicated /book route | Clean separation, shareable link; route not named in ROADMAP | ✓ |
| Calendar on /contact, stacked below | Simplest wiring; customer must scroll to find it | |
| You decide | Claude notes the ROADMAP names only /contact | |

**User's choice:** Dedicated /book route
**Notes:** Claude flagged honestly that this is slightly wider than the written ROADMAP scope, which names `/contact` and not `/book`, then proceeded on the user's decision. Judged a new *route* for in-scope capability rather than a new capability. Recorded in CONTEXT.md as an explicit scope note so the planner and verifier know it was chosen, not invented.

### Q2 — What stays on /contact

| Option | Description | Selected |
|--------|-------------|----------|
| Form + VIN search, estimate links to /book | Satisfies CONT-01/02; VIN not carried over | |
| Form + VIN search, estimate carries VIN to /book | Pre-fills the booking form's BOOK-06 fields | ✓ |
| Form only, VIN search on /book | Contradicts CONT-02, which requires it on the contact page | |
| You decide | Claude picks carrying the VIN | |

**User's choice:** Form + VIN search, estimate carries VIN to /book

### Q3 — How much to trust from the URL

| Option | Description | Selected |
|--------|-------------|----------|
| VIN only, server re-decodes | Tampering can supply only a VIN; identity always server-derived | ✓ |
| Pass VIN + vehicle description | Faster, but attacker-controlled text reaches the DB and Phase 5 admin UI | |
| You decide | Claude specifies VIN-only | |

**User's choice:** VIN only, server re-decodes
**Notes:** Extends Phase 3's D-15 principle — derived values are computed server-side, never accepted from the client. The extra decode is absorbed by `vin_cache`.

### Q4 — Page chrome for /contact and /book

| Option | Description | Selected |
|--------|-------------|----------|
| Normal-flow chrome, like /about | Ordinary scrolling, sticky nav, footer at bottom | ✓ |
| Snap-scroll like the home page | Visually consistent, but fights form scrolling | |
| You decide | Claude specifies normal-flow | |

**User's choice:** Normal-flow chrome, like /about
**Notes:** A calendar plus slot list plus form is exactly the taller-than-viewport content that produced the Phase 3 clipping bug (03-UAT test 14). Snap-scroll and the overlay nav stay home-page-only.

---

## Claude's Discretion

- **Booking honeypot storage** — user answered "you decide" on Q2 of abuse protection. Chose server-side-only rejection with no schema change, because the Phase 01 migration is still un-pushed and the stored value would never be read.
- **Slot-list layout, calendar styling, field ordering** — not discussed; standard shadcn/ui patterns are acceptable.
- **Exact copy wording** — beyond the required content in D-10 (phone number on failure) and D-11 (what-happens-next line), wording is Claude's, following the `ESTIMATE_COPY` constants pattern from Phase 3.

## Deferred Ideas

- Rate limiting on the booking write path — accepted residual risk this phase; needs external state on Vercel
- Per-phone booking limit — considered and set aside in favour of honeypot-only
- Blackout dates / holidays — `BUSINESS.hours` expresses weekly recurrence only
- Manual slot blocking by the shop owner — related to Phase 5 admin work
- Phone number format validation / normalisation — stored as free text
- Contact form `message` column — exists in the schema but is not among CONT-01's listed fields
- Email/SMS confirmation — V2-05, explicitly out of scope
- Customer booking lookup or cancellation — REQUIREMENTS.md rejects a customer account portal

## Offered but not taken

At the close, Claude offered five further gray areas (blackout dates, manual slot blocking, phone normalisation, the unused `message` column, and whether `/book` needs its own success page). The user chose to proceed to context instead. The first four are recorded as deferred ideas above; the fifth is left to planning.
