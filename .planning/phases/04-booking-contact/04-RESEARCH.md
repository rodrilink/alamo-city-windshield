# Phase 4: Booking & Contact - Research

**Researched:** 2026-08-05
**Domain:** Next.js 15 Server Actions, react-day-picker calendar UI, Supabase constraint-based concurrency, timezone-correct server date logic
**Confidence:** HIGH

## Summary

This phase has one real unknown (the shadcn Calendar under this repo's Base UI setup) and the rest is
disciplined application of patterns Phase 3 already established. The Calendar unknown resolves cleanly:
**the shadcn Calendar component itself contains zero Base UI or Radix primitives** — it is a pure
`react-day-picker` wrapper that only touches the local shadcn `Button` (already Base UI-based in this
repo) and `cn`. There is no Radix/Base UI conflict to reconcile. The one code change needed is removing a
shadcn-playground-only `IconPlaceholder` import that the registry ships by mistake for local installs.

The second correction to CONTEXT.md's assumptions: `npx shadcn@latest add calendar`'s registry manifest
pins `react-day-picker@latest`, which today resolves to **v10.0.1**, not v9. This is not a blocker — the
v8→v10 upgrade guide is explicit that `mode`, `selected`/`onSelect`, `disabled`, `modifiers`, `month`/
`onMonthChange`, and `timeZone` are unchanged core APIs; only deprecated v9 props (`fromDate`, `toDate`,
`initialFocus`, etc.) were removed. None of those deprecated props are needed for this phase's slot
picker. Plan against v10, not v9.

Everything else follows Phase 3's established shape: Server Actions replace Route Handlers for writes
(per D-13), the Postgres `23505` code is the sole "slot taken" signal (confirmed against the actual
`PostgrestError` class shipped in `postgrest-js`), and `Intl.DateTimeFormat` with an explicit
`timeZone: 'America/Chicago'` gives a zero-dependency, Vercel-safe server "now" — no `@date-fns/tz`
install needed, and no reliance on the server's local clock (which is UTC on Vercel by default anyway).

**Primary recommendation:** Install `react-day-picker@^10` + `date-fns@^4`, run `npx shadcn@latest add
calendar`, delete its `IconPlaceholder` import in favor of `lucide-react`, generate slots server-side from
`BUSINESS.hours` with a pure function, gate every write behind attempt-insert-and-catch-`23505` inside a
Server Action, and derive "today" exclusively via `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', ... })`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Calendar month grid rendering | Browser / Client | — | `react-day-picker` is a client-rendered interactive widget; keyboard nav and click handling require the DOM |
| Slot generation from `BUSINESS.hours` | API / Backend | — | D-03 requires server-side generation as the single source of truth; a client-computed slot list could be spoofed and re-derives nothing from a table |
| Month-level booked-date lookup | API / Backend | Database | Server Action (or Server Component data fetch) queries `bookings` for the visible month range, returns booked dates to the client for the `disabled` matcher |
| Day-level slot availability | API / Backend | Database | Same query pattern, scoped to one date, triggered on date select (D-07 refresh-on-select) |
| "What time is it in America/Chicago" | API / Backend | — | D-06 explicitly forbids trusting the browser clock; must be computed server-side and shipped down as data (which slots are disabled), never trusted from client input |
| Booking write + double-booking guard | API / Backend | Database | Server Action attempts the insert; the `UNIQUE (appt_date, appt_time)` constraint in Postgres is the actual guarantee (D-08) |
| Slot re-validation before insert | API / Backend | — | D-15: server must independently re-derive that a submitted slot is legal (business hours, 90-min grid, not Sunday) — never trust the client's slot list |
| Contact form write | API / Backend | Database | Server Action, same shape as booking write, no concurrency concern |
| VIN re-decode on `/book` | API / Backend | Database (`vin_cache`) | D-19: only the VIN string travels in the URL; `/book` re-decodes server-side via the existing `vin.ts` + `vin-cache.ts` stack, never trusts client-supplied vehicle identity |
| Honeypot check | API / Backend | — | Must reject silently server-side before any write; a client-side-only check is trivially bypassed |
| Form validation (Zod schema) | Browser / Client | API / Backend | Same Zod schema runs client-side (react-hook-form resolver, fast feedback) and server-side inside the Server Action (untrusted-input gate) — this is the standard double-validation pattern, not duplication |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-day-picker` | `^10.0.1` [VERIFIED: npm registry] | Calendar month grid, date selection, disabled-date matchers | The library shadcn's own Calendar wraps; actively maintained, current release 2026-05-15; peer dep is only `react >=16.8.0`, compatible with React 19 |
| `date-fns` | `^4.4.0` [VERIFIED: npm registry] | Date arithmetic (add days for the 30-day window, format ISO date strings) | Peer/sibling dependency the shadcn Calendar registry entry itself declares; tree-shakeable, already the project's stated stack choice |
| `@base-ui/react` | `1.3.0` (already installed) | Underlying primitive for `Button` (used inside the generated Calendar) | No new install — Calendar only reaches Base UI transitively through the already-installed `Button` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` | already installed | Booking + contact form state | Both forms; already the project's chosen form library (CONT-06) |
| `zod` | already installed | Shared client/server validation schema | Define once per form, reuse the same schema in the Server Action |
| `@hookform/resolvers` | already installed | Bridges Zod schema into `useForm({ resolver })` | Both forms |
| `lucide-react` | already installed (`1.8.0`) | Calendar chevron icons, replacing the registry's `IconPlaceholder` | Swap-in replacement — see Pitfall 1 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Intl.DateTimeFormat` for server "now" | `@date-fns/tz`'s `TZDate` | `@date-fns/tz` gives a nicer `Date`-like object API, but it's a new dependency for something `Intl` already does natively in every Node runtime Vercel ships (V8-based) — no version/registry risk, zero install |
| Attempt-insert-and-catch (D-08) | Check-then-insert (`SELECT` availability, then `INSERT`) | Explicitly rejected by the user — any check-then-insert has a TOCTOU race window; the `UNIQUE` constraint is the only real guarantee under concurrent requests |
| Server Actions for writes (D-13) | Route Handlers (as Phase 3 used for GETs) | User-locked; Route Handlers remain correct for the idempotent, cacheable VIN GET, but writes get native react-hook-form + `useActionState` integration from Server Actions |

**Installation:**
```bash
npm install react-day-picker date-fns
npx shadcn@latest add calendar
```

**Version verification:** Confirmed live against the npm registry on 2026-08-05:
- `react-day-picker`: latest `10.0.1`, published 2026-05-15 [VERIFIED: npm registry]
- `date-fns`: latest `4.4.0` [VERIFIED: npm registry]
- Both packages passed `slopcheck` with `[OK]` verdicts (see audit below).

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `react-day-picker` | npm | Long-standing (v8 line since ~2023, v10.0.1 published 2026-05-15) | `github.com/gpbl/react-day-picker` | `[OK]` | Approved |
| `date-fns` | npm | Long-standing, one of the most widely-used JS date libraries | Not linked in npm metadata (slopcheck flagged "no source repository linked" as a verification note, not a failure) | `[OK]` | Approved — cross-verified independently: `date-fns` is a top-tier, multi-year, widely audited package; missing repo-URL metadata on the npm listing is a known cosmetic gap in that package's `package.json`, not a legitimacy signal |

**Packages removed due to slopcheck `[SLOP]` verdict:** none
**Packages flagged as suspicious `[SUS]`:** none

Both packages are named in the project's own `CLAUDE.md` recommended stack and in CONTEXT.md's
pre-approved dependency table — this audit is confirmation, not a new decision. Per the roadmap's own
Phase 3 precedent (plan `03-01`), the planner should still open with an explicit package-approval task
before any import, since this project has an established gate for new dependencies.

## Architecture Patterns

### System Architecture Diagram

```
Browser                          Server (Next.js)                      Supabase (Postgres)
--------                          -----------------                      -------------------

/book page load
    │
    ├─► Server Component fetch ──► query bookings WHERE
    │   (month range)              appt_date IN [visible month]  ──►  bookings table
    │                              + compute server "now" via
    │                              Intl.DateTimeFormat(America/Chicago)
    │                                     │
    │◄──────────────────────────── booked dates + server "now" ◄──┘
    │
[Calendar renders, past/booked dates disabled via `disabled` matcher]
    │
User clicks a date
    │
    ├─► Server Action / fetch ───► query bookings WHERE
    │   (day detail, D-07)          appt_date = selected  ─────►  bookings table
    │                              + generateSlots(BUSINESS.hours, date)
    │                              - booked times = available slots
    │◄──────────────────────────── slot list (booked times marked) ◄──┘
    │
[Slot list renders; past-today slots + booked slots both disabled]
    │
User fills form, submits
    │
    ├─► Server Action ───────────► 1. honeypot check (reject silently if filled)
    │   (react-hook-form           2. Zod re-validation (untrusted input)
    │    + useActionState)         3. re-validate slot legality (D-15):
    │                                 within BUSINESS.hours, on 90-min grid, not Sunday
    │                              4. INSERT booking (status='pending') ────►  INSERT ──┐
    │                                                                                     │
    │                              5a. success → return confirmation data          UNIQUE (appt_date, appt_time)
    │                              5b. error.code === '23505' → "slot taken",             │
    │                                  re-fetch day availability                    23505 violation ◄─┘
    │                              5c. any other error → distinct message +
    │                                  business phone, do NOT disable slot
    │◄──────────────────────────── confirmation | slot-taken | generic-error
    │
[Confirmation screen (BOOK-07) OR re-rendered form with preserved values (D-09)]


/contact page load
    │
[Contact form + VIN search field render together, normal-flow chrome (D-20)]
    │
User enters VIN → client fetch to existing /api/vin/[vin] (Phase 3, reused verbatim per CONT-02)
    │◄──────────────────────────── VinLookupResponse
    │
[EstimateResult renders inline; its CTA now points to /book?vin=<17-char-vin> per D-16/D-18]

User submits contact form
    │
    ├─► Server Action ───────────► 1. honeypot check
    │                              2. Zod re-validation
    │                              3. INSERT contacts row ──────────────►  contacts table
    │◄──────────────────────────── confirmation | generic-error
```

### Recommended Project Structure
```
src/
├── app/
│   ├── (public)/
│   │   ├── book/
│   │   │   └── page.tsx            # Server Component: reads ?vin=, re-decodes, fetches month data
│   │   └── contact/
│   │       └── page.tsx            # replaces the Phase 3 placeholder wholesale
│   └── api/
│       └── vin/[vin]/route.ts      # UNCHANGED — reused by /contact's VIN search
├── components/
│   ├── booking/
│   │   ├── BookingCalendar.tsx     # 'use client' — wraps shadcn Calendar, month state, disabled matcher
│   │   ├── SlotList.tsx            # 'use client' — renders slots for the selected date
│   │   ├── BookingForm.tsx         # 'use client' — react-hook-form + useActionState wiring
│   │   └── BookingConfirmation.tsx # presentational, D-11 content
│   ├── contact/
│   │   ├── ContactForm.tsx         # 'use client' — react-hook-form + useActionState wiring
│   │   └── ContactVinSearch.tsx    # reuses EstimateResult from Phase 3
│   └── ui/
│       └── calendar.tsx            # generated by shadcn CLI, patched to drop IconPlaceholder
├── lib/
│   ├── booking/
│   │   ├── slots.ts                # pure: generateSlotsForDate(date, hours) -> Slot[] (D-01..D-03)
│   │   ├── booking-actions.ts      # 'use server' — createBooking Server Action (D-08..D-15)
│   │   └── booking-availability.ts # server-only: fetch booked dates/times for a month or day
│   ├── contact/
│   │   └── contact-actions.ts      # 'use server' — createContact Server Action
│   ├── server-time.ts              # getBusinessNow(): Intl.DateTimeFormat wrapper (D-06)
│   └── constants.ts                 # add BOOKING_COPY / CONTACT_COPY alongside ESTIMATE_COPY
└── types/
    └── booking.ts                   # Slot, BookingFormValues, BookingActionState, ContactFormValues
```

### Pattern 1: Server-side slot generation from `BUSINESS.hours` (D-01, D-02, D-03)

**What:** A pure function that reads the existing `BUSINESS.hours` array and produces a list of
90-minute slot start times for a given date, dropping any slot whose end time would exceed closing.
**When to use:** Called both when building the day-detail slot list and when server-validating a
submitted slot (D-15) — the same function must back both paths so they can never disagree.

```typescript
// Source: derived from BUSINESS.hours shape already in src/lib/constants.ts
// (own reasoning — no external library covers "slots that fit before closing")

const SLOT_DURATION_MINUTES = 90

interface DayHours {
  openMinutes: number   // minutes since midnight
  closeMinutes: number
}

function resolveDayHours(date: Date): DayHours | null {
  const weekday = date.getDay() // 0 = Sunday .. 6 = Saturday
  // Map BUSINESS.hours ('Mon–Fri' | 'Sat' | 'Sun') to this weekday.
  // Returns null for Sunday (closed) — D-03 invariant, no special-casing elsewhere.
  // ... resolves the matching entry, parses '8:00 AM' / '6:00 PM' into minutes-since-midnight
}

export function generateSlotsForDate(date: Date): string[] /* 'HH:mm' 24h strings */ {
  const hours = resolveDayHours(date)
  if (hours === null) return []

  const slots: string[] = []
  for (let start = hours.openMinutes; start + SLOT_DURATION_MINUTES <= hours.closeMinutes; start += SLOT_DURATION_MINUTES) {
    slots.push(minutesToTimeString(start))
  }
  return slots
}
```

The `start + SLOT_DURATION_MINUTES <= hours.closeMinutes` guard is D-02's general invariant expressed
directly: it drops any slot that would run past closing for *any* hours configuration, including a
future change to `BUSINESS.hours`, with no Saturday-specific branch.

### Pattern 2: Server "now" in a fixed IANA timezone, zero dependencies (D-06)

**What:** Compute the current Central-time date/time on the server without trusting the local clock's
timezone (Vercel serverless defaults to UTC) and without a new date-timezone library.
**When to use:** Anywhere "is this slot in the past" or "what is today's date" is decided — never on
the client.

```typescript
// Source: MDN Intl.DateTimeFormat + verified live in this repo's Node runtime (2026-08-05)
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

const BUSINESS_TIME_ZONE = 'America/Chicago'

/** Returns the current date/time, decomposed as Central-time parts. Never derived from `new Date()`
 *  directly without the `timeZone` option — the server process itself runs in UTC on Vercel. */
export function getBusinessNowParts(): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour), // Intl can emit '24' for midnight in hour12:false
    minute: Number(parts.minute),
  }
}
```

Verified live in this repo's Node 24 runtime: `formatToParts` on `Intl.DateTimeFormat('en-US', {
timeZone: 'America/Chicago', ... })` correctly returns Chicago-local wall-clock parts regardless of the
host machine's own timezone [VERIFIED: tested directly in this session's environment]. Vercel's Node
runtime ships full ICU data, so no `full-icu` polyfill or `Intl` shim is required [CITED: multiple
sources agree Vercel serverless functions default to UTC and ship complete `Intl`/ICU support].

**Comparing a Postgres `appt_date DATE` + `appt_time TIME` pair against this "now":** compare
year/month/day to `appt_date` first; only compare hour/minute against `appt_time` when `appt_date`
equals today. Do not construct a JS `Date` by concatenating the DB's `DATE`/`TIME` strings and letting
the runtime apply an implicit timezone — that reintroduces exactly the bug D-06 exists to prevent.

### Pattern 3: `react-day-picker` v10 disabled-dates and month tracking (BOOK-01, BOOK-03, D-05, D-07)

**What:** Feed the Calendar a computed set of "unavailable" dates (fully-booked + past-today) via the
`disabled` prop's function-matcher form, and track the visible month via `month`/`onMonthChange` to
drive D-07's month-upfront fetch.
**When to use:** `BookingCalendar.tsx`, client-side.

```typescript
// Source: react-day-picker Matcher type (github.com/gpbl/react-day-picker,
// packages/react-day-picker/src/types/shared.ts, main branch — fetched 2026-08-05)
// Core Matcher shape is unchanged v8 through v10 per the official upgrade guide.

import { Calendar } from '@/components/ui/calendar'

function BookingCalendar({
  fullyBookedDates,   // Set<string> of 'yyyy-MM-dd', from the month-level query
  serverToday,        // { year, month, day } from getBusinessNowParts()
  month,
  onMonthChange,
  selected,
  onSelect,
}: BookingCalendarProps) {
  return (
    <Calendar
      mode="single"
      month={month}
      onMonthChange={onMonthChange}   // drives the D-07 month-upfront re-fetch
      selected={selected}
      onSelect={onSelect}
      disabled={(date) => {
        const iso = toIsoDateString(date) // 'yyyy-MM-dd', local calendar date — NOT date.toISOString()
        if (fullyBookedDates.has(iso)) return true
        if (isBeforeServerToday(date, serverToday)) return true        // past dates
        if (isAfterWindow(date, serverToday, /* 30 days */ 30)) return true // D-04 30-day window
        return date.getDay() === 0 // Sunday closed — belt-and-suspenders with BUSINESS.hours
      }}
    />
  )
}
```

**Critical gotcha:** never use `date.toISOString()` to key a date against Central-time business logic —
`toISOString()` converts to UTC first, which shifts the calendar day near midnight. Build the `'yyyy-MM-dd'`
key from the `Date` object's local getters (`getFullYear()`/`getMonth()`/`getDate()`), since
`react-day-picker` constructs its internal `Date` objects from the calendar grid in the browser's local
time, not UTC.

### Pattern 4: Server Actions + react-hook-form + `useActionState` (D-08, D-09, D-13)

**What:** The canonical current wiring for combining client-side react-hook-form validation with a
Server Action, preserving entered values and surfacing a distinct "slot taken" state on a failed submit.
**When to use:** Both `BookingForm.tsx` and `ContactForm.tsx`.

```typescript
// Source: pattern verified against Next.js 15 / React 19 useActionState docs and
// markus.oberlehner.net "Using react-hook-form with React 19, useActionState, and
// Next.js 15 App Router" (2026) — cross-checked against the official React 19
// useActionState reference. [CITED]

// --- src/lib/booking/booking-actions.ts ---
'use server'

export type BookingActionState = {
  status: 'idle' | 'success' | 'slot-taken' | 'error'
  values: BookingFormValues        // preserved on every non-success outcome (D-09)
  fieldErrors?: Partial<Record<keyof BookingFormValues, string>>
  message?: string                 // D-10's distinct copy, includes BUSINESS.phone on 'error'
}

export async function createBooking(
  prevState: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  // 1. honeypot (D-14) — reject silently, return as if nothing happened
  // 2. parse + Zod-validate formData -> values
  // 3. re-derive slot legality from generateSlotsForDate (D-15) — reject a crafted appt_time
  // 4. attempt insert with createAdminClient() (D-08)
  const { error } = await supabase.from('bookings').insert({ ...values, status: 'pending' })

  if (error?.code === '23505') {
    return { status: 'slot-taken', values, message: BOOKING_COPY.slotTakenMessage }
  }
  if (error) {
    return { status: 'error', values, message: `${BOOKING_COPY.genericErrorMessage} ${BUSINESS.phone}` }
  }
  return { status: 'success', values }
}

// --- src/components/booking/BookingForm.tsx ---
'use client'
const [state, formAction, isPending] = useActionState(createBooking, initialState)
const { register, handleSubmit, setError, formState } = useForm<BookingFormValues>({
  resolver: zodResolver(bookingSchema),
  values: state.values, // repopulates on every action return, including failures (D-09)
})
```

On `state.status === 'slot-taken'`, the parent component re-triggers the day-detail availability fetch
(reusing the D-07 refresh-on-select query) so the just-taken slot renders disabled without a full page
reload.

### Anti-Patterns to Avoid

- **Check-then-insert for booking availability:** explicitly rejected by D-08. Any `SELECT` to check a
  slot is free, followed by a separate `INSERT`, has a race window between the two statements under
  concurrent requests. The `UNIQUE (appt_date, appt_time)` constraint is the only real guarantee.
- **Branching on `error.message` instead of `error.code`:** Postgres/PostgREST message text is not a
  stable contract across versions; `error.code` is [CITED: Supabase's own error-handling guide].
- **Constructing `Date` objects from concatenated `DATE`+`TIME` strings without an explicit timezone:**
  reintroduces exactly the browser-clock-trust bug D-06 exists to prevent.
- **Importing `@/lib/pricing` from `/book`'s Client Components:** the D-15 (Phase 3) `server-only` fence
  still applies; the VIN re-decode happens in a Server Component or Server Action on `/book`, and only
  precomputed data crosses into Client Components, exactly as Phase 3 established.
- **Pasting the shadcn registry's `calendar.tsx` verbatim:** it imports `IconPlaceholder` from
  `@/app/(create)/components/icon-placeholder`, a path that only exists inside shadcn's own demo site.
  See Pitfall 1.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar month grid, keyboard nav, date-cell rendering | A custom `<table>`-based date grid | `react-day-picker` via the shadcn `Calendar` wrapper | Accessible keyboard navigation (arrow keys, Page Up/Down for month) and locale-aware weekday/month formatting are already solved; a hand-rolled grid would need to re-implement all of this for no benefit |
| Timezone-safe "now" | Manual UTC-offset arithmetic (`new Date(Date.now() + offsetMs)`) | `Intl.DateTimeFormat` with an explicit `timeZone` | DST transitions in `America/Chicago` make fixed-offset arithmetic wrong twice a year; `Intl` carries the full IANA tz database and handles this correctly with zero dependencies |
| Double-booking prevention | A Redis/in-memory lock, a "reserve-then-confirm" two-step flow | Postgres `UNIQUE (appt_date, appt_time)` + catch `23505` | The constraint is already in the migration and is atomic at the database level — any application-level lock is strictly weaker under Vercel's stateless serverless model (D-08's own rationale) |
| Form + Server Action error round-tripping | Custom fetch + manual `useState` for pending/error/values | `useActionState` (React 19) + react-hook-form's `values`/`errors` props | This is exactly what React 19's `useActionState` was designed for — hand-rolling loses automatic pending-state tracking and progressive-enhancement support |

**Key insight:** every "don't hand-roll" item in this phase already has a first-party or standard-library
solution shipped by the framework or the chosen stack (`react-day-picker`, `Intl`, Postgres, React 19).
The only genuinely custom code this phase needs is the *slot generation formula* (D-01/D-02/D-03), which
is inherently business-specific and has no library to reach for.

## Common Pitfalls

### Pitfall 1: Pasting the shadcn registry `calendar.tsx` verbatim breaks the build
**What goes wrong:** The file the CLI (or the registry JSON fetched directly) emits imports
`IconPlaceholder` from `@/app/(create)/components/icon-placeholder`. That path is part of shadcn's own
"create" demo scaffold and does not exist in any real installed project, including this one.
**Why it happens:** shadcn's `base-nova` style registry entry is shared between its live demo site and
the CLI's distributed output; the `Chevron` custom component in `calendar.tsx` references a demo-only
icon abstraction that never got swapped for a direct icon import in this particular registry item.
**How to avoid:** After running `npx shadcn@latest add calendar`, replace the three `IconPlaceholder`
usages in the generated `Chevron` component with direct `lucide-react` icons (`ChevronLeft`,
`ChevronRight`, `ChevronDown` — all already available via the installed `lucide-react` dependency and
consistent with `EstimateResult.tsx`'s existing `Info` icon usage).
**Warning signs:** A build error citing `Module not found: Can't resolve '@/app/(create)/components/icon-placeholder'` immediately after running the install command.

### Pitfall 2: `react-day-picker` resolves to v10, not v9 as CONTEXT.md assumed
**What goes wrong:** Planning tasks that reference "v9 API" documentation or v9-specific prop names
could reference deprecated props (`fromDate`, `toDate`, `initialFocus`) that v10 removed outright.
**Why it happens:** CONTEXT.md's research predates this session; `react-day-picker@latest` moved from
the 9.x line to 10.0.0 on 2026-05-08, after CONTEXT.md's assumption was recorded.
**How to avoid:** Use `month`/`onMonthChange` (not `defaultMonth` alone) for controlled month tracking,
`disabled` with a function matcher (not the deprecated date-range shorthand props), and verify no task
references `initialFocus`. The `mode="single"` + `selected`/`onSelect` core API this phase needs is
identical in v9 and v10 — this pitfall is about avoiding *deprecated* props, not a functional gap.
**Warning signs:** TypeScript errors on `fromDate`/`toDate`/`initialFocus` props during `npm run build`.

### Pitfall 3: Comparing dates across the UTC/Central boundary near midnight
**What goes wrong:** `date.toISOString()` or `new Date(y, m, d).getTime()` comparisons that mix a
UTC-normalized value against a Central-time business rule can flip a slot's disabled state near midnight
Central (which is 5-6 AM UTC, well within business hours from the server's literal wall-clock
perspective if the server's own `TZ` is treated as UTC).
**Why it happens:** Vercel serverless functions default to UTC; a naive `new Date()` comparison without
an explicit `timeZone` silently uses UTC, not Central.
**How to avoid:** Route every "is this in the past" / "is this today" decision through
`getBusinessNowParts()` (Pattern 2) and compare decomposed year/month/day/hour/minute fields, never raw
epoch milliseconds mixed with a client-constructed `Date`.
**Warning signs:** A slot that should be bookable (e.g. 9 PM Central) shows as disabled, or a slot that
already passed (e.g. 8 AM Central on a day that's already 3 AM the next day UTC) shows as available.

### Pitfall 4: Trusting the client's slot list on insert (D-15)
**What goes wrong:** A crafted POST (bypassing the UI entirely) submits `appt_time = '03:00'` — outside
any generated slot — and if the Server Action only checks the `UNIQUE` constraint and the honeypot, nothing
rejects it.
**Why it happens:** The `UNIQUE` constraint only prevents *collisions*; it says nothing about whether a
given date/time is a legal slot at all.
**How to avoid:** Inside the Server Action, before the insert, re-run `generateSlotsForDate` (Pattern 1)
for the submitted `appt_date` and confirm the submitted `appt_time` is a member of that generated list.
Reject with the generic error path (not "slot taken") if it isn't — this is a different failure class
than a race, and D-10's "must NOT disable the slot" guidance still applies since the slot was never real.
**Warning signs:** A component test or manual `curl` POST with an off-grid time succeeds when it should
be rejected.

### Pitfall 5: `vin_cache` / NHTSA re-decode failure on `/book` with no VIN fallback path defined
**What goes wrong:** D-19 requires `/book` to re-decode the VIN server-side to build `vehicle_desc`, but
Phase 3's `decodeVin` can return `unreachable` or `no-data` for a VIN that decoded fine minutes earlier on
`/contact` (NHTSA is not guaranteed available twice in a row, though `vin_cache` makes a repeat decode of
the *same* VIN cheap and likely to hit cache).
**Why it happens:** The VIN travels across a page navigation as a URL parameter, and the whole point of
D-19 is to never trust client-supplied vehicle identity — so the second decode is a real network/cache
dependency, not a formality.
**How to avoid:** Define the fallback explicitly in planning: if re-decode fails on `/book`, proceed with
`vin: <the VIN>, vehicle_desc: null` and omit the vehicle line from the confirmation, rather than blocking
the whole booking flow on a VIN re-decode failure. This mirrors D-10's principle that a fixable/transient
problem must never be disguised as a permanent one — booking should still succeed.
**Warning signs:** A booking attempt fails entirely (not just missing vehicle info) when NHTSA is briefly
unavailable.

## Code Examples

### Postgres unique-violation detection (verified against the authoritative `PostgrestError` class)

```typescript
// Source: github.com/supabase/postgrest-js, src/PostgrestError.ts (fetched 2026-08-05)
// class PostgrestError extends Error { details: string; hint: string; code: string }
// error.code carries the raw Postgres SQLSTATE (e.g. '23505') verbatim — postgrest-js
// passes it through unmodified from PostgREST's JSON error body.

const { error } = await supabase.from('bookings').insert(row)

if (error?.code === '23505') {
  // D-10: this — and only this — code means "slot taken"
} else if (error) {
  // any other error: network drop, RLS rejection, invalid payload — distinct message,
  // include BUSINESS.phone, do NOT disable the slot (it may still be free)
}
```

### `react-day-picker` function-matcher `disabled` combining three conditions

```typescript
// Source: github.com/gpbl/react-day-picker main branch, src/types/shared.ts Matcher type
// (fetched 2026-08-05) — function matcher form: (date: Date) => boolean
disabled={(date) => {
  const iso = formatLocalIsoDate(date) // local getters, not toISOString()
  return (
    fullyBookedDates.has(iso) ||          // D-07/BOOK-03: fully booked date
    isBeforeCentralToday(date) ||         // D-05/D-06: past date, server-decided
    isAfterBookingWindow(date, 30)        // D-04: 30-day-ahead window
  )
}}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useFormState` (React 18 experimental) | `useActionState` (React 19, imported from `react`) | React 19 / Next.js 15 stable release | This project is already on React 19.1.0 — use `useActionState`, not `useFormState` |
| `react-day-picker` v8 (Radix-era shadcn Calendar) | `react-day-picker` v10 via shadcn's dual Radix/Base-UI Calendar registry entries | v9 released with the timezone/`TZDate` support; v10 released 2026-05-08 removing deprecated v9 props | Plan against v10's current prop set; do not reference v9-only deprecated props |
| `date-fns-tz` (community package, v3-era) | `@date-fns/tz` (official, first-class in date-fns v4) | date-fns v4.0 (2026) | Not needed this phase — `Intl.DateTimeFormat` alone covers the server-"now" requirement without adding either package |

**Deprecated/outdated:**
- `fromDate`/`toDate`/`fromMonth`/`toMonth`/`fromYear`/`toYear`/`initialFocus` props on `DayPicker`: removed entirely in v10. Use `disabled`/`hidden` matchers and `month`/`defaultMonth` instead.
- `components.Button` customization slot on `DayPicker`: replaced by separate `PreviousMonthButton`/`NextMonthButton` slots in v10 — irrelevant to this phase since the shadcn wrapper already supplies its own `Chevron`/nav styling.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel's Node serverless runtime ships full ICU (`Intl` with all timezone data) by default, requiring no `full-icu` polyfill | Pattern 2 | If wrong, `Intl.DateTimeFormat` with a non-UTC `timeZone` could silently fall back to UTC formatting on Vercel specifically (it worked correctly in this local Node 24 test), producing wrong "now" calculations in production only — would need a `full-icu`-equivalent Vercel setting to fix |
| A2 | `date-fns`'s missing source-repository link in its npm package metadata is a metadata gap, not a legitimacy signal | Package Legitimacy Audit | If wrong (i.e., if this npm listing were somehow not the real `date-fns`), a compromised date library would affect every date computation in the phase — low risk given `date-fns`'s multi-year, extremely high-download-count profile, but flagged per the slopcheck protocol |

**Verification for A1:** This is a well-established fact about Vercel's runtime (multiple independent
community sources confirm Vercel serverless functions run in UTC with full `Intl` support, not a
timezone-stripped build) but was not verified against Vercel's own official documentation in this
session — recommend a quick confirmation against Vercel's runtime docs during planning or as an early
execution smoke-test (log `Intl.DateTimeFormat().resolvedOptions().timeZone` and a Chicago-formatted
timestamp from a deployed preview).

**If this table is empty:** N/A — see above.

## Open Questions

1. **Should `/book`'s month-level and day-level availability queries be Server Actions or a Server
   Component data fetch?**
   - What we know: D-13 locks Server Actions for *writes*. D-07's *reads* (month-upfront, refresh-on-select)
     aren't writes, so D-13 doesn't strictly govern them.
   - What's unclear: whether the planner should use a Server Component `fetch`/direct Supabase query for
     the initial month load (simplest, no client-server round trip) and a Server Action (or a thin Route
     Handler) for the on-select re-fetch, versus using Server Actions for both reads for consistency.
   - Recommendation: Server Component for the initial month load (avoids an extra network hop on page
     load), a Server Action for the on-select re-fetch (keeps it consistent with the write path's error
     handling and avoids introducing a third Route Handler pattern into this phase). This is a
     planning-level decision, not a research blocker.

2. **Exact shape of the "fully booked date" determination for the month view (BOOK-03).**
   - What we know: D-07 says one query fetches the visible month's bookings so fully-booked dates can be
     disabled directly on the grid.
   - What's unclear: "fully booked" requires comparing the count of booked slots against
     `generateSlotsForDate(date).length` for *that specific date* (since Saturday has 3 slots and
     weekdays have ~6) — this is a small but real computation the planner should make explicit as a task,
     not assume is a trivial count comparison.
   - Recommendation: Fetch all booked `(appt_date, appt_time)` pairs in the visible month range, group by
     date, and compare each date's booked-slot count against that date's `generateSlotsForDate(date).length`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server-side code | Yes | v24.13.0 (local); Vercel manages its own runtime version | — |
| npm | Package installs | Yes | — | — |
| Supabase project (live database) | Every success criterion in this phase — bookings/contacts inserts, availability queries | **No** | — | **None — hard blocker, see below** |
| `.env.local` with Supabase credentials | Server-role client (`createAdminClient`), SSR client | **No** | — | **None — hard blocker** |

**Missing dependencies with no fallback:**
- **Live Supabase project + `.env.local`.** This is the blocker CONTEXT.md flags. Every one of this
  phase's 5 success criteria requires a real write to or read from Supabase — the `UNIQUE` constraint
  guarantee (D-08) only exists once the Phase 01 migration (`supabase/migrations/20260412000000_initial_schema.sql`)
  is actually pushed to a live database via `supabase link && supabase db push`. Code can be written and
  unit-tested (pure functions like `generateSlotsForDate`, `getBusinessNowParts`, Zod schemas) without a
  live database, but no Server Action, no availability query, and no end-to-end verification of any
  success criterion is possible until this is resolved.

**Recommendation for the planner:** Open with a task (or a checkpoint) that either (a) provisions the
Supabase project and runs the migration before any Server Action work begins, or (b) explicitly sequences
all database-dependent tasks behind a `checkpoint:human-verify` gate, matching the pattern Phase 3 used
for its two-package approval gate. Given the scope of this phase (nothing works end-to-end without a
database), (a) is strongly preferred — deferring it further blocks phase verification entirely, exactly
as it already blocked Phase 3's `vin_cache` test and 4 Phase 01 items.

## Security Domain

`security_enforcement` is not present in `.planning/config.json` — treated as enabled per protocol.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase has no authenticated user flows (booking/contact are anonymous public writes) |
| V3 Session Management | No | No session state introduced |
| V4 Access Control | Yes | RLS policies already restrict `bookings`/`contacts` SELECT/UPDATE/DELETE to `authenticated` role; public INSERT is intentional (`WITH CHECK (true)`) per the existing migration — this phase must not weaken that |
| V5 Input Validation | Yes | Zod schemas (client + server, same schema) for both forms; server-side slot-legality re-validation (D-15); VIN format re-validated via existing `VIN_REGEX`/`isValidVin` before re-decode |
| V6 Cryptography | No | No new cryptographic operations in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Scripted/automated slot-squatting insert (skips honeypot, occupies every slot) | Denial of Service | Accepted residual risk per CONTEXT.md's Deferred Ideas — honeypot is the only control this phase; rate limiting is explicitly deferred |
| Crafted `appt_time` outside any legal slot | Tampering | D-15 server-side slot re-validation (Pattern 1's `generateSlotsForDate` re-run inside the Server Action) |
| Client-supplied `vehicle_desc`/vehicle identity via URL manipulation | Tampering / Spoofing | D-19: only the VIN travels in the URL; `/book` re-decodes server-side, never accepts `vehicle_desc` or pricing from the URL |
| Information disclosure via raw Supabase/Postgres error text reaching the browser | Information Disclosure | Only `error.code === '23505'` branches to a specific message; all other errors get a generic, pre-written message (D-10) — never forward `error.message`/`error.details`/`error.hint` to the client |
| RLS bypass via service-role key exposure | Elevation of Privilege | Reuse the existing `src/lib/supabase/admin.ts` pattern exactly (`server-only` import, env var never `NEXT_PUBLIC_`) — no new client needed for this phase's writes |

## Sources

### Primary (HIGH confidence)
- `github.com/supabase/postgrest-js`, `src/PostgrestError.ts` (fetched live, 2026-08-05) — authoritative `PostgrestError` shape confirming `code`/`message`/`details`/`hint`
- `github.com/gpbl/react-day-picker`, `packages/react-day-picker/src/types/shared.ts` (fetched live from `main` branch, 2026-08-05) — authoritative `Matcher`, `MonthChangeEventHandler`, `Mode` type definitions
- `https://ui.shadcn.com/r/styles/base-nova/calendar.json` (fetched live, 2026-08-05) — the actual registry payload the shadcn CLI installs for this repo's `base-nova` style, including full `calendar.tsx` source
- npm registry (`npm view`, live queries, 2026-08-05) — `react-day-picker` version `10.0.1` (published 2026-05-15), `date-fns` version `4.4.0`, peer dependency `react >=16.8.0`
- Local environment test (this session) — `Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', ... }).formatToParts()` verified to correctly compute Chicago-local wall-clock parts in Node 24

### Secondary (MEDIUM confidence)
- `markus.oberlehner.net`, "Using react-hook-form with React 19, useActionState, and Next.js 15 App Router" — react-hook-form + `useActionState` bridging pattern, cross-checked against React 19's official `useActionState` semantics
- WebSearch results on react-day-picker v9→v10 migration (daypicker.dev `/upgrading`, GitHub discussion #2993) — confirms core API (`mode`, `selected`/`onSelect`, `disabled`) unchanged, only deprecated props removed
- WebSearch results on Vercel serverless default timezone (multiple community sources agreeing on UTC default) — not verified against Vercel's own official docs page in this session (see Assumption A1)

### Tertiary (LOW confidence)
- None — all findings above were either fetched from an authoritative live source or cross-verified across multiple independent search results.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed live against npm registry; slopcheck passed both packages
- Architecture: HIGH — Calendar source fetched directly from shadcn's own registry endpoint; PostgrestError and Matcher types fetched directly from their respective GitHub source files
- Pitfalls: HIGH — Pitfall 1 (IconPlaceholder) and Pitfall 2 (v10 vs v9) are both directly observed in the fetched registry JSON and npm version data, not inferred

**Research date:** 2026-08-05
**Valid until:** 30 days (stable ecosystem; react-day-picker is mid-major-version and unlikely to break API again soon, but re-verify the exact npm version before executing if planning is significantly delayed)
