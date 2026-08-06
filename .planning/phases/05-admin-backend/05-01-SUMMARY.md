---
phase: 05-admin-backend
plan: 01
subsystem: human-gates
tags: [package-approval, supabase-auth, checkpoint, D-19]
key-files:
  created: []
  modified: []
metrics:
  tasks: 2
  commits: 1
  files_changed: 0
requirements: [ADMIN-02, ADMIN-03, ADMIN-04, AUTH-01]
---

# Plan 05-01: Human Gates — Summary

Both blocking human gates cleared. No repository source files were modified by
either task, as designed — this plan exists purely to record two decisions that
the phase cannot make on its own.

## Task 1: `recharts` npm package approval

**Pre-gate verification:** `package.json` was read directly before presenting.
`recharts` appeared in neither `dependencies` nor `devDependencies`, confirming
the gate was a genuine pre-install decision and not a redundant re-approval.

**Developer decision, recorded verbatim:**

> 1 - add the package

**Interpretation:** APPROVED. Plan `05-02` is authorized to run
`npx shadcn@latest add chart alert-dialog table`, which installs `recharts` as a
side effect of the `chart` add. ADMIN-02, ADMIN-03 and ADMIN-04 are unblocked.

**Evidence presented at the gate:**

| Field | Value |
|-------|-------|
| Package | `recharts` — one production dependency |
| Purpose | SVG chart engine under shadcn `ChartContainer` / `ChartTooltip` / `ChartLegend` |
| Version handling | shadcn `chart.json` declares `recharts@3.8.0` as a floor, not a pin; npm latest was `3.10.1` on 2026-08-06. CLI resolves the installed version — deliberately not hand-pinned, to avoid a v2/v3 mismatch against the generated `chart.tsx` |
| Audit verdict | `[OK]` / Approved, recorded in `05-RESEARCH.md`. `slopcheck install recharts` emitted `[OK]` (1 scanned, 1 OK) before its own internal `npm install` sub-step failed with a Windows subprocess spawn error (`FileNotFoundError: WinError 2`) — slopcheck's installer failing, not a package rejection. The legitimacy verdict had already been emitted |
| Provenance | `github.com/recharts/recharts`, confirmed against the live npm registry and the official shadcn registry JSON. Also named in this project's `CLAUDE.md` recommended stack |

**Scope of this gate:** ONE npm package, not five as in `04-01`. The three
shadcn CLI source files (`chart.tsx`, `alert-dialog.tsx`, `table.tsx`) are
generated source written into this repo, not npm dependencies: `table.json`
declares no `dependencies` array at all, and `alert-dialog.json` depends only on
`@base-ui/react`, already installed at `1.3.0`.

## Task 2: First Supabase Auth user (D-19)

**Automatable portion — `.env.local` verification (names and presence only,
no values read out or logged):**

| Key | Status |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | present |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | present |
| `SUPABASE_SERVICE_ROLE_KEY` | present |

All three present at the repo root. This matters beyond bookkeeping:
`src/lib/supabase/middleware.ts` lines 8-12 return `NextResponse.next()` and
skip auth entirely when the URL or anon key is absent, so any verification of
redirect behaviour in `05-09` will now exercise the real guard rather than a
silently disabled one.

**Confirmed `auth.users` row count: 1**

A user was created during this task by the developer in the Supabase dashboard
for project ref `kyhvgskeihtccylpdkas`. AUTH-01 is now verifiable and D-05 is
satisfied — that one row IS the first admin.

**Credential handling:** No password, no email/password pair, and no key
material is recorded in this summary, per threat T-05-01. The developer did
paste a credential into the execution conversation despite the task's
instruction not to; it was deliberately not transcribed into this file or any
log, and the developer was advised to rotate it in the Supabase dashboard. The
account itself remains valid for use.

**Consequence for plan 05-09 (success criterion 5):** With exactly 1 row, D-10's
last-admin guard will correctly refuse to remove it. The removal path must
therefore be exercised against a second account created through `/admin/users`
itself in plan `05-08` — not against this first admin.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 + 2 | (this summary) | docs(05-01): record recharts approval and auth.users confirmation |

No source commits — this plan modifies no repository files by design.

## Deviations

None. Both tasks executed as specified and blocked on genuine human responses;
neither was auto-approved.

One incidental finding outside this plan's scope, surfaced during the Task 2
env check: `STATE.md`'s Blockers section still asserts "No Supabase project and
no `.env.local` exist." That is now stale on both counts — `.env.local` is
present with all three keys, and Phase 4's `04-02-SUMMARY.md` already proved the
live project with dated HTTP-status and Postgres-error-code evidence. The
`auth.users` gap that remained is closed by this plan.

## Self-Check: PASSED

- [x] Human responded with an explicit decision for `recharts` (approval)
- [x] Decision recorded verbatim in this summary
- [x] `auth.users` row count recorded as a number >= 1 (count: 1)
- [x] Whether a new user was created is recorded (yes)
- [x] No password, email/password pair, or key material in this summary
- [x] `.env.local` key presence recorded by name only
- [x] `git status --porcelain` unchanged — no repository file modified by this plan
