---
phase: 04-booking-contact
plan: 12
type: execute
status: complete
gap_closure: true
completed: 2026-08-06
requirements: [BOOK-02, BOOK-03, BOOK-05, BOOK-06, CONT-01, CONT-06]
---

# Plan 04-12 Summary: Gap Closure Re-Verification

## Task 1 — Pre-flight automated gate

| Check | Result |
|-------|--------|
| `npm run build` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `npx vitest run` | 90/90 passing, 7 test files |
| `.env.local` present with real URL | ✓ |
| `/book` and `/contact` | HTTP 200 |
| Dev servers | exactly 1 (port 3000) |

No orphaned server this time (unlike 04-08, which found and killed PID 50408).
Dev server shut down after the walkthrough; port 3000 confirmed free.

## Task 2 — Human re-verification

### First pass — FAILED on sections A and B

Developer's verbatim report:

> A: Almost all good, no confirmatin screen, no new rows in supabaes, but no
> inline red errors are displayedn
> B: no inline errors (bad)

Section A partially failed (no inline errors) and section B — which had
previously been recorded as passing in 04-08 — fully regressed. That
combination is what identified the fault as shared infrastructure rather than
the new `handleSubmit` wiring: the two forms render errors by completely
different mechanisms (`ContactForm` uses raw `{errors.x && ...}` JSX,
`BookingForm` uses `<FormField>`/`<FormMessage>`), yet both failed identically.

### Root cause — `@hookform/resolvers@3` is incompatible with `zod@4`

Reproduced directly against the installed packages: resolvers v3's zod adapter
**throws** when handed a Zod 4 error object rather than returning a normalized
error map.

```
at node_modules/@hookform/resolvers/zod/dist/zod.mjs:1:737
```

`form.handleSubmit` awaits the resolver, so the rejection meant client-side
validation never completed and `formState.errors` never populated. Every
`<FormMessage/>` and every `{errors.x && ...}` block rendered empty for any
input, on both forms.

**This defect predates gap closure.** It shipped in the original Wave 2
(plan 04-04 installed the incompatible pair) and meant `/contact` never
validated client-side at any point. The original 04-08 UAT recorded step 23 as
passing when it could not have been. Plan 04-10's `handleSubmit` fix was
correct — it simply exposed the broken resolver beneath it.

**No data-integrity impact at any point.** `createBooking` and `createContact`
both re-validate server-side with `safeParse`, which is why the developer
observed no confirmation screen and no new Supabase row even while inline
errors were missing.

### Fix — resolvers v3 → v5, with explicit human approval

`@hookform/resolvers@^3.10.0` → `@hookform/resolvers@^5.7.1`. Zod 4 requires
the v4+ resolver line.

**This supersedes the plan 04-01 package gate**, where the developer explicitly
approved pinning `@hookform/resolvers@^3`. Because that pin was a recorded human
decision, the change was put back to the developer rather than made
unilaterally; they selected the upgrade from four presented options.

Verified at the library level after upgrade:

```
ERROR KEYS: [ 'firstName', 'phone' ]
firstName msg: First name is required
phone msg: Phone number is required
valid input -> errors: 0
```

No source changes were needed at either `zodResolver` call site — the v5 API is
compatible with existing usage. Only `package.json` / `package-lock.json`
changed.

### Second pass — ALL SECTIONS PASS

Developer's verbatim report:

> verified

| Section | Covers | Result |
|---------|--------|--------|
| A | `/book` blank submit — inline errors, no confirmation, no DB row (orig. UAT step 24) | **PASS** |
| B | `/contact` blank submit — inline errors still block (orig. UAT step 23) | **PASS** |
| C | Booking happy path — confirmation screen + live `bookings` row `status: pending` | **PASS** |
| D | Slot-taken race — WR-01 + WR-02 behavior (orig. UAT steps 11-14) | **PASS** |
| E | Short-viewport regression, D-20 / 03-UAT test 14 | **PASS** |

Section D specifically confirmed the new post-fix behavior: the customer's name
and phone survive the rejection (D-09 intact), no time remains selected, a
different slot re-shows a pre-filled form, the raced date stays **selectable**
in the month calendar because it still has free slots (WR-01 closed), and
exactly one database row exists for that slot.

## Gap closure status

| Item | Plan | Status |
|------|------|--------|
| CONT-06 client-side validation (blocking gap) | 04-10 + resolver upgrade | **CLOSED** |
| WR-01 — one taken slot marked whole day booked | 04-11 | **CLOSED** |
| WR-02 — resubmit loop on taken slot | 04-10 | **CLOSED** |
| WR-03 — no length caps on public free-text | 04-09 | **CLOSED** |

ROADMAP Success Criterion 5 now passes on **both** forms.

## Deviations

**One, significant:** the plan assumed wiring `handleSubmit` would be sufficient
to close the validation gap. It was necessary but not sufficient — an
undiscovered library incompatibility sat beneath it. Closing the gap required a
dependency upgrade that was outside this plan's scope and that overrode a prior
human gate decision, so it was escalated to the developer for approval rather
than applied silently.

## Key Files

created:
  - .planning/phases/04-booking-contact/04-12-SUMMARY.md
modified:
  - package.json (@hookform/resolvers ^3.10.0 -> ^5.7.1)
  - package-lock.json

## Follow-up recorded

The original 04-08 UAT recorded step 23 as passing when the underlying behavior
was broken. Worth noting as a process observation: a 25-step manual walkthrough
can absorb an individual step, which is precisely why goal-backward verification
runs as a separate gate. The targeted 19-step re-walkthrough in this plan caught
what the broader one missed.

## Self-Check: PASSED

- [x] All automated pre-flight gates passed before requesting human time
- [x] Exactly one dev server ran, on port 3000; shut down afterward
- [x] Developer walked all five sections and reported a result for each
- [x] First-pass failure diagnosed to root cause rather than patched at the symptom
- [x] Dependency change overriding a prior human gate decision was escalated, not applied silently
- [x] Fix verified at library level AND by human re-walkthrough
- [x] All four gap items (CONT-06, WR-01, WR-02, WR-03) confirmed closed
- [x] No dev server left running
