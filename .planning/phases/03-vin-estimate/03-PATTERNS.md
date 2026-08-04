# Phase 3: VIN Estimate - Pattern Map

**Mapped:** 2026-08-04
**Files analyzed:** 7 explicit (from CONTEXT.md Integration Points) + 4 shared/UI-convention targets
**Analogs found:** 5 / 7 (2 have **no analog** — greenfield, stated explicitly below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/api/vin/[vin]/route.ts` | route (Route Handler) | request-response | **none** | no analog — first Route Handler in project |
| `src/lib/pricing.ts` | utility (pure) | transform | `src/lib/constants.ts` (module-level exported const style) | partial — no pure-function file exists, only const-object files |
| `src/lib/vin.ts` | service (external fetch) | request-response | **none** | no analog — first outbound third-party `fetch` in project |
| `src/lib/supabase/admin.ts` | config/provider (client factory) | CRUD (DB) | `src/lib/supabase/server.ts` + `src/lib/supabase/client.ts` | exact — same file family, same export shape, new auth mode |
| `src/types/vehicle.ts` | model (types) | — | `src/types/css.d.ts` | role-match only — no precedent for runtime types in `src/types/` |
| `src/components/home/EstimateSection.tsx` | component (Client) | request-response (to be added) | itself (existing file, MODIFY in place) | exact — read fully below |
| `src/lib/pricing.test.ts` | test | transform | **none** | no analog — zero test files exist anywhere in repo |

## Pattern Assignments

### `src/app/api/vin/[vin]/route.ts` (route, request-response)

**Analog:** none. Grep/Glob confirm `src/app/**/route.ts` returns zero matches — this is the **first Route Handler in the project**. There is nothing to copy structurally from existing code; RESEARCH.md's own verified code examples (Pattern 3, `params: Promise<{ vin: string }>`, and Pattern 2's `AbortSignal.timeout(6000)` classification) are the authoritative source for this file, not a codebase analog.

What *does* exist and is relevant as a half-analog:
- `src/lib/supabase/middleware.ts` (lines 1-58) — the only other file in the repo that touches `NextRequest`/`NextResponse` directly, shows the project's convention for env-var guard comments and inline "why" comments (e.g. line 41: `// CRITICAL: getUser() not getSession() — revalidates JWT server-side (CVE-2025-29927)`). Mirror this commenting style for the D-17/D-18/D-19 branching logic — explain *why* a branch exists, not just what it does.
- Async `params` signature and NHTSA fetch/timeout/classification code MUST come from RESEARCH.md `Pattern 2` and `Pattern 3` (lines 267-315) verbatim — these were live-verified this session, not assumed.

**Import/env-var convention to mirror** (from `src/lib/supabase/middleware.ts` lines 8-12):
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseAnonKey) {
  return NextResponse.next({ request })
}
```
Apply the same "guard, don't throw" instinct is NOT appropriate here (a missing service-role key should be a hard error, not a silent skip) — but the *pattern of checking env vars explicitly near the top of the function, with a comment explaining the reason* is the convention to copy.

---

### `src/lib/pricing.ts` (utility/pure, transform)

**Analog:** `src/lib/constants.ts` (read in full, 20 lines).

**Module style pattern** (lines 1-12):
```typescript
export const BUSINESS = {
  name: 'Alamo City Windshield Repair',
  phone: '(210) 555-0100',
  phoneHref: 'tel:+12105550100',
  location: 'San Antonio, TX',
  serviceArea: 'Mobile service available across San Antonio',
  hours: [
    { days: 'Mon–Fri', open: '8:00 AM', close: '6:00 PM', closed: false },
    { days: 'Sat', open: '9:00 AM', close: '2:00 PM', closed: false },
    { days: 'Sun', open: null, close: null, closed: true },
  ],
} as const
```
Takeaway: the project's convention for hardcoded, locked-value data is a **plain exported `const ... as const` object**, not a class or factory. `lib/pricing.ts`'s D-01..D-05 constants (base price, size modifiers, glass modifiers) should follow this same flat-object-literal style before the `computeEstimate` function.

`src/lib/utils.ts` (read in full, 7 lines) is the *only* existing "pure helper" file:
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
Convention: pure functions are plain named exports (`export function ...`), no default export, no class wrapper — consistent with the `code-standards.md` `.utility.ts` rule (pure, no side effects, no classes). `pricing.ts` should export a plain `computeEstimate(...)` function the same way.

**Critical addition not present in any existing file:** `import 'server-only'` must be the first line, per RESEARCH.md D-15 enforcement — no existing file in the repo uses this yet (it's a new package, not installed: confirmed absent from `package.json` dependencies). This is new convention, not copied from an analog.

---

### `src/lib/vin.ts` (service, request-response / external fetch)

**Analog:** none. Grep for `fetch(` across `src/` returned zero matches — **no outbound third-party `fetch` exists anywhere in this codebase.** The closest structural relative is `src/lib/supabase/middleware.ts`, which at least shows the project's error-guard-and-comment style for a request/response boundary, but it uses the Supabase SDK, not raw `fetch`.

Build this file from RESEARCH.md's live-verified Pattern 1 (field-presence classification, lines 240-265) and Pattern 2 (timeout/network classification, lines 267-299) directly — both are already concrete, working TypeScript, not abstractions to reinterpret.

---

### `src/lib/supabase/admin.ts` (config/provider, CRUD)

**Analog:** `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` — direct, exact-family analogs. Both read in full (28 and 9 lines respectively). This is the highest-value excerpt in this document per the task brief.

**`src/lib/supabase/server.ts` (verbatim, all 28 lines):**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — ignored.
            // Middleware handles token refresh for RSC reads.
          }
        },
      },
    }
  )
}
```

**`src/lib/supabase/client.ts` (verbatim, all 9 lines):**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Conventions to mirror exactly in `admin.ts`:**
- Named export `createClient` (or `createAdminClient` per RESEARCH.md's suggested name — either is consistent, but note the existing two files both use the bare name `createClient`; if the planner names the third one identically, imports must be disambiguated by path, e.g. `import { createClient as createAdminClient } from '@/lib/supabase/admin'` — flag this naming collision risk to the planner explicitly)
- Env vars accessed via `process.env.X!` (non-null assertion), never through a wrapper/retriever abstraction — this project does NOT have an `EnvironmentVariablesRetriever` (that's a backend-repo convention from the global standards, not present in this Next.js frontend-hosted repo; direct `process.env` access is the established local convention)
- `NEXT_PUBLIC_SUPABASE_URL` is reused as-is for the admin client (same URL, different key) — only `SUPABASE_SERVICE_ROLE_KEY` is new and MUST NOT carry a `NEXT_PUBLIC_` prefix (Phase 1 D-21, re-confirmed in RESEARCH.md)
- No class wrapper, no DI container — both existing clients are simple factory functions returning the SDK client directly. `admin.ts` should match this shape (RESEARCH.md's own example already does, see RESEARCH.md lines 328-343)
- `import 'server-only'` should be the first line (new convention, not yet used anywhere in the repo, but required per D-15/D-21 threat model — `server.ts` and `client.ts` predate this need since `client.ts` is intentionally client-safe and `server.ts` is already unreachable from the client by virtue of using `next/headers`)

---

### `src/types/vehicle.ts` (model/types)

**Analog:** `src/types/css.d.ts` — but this is a **weak/non-analog**. Its entire content is:
```typescript
declare module '*.css'
```
This is an ambient module declaration for asset imports, not a runtime type/interface file. **There is no precedent in this codebase for shared runtime TypeScript types/interfaces living in `src/types/`.** A full repo listing (`find src -type f`) confirms `src/types/` currently holds only this one ambient-declaration file.

**Report on convention:** Every other type in the project is either inline (component prop interfaces defined directly above the component, e.g. `EstimateSectionProps` in `EstimateSection.tsx` lines 11-13, `ServicesSectionProps` in `ServicesSection.tsx` lines 10-12) or implicit (no shared domain model types exist yet — this is the first business-domain type file in the project). `src/types/vehicle.ts` will be establishing a new convention (a `src/types/` directory for shared domain types), not following an existing one. This is architecturally reasonable (RESEARCH.md's recommended structure already assumes it) but the planner should know it is greenfield, matching the project's colocated-interface style only insofar as using plain `export interface`/`export type` declarations, no classes, no `I`-prefix (this project is a frontend Next.js app, not one of the `ipay-*` backend repos — the `I`-prefix interface convention from the global engineering standards is a backend-repo convention and is not used anywhere in this codebase; e.g. `EstimateSectionProps`, not `IEstimateSectionProps`). **Follow the local codebase convention (no `I` prefix) over the global standards file, since this repo is a Next.js/shadcn frontend project outside the `ipay-*` backend convention's scope.**

---

### `src/components/home/EstimateSection.tsx` (component, request-response — MODIFY)

**Analog:** itself. Read in full (132 lines) — this is the file being rewired, not a template to copy from another file. Full breakdown of what stays vs. what gets replaced:

**Imports (lines 1-9) — KEEP, will need additions (fetch state, selectors, icons):**
```typescript
'use client'

import { type RefObject, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BUSINESS } from '@/lib/constants'
```

**VIN_REGEX + normalization (lines 15-17, 26, 34, 86) — KEEP verbatim, do not rewrite:**
```typescript
// VIN regex: 17 chars, uppercase A-Z excluding I, O, Q + digits 0-9
// Source: NHTSA VIN specification
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/
```
```typescript
const normalized = vin.trim().toUpperCase()
```
```typescript
onChange={(e) => {
  setVin(e.target.value.toUpperCase())
  ...
}}
```

**Error rendering with `role="alert"` (lines 99-103) — KEEP the pattern, reuse for D-18's "check your VIN" message too:**
```typescript
{vinError && (
  <p className="mt-1 text-sm text-destructive" role="alert">
    {vinError}
  </p>
)}
```

**Card-in-snap-section layout (lines 47-65) — KEEP the outer section/motion/Card wrapper unchanged:**
```typescript
<section className="snap-start snap-always h-dvh relative overflow-hidden flex items-center justify-center">
  <Image src="..." alt="..." fill className="object-cover" />
  <div className="absolute inset-0 bg-black/55" />
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
    viewport={{ root: scrollRef, once: true, amount: 0.3 }}
    className="relative z-10 w-full max-w-md mx-auto px-4"
  >
    <Card>...</Card>
  </motion.div>
</section>
```
D-07's "swap inside the same card" requirement means this outer shell is untouched; only what's inside `<CardContent>` changes.

**REPLACE ENTIRELY — the fake-result block (lines 110-126):**
```typescript
{/* Fake result card (D-11) — Phase 2 placeholder, wired to real API in Phase 3 */}
{showResult && (
  <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
    <p className="font-semibold text-foreground">2024 Toyota Camry</p>
    <p className="text-muted-foreground">
      Estimated replacement: $250 – $400
    </p>
    <p className="mt-2 text-xs text-muted-foreground italic">
      Estimates launching soon — call {BUSINESS.phone} for an immediate
      quote.
    </p>
    <Link href="/contact" className="block mt-3">
      <Button className="w-full">Book Appointment</Button>
    </Link>
  </div>
)}
```
This entire block is the D-12 placeholder to remove: the hardcoded "2024 Toyota Camry", the hardcoded "$250 – $400", and specifically the "Estimates launching soon" sentence. The `<Link href="/contact">` + `<Button>Book Appointment</Button>` wrapper stays (per CONTEXT.md: CTA continues to link to `/contact` until Phase 4) but everything above it becomes the real result: vehicle identity, four-line breakdown, glass selector, ADAS note, D-11 disclaimer (using `BUSINESS.phone` the same way, just with new wording).

**`handleSubmit` (lines 24-44) — currently pure client-side state, must become async and call the new Route Handler:**
```typescript
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const normalized = vin.trim().toUpperCase()

  if (normalized.length === 0) {
    setVinError('Please enter your VIN')
    setShowResult(false)
    return
  }

  if (!VIN_REGEX.test(normalized)) {
    setVinError(
      'Please enter a valid 17-character VIN (letters A-Z excluding I, O, Q and digits 0-9)'
    )
    setShowResult(false)
    return
  }

  setVinError('')
  setShowResult(true)
}
```
The two validation branches (empty / regex fail) stay exactly as-is (client-side instant feedback, per RESEARCH.md's Architectural Responsibility Map). Only the final `setShowResult(true)` branch changes — it becomes `async`, sets a loading state (D-08: button becomes "Decoding VIN…" spinner), calls `fetch('/api/vin/' + normalized)`, and branches on the response's `status` field (`decoded` / `not-found` / `needs-vehicle-type` / `unreachable`) into the four D-17/18/19/20 UI states.

---

## Shared Patterns

### shadcn/ui primitive composition — **built on `@base-ui/react`, NOT Radix**

**Important correction to a common assumption:** this project's `shadcn` CLI (v4.2.0) generates components wrapping `@base-ui/react` primitives, not `@radix-ui/react-*`. Confirmed in `src/components/ui/button.tsx` line 1 (`import { Button as ButtonPrimitive } from "@base-ui/react/button"`) and `src/components/ui/sheet.tsx` line 4 (`import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"`). Any new shadcn primitive added this phase (see below) will follow this same import source, not Radix.

**Source:** `src/components/ui/button.tsx` (read in full, 59 lines), `src/components/ui/sheet.tsx` (read in full, 139 lines).

**`cn()` + `cva()` variant convention** (from `button.tsx` lines 1-41):
```typescript
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg ...",
  {
    variants: {
      variant: { default: "...", outline: "...", ghost: "...", destructive: "...", ... },
      size: { default: "...", sm: "...", lg: "...", icon: "...", ... },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```
Every shadcn primitive in this repo (`card.tsx`, `button.tsx`, `separator.tsx`, `sheet.tsx`) uses `data-slot="..."` on the root element and passes `className={cn(...)}` merging a base class string with the caller's `className` prop. Any new segmented-control component built this phase should follow this exact shape.

**Composition example — which sub-parts get used together** (`ServicesSection.tsx` lines 71-77, `EstimateSection.tsx` lines 66-71): consumers only ever compose `Card` + `CardHeader`/`CardContent` + `CardTitle` — `CardFooter`, `CardAction`, `CardDescription` exist in `card.tsx` but are unused anywhere in the codebase so far. The VIN result UI should follow the `Card > CardHeader > CardTitle` + `Card > CardContent` pattern already established, not introduce `CardFooter`/`CardAction` without precedent.

**`render` prop pattern for composing a primitive inside a styled wrapper** (`TopNav.tsx` lines 59-64, `sheet.tsx` lines 63-71) — Base UI's convention for "render this other component as the underlying DOM element":
```typescript
<SheetTrigger render={
  <Button variant="ghost" size="icon" className="md:hidden">
    <Menu className="h-5 w-5" />
    <span className="sr-only">Open menu</span>
  </Button>
} />
```
If the glass-type/vehicle-type selector is built on a Base UI primitive (e.g. `@base-ui/react/toggle-group` or `@base-ui/react/radio-group`, both confirmed present in `node_modules/@base-ui/react/` — see below), expect this same `render`-prop composition style rather than Radix's `asChild`.

### Segmented/toggle control — **no analog exists in `src/components/`; greenfield**

Grep across `src/` for `ToggleGroup`, `RadioGroup`, `role="radiogroup"` returned zero matches. **No mutually-exclusive button group or segmented control exists anywhere in this codebase.** This must be built new for both the glass-type selector (D-13/D-14) and the vehicle-type selector (D-19/D-17).

However, the underlying primitive library is already installed and has the building blocks: `node_modules/@base-ui/react/` contains `toggle-group/`, `radio-group/`, `radio/`, and `toggle/` subdirectories, but **no corresponding `src/components/ui/toggle-group.tsx` or `radio-group.tsx` wrapper has been generated yet** (confirmed — `src/components/ui/` contains only `button.tsx`, `card.tsx`, `separator.tsx`, `sheet.tsx`). The planner has two options, both legitimate: (a) run `npx shadcn add toggle-group` (or `radio-group`) to generate the wrapper in the established style, or (b) hand-write a thin wrapper following the exact `button.tsx`/`sheet.tsx` `data-slot` + `cva` + `cn()` conventions shown above. Either way, state explicitly in the plan that this is new UI infrastructure, not a copy of an existing component.

### Icon usage convention (`lucide-react`)

**Source:** `TopNav.tsx` line 5 & 53, `ServicesSection.tsx` line 6 & 73, `HeroSection.tsx` line 6, `sheet.tsx` line 8 & 73-75.

- **Import style:** named imports directly from `lucide-react`, e.g. `import { Menu, Phone } from 'lucide-react'` (`TopNav.tsx` line 5) — never a default import, never a namespace import.
- **Sizing:** Tailwind `h-{n} w-{n}` utility classes directly on the icon component, sized contextually — `h-4 w-4` for inline text-adjacent icons (`TopNav.tsx` line 53), `h-5 w-5` for standalone nav icons (`TopNav.tsx` line 61, 91), `h-10 w-10` for large feature icons (`ServicesSection.tsx` line 73). No fixed project-wide icon size constant exists — size is chosen per context.
- **`aria-hidden`:** inconsistently applied — `TopNav.tsx` line 53 explicitly sets `aria-hidden="true"` on a `<Phone>` icon adjacent to visible text, but `ServicesSection.tsx` line 73 and `sheet.tsx` line 74 (`<XIcon />`) omit it (the `sheet.tsx` case relies on an adjacent `sr-only` label instead, line 75: `<span className="sr-only">Close</span>`). **Recommendation for the new D-10 info icon:** since it will sit next to a text note (not inside an interactive control), follow the `TopNav.tsx` line 53 precedent — pair it with `aria-hidden="true"` since the adjacent text already conveys the full meaning.
- No `icon-{size}` design-token classes exist beyond what shadcn's `button.tsx` defines for icon-only buttons (`size="icon"`, `size="icon-sm"`, etc., lines 28-33) — those are for `<Button>` sizing, not raw `lucide-react` icon sizing.

### `BUSINESS.phone` consumption pattern

**Source:** `EstimateSection.tsx` line 118 (existing, to be replaced) and `TopNav.tsx` lines 49-55, 87-93.

```typescript
import { BUSINESS } from '@/lib/constants'
// ...
<a href={BUSINESS.phoneHref} className="...">
  <Phone className="h-4 w-4" aria-hidden="true" />
  <span className="hidden sm:inline">{BUSINESS.phone}</span>
</a>
```
Two fields are always paired: `BUSINESS.phoneHref` (a `tel:` URI) for the `href`/click target, and `BUSINESS.phone` (the human-readable formatted string) for display text. The D-11 disclaimer needs only the **display string** (`BUSINESS.phone`) inline in a sentence — it is not necessarily a clickable link in the existing placeholder (`EstimateSection.tsx` line 118 uses plain interpolation, no `<a href>`). Follow whichever the planner decides (plain text vs. tappable `tel:` link) but pull the value only from `BUSINESS.phone`/`BUSINESS.phoneHref` — never hardcode `(210) 555-0100` again.

### Test tooling — **no test runner installed, confirmed from `package.json`**

`package.json` `scripts` block contains only `dev`, `build`, `start`, `lint` — no `test` script, no Jest/Vitest/`node --test` reference anywhere. `devDependencies` list confirms no test framework package is installed (`@eslint/eslintrc`, `@tailwindcss/postcss`, `@types/*`, `eslint*`, `tailwindcss`, `typescript` only). A full `find src -type f` listing confirms **zero `*.test.ts`/`*.test.tsx`/`*.spec.ts` files exist anywhere in the repository** — this is the first test file the project will have. RESEARCH.md's recommendation (`node --test`, zero-dependency, confirmed live against Node v24.13.0 this session) is corroborated by this pattern-mapping pass and should be treated as correct, not re-verified further. There is no existing test-file-organization convention (no `test/` mirror directories, no `*.mock.ts` generators) to extract, because none exists yet — the global engineering standards' Jest-oriented backend conventions (mirrored `test/` directories, `.mock.ts` generators) are written for `ipay-*` backend repos and do not apply to this frontend Next.js project's tooling reality.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/app/api/vin/[vin]/route.ts` | route | request-response | First Route Handler in the project (`src/app/**/route.ts` glob returns zero results). Build directly from RESEARCH.md's live-verified Pattern 2/Pattern 3 code, not from a codebase analog. |
| `src/lib/vin.ts` | service (external fetch) | request-response | No outbound third-party `fetch` call exists anywhere in `src/` (grep for `fetch(` returns zero matches). Build from RESEARCH.md's live-verified NHTSA fetch/classification patterns. |
| `src/lib/pricing.test.ts` | test | transform | Zero test files exist anywhere in the repository; no test runner installed (`package.json` has no `test` script, no test-framework `devDependency`). Use RESEARCH.md's `node --test` example as the sole template. |
| Segmented/toggle selector component | component | — | No mutually-exclusive button group/`ToggleGroup`/`RadioGroup` exists in `src/components/` yet, though the underlying `@base-ui/react` primitive (`toggle-group/`, `radio-group/`) is already an installed dependency with no shadcn wrapper generated for it yet. |

## Metadata

**Analog search scope:** `src/` (full recursive listing via `find`), `node_modules/@base-ui/react/` (top-level listing only), `package.json` (dependencies/devDependencies/scripts)
**Files scanned/read in full:** `03-CONTEXT.md`, `03-RESEARCH.md`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`, `src/lib/constants.ts`, `src/lib/utils.ts`, `src/components/home/EstimateSection.tsx`, `src/components/home/ServicesSection.tsx`, `src/components/layout/TopNav.tsx`, `src/components/ui/card.tsx`, `src/components/ui/button.tsx`, `src/components/ui/separator.tsx`, `src/components/ui/sheet.tsx`, `src/types/css.d.ts`, `src/app/(public)/page.tsx`, `package.json`
**Grep searches performed:** `lucide-react` imports, `fetch\(|ToggleGroup|RadioGroup|role="radiogroup"|aria-live`, `**/route.ts` glob
**Pattern extraction date:** 2026-08-04
