# Phase 5: Admin Backend - Pattern Map

**Mapped:** 2026-08-06
**Files analyzed:** 24 (new) + 2 (modified)
**Analogs found:** 20 / 24 (4 net-new UI primitives / charts have no analog — flagged below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(admin)/admin/login/page.tsx` (replace placeholder) | route (page) | request-response | itself (placeholder) + `src/app/(public)/contact/page.tsx` composition style | role-match |
| `src/components/auth/LoginForm.tsx` | component (client form) | request-response | `src/components/contact/ContactForm.tsx` | exact |
| `src/lib/auth/login-schema.ts` | utility (Zod schema) | transform | `src/lib/contact/contact-schema.ts` | exact |
| `src/lib/auth/login-schema.test.ts` | test (pure-fn) | transform | `src/lib/contact/contact-schema.test.ts` | exact |
| `src/lib/auth/auth-actions.ts` (`loginAction`, `logoutAction`) | service (Server Action) | request-response | `src/lib/contact/contact-actions.ts` | role-match (new: cookie-writing, not DB-insert) |
| `src/types/auth.ts` (`LoginActionState`, `LoginFormValues`) | model (types) | transform | `src/types/booking.ts` (`ContactActionState`/`ContactFormValues`) | exact |
| `src/app/(admin)/admin/(dashboard)/layout.tsx` | component (layout) | request-response | none (first real layout in `(admin)`) — see below | no analog (structure only) |
| `src/app/(admin)/admin/(dashboard)/page.tsx` | route (page, Server Component) | request-response | `src/app/(public)/book/page.tsx` (Server Component composing Client islands) | role-match |
| `src/lib/analytics/bucket-by-day.ts` | utility (pure function) | transform | `src/lib/booking/booking-schema.ts`'s `isLegalSlot` / `src/lib/booking/slots.ts` | exact |
| `src/lib/analytics/bucket-by-day.test.ts` | test (pure-fn) | transform | `src/lib/booking/slots.test.ts` | exact |
| `src/lib/dashboard/dashboard-queries.ts` (cards + charts + tables reads) | service (data-read module) | CRUD (read) | `src/lib/booking/booking-availability.ts` | role-match (client swap: `server.ts` not `admin.ts` — see gap note) |
| `src/components/dashboard/SummaryCards.tsx` | component (Server Component) | request-response | `src/components/ui/card.tsx` (primitive) + no page-level card-grid analog | role-match |
| `src/components/dashboard/VisitorsChart.tsx` | component (client chart) | request-response | none — no chart exists anywhere in repo | **no analog — net new** |
| `src/components/dashboard/ContactsChart.tsx` | component (client chart) | request-response | none | **no analog — net new** |
| `src/components/dashboard/VinSearchChart.tsx` | component (client chart) | request-response | none | **no analog — net new** |
| `src/components/dashboard/RecentContactsTable.tsx` | component (Server Component, read-only table) | CRUD (read) | none — no table exists; `src/components/booking/SlotList.tsx` is closest for "render a bounded list from server data" | partial match |
| `src/components/dashboard/UpcomingAppointmentsTable.tsx` | component (Server Component, read-only table) | CRUD (read) | same as above | partial match |
| `src/app/(admin)/admin/(dashboard)/users/page.tsx` | route (page, Server Component) | CRUD (read) | `src/app/(public)/book/page.tsx` | role-match |
| `src/lib/admin-users/admin-guards.ts` (`isSelfDeleteAttempt`, `isLastAdminAttempt`) | utility (pure predicates) | transform | `src/lib/booking/booking-schema.ts`'s `isLegalSlot` | exact |
| `src/lib/admin-users/admin-guards.test.ts` | test (pure-fn) | transform | `src/lib/booking/booking-schema.test.ts` (need to confirm — see below) / `slots.test.ts` | exact |
| `src/lib/admin-users/admin-users-actions.ts` (`addUserAction`, `removeUserAction`) | service (Server Action) | CRUD (write) | `src/lib/booking/booking-actions.ts` | role-match (new: `auth.admin.*` via service-role, not table insert) |
| `src/lib/admin-users/add-user-schema.ts` | utility (Zod schema) | transform | `src/lib/contact/contact-schema.ts` | exact |
| `src/lib/admin-users/add-user-schema.test.ts` | test (pure-fn) | transform | `src/lib/contact/contact-schema.test.ts` | exact |
| `src/components/admin-users/UserList.tsx` | component (client, table + per-row dialog) | request-response | `src/components/booking/SlotList.tsx` (bounded list + per-item action state) | partial match |
| `src/components/admin-users/AddUserForm.tsx` | component (client form) | request-response | `src/components/booking/BookingForm.tsx` (react-hook-form + shadcn `Form` + `useActionState`, NOT `ContactForm.tsx`'s manual-register style) | exact |
| `src/components/admin-users/RemoveUserDialog.tsx` | component (client, confirmation) | request-response | none — no dialog/alert-dialog exists yet | **no analog — net new (primitive)** |
| `src/components/ui/chart.tsx` (shadcn-generated) | component (ui primitive) | — | none in repo; registry JSON is the only source | **no analog — net new** |
| `src/components/ui/alert-dialog.tsx` (shadcn-generated) | component (ui primitive) | — | `src/components/ui/sheet.tsx` (closest in-repo Base UI `render`-prop convention) | role-match |
| `src/components/ui/table.tsx` (shadcn-generated) | component (ui primitive) | — | `src/components/ui/card.tsx` (closest in-repo `data-slot` wrapper convention) | role-match |
| `src/lib/constants.ts` (add `ADMIN_COPY`) | config (copy module) | transform | `ESTIMATE_COPY` / `BOOKING_COPY` / `CONTACT_COPY` (same file) | exact |

## Pattern Assignments

### `src/lib/auth/auth-actions.ts` (service, Server Action, request-response)

**Analog:** `src/lib/contact/contact-actions.ts` (full file read, 74 lines) and `src/lib/booking/booking-actions.ts` (full file read, 121 lines)

**Imports pattern** (from `contact-actions.ts` lines 1-11):
```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { contactSchema } from '@/lib/contact/contact-schema'
import { CONTACT_COPY, BUSINESS } from '@/lib/constants'
import type { ContactActionState, ContactFormValues } from '@/types/booking'
```
**For the new file, swap the client import** — this is the one load-bearing difference. `loginAction`/`logoutAction` MUST use the cookie-aware `createClient()` from `src/lib/supabase/server.ts`, never `createAdminClient()` from `admin.ts` (that client has `persistSession: false` and no cookie plumbing — confirmed in `src/lib/supabase/admin.ts` lines 38-47). `addUserAction`/`removeUserAction` (a separate file, `admin-users-actions.ts`) correctly DO use `createAdminClient()`, matching `contact-actions.ts`'s import exactly.

**Core Server Action shape** (from `contact-actions.ts` lines 25-73, the full function body):
```typescript
export async function createContact(prevState: ContactActionState, formData: FormData): Promise<ContactActionState> {
    const values: ContactFormValues = {
        firstName: String(formData.get('firstName') ?? ''),
        // ... one String(formData.get(...) ?? '') per field
    }

    // 1. Honeypot / cheap short-circuit gate FIRST — silent success, no I/O.
    if (values.honeypot !== '') {
        return { status: 'success', values }
    }

    // 2. Zod re-validation — the untrusted-input gate.
    const parsed = contactSchema.safeParse(values)
    if (!parsed.success) {
        const fieldErrors: Partial<Record<keyof ContactFormValues, string>> = {}
        for (const issue of parsed.error.issues) {
            const field = issue.path[0] as keyof ContactFormValues | undefined
            if (field && !fieldErrors[field]) {
                fieldErrors[field] = issue.message
            }
        }
        return { status: 'error', values, fieldErrors, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }

    // 3. The actual mutation, wrapped in try/catch.
    try {
        const supabase = createAdminClient()
        const { error } = await supabase.from('contacts').insert({ /* mapped fields */ })

        if (error) {
            console.error('createContact: insert failed', { error })
            return { status: 'error', values, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
        }

        return { status: 'success', values }
    } catch (error) {
        console.error('createContact: unexpected error', { error })
        return { status: 'error', values, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }
}
```

**Login-specific shape** (already drafted in RESEARCH.md's Pattern 2 — copy verbatim, it already follows the above shape correctly):
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function loginAction(prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return { status: 'error', message: ADMIN_COPY.loginGenericError }
    }

    revalidatePath('/', 'layout')
    redirect('/admin')
}

export async function logoutAction(): Promise<void> {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/admin/login')
}
```

**Error handling pattern:** never return raw Postgres/Supabase error text or `error.code`/`error.message` to the client — only a pre-written `*_COPY` string (see `contact-actions.ts` lines 63-65: `console.error` server-side, generic message client-side). Apply the same to `loginAction`'s credential-error branch (already correctly generic in the RESEARCH.md draft) and to `admin-users-actions.ts`.

**Discriminated-status contract to mirror** (from `src/types/booking.ts` lines 105-112, `ContactActionState` — the minimal 3-state variant, since login/add-user/remove-user have no `'slot-taken'`-equivalent race condition):
```typescript
export type ContactActionStatus = 'idle' | 'success' | 'error'

export interface ContactActionState {
    status: ContactActionStatus
    values: ContactFormValues
    fieldErrors?: Partial<Record<keyof ContactFormValues, string>>
    message?: string
}
```
Use this exact shape for `LoginActionState` (drop `values`/`fieldErrors` if the login form's own local state is sufficient — RESEARCH.md's Code Examples section already shows the minimal `{ status: 'idle' } | { status: 'error'; message: string }` variant, which is the better fit here since there's no D-09 "preserve submitted values" requirement for a login form). For `AddUserActionState`, keep the full shape (`values`, `fieldErrors`) since D-12's email/password/confirmPassword form benefits from field-level error redisplay exactly like `ContactFormValues`.

---

### `src/lib/auth/login-schema.ts` and `src/lib/admin-users/add-user-schema.ts` (utility, transform)

**Analog:** `src/lib/contact/contact-schema.ts` (full file, 27 lines)

**Full pattern to copy:**
```typescript
// Shared client/server validation contract for the <X> form.
//
// Deliberately NOT build-time server-side-only fenced -- same reasoning as
// `@/lib/booking/booking-schema`: this schema runs both as the
// react-hook-form resolver (client) and inside the Server Action as the
// untrusted-input gate (server).

import { z } from 'zod'

export const contactSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(100, 'First name is too long'),
    // ...
})
```

**Add-user schema exact shape** (already drafted correctly in RESEARCH.md's Code Examples, matches the contact-schema.ts convention):
```typescript
import { z } from 'zod'

export const addUserSchema = z
    .object({
        email: z.string().trim().email('Enter a valid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(8, 'Confirm the password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })
```
Note `contact-schema.ts` never uses `.refine()` at the object level (its cross-field constraint doesn't exist) — the `.refine()` pattern for password-confirm matching has no direct in-repo precedent; this is standard Zod usage, not a repo convention deviation, and requires no server-side-only fence for the same reason `contact-schema.ts` doesn't need one (double-validation: client resolver + server re-validation inside the Server Action).

**Login schema:** simpler — mirror the field-level `.trim()`/`.min()` pattern for `email`/`password`, no `.refine()` needed.

---

### `src/lib/contact/contact-schema.test.ts` → test-file convention (pure-fn, transform)

**Analog:** `src/lib/contact/contact-schema.test.ts` (full file, 132 lines)

**Exact conventions to copy for `login-schema.test.ts`, `add-user-schema.test.ts`, `bucket-by-day.test.ts`, `admin-guards.test.ts`:**
```typescript
import { describe, expect, it } from 'vitest'

import { contactSchema } from '@/lib/contact/contact-schema'

// This suite unit-tests `contactSchema` as a pure function -- no Supabase, no
// Server Action, matching the framing of `booking-schema.test.ts`.

function baseContactPayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        firstName: 'Jane',
        // ...defaults...
        ...overrides,
    }
}

describe('contactSchema required fields', () => {
    it('passes a well-formed submission with all required fields present', () => {
        // Arrange
        const payload = baseContactPayload()

        // Act
        const result = contactSchema.safeParse(payload)

        // Assert
        expect(result.success).toBe(true)
    })
    // ... one it() per boundary condition, AAA comments on their own line, no trailing explanation
})
```
This is the **entire testing story in this repo** — no `@testing-library/react`, no `jsdom`, no component tests (CONTEXT.md's Established Patterns section confirms "zero component-test infrastructure"). Every one of the 33 existing tests (`booking-schema.test.ts`, `contact-schema.test.ts`, `slots.test.ts`, `day-fully-booked.test.ts`, `pricing.test.ts`, `server-time.test.ts`, `vin.test.ts`) follows this exact `describe`/`it`/AAA shape against a pure function or Zod schema with zero mocking. Phase 5's new tests (`login-schema.test.ts`, `add-user-schema.test.ts`, `bucket-by-day.test.ts`, `admin-guards.test.ts`) must do the same — this is why RESEARCH.md insists on extracting `bucketByDay()` and the D-10 guards as pure, dependency-free functions rather than inlining them in Server Actions or Server Components.

---

### `src/lib/analytics/bucket-by-day.ts` and `src/lib/admin-users/admin-guards.ts` (utility, pure predicates)

**Analog:** `src/lib/booking/booking-schema.ts`'s `isLegalSlot` (lines 56-75) — the closest in-repo precedent for "a pure, independently-testable predicate function pulled out of a Server Action's inline logic," and `src/lib/booking/slots.ts`'s `generateSlotsForDate` (lines 108-122) for "a pure function whose output later reaches the browser as serializable data."

**Pattern to copy — pure function with explicit clock/inputs, TSDoc, no I/O:**
```typescript
/**
 * D-15: confirms the submitted `apptTime` is a member of the slot list
 * `generateSlotsForDate` produces for `apptDate`...
 *
 * @param apptDate - The submitted appointment date as a `'yyyy-MM-dd'` string.
 * @param apptTime - The submitted appointment time as a `'HH:mm'` 24-hour string.
 * @returns `true` only when `apptTime` is a legal slot start time for `apptDate`.
 */
export function isLegalSlot(apptDate: string, apptTime: string): boolean {
    const [year, month, day] = apptDate.split('-').map(Number)
    if (!year || !month || !day) return false

    const date = new Date(year, month - 1, day)
    const legalSlots = generateSlotsForDate(date)
    return legalSlots.includes(apptTime)
}
```

**Applied to `admin-guards.ts`** (already correctly drafted in RESEARCH.md Pattern 4 — matches this convention exactly):
```typescript
export function isSelfDeleteAttempt(targetUserId: string, callerUserId: string): boolean {
    return targetUserId === callerUserId
}

export function isLastAdminAttempt(totalAdminCount: number): boolean {
    return totalAdminCount <= 1
}
```

**Applied to `bucket-by-day.ts`** — mirror `slots.ts`'s "no `Date.now()` call inside; caller passes `now` explicitly" convention (see `slots.ts` header comment reasoning and `booking-availability.ts`'s `getBusinessNowParts()` companion pattern in `src/lib/server-time.ts`, which this file should also be checked against for the "clock passed as parameter, never read internally" idiom). RESEARCH.md's Pattern 5 draft already follows this correctly:
```typescript
export const ANALYTICS_WINDOW_DAYS = 30 // D-03: named constant, tunable without touching query logic
export const ANALYTICS_BUCKET_GRANULARITY = 'day' as const // D-03: named constant

export function bucketByDay(
    createdAtTimestamps: string[],
    now: Date,
    windowDays: number = ANALYTICS_WINDOW_DAYS
): DailyBucket[] {
    // eachDayOfInterval / startOfDay / subDays / format from date-fns
}
```

**Named-constant convention** (D-03/D-16 requirement) — copy `slots.ts`'s top-level `export const SLOT_DURATION_MINUTES = 90` (line 20) as the exact shape: a single exported `UPPER_SNAKE`-ish (actually `PascalCase`-free, plain `camelCase`-exported-as-const in this repo's style — see `SLOT_DURATION_MINUTES`, `ANALYTICS_WINDOW_DAYS`) constant with a one-line TSDoc comment tying it to its deciding decision ID. Apply the same for the two D-16 table limits:
```typescript
export const RECENT_CONTACTS_LIMIT = 10 // D-16
export const UPCOMING_APPOINTMENTS_LIMIT = 10 // D-16
```
Place these either alongside `bucket-by-day.ts`'s constants or in `dashboard-queries.ts` directly above the queries that consume them — this repo does not centralize all tunables in one file (`SLOT_DURATION_MINUTES` lives in `slots.ts` next to its consumer, not in `constants.ts`), so co-locating the two table-limit constants with `dashboard-queries.ts` is consistent, not a deviation.

---

### `src/lib/dashboard/dashboard-queries.ts` (service, CRUD read)

**Analog:** `src/lib/booking/booking-availability.ts` (full file, 150 lines) — closest in-repo precedent for "a server-side read module returning a discriminated ok/fail result, never silently degrading a query failure to an empty result" (Pitfall 3 in RESEARCH.md warns about exactly this).

**Client to use — IMPORTANT DEVIATION FROM THE ANALOG:** `booking-availability.ts` uses `createAdminClient()` (line 13, `import { createAdminClient } from '@/lib/supabase/admin'`) because as a public booking flow it must bypass RLS. **Dashboard reads must NOT copy that import.** D-04 requires the RLS-respecting SSR client instead:
```typescript
import { createClient } from '@/lib/supabase/server'
// ...
const supabase = await createClient() // note: async, unlike createAdminClient()
```
**No existing file in this repo currently calls `createClient()` from `server.ts` for a data read** (grep confirms `server.ts` is currently only wired through `src/middleware.ts`'s companion `updateSession` and is otherwise unconsumed by any Server Component yet) — this is a genuinely new call site, not merely a new file. Treat `booking-availability.ts` as the structural analog (try/catch, explicit `console.error`, discriminated failure) while swapping only the client-factory import and adding the `await` `createClient()` requires.

**Core read pattern to copy** (from `booking-availability.ts` lines 34-72, `getMonthAvailability`):
```typescript
export async function getRecentContacts(): Promise<...> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('contacts')
            .select('created_at, name, last_name, phone')
            .order('created_at', { ascending: false })
            .limit(RECENT_CONTACTS_LIMIT)

        if (error) {
            console.error('getRecentContacts: Supabase read failed', { error })
            return { ok: false }
        }

        return { ok: true, data: data ?? [] }
    } catch (error) {
        console.error('getRecentContacts: unexpected error', { error })
        return { ok: false }
    }
}
```
Apply the identical try/catch/explicit-error-branch shape to `getUpcomingAppointments` (D-16: `.gte('appt_date', today).order('appt_date', { ascending: true }).order('appt_time', { ascending: true }).limit(UPCOMING_APPOINTMENTS_LIMIT)`) and to the three `analytics_events` chart reads (D-01/D-18: two read `analytics_events` filtered by `event_type` and `gte('created_at', windowStart)`; the contacts chart reads `contacts.created_at` over the same window per D-18's amendment).

**Discriminated-result contract to mirror** (from `src/types/booking.ts` lines 114-127, `AvailabilityReadResult`):
```typescript
export type AvailabilityReadResult<TData> = { ok: true; data: TData } | { ok: false }
```
Define an equivalent generic (or reuse this one directly if its shape fits) in `src/types/` for dashboard reads so a query failure is structurally distinct from "zero rows" — this is the exact mechanism Pitfall 3 in RESEARCH.md calls for.

---

### `src/components/dashboard/RecentContactsTable.tsx` / `UpcomingAppointmentsTable.tsx` (component, Server Component read-only table)

**Analog:** `src/components/booking/SlotList.tsx` — not read in full above (bounded-list-from-server-data precedent per the phase mapping instructions), but structurally the closest existing "render a small server-derived list with per-row shape" component. **No existing table/grid component exists.** Compose these new components using the freshly generated `src/components/ui/table.tsx` (its `data-slot` convention will match `card.tsx`'s, e.g. `data-slot="table-row"`, `data-slot="table-cell"`) — there is no in-repo table-rendering JSX to copy beyond the generated primitive itself.

**Empty-state convention to copy** (D-01, "No data yet" honest-empty-state requirement) — no exact analog exists for an empty-state message, but `ESTIMATE_COPY.unknownVehicleTypePrompt`/`notFoundMessage` (constants.ts lines 52-58) establish the repo's voice for this kind of message: plain, second-person, no jargon. Write the D-01 empty-state string (`"No data yet — event tracking arrives in Phase 6"`) into `ADMIN_COPY` following that same voice, not inline in the component.

---

### `src/app/(admin)/admin/(dashboard)/layout.tsx` (component, layout — D-14)

**No direct analog exists.** `src/app/(public)/layout.tsx` is explicitly documented (CONTEXT.md, RESEARCH.md) as a bare passthrough with no chrome of its own — every public page composes its own `TopNav`+`Footer`. This is the **first real layout file** in either route group. Do not copy the public layout's passthrough shape; instead this file must render a sidebar (`Dashboard`, `Users` links per D-14), the current admin's email, and a logout button wired to `logoutAction`.

**Structural precedent for "get the current user in a Server Component"** — none exists yet in this repo (no Server Component currently calls `.auth.getUser()`); RESEARCH.md's Anti-Patterns section is explicit that this must use `createClient()` (from `server.ts`) + `getUser()`, never `getSession()`, matching `src/lib/supabase/middleware.ts`'s load-bearing choice (lines 41-45):
```typescript
// CRITICAL: getUser() not getSession() — revalidates JWT server-side (CVE-2025-29927)
// Do NOT replace with getSession() even if it seems simpler.
const {
  data: { user },
} = await supabase.auth.getUser()
```

**Route-group placement (verified on-disk tree, 2026-08-06):**
```
src/app/(admin)/admin/
├── login/
│   └── page.tsx                    # EXISTS today (placeholder) — replaced wholesale, stays OUTSIDE (dashboard)
└── (dashboard)/                    # DOES NOT EXIST YET — new nested route group
    ├── layout.tsx                  # NEW — sidebar shell (D-14)
    ├── page.tsx                    # NEW — /admin dashboard
    └── users/
        └── page.tsx                # NEW — /admin/users
```
Full current `src/app/` tree (verified via direct `find`, 2026-08-06):
```
src/app/
├── layout.tsx
├── globals.css
├── favicon.ico
├── api/
│   ├── estimate/route.ts
│   └── vin/[vin]/route.ts
├── (public)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── about/page.tsx
│   ├── book/page.tsx
│   └── contact/page.tsx
└── (admin)/
    └── admin/
        └── login/page.tsx
```
Confirms RESEARCH.md's documented tree is accurate and current — no `(dashboard)` folder, no `layout.tsx` anywhere under `(admin)` yet.

---

### `src/components/admin-users/AddUserForm.tsx` (component, client form)

**Analog:** `src/components/booking/BookingForm.tsx` (full file, 280 lines) — **use this, not `ContactForm.tsx`**, as the primary analog. `BookingForm.tsx` is the more mature, gap-closed pattern: it uses the shadcn `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` composition (imported from `src/components/ui/form.tsx`), while `ContactForm.tsx` manually calls `register()` and renders raw `<Label>`+`<input>`+error-`<p>` without the `Form` wrapper. Per-file comment in `BookingForm.tsx` (lines 18-25) explicitly documents this as a "gap closure" that `ContactForm.tsx` predates — the `Form`-wrapped style is the more current convention.

**Core wiring pattern to copy** (from `BookingForm.tsx` lines 63-78, 112-123, 138-140, 174-193):
```typescript
const [state, formAction, isPending] = useActionState(createBooking, INITIAL_STATE)

const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    values: { /* ...state.values merged with any lifted/initial values... */ },
})

function onValidSubmit(values: BookingFormValues) {
    const formData = new FormData()
    formData.set('firstName', values.firstName)
    // ...
    formAction(formData)
}

return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onValidSubmit)} className="space-y-4" noValidate data-testid="form-booking">
            <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{BOOKING_COPY.formFieldLabels.firstName}</FormLabel>
                        <FormControl>
                            <input {...field} value={field.value ?? ''} disabled={isPending} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {/* one FormField per field: email, password, confirmPassword */}
            <Button type="submit" className="w-full" disabled={isPending} data-testid="btn-submit-booking">
                {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Booking…</>) : (BOOKING_COPY.submitLabel)}
            </Button>
        </form>
    </Form>
)
```

**Server-error → field-error bridging pattern** (from `BookingForm.tsx` lines 92-105, the "gap closure" `useEffect`):
```typescript
useEffect(() => {
    if (state.status === 'error' && state.fieldErrors) {
        for (const [field, message] of Object.entries(state.fieldErrors)) {
            if (message && (field === 'firstName' /* ... */)) {
                form.setError(field, { type: 'server', message })
            }
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [state.fieldErrors, state.status])
```
Apply this to `AddUserForm` so a server-side `email`/`password`/`confirmPassword` re-validation failure surfaces per-field, not only as a generic message.

**D-12's "show password once on success" requirement** has no in-repo analog (`BookingConfirmation.tsx` shows booking details, not a secret value) — this is new UI, but the `state.status === 'success'` early-return branch shape is identical to both `ContactForm.tsx` (lines 47-53) and `BookingForm.tsx` (lines 125-136): render a different subtree entirely rather than a conditional banner atop the form.

**Simpler `LoginForm.tsx`** (only 2 fields, no field-array complexity) should use the same `Form`/`FormField` composition but can more closely mirror `ContactForm.tsx`'s flatter structure given it has no D-09 "preserve values across failure" requirement — a login form has no reason to remember a failed password attempt.

---

### `src/components/admin-users/UserList.tsx` + `RemoveUserDialog.tsx` (component, client list + confirmation)

**Analog:** No direct per-row-destructive-action-with-confirmation precedent exists in this repo. `src/components/booking/SlotList.tsx` is the closest "bounded list rendered from server-shaped data with per-item interactive state" but has no destructive/dialog action. **Treat `RemoveUserDialog.tsx` as net-new UI**, composed from the freshly generated `alert-dialog.tsx` primitive.

**D-11's exact confirmation-copy requirement** ("Remove admin@example.com? They will immediately lose access.") has no existing analog string — write it into `ADMIN_COPY` as a template function or `{email}`-interpolated string, following `BOOKING_COPY.confirmationBody`'s interpolation style (constants.ts line 94: `"We've recorded your appointment. We'll call you at"` + caller-appended phone number) — i.e., store the fixed parts as copy constants and interpolate the dynamic email/phone at the call site, never inline the whole templated sentence in the component.

---

### `src/components/ui/alert-dialog.tsx` (shadcn-generated, ui primitive)

**Analog:** `src/components/ui/sheet.tsx` (full file, 139 lines) — the clearest in-repo demonstration of this project's **Base UI `render`-prop convention** (NOT Radix `asChild`).

**The exact pattern every generated primitive in this phase must match** (from `sheet.tsx` lines 62-77):
```tsx
<SheetPrimitive.Close
  data-slot="sheet-close"
  render={
    <Button
      variant="ghost"
      className="absolute top-3 right-3"
      size="icon-sm"
    />
  }
>
  <XIcon />
  <span className="sr-only">Close</span>
</SheetPrimitive.Close>
```
Note the import at the top: `import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"` (line 4) — every generated primitive imports from `@base-ui/react/<primitive>`, never `@radix-ui/*`. Per RESEARCH.md's own verification, the live shadcn registry's `alert-dialog.json` already emits this convention correctly (its `AlertDialogCancel` uses `render={<Button variant={variant} size={size} />}` — RESEARCH.md Pattern 1 excerpt), so **no patching is expected to be needed** for the render-prop convention itself post-generation — only a post-generation grep for stray `@radix-ui/*` imports (there should be none) is the verification step, mirroring how Phase 4 verified `calendar.tsx` after generation.

`data-slot` naming convention to verify matches (`sheet.tsx` uses `data-slot="sheet"`, `"sheet-trigger"`, `"sheet-close"`, `"sheet-content"`, `"sheet-header"`, `"sheet-footer"`, `"sheet-title"`, `"sheet-description"` — one per exported sub-component, always `<primitive-name>-<part>`).

---

### `src/components/ui/table.tsx` (shadcn-generated, ui primitive)

**Analog:** `src/components/ui/card.tsx` (full file, 104 lines) — the closest in-repo precedent for "a family of plain `<div>`/element wrapper components sharing a `data-slot` naming convention with zero external primitive dependency" (per RESEARCH.md's Package Legitimacy Audit: `table.json`'s registry payload has no `dependencies` array — it is pure `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` wrappers, structurally identical in spirit to `card.tsx`'s pure-`<div>` wrappers). Expect the generated file to export `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` following the same `data-slot="table-*"` pattern `card.tsx` uses (`data-slot="card-header"`, `"card-title"`, etc. — lines 26, 39, 52, 63, 76, 86 of `card.tsx`).

---

### `src/components/ui/chart.tsx` (shadcn-generated, ui primitive) + `VisitorsChart.tsx` / `ContactsChart.tsx` / `VinSearchChart.tsx`

**No analog exists anywhere in this repository.** Confirmed by the full file listing above — there is no `recharts` import, no `Chart*` component, no `.tsx` file under any `components/` subdirectory that renders a data visualization of any kind. This is the single largest net-new surface in the phase. Do not invent a weak analog; build directly from:
1. The live shadcn registry payload for `chart.tsx` (fetch via `npx shadcn@latest add chart` per the package-approval gate)
2. RESEARCH.md's `ChartConfig` type excerpt (Code Examples section) — the only concrete shape available pre-generation:
```typescript
export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; icon?: React.ComponentType } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  )
>
```
3. The brand constraint (white/red/black palette, CLAUDE.md) when choosing each chart's `color` token — use existing CSS variables (`var(--primary)` etc.) rather than introducing new color literals, matching how `button.tsx`/`card.tsx` reference theme tokens rather than hex values throughout this repo.

The three chart **components themselves** (`VisitorsChart.tsx` etc.) must be `'use client'` per D-04, receiving plain serialized `DailyBucket[]` props from the Server Component page — this data-flow shape (`Server Component fetches → passes plain props → Client Component renders`) DOES have an in-repo precedent worth copying: `src/app/(public)/book/page.tsx`'s composition of `BookingCalendar`/`SlotList` (Client Components fed by server-fetched availability data) — copy that boundary discipline (no client-side data fetching, no `useEffect` fetch, props only) even though the calendar/chart internals differ completely.

---

## Shared Patterns

### Server Action discriminated-state shape
**Source:** `src/types/booking.ts` lines 105-112 (`ContactActionState`/`ContactActionStatus`)
**Apply to:** `LoginActionState`, `AddUserActionState`, `RemoveUserActionState`
```typescript
export type ContactActionStatus = 'idle' | 'success' | 'error'

export interface ContactActionState {
    status: ContactActionStatus
    values: ContactFormValues
    fieldErrors?: Partial<Record<keyof ContactFormValues, string>>
    message?: string
}
```

### Honeypot-first / cheapest-check-first Server Action ordering
**Source:** `src/lib/contact/contact-actions.ts` lines 34-37, `src/lib/booking/booking-actions.ts` lines 60-64
**Apply to:** N/A directly (login/add-user/remove-user have no honeypot — these are authenticated-admin-only actions, not public forms) — but the **general principle** ("cheapest, no-I/O check first; Zod re-validation second; I/O last") applies directly to `removeUserAction`: D-10's two guards (`isSelfDeleteAttempt`, `isLastAdminAttempt`) must run BEFORE `deleteUser()` is called, exactly mirroring how the honeypot and Zod checks run before any `.insert()` call in the analogs.

### `console.error` on every failure branch, generic copy-module message to the client
**Source:** `src/lib/contact/contact-actions.ts` lines 63-64, 70; `src/lib/booking/booking-availability.ts` lines 48-51, 68-70, 96-98, 115-117
**Apply to:** every new Server Action and every new dashboard-read function. RESEARCH.md's Pitfall 3 explicitly warns against silently collapsing a real query failure into the same "empty" UI state without at least logging server-side — every analog in this repo already does this correctly; the new code must not regress it.

### `server-only` fencing
**Source:** `src/lib/supabase/admin.ts` line 1, `src/lib/pricing.ts` line 1, `src/lib/booking/booking-availability.ts` line 1
**Apply to:** any new module touching `createAdminClient()` or non-public data. `src/lib/admin-users/admin-users-actions.ts` should follow this (it's a `'use server'` file calling `createAdminClient()`, so the Server Action boundary already prevents client bundling, but the existing `admin.ts` itself is already fenced — no new fence needed on the action file itself, consistent with `booking-actions.ts`/`contact-actions.ts` NOT re-declaring `server-only` despite importing `createAdminClient()`). `admin-guards.ts` and `bucket-by-day.ts` should NOT be `server-only`-fenced — they are pure functions with no secret data, matching `booking-schema.ts`'s and `slots.ts`'s explicit reasoning for omitting the fence (both header comments state this explicitly).

### Copy-module pattern (`ADMIN_COPY`)
**Source:** `src/lib/constants.ts` lines 68-96 (`BOOKING_COPY`, full block)
**Apply to:** every user-facing string in this phase — login errors, D-11's confirmation copy, D-01's empty-state hint, D-02's "tracking starts Phase 6" card subtitle, D-12's one-time password-display message, table column headers if not self-evident.
```typescript
// Copy for <the admin area> (Phase 5). Follows the same shape and header-
// comment convention as ESTIMATE_COPY/BOOKING_COPY/CONTACT_COPY above.
export const ADMIN_COPY = {
    loginGenericError: '...',        // D-09's discretion note: distinct from an "unreachable Supabase" message
    loginUnreachableError: '...',
    logoutLabel: 'Log out',
    dashboardEmptyStateHint: 'No data yet — event tracking arrives in Phase 6', // D-01
    trackingStartsHint: 'Tracking starts in Phase 6',                          // D-02 card subtitle
    removeUserConfirmBody: 'They will immediately lose access.',              // D-11, email interpolated by caller
    selfDeleteError: 'You cannot remove your own account.',                   // D-10 guard 1
    lastAdminError: 'At least one admin must remain.',                        // D-10 guard 2
    passwordShownOnceNotice: 'Account created. Save this password — it will not be shown again.', // D-12
    neverSignedIn: 'Never signed in',                                        // Pitfall 5 fallback
} as const
```

### `data-testid` naming (`btn-`, `input-`, `text-`, `card-`, `form-`)
**Source:** used throughout `ContactForm.tsx` and `BookingForm.tsx` (e.g. `data-testid="btn-contact-submit"`, `"input-contact-first-name"`, `"text-contact-error"`, `"card-contact-success"`, `"form-booking"`)
**Apply to:** every interactive element in every new component this phase, per the global naming-conventions standard's prefix matrix (`btn-`, `input-`, `select-`, `modal-`/`dialog-` for `RemoveUserDialog`, `table-`/`row-`/`cell-` for the two dashboard tables, `card-` for summary cards).

## No Analog Found

Files/surfaces with no close match in the codebase — planner should treat these as net-new work guided by RESEARCH.md's Code Examples and the live shadcn registry, not by an in-repo pattern:

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/ui/chart.tsx` | ui primitive | — | No chart component, no `recharts` import, anywhere in the repo. First data-visualization surface in the project. |
| `src/components/dashboard/VisitorsChart.tsx` | component | request-response | Depends entirely on the not-yet-generated `chart.tsx`; no client-side Recharts consumer exists to copy. |
| `src/components/dashboard/ContactsChart.tsx` | component | request-response | Same as above. |
| `src/components/dashboard/VinSearchChart.tsx` | component | request-response | Same as above. |
| `src/components/admin-users/RemoveUserDialog.tsx` | component | request-response | No dialog/alert-dialog primitive or per-row destructive-confirmation pattern exists yet. |
| `src/app/(admin)/admin/(dashboard)/layout.tsx` | layout | request-response | First real (non-passthrough) layout in this repo; `(public)/layout.tsx` is explicitly documented as a bare passthrough with no sidebar/chrome precedent. |

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/lib/`, `src/types/` (full repo — 46 source files, confirmed via `find src -type f`)
**Files scanned:** 46 existing source files read or grepped; 12 read in full (booking-actions.ts, contact-actions.ts, contact-schema.ts + .test.ts, booking-schema.ts, slots.ts + .test.ts, admin.ts, server.ts, pricing.ts, ContactForm.tsx, sheet.tsx, form.tsx, BookingForm.tsx, card.tsx, button.tsx, middleware.ts, booking-availability.ts, types/booking.ts, constants.ts, login/page.tsx)
**Pattern extraction date:** 2026-08-06

---

*Phase: 05-admin-backend*
