# Phase 4: Booking & Contact - Context

**Gathered:** 2026-08-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Customers can book an appointment through a visual calendar and submit contact requests, both
persisted to Supabase with double-booking structurally impossible.

Delivers: the booking calendar + slot picker + booking form + confirmation, the contact form, and
a VIN search on the contact page reusing the Phase 3 decoder.

Does NOT deliver: email/SMS confirmations (V2-05), customer accounts or a booking-lookup portal
(explicitly rejected in REQUIREMENTS.md), admin views of bookings (Phase 5), or analytics events
on these actions (Phase 6, ANLY-04/ANLY-05).

</domain>

<decisions>
## Implementation Decisions

### Slot generation

- **D-01:** Appointment slots are **90 minutes**. Chosen to cover a full windshield replacement
  including adhesive cure time, and to absorb the ADAS recalibration that `lib/pricing.ts` already
  prices for 2018+ vehicles. Yields ~6 slots on a Mon–Fri day and 3 on Saturday.
- **D-02:** **A slot is offered only if it ends at or before closing time.** Saturday (9:00–2:00)
  therefore offers 9:00, 10:30 and 12:00 — no 1:30 slot, because it would run to 3:00. This is a
  general invariant, not a Saturday special case: it must hold for any future change to
  `BUSINESS.hours` without new code.
- **D-03:** Slots are **generated server-side from `BUSINESS.hours`** in `src/lib/constants.ts`
  (Mon–Fri 8:00–6:00, Sat 9:00–2:00, Sun closed). Do NOT create a table of pre-materialised
  future slot rows — the schedule definition stays in one place.
- **D-04:** **Same-day booking is allowed**, and the calendar opens **30 days** ahead. Put both
  values in named constants so they can be tuned without hunting through logic.
  - *Known business tradeoff, accepted by the user:* because the VIN decode identifies the exact
    glass required, a same-day booking may arrive before that windshield is in stock. Handled by
    phone follow-up, not by code — the `status` and `notes` columns already exist for this.
- **D-05:** On today's date, slots whose start time has already passed are **shown disabled**, not
  hidden — the same visual treatment as booked slots, so one disabled state serves both reasons.
- **D-06:** **The server decides what "past" means, in `America/Chicago`.** San Antonio is Central.
  Browser clocks must never be trusted for this: a wrong or manipulated client clock would
  otherwise allow booking a slot that has already gone.

### Availability reads

- **D-07:** **Month-upfront plus refresh-on-select.** One query fetches the visible month's
  bookings so fully-booked dates can be disabled directly on the month grid (satisfies BOOK-03 at
  the date level); selecting a date re-fetches that day's booked times to drive the slot list.
  The refresh-on-select path is also reused by D-09.

### Double-booking

- **D-08:** **Attempt the insert and catch the violation. Never check-then-insert.** The
  `UNIQUE (appt_date, appt_time)` constraint (already in the Phase 01 migration) is the only real
  guarantee; any read-then-write has a race window.
- **D-09:** On a lost race, show "that slot was just taken — please pick another", **re-fetch that
  date's availability** so the taken slot renders disabled, and **preserve the customer's entered
  name/phone/VIN** so they only re-pick a time.
- **D-10:** **Only Postgres error code `23505` means "slot taken."** Any other failure (network
  drop, Supabase unreachable, invalid payload, RLS rejection) shows a *distinct* message including
  the business phone `(210) 555-0100`, preserves entered data, and **must NOT disable the slot** —
  it may still be free. This mirrors the D-17/D-18 lesson from Phase 3: different failures deserve
  different screens, and a fixable problem must never be disguised as a permanent one.
- **D-11:** The confirmation screen (BOOK-07) shows date, time, vehicle (if a VIN was decoded) and
  name, **plus an explicit "we'll call you at &lt;phone&gt; to confirm" line and the shop phone
  number.** This matters because email confirmation is V2-05 and out of scope — without it the
  customer otherwise leaves with no artifact and no idea whether the booking is real.

### Booking row contents

- **D-12:** A new booking writes `status: 'pending'` (you confirm by phone; nothing is 'confirmed'
  until you say so), keeps the `service_type` default of `'replacement'`, and when a VIN was
  decoded stores **both** the raw `vin` **and** a human-readable `vehicle_desc` such as
  `"2022 Ford F-150"`.
  - *Deliberate denormalisation:* one text column saves Phase 5's recent-bookings table from
    re-decoding every VIN on admin page load, which would add NHTSA calls and rate-limit exposure
    to an internal page.

### Write path and abuse protection

- **D-13:** Both writes go through **Next.js Server Actions**, not Route Handlers. CONT-04 already
  locks this for contacts, and splitting patterns inside one phase would be worse than differing
  from Phase 3 — whose Route Handlers were GETs consumed by client `fetch`, a genuinely different
  case. Keeps the service-role client server-side and gives react-hook-form native support.
- **D-14:** **A honeypot field guards the booking form as well as the contact form.** CONT-03 only
  requires it for contacts, but `bookings` carries `public_insert` RLS with `WITH CHECK (true)`,
  so unauthenticated inserts write to the real schedule — and the `UNIQUE` constraint means a
  scripted insert permanently blocks that slot from real customers until manually deleted.
- **D-15:** **The server must re-validate that a submitted slot is a legal slot** — inside business
  hours, aligned to the 90-minute grid, and not a Sunday — before inserting. Neither the honeypot
  nor the `UNIQUE` constraint prevents a crafted payload writing `appt_time = 03:00`.

### Contact page and booking route

- **D-16:** The booking calendar lives on a **dedicated `/book` route**. `EstimateResult`'s
  "Book Appointment" CTA is rewired from `/contact` (its Phase 3 placeholder target) to `/book`.
  - *Explicit scope note:* the ROADMAP's Phase 4 section names `/contact` and does not mention
    `/book`. The user chose this deliberately. It is a new **route** for capability already in
    scope, not a new capability — recorded here so the planner and verifier know it was decided,
    not invented.
- **D-17:** `/contact` holds the contact form (CONT-01) **and** the VIN search (CONT-02). A decoded
  estimate there renders the existing `EstimateResult`, whose CTA navigates to `/book`.
- **D-18:** The estimate CTA **carries the VIN to `/book`** so the booking form can pre-fill `vin`
  and `vehicle_desc` (the fields BOOK-06 wants).
- **D-19:** **Only the 17-character VIN travels in the URL**, validated against `VIN_REGEX`.
  `/book` **re-decodes server-side** to obtain year/make/model and build `vehicle_desc`. Never
  accept vehicle identity or any pricing from the URL — attacker-controlled `vehicle_desc` would
  be written to the database and later rendered in Phase 5's admin table. This extends Phase 3's
  D-15 principle: derived values are computed server-side, never supplied by the client. The extra
  decode is absorbed by `vin_cache`.
- **D-20:** Both `/contact` and `/book` use **normal-flow chrome** — the same
  `flex min-h-screen flex-col` + `TopNav` + `main.flex-1` + `Footer` structure `/about` uses. No
  snap-scroll and no overlay nav; those are deliberately home-page-only. A calendar plus slot list
  plus form is exactly the taller-than-viewport content that caused the Phase 3 clipping bug
  (03-UAT test 14), and snap-scroll fights form scrolling.

### Claude's Discretion

- **Booking honeypot storage:** rejected **server-side only, with no schema change.** The
  `contacts` table has a `honeypot` column but `bookings` does not, and the Phase 01 migration has
  **not been pushed to a live database yet** — adding a column now means editing a pending
  migration to store junk that would never be read. The booking Server Action returns early on a
  non-empty honeypot and writes nothing. `contacts` keeps its existing column since that migration
  is already written.
- Slot-list layout, calendar styling, and field ordering within the forms are unspecified —
  standard shadcn/ui patterns are fine.
- Copy wording for confirmations and error messages is unspecified beyond the required content in
  D-10 and D-11; put user-facing strings in a constants module as Phase 3 did with `ESTIMATE_COPY`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 4: Booking & Contact" — the goal, the 13 requirement IDs, and the
  5 success criteria this phase is measured against
- `.planning/REQUIREMENTS.md` — BOOK-01..BOOK-07 and CONT-01..CONT-06 in full; also the
  Out-of-Scope table (customer account portal, live chat) and V2-05 (email confirmation)

### Database schema (already exists — do NOT recreate)
- `supabase/migrations/20260412000000_initial_schema.sql` — creates `bookings` with `appt_date DATE`,
  `appt_time TIME`, `UNIQUE (appt_date, appt_time)`, `status`, `notes`, `vin`, `vehicle_desc`,
  `service_type`; and `contacts` with `honeypot`. **BOOK-04 and BOOK-05 are already satisfied at
  the schema level.** Both tables carry `public_insert` RLS with `WITH CHECK (true)` and
  authenticated-only SELECT/UPDATE/DELETE.
  - ⚠ This migration has **not been pushed to a live database** — see the blocker note below.

### Reusable Phase 3 assets
- `src/components/home/EstimateResult.tsx` — built deliberately reusable for this phase; its own
  header comment says "Phase 4 renders this same result from the contact page's VIN search". Takes
  `headline`, `headlineFollowsSizeBucket`, `estimates`, `adasApplies`, selector props and
  `basisNote`. Its CTA is the one D-16 rewires to `/book`.
- `src/lib/vin.ts` — NHTSA decode with a 6s budget; classifies responses by **field presence,
  never by `ErrorCode`** (pinned by a regression test in `src/lib/vin.test.ts`)
- `src/lib/vin-cache.ts` — failure-tolerant `vin_cache` read/write; degrades to a live decode on
  cache failure. Never caches failed lookups (D-21 of Phase 3).
- `src/lib/pricing.ts` — **`server-only`.** Must never be imported by a Client Component; doing so
  is a build error by design.
- `src/lib/supabase/admin.ts` — service-role client for server-side writes
- `src/types/vehicle.ts` — client-safe contract: `VIN_REGEX`, `isValidVin`, `SizeBucket`,
  `GlassType`, `EstimateMatrix`
- `src/lib/constants.ts` — `BUSINESS.hours` (drives D-01/D-02/D-03), `BUSINESS.phone`,
  `BUSINESS.phoneHref`, `ESTIMATE_COPY` (the copy-module pattern to follow)

### Prior-phase decisions that constrain this phase
- `.planning/phases/03-vin-estimate/03-CONTEXT.md` — D-15 (server-only pricing fence), D-17/D-18
  (distinct failure paths), and the estimate result contract
- `.planning/phases/03-vin-estimate/03-UAT.md` — test 14 documents the short-viewport clipping bug
  that D-20 exists to avoid repeating
- `.planning/phases/01-foundation/01-CONTEXT.md` — Supabase SSR pattern and the RLS-at-migration
  rule

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`EstimateResult`**: renders the full estimate card from props with no data fetching. Drop it
  straight into `/contact`'s VIN search result. No modification expected.
- **VIN decode stack** (`vin.ts` + `vin-cache.ts` + `/api/vin/[vin]`): CONT-02 says "same decoder
  as home", and the Route Handler already exists — the contact page's VIN search should call it
  rather than reimplementing decode logic.
- **`BUSINESS.hours`**: already the single source of truth for opening times; slot generation reads
  from it so changing hours changes the calendar with no other edit.
- **Form stack**: `react-hook-form` + `zod` + `@hookform/resolvers` are already dependencies, and
  shadcn `Form` primitives are the established wrapper. CONT-06 requires this combination.
- **shadcn Calendar / react-day-picker v9**: named by BOOK-01. **Verified not present:**
  `src/components/ui/calendar.tsx` does not exist, and neither `react-day-picker` nor `date-fns` is
  in `package.json`. See the new-dependencies note below — this is the one part of the phase that
  needs packages. Note this repo's shadcn primitives wrap **`@base-ui/react`**, not Radix (Base UI
  uses a `render` prop where Radix uses `asChild`), so verify the generated Calendar matches the
  local convention rather than pasting Radix-oriented docs.

### Established Patterns
- **Route group chrome is per-page.** `(public)/layout.tsx` is a bare passthrough since quick task
  260805-i19; `/about` and `/contact` each compose their own `TopNav` + `Footer`. `/book` must do
  the same (D-20). Do not reintroduce chrome into the layout — it would break the home page's
  overlay nav.
- **Server-only fence**: `src/lib/pricing.ts` carries `server-only`. Any pricing shown on `/book`
  must be computed server-side or passed as precomputed data, exactly as Phase 3 does.
- **Copy in constants**: `ESTIMATE_COPY` centralises user-facing strings. Follow it for booking and
  contact copy.
- **Distinct failure screens**: Phase 3 established that different failure causes get visibly
  different UI. D-10 applies the same rule to booking writes.

### Integration Points
- `EstimateResult`'s "Book Appointment" `<Link href="/contact">` → becomes `/book` (+ VIN param).
- `/contact/page.tsx` is currently a placeholder reading "Contact form will be added in a later
  phase" — it gets replaced wholesale.
- New Server Actions write to the existing `bookings` and `contacts` tables; no schema work is
  expected beyond what the Phase 01 migration already defines.
- Phase 5 will read `bookings` and `contacts` for the admin dashboard; Phase 6 adds
  `booking_created` and `contact_submit` analytics events. Neither is in scope here, but D-12's
  denormalised `vehicle_desc` exists specifically to serve Phase 5.

</code_context>

<specifics>
## Specific Ideas

- Saturday must offer exactly 9:00, 10:30 and 12:00 — the user confirmed the 1:30 slot is dropped
  rather than allowed to run past close.
- Past-and-booked slots should look the same (both disabled), rather than past slots vanishing.
- The confirmation screen must tell the customer they will receive a phone call, since there is no
  email confirmation in v1.
- Error copy on a failed booking should carry `(210) 555-0100` so a blocked customer has a way
  through.

</specifics>

<deferred>
## Deferred Ideas

- **Rate limiting on the booking write path** — a targeted script that skips the honeypot can still
  occupy slots, and the `UNIQUE` constraint makes each one permanently block a real customer until
  manually deleted. Vercel serverless has no shared memory, so real rate limiting needs external
  state (Upstash Redis) or a Postgres counter table. **Accepted residual risk for this phase**, in
  the same spirit as Phase 3's T-03-15. Revisit if abuse is observed.
- **Per-phone booking limit** — rejecting a booking when the same phone already has N pending
  bookings. Considered as the cheaper alternative to rate limiting; the user chose honeypot-only
  for now. No new infrastructure needed if revisited.
- **Blackout dates / holidays** — no way to close the shop for a specific date (Christmas, staff
  leave). `BUSINESS.hours` only expresses weekly recurrence.
- **Manual slot blocking by the shop** — the owner cannot reserve or block a slot from the UI.
  Related to the admin work in Phase 5.
- **Phone number format validation / normalisation** — phones are stored as free text; no
  canonical format is enforced, so `210-555-0100` and `(210) 555-0100` are different strings.
- **Contact form `message` field** — the `contacts` table has a `message` column that CONT-01 does
  not list among its fields. Left unused unless planning decides otherwise.
- **Email/SMS confirmation** — V2-05, explicitly out of scope.
- **Booking lookup / cancellation by the customer** — no portal exists; REQUIREMENTS.md rejects a
  customer account portal outright.

</deferred>

---

## ⚠ New dependencies required — needs owner approval

Unlike Phase 3's later plans, this phase **cannot be built with the current dependency set**.
Verified against `package.json` on 2026-08-05:

| Package | Why | Status |
|---|---|---|
| `react-day-picker` (^9) | BOOK-01 names shadcn Calendar, which is built on it. v9 is required for React 19 / Next 15 — v8 does not work. | **not installed** |
| `date-fns` (^4) | Peer dependency of react-day-picker v9. | **not installed** |

`src/components/ui/calendar.tsx` also does not exist and must be generated.

This project has an established package-approval gate — Phase 3's plan `03-01` existed solely to
clear two packages with the owner before any install ran. **Planning should open with the same gate
for these two**, before any task that imports them. Both are named in PROJECT.md's recommended
stack, so this is a confirmation step rather than an open question.

No other new dependencies are anticipated: `react-hook-form`, `zod` and `@hookform/resolvers` are
already installed, and D-13 uses built-in Server Actions rather than a data-fetching library.

---

## ⚠ Blocker affecting this phase

**No Supabase project and no `.env.local` exist.** The Phase 01 migration is written and committed
but has never been pushed to a live database — this is the root cause of 4 outstanding Phase 01
verification items and the blocked `vin_cache` test in Phase 03 (03-UAT test 15).

Phase 4 is the point where this stops being deferrable: **every success criterion in this phase
requires writing to or reading from Supabase.** A booking that cannot be saved cannot be verified,
and the double-booking guarantee in D-08 depends on a real `UNIQUE` constraint in a real database.

Recommended before executing this phase: create the Supabase project, set `.env.local`, and run
`supabase link && supabase db push`.

---

*Phase: 04-booking-contact*
*Context gathered: 2026-08-05*
