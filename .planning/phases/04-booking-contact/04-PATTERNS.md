# Phase 4: Booking & Contact - Pattern Map

**Mapped:** 2026-08-05
**Files analyzed:** 17 (new/modified) + 3 shared cross-cutting concerns
**Analogs found:** 15 / 17

## ⚠ Dependency correction (read before planning)

CONTEXT.md and RESEARCH.md both state `react-hook-form`, `zod`, and `@hookform/resolvers` are
"already installed." **This is false — verified directly against `package.json` in this session.**
None of the three appear in `dependencies` or `devDependencies`. Only these are actually installed
relevant to this phase: `@base-ui/react`, `class-variance-authority`, `clsx`, `lucide-react`,
`motion`, `tailwind-merge`. The package-approval gate that RESEARCH.md recommends opening with
(mirroring Phase 3's `03-01`) must cover **five** packages, not two:

| Package | Already installed? |
|---|---|
| `react-day-picker` | No |
| `date-fns` | No |
| `react-hook-form` | **No — contradicts CONTEXT.md/RESEARCH.md** |
| `zod` | **No — contradicts CONTEXT.md/RESEARCH.md** |
| `@hookform/resolvers` | **No — contradicts CONTEXT.md/RESEARCH.md** |

The planner should route all five through the same approval gate, not just the two RESEARCH.md
names.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(public)/book/page.tsx` | route (Server Component page) | request-response | `src/app/(public)/about/page.tsx` | exact (chrome shape) |
| `src/app/(public)/contact/page.tsx` (rewrite) | route (Server Component page) | request-response | `src/app/(public)/about/page.tsx` (chrome) + itself (placeholder being replaced) | exact (chrome shape) |
| `src/lib/booking/booking-actions.ts` (`createBooking` Server Action) | service (write) | CRUD (insert w/ constraint-driven concurrency) | `src/app/api/vin/[vin]/route.ts` (trust-boundary/outcome-branching shape) + `src/lib/supabase/admin.ts` (client) | role-match (no Server Action precedent exists) |
| `src/lib/contact/contact-actions.ts` (`createContact` Server Action) | service (write) | CRUD (insert, no concurrency) | same as above, simpler | role-match |
| `src/lib/booking/slots.ts` (`generateSlotsForDate`) | utility (pure) | transform | `src/lib/pricing.ts` | exact (pure derivation from a constants table) |
| `src/lib/booking/booking-availability.ts` | service (read) | CRUD (read/aggregate) | `src/lib/vin-cache.ts` (`readVinCache`, failure-tolerant Supabase read via admin client) | role-match |
| `src/lib/server-time.ts` (`getBusinessNowParts`) | utility (pure) | transform | none in repo — new domain (timezone) | no analog (see below) |
| `src/components/booking/BookingCalendar.tsx` | component (client, interactive) | event-driven | `src/components/home/EstimateSection.tsx` (client component orchestrating view state) | role-match |
| `src/components/booking/SlotList.tsx` | component (client, interactive) | event-driven | `src/components/home/ManualEntryForm.tsx` (client list/selection with disabled states) | role-match |
| `src/components/booking/BookingForm.tsx` | component (client, form + Server Action) | request-response (form submit) | `src/components/home/ManualEntryForm.tsx` (form shape, loading/disabled state) — **diverges**: RHF + `useActionState`, no precedent in repo | partial (new library pattern, old repo shape) |
| `src/components/booking/BookingConfirmation.tsx` | component (presentational) | transform | `src/components/home/EstimateResult.tsx` (presentational, props-only, no fetching) | exact |
| `src/components/contact/ContactForm.tsx` | component (client, form + Server Action) | request-response (form submit) | same as `BookingForm.tsx` | partial |
| `src/components/contact/ContactVinSearch.tsx` | component (client, calls existing endpoint) | request-response (fetch + distinct failure states) | `src/components/home/EstimateSection.tsx` (VIN fetch + switch-on-status pattern) | exact |
| `src/components/ui/calendar.tsx` | component (generated shadcn primitive) | — | `src/components/ui/segmented-control.tsx` (Base UI wrapper conventions: `cn`, `data-slot`, class merging) | role-match |
| `src/lib/constants.ts` (add `BOOKING_COPY`/`CONTACT_COPY`) | config (modified, not new) | — | `ESTIMATE_COPY` in the same file | exact |
| `src/types/booking.ts` | model (types only) | — | `src/types/vehicle.ts` | exact |
| `src/lib/booking/slots.test.ts` | test | transform | `src/lib/vin.test.ts` (pure-function unit test style) + `src/lib/pricing.test.ts` (fixture-table style) | exact |

## Pattern Assignments

### `src/app/(public)/book/page.tsx` and `src/app/(public)/contact/page.tsx` (route, request-response)

**Analog:** `src/app/(public)/about/page.tsx` (full file, 19 lines — read in one pass above)

D-20 requires both pages to use the exact same normal-flow chrome structure `/about` uses. Copy
this verbatim, swapping only the section children:

```tsx
// src/app/(public)/about/page.tsx — the structure to copy verbatim
import { MissionSection } from '@/components/about/MissionSection'
import { VisionSection } from '@/components/about/VisionSection'
import { TrustSection } from '@/components/about/TrustSection'
import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <MissionSection />
        <VisionSection />
        <TrustSection />
      </main>
      <Footer />
    </div>
  )
}
```

For `/book`, this becomes a Server Component that (1) parses `?vin=`, validates against
`VIN_REGEX`/`isValidVin` from `@/types/vehicle`, (2) re-decodes server-side via the existing
`decodeVin` + `vin_cache` stack (never trusts `vehicle_desc` from the URL — D-19), (3) fetches the
visible month's booked dates via `booking-availability.ts`, and (4) computes `getBusinessNowParts()`
— then passes all of that as props into `<BookingCalendar>` inside `<main className="flex-1">`.

`/contact`'s current placeholder (full file, read above) is replaced wholesale — same chrome
wrapper, but `<main>` now holds `<ContactForm>` and `<ContactVinSearch>` instead of the placeholder
`<div>`.

**Route group chrome note:** `src/app/(public)/layout.tsx` is `return children` — a bare passthrough
(see full 7-line file above). Do NOT add chrome there; both new/rewritten pages compose `TopNav` +
`Footer` themselves, exactly like `/about`.

---

### `src/lib/booking/slots.ts` — `generateSlotsForDate` (utility, transform)

**Analog:** `src/lib/pricing.ts` (full file, 112 lines — read above)

`pricing.ts` is the closest existing example of "pure function(s) deriving values from a locked
constants table, exported with TSDoc, no side effects, `server-only` not required because the
output values themselves aren't secret business data — the *formula* in `pricing.ts` is secret, but
slot times are not." Copy this shape:

**Imports pattern** (lines 1-9):
```typescript
import 'server-only'  // NOTE: pricing.ts uses this because its VALUES are secret (base price).
                        // generateSlotsForDate's OUTPUT (slot times) is not secret — it will be
                        // sent to the browser as availability data. Do not blindly copy the
                        // `server-only` import; decide based on whether the module's data is
                        // secret, not just because pricing.ts has it. (BUSINESS.hours is already
                        // public — it renders on the site.)
import { GLASS_TYPES, SIZE_BUCKETS, type EstimateMatrix, ... } from '@/types/vehicle'
```

**Locked-constants-as-named-object pattern** (lines 16-39):
```typescript
export const PRICING = {
    /** D-01: flat base price added to every estimate regardless of vehicle. */
    basePrice: 300,
    // ...
} as const
```
Follow this exact shape for slot generation: a `SLOT_DURATION_MINUTES = 90` constant (D-01), reading
from `BUSINESS.hours` (already in `src/lib/constants.ts`) rather than duplicating a schedule table
(D-03).

**TSDoc + `@param`/`@returns` pattern** (lines 41-50, 86-96):
```typescript
/**
 * Returns whether a vehicle of the given model year requires ADAS (Advanced
 * Driver-Assistance Systems) calibration, per D-04/VIN-07.
 *
 * @param modelYear - The vehicle's model year.
 * @returns `true` when `modelYear` is at or after `PRICING.adasMinModelYear`.
 */
export function adasApplies(modelYear: number): boolean {
    return modelYear >= PRICING.adasMinModelYear
}
```
Apply the same TSDoc discipline to `generateSlotsForDate` and `resolveDayHours` — document which
decision ID (D-01/D-02/D-03) each guard clause encodes, exactly as `pricing.ts` cites D-01..D-05
inline.

**The critical invariant-as-comment pattern** (lines 68-72) — this is the exact style to use for
D-02's "ends at or before closing" guard:
```typescript
const low = Math.round(subtotal * PRICING.spreadLow)
// Math.round is applied to the ±10% spread BEFORE the ADAS term is added.
// Reordering these two operations (rounding after the add) breaks D-06
// rows 4 and 6, which depend on Math.round(337.5) -> 338 and
// Math.round(412.5) -> 413 happening on the spread alone.
```

---

### `src/lib/booking/booking-actions.ts` — `createBooking` Server Action (service, CRUD write)

**No exact analog exists** — this repo has zero Server Actions (D-13 is a deliberate first). The
two closest partial analogs, and where the plan must diverge from each:

**Analog A — `src/app/api/vin/[vin]/route.ts`** (full file, 152 lines — read above), for the
**outcome-branching shape and the "never leak diagnostic detail" discipline**:

```typescript
// Source: src/app/api/vin/[vin]/route.ts lines 79-93 — the pattern to copy for
// distinguishing failure classes and logging server-side detail without leaking it
if (outcome.outcome === 'unreachable') {
    // `detail`/`reason` are for server-side diagnostics only and must
    // never reach the response body (threat T-03-08).
    console.error('VIN decode unreachable', { vin, reason: outcome.reason, detail: outcome.detail })
    return NextResponse.json(
        { status: 'unreachable', vehicle: null, estimates: null, adasApplies: false, cached: false } satisfies VinLookupResponse,
        { status: 200 }
    )
}
```

Divergence: a Server Action returns a plain state object (`BookingActionState`), not a
`NextResponse`. But the *shape* of "one discriminated status field, switch over it, log detail
server-side only" transfers directly. D-10's three outcomes (`success` / `slot-taken` / `error`)
mirror this file's `decoded` / `not-found` / `unreachable` three-way branch almost exactly — copy
the discriminated-union-return idiom, not the `NextResponse` wrapper.

**Analog B — `src/lib/supabase/admin.ts`** (full file, 48 lines — read above), for the **write
client itself, used as-is, no modification**:

```typescript
// Source: src/lib/supabase/admin.ts — call this exactly as vin-cache.ts does,
// no new client factory needed
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()
const { error } = await supabase.from('bookings').insert({ ...values, status: 'pending' })
```

**Analog C — `src/lib/vin-cache.ts`** (full file, 66 lines — read above), for the **try/catch
degrade-gracefully idiom on a Supabase call** — but this must be inverted for booking writes: `vin
cache` swallows errors and returns `null` because a cache miss is harmless (D-21 of Phase 3). A
**booking insert must NOT swallow errors** — D-10 requires branching on `error.code`. Do not copy
`vin-cache.ts`'s "catch and return null" shape for the write path; copy only its `createAdminClient()`
usage pattern.

**The actual write + branch pattern** (from RESEARCH.md, verified against `postgrest-js`
`PostgrestError` shape):
```typescript
'use server'

export type BookingActionState = {
  status: 'idle' | 'success' | 'slot-taken' | 'error'
  values: BookingFormValues
  fieldErrors?: Partial<Record<keyof BookingFormValues, string>>
  message?: string
}

export async function createBooking(
  prevState: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  // 1. honeypot (D-14) — reject silently, return as if idle/success
  // 2. parse + Zod-validate formData -> values
  // 3. re-derive slot legality via generateSlotsForDate (D-15) — reject off-grid appt_time
  const supabase = createAdminClient()
  const { error } = await supabase.from('bookings').insert({ ...values, status: 'pending' })

  if (error?.code === '23505') {
    return { status: 'slot-taken', values, message: BOOKING_COPY.slotTakenMessage }
  }
  if (error) {
    // Never forward error.message/details/hint to the client (T-03-08 precedent).
    return { status: 'error', values, message: `${BOOKING_COPY.genericErrorMessage} ${BUSINESS.phone}` }
  }
  return { status: 'success', values }
}
```

`src/lib/contact/contact-actions.ts` follows the identical shape, minus the slot-legality
re-validation step (D-15 does not apply to contacts) and minus the `23505`/`slot-taken` branch
(contacts carry no `UNIQUE` constraint) — it only has `success` / `error`.

---

### `src/lib/booking/booking-availability.ts` (service, read)

**Analog:** `src/lib/vin-cache.ts`'s `readVinCache` (lines 14-27, read above) — the failure-tolerant
Supabase read via the admin client:

```typescript
// Source: src/lib/vin-cache.ts lines 14-27
export async function readVinCache(vin: string): Promise<VinCacheRow | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('vin_cache').select('*').eq('vin', vin).maybeSingle()
    if (error) {
      return null
    }
    return data as VinCacheRow | null
  } catch {
    return null
  }
}
```

Divergence: a booked-dates/times read that fails should NOT silently degrade to "nothing is
booked" — that would make an unavailable database appear as a fully-open calendar, directly
contradicting D-08's guarantee. Copy the `try/catch` + `createAdminClient()` shape, but on failure
this module should surface an explicit error state to the caller (e.g. `{ ok: false }` or throw),
not `null`-as-empty-result, since `[]` and "read failed" must be distinguishable to the calendar UI.

---

### `src/lib/server-time.ts` — `getBusinessNowParts` (utility, transform)

**No analog found in this codebase.** No existing file deals with timezone-aware "now." Use the
RESEARCH.md `Intl.DateTimeFormat` pattern directly (verified live in this session's Node 24
runtime), following `pricing.ts`'s TSDoc-and-comment discipline (see above) since it is the closest
structural sibling (pure function, no I/O, heavily commented on the *why*):

```typescript
const BUSINESS_TIME_ZONE = 'America/Chicago'

/** Returns the current date/time, decomposed as Central-time parts. Never derived from `new Date()`
 *  directly without the `timeZone` option — the server process itself runs in UTC on Vercel. */
export function getBusinessNowParts(): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]))
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour), minute: Number(parts.minute),
  }
}
```

---

### `src/components/contact/ContactVinSearch.tsx` (component, client + request-response with distinct failure states)

**Analog:** `src/components/home/EstimateSection.tsx` (full file, 327 lines — read above), lines
39-131 specifically — the fetch-and-switch-on-status idiom, which CONT-02 and D-10 both require
reusing verbatim in spirit:

**Discriminated view-state pattern** (lines 23-38):
```typescript
type EstimateViewState =
  | { kind: 'form' }
  | { kind: 'loading' }
  | { kind: 'result'; /* ...precomputed data, never a formula... */ }
  | { kind: 'not-found' }
  | { kind: 'manual' }
```

**Fetch + switch-on-`status` pattern** (lines 70-131):
```typescript
try {
  const response = await fetch(`/api/vin/${encodeURIComponent(normalized)}`)
  const data = (await response.json()) as VinLookupResponse

  switch (data.status) {
    case 'decoded': { /* ... */ break }
    case 'needs-vehicle-type': { /* ... */ break }
    case 'not-found':
    case 'invalid':
      // D-18: NHTSA answered (or the server rejected the format), so a
      // typo is the likely cause. This is deliberately NOT the manual
      // form — jumping there would hide a fixable mistake.
      setView({ kind: 'not-found' })
      break
    case 'unreachable':
      setView({ kind: 'manual' })
      break
  }
} catch {
  setView({ kind: 'manual' })
}
```

`ContactVinSearch.tsx` should call the same existing `/api/vin/[vin]` Route Handler (CONT-02: "same
decoder as home" — do not reimplement), reuse the same `VinLookupResponse` discriminated union from
`@/types/vehicle`, and render `<EstimateResult>` on `decoded`/`needs-vehicle-type` exactly as
`EstimateSection.tsx` does at lines 296-318. The only required change to `EstimateResult` usage: its
CTA now needs the VIN in the URL per D-16/D-18 — see the next section for the exact prop contract.

---

### `EstimateResult` — reused unmodified, exact prop contract (component, presentational)

**Source:** `src/components/home/EstimateResult.tsx` (full file, 165 lines — read above). No
modification is planned; extract the contract precisely so the planner wires it correctly from both
`/` (unchanged) and `/contact` (new usage):

```typescript
interface EstimateResultProps {
  headline: string
  headlineFollowsSizeBucket: boolean   // true only on manual-entry path (D-20 of Phase 3)
  estimates: EstimateMatrix
  adasApplies: boolean
  glassType: GlassType
  onGlassTypeChange: (value: GlassType) => void
  sizeBucket: SizeBucket
  onSizeBucketChange: (value: SizeBucket) => void
  sizeBucketEditable: boolean
  basisNote?: string
  onReset: () => void
}
```

**The one line that must change project-wide (D-16), located at line 149:**
```tsx
{/* 8. Book Appointment CTA — links to /contact in Phase 3; Phase 4 rewires to booking calendar */}
<Link href="/contact" className="block">
  <Button className="w-full">Book Appointment</Button>
</Link>
```
This becomes `<Link href={`/book?vin=${vin}`}>` (D-18: carry the VIN). Per D-19, only the raw
17-character VIN travels — never `vehicle_desc` or any pricing value. This is the only edit expected
inside `EstimateResult.tsx` itself; everything else about the component is unmodified and reused
verbatim on `/contact`, per its own header comment (lines 1-10):

```typescript
// Deliberately reusable: Phase 4 renders this same result from the contact
// page's VIN search, so it stays free of any home-page-specific or
// snap-scroll-specific assumption.
```

Because `EstimateResult` needs the current VIN string to build the `/book?vin=` link and the VIN is
not currently one of its props, the planner must add a `vin: string` prop (or derive the href in the
parent and pass it down) — flag this explicitly as a required prop-contract change, not an
implementation detail to improvise later.

---

### `src/components/booking/BookingForm.tsx` and `src/components/contact/ContactForm.tsx` (component, client form + Server Action)

**No exact analog** — this repo has zero react-hook-form usage (confirmed: the package isn't even
installed, see the dependency correction above) and zero `useActionState` usage. The closest
structural analog for loading/disabled/error-message conventions is `ManualEntryForm.tsx` (full
file, 130 lines — read above):

**Field + error-message convention to preserve** (lines 72-96):
```tsx
<div>
  <label htmlFor="manual-year-input" className="block text-sm font-medium text-foreground mb-1">
    Model Year
  </label>
  <input
    id="manual-year-input"
    // ...
    disabled={isLoading}
    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    autoComplete="off"
  />
  {yearError && (
    <p className="mt-1 text-sm text-destructive" role="alert">
      {yearError}
    </p>
  )}
</div>
```

**Submit-button loading-state convention** (lines 113-122, also in `EstimateSection.tsx` lines
230-239):
```tsx
<Button type="submit" className="w-full" disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Calculating estimate…
    </>
  ) : (
    'Get Estimate'
  )}
</Button>
```

These two conventions (label/input/error-paragraph markup, and the `Loader2` spinner + disabled
button on submit) should carry over unchanged into the new RHF-based forms — only the state
management underneath changes, from raw `useState` to `useForm` + `useActionState`, per the
RESEARCH.md-documented wiring:

```typescript
// --- src/components/booking/BookingForm.tsx ---
'use client'
const [state, formAction, isPending] = useActionState(createBooking, initialState)
const { register, handleSubmit, setError, formState } = useForm<BookingFormValues>({
  resolver: zodResolver(bookingSchema),
  values: state.values, // repopulates on every action return, including failures (D-09)
})
```

No shadcn `Form` primitive exists in this repo (`src/components/ui/` has no `form.tsx`) — the
planner should treat "generate the shadcn `form` component" as part of the same package-approval
gate that installs `react-hook-form`/`zod`/`@hookform/resolvers`, since shadcn's `Form` wrapper
requires them as peers.

---

### `src/components/ui/calendar.tsx` (generated shadcn primitive)

**Analog:** `src/components/ui/segmented-control.tsx` (full file, 66 lines — read above) — the only
existing example in this repo of a Base UI-derived shadcn-style primitive, useful for confirming the
local conventions the generated `calendar.tsx` must match:

```typescript
// Source: src/components/ui/segmented-control.tsx lines 1-11
'use client'
import { RadioGroup } from '@base-ui/react/radio-group'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
```

Per RESEARCH.md, the generated `calendar.tsx` itself contains **zero** Base UI/Radix primitives — it
only touches the local `Button` (already Base UI-based, see `src/components/ui/button.tsx` read
above) and `cn`. The convention match that matters is: `data-slot` attributes (see `button.tsx` line
51, `segmented-control.tsx` lines 26/50) and `cn(...)` class merging — confirm the generated file
uses both, and manually patch out the three `IconPlaceholder` imports per RESEARCH.md Pitfall 1,
replacing them with `ChevronLeft`/`ChevronRight`/`ChevronDown` from `lucide-react` (already a
dependency, already used the same way in `EstimateResult.tsx` line 13's `Info` import).

---

### `src/lib/constants.ts` (config, modified) — `BOOKING_COPY` / `CONTACT_COPY`

**Analog:** `ESTIMATE_COPY` in the same file (lines 23-61, read above in full). Copy this exact
shape — a flat `as const` object of named string/label groups, with a header comment stating what
must NOT live in the module:

```typescript
// Copy for the VIN estimate result (Phase 3). No pricing value or year
// threshold belongs here — this module ships to the browser (T-03-03).
export const ESTIMATE_COPY = {
  glassLabels: { standard: 'Standard', acoustic: 'Acoustic', heated: 'Heated' },
  // ...
  disclaimer: 'This is an estimate, not a final quote — final pricing is confirmed once we see the vehicle. Questions? Call us at',
  // ...
} as const
```

`BOOKING_COPY` needs (at minimum, per D-09/D-10/D-11): `slotTakenMessage`, `genericErrorMessage`
(both D-10 — the generic one must be written so `${BOOKING_COPY.genericErrorMessage}
${BUSINESS.phone}` reads naturally), and a confirmation-screen copy block covering D-11's "we'll
call you at `<phone>` to confirm" line. `CONTACT_COPY` needs an equivalent success/error pair. Both
follow `ESTIMATE_COPY`'s "no business-sensitive value in this module" rule — the header-comment
convention itself should be copied nearly verbatim, substituting "pricing value" for whatever this
module must never contain (nothing sensitive applies to booking/contact copy, so the comment can
simply state these are the only string source for their respective UI, matching this file's
existing self-documenting style).

---

### `src/lib/booking/slots.test.ts` (test)

**Analog:** `src/lib/vin.test.ts` (full file, 258 lines — read above) for **pure-function unit test
structure**, and `src/lib/pricing.test.ts` (partial read, lines 1-60) for **fixture-table-driven
tests of a formula with locked, user-confirmed expected values**.

**Header comment convention** (vin.test.ts lines 1-6):
```typescript
// This suite unit-tests only the two pure functions exported by
// `src/lib/vin.ts` — `classifyNhtsaResult` and `mapBodyClassToSizeBucket`.
// `decodeVin` performs real network I/O against NHTSA and is deliberately
// NOT unit-tested here; its network paths are exercised by the curl checks
// in plan 03-06 and the browser checks in plan 03-08. Do not add a
// live-network test to this file.
```
`slots.test.ts` should open with an equivalent scope statement: it tests `generateSlotsForDate` and
`resolveDayHours` as pure functions: no Supabase, no server-time mocking beyond passing in explicit
`Date` values.

**AAA pattern with plain comments, no explanation suffix** (vin.test.ts lines 53-71, matches the
global CLAUDE.md standard exactly):
```typescript
it('classifies a bad-check-digit payload as decoded with a suv-truck bucket', () => {
    // Arrange
    const result = BAD_CHECK_DIGIT_RESULT

    // Act
    const outcome = classifyNhtsaResult(result)

    // Assert
    expect(outcome).toMatchObject({ /* ... */ })
})
```

**Locked-fixture-table + `it.each` pattern** (pricing.test.ts lines 11-32) — use this exact shape for
the D-02 Saturday invariant test (must assert exactly 9:00/10:30/12:00, no 1:30):
```typescript
const D06_FIXTURES: ReadonlyArray<readonly [string, number, SizeBucket, GlassType, number, number]> = [
    ['2015 Honda Civic (sedan) / standard → $270-$330', 2015, 'car', 'standard', 270, 330],
    // ...
]

describe('D-06 locked fixtures', () => {
    it.each(D06_FIXTURES)('%s', (_name, modelYear, sizeBucket, glassType, expectedLow, expectedHigh) => {
        // Arrange
        // Act
        const variant = computeVariant(modelYear, sizeBucket, glassType)
        // Assert
        expect(variant.low).toBe(expectedLow)
        expect(variant.high).toBe(expectedHigh)
    })
})
```

Test runner: `vitest` (confirmed in `package.json` — `"test": "vitest run"`), imports from
`'vitest'` directly (`describe, it, expect`), no Jest anywhere in this repo — the global CLAUDE.md
Jest-oriented testing-standards.md sections do not apply here; follow this repo's Vitest convention
instead.

## Shared Patterns

### Server-only fencing decision (not a blanket copy)

**Source:** `src/lib/pricing.ts` line 1, `src/lib/supabase/admin.ts` line 1, `src/lib/vin-cache.ts`
line 1 — all three open with `import 'server-only'`.
**Apply to:** `booking-actions.ts`, `contact-actions.ts`, `booking-availability.ts`,
`server-time.ts` if it ever touches non-public data (it does not — `getBusinessNowParts` output is
not secret, but it must never be trusted from the client per D-06, so keep it server-only anyway to
prevent a client-side call from silently using the browser's clock instead).
**Do NOT apply to:** `slots.ts` if its only consumer set includes a Client Component that needs to
render "what slots would exist" for optimistic UI — confirm at planning time whether `slots.ts` is
called only from Server Actions/Server Components (in which case `server-only` is safe and
recommended) or also needs client-side re-derivation for instant UI feedback before the server
round-trip (in which case `server-only` would break the build, mirroring the `pricing.ts`
anti-pattern documented in RESEARCH.md's Anti-Patterns section: "Importing `@/lib/pricing` from
`/book`'s Client Components... is a build error by design").

### Distinct failure screens (D-10, extending Phase 3's D-17/D-18)

**Source:** `src/app/api/vin/[vin]/route.ts` lines 79-105 (three-way outcome branch: unreachable /
not-found / decoded) and `src/components/home/EstimateSection.tsx` lines 91-131 (client-side switch
consuming that same discriminated union).
**Apply to:** `createBooking`'s three-way return (`success` / `slot-taken` / `error`), and its
consumer in `BookingForm.tsx`. The core rule extracted from both: **never collapse two different
failure causes into the same UI treatment**, and **never forward raw error detail
(`error.message`/`details`/`hint`/`reason`) to the client** — log it server-side (`console.error`)
and return only a pre-written, constants-module string.

### Copy-in-constants-module (D-11's requirement, Claude's Discretion note)

**Source:** `ESTIMATE_COPY` in `src/lib/constants.ts` lines 23-61.
**Apply to:** `BOOKING_COPY` and `CONTACT_COPY`, added to the same file alongside `ESTIMATE_COPY`
and `BUSINESS`/`NAV_LINKS` — not a new file, matching this repo's existing single-constants-module
convention.

### Service-role write client (D-13's Server Action write path)

**Source:** `src/lib/supabase/admin.ts`, `createAdminClient()`, full file read above.
**Apply to:** both new Server Actions and `booking-availability.ts`. Use exactly as `vin-cache.ts`
does — no new client factory, no modification to `admin.ts` needed.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/server-time.ts` | utility | transform | No existing timezone-aware "now" logic anywhere in the codebase; RESEARCH.md's `Intl.DateTimeFormat` code sample is the only source to follow (see Pattern Assignments above) |
| `src/components/booking/BookingForm.tsx` / `src/components/contact/ContactForm.tsx` (state-management layer only — markup layer has an analog) | component | request-response | No react-hook-form, `useActionState`, or Server Action precedent exists anywhere in this repo; RESEARCH.md's cited wiring pattern (markus.oberlehner.net, cross-checked against React 19 docs) is the only source |
| `src/lib/booking/booking-actions.ts` / `src/lib/contact/contact-actions.ts` (Server Action layer specifically — the write-client and outcome-branching layers each have partial analogs, noted above) | service | CRUD | No Server Action exists in this repo (Phase 3 used Route Handlers exclusively per D-13's own framing); assembled from RESEARCH.md's Code Examples plus the two partial analogs cited in Pattern Assignments |

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/lib/`, `src/types/`, `package.json`,
`supabase/migrations/`
**Files scanned:** 24 source files read in full or in targeted sections; `package.json` verified
directly against phase dependency claims
**Pattern extraction date:** 2026-08-05
