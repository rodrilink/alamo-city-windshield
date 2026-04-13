---
phase: 01-foundation
plan: "03"
subsystem: database
tags: [supabase, migrations, rls, schema, postgresql]
dependency_graph:
  requires: [01-01]
  provides: [supabase-schema, rls-policies, migration-file]
  affects: [01-04, 01-05, all-feature-phases]
tech_stack:
  added: [supabase-cli]
  patterns: [supabase-migrations, row-level-security, date-time-split]
key_files:
  created:
    - supabase/config.toml
    - supabase/migrations/20260412000000_initial_schema.sql
  modified:
    - .gitignore
decisions:
  - "D-10: All 4 tables created upfront in a single migration"
  - "D-13: RLS enabled on every table from migration 0"
  - "D-14: DATE + TIME columns (not TIMESTAMPTZ) for appointment slots"
  - "D-15: UNIQUE(appt_date, appt_time) constraint prevents double-booking at DB level"
  - "vin_cache RLS with zero policies: service-role bypasses RLS; anon/authenticated get zero access"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-12"
  tasks_completed: 1
  tasks_deferred: 1
  files_created: 2
  files_modified: 1
---

# Phase 01 Plan 03: Supabase CLI Init + Schema Migration Summary

**One-liner:** Complete Supabase schema migration with 4 tables, RLS on every table, DATE+TIME appointment columns, and UNIQUE booking-slot constraint — push deferred pending project credentials.

## What Was Built

Initialized the Supabase CLI (`supabase init`) to create `supabase/config.toml`, then hand-crafted the migration file `supabase/migrations/20260412000000_initial_schema.sql` with the complete schema for all four application tables.

The migration implements all schema decisions locked in Phase 1 context:

| Table | RLS | Public INSERT | Auth SELECT | Notes |
|-------|-----|--------------|-------------|-------|
| bookings | enabled | yes | yes (authenticated) | DATE+TIME columns, UNIQUE slot constraint |
| contacts | enabled | yes | yes (authenticated) | honeypot column for spam analysis |
| analytics_events | enabled | yes | yes (authenticated) | metadata JSONB for flexible event data |
| vin_cache | enabled | no | no | Service-role only via RLS bypass; zero explicit policies |

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Initialize Supabase CLI and create migration with all 4 tables + RLS | da9cfab | supabase/config.toml, supabase/migrations/20260412000000_initial_schema.sql, .gitignore |

## Pending Human Action: Supabase Project Setup

Task 2 (`[BLOCKING] Link Supabase project and push migration`) is a `checkpoint:human-action` that requires live Supabase credentials. The migration file is committed and ready — push is blocked on project creation and credentials.

Before Phase 1 can fully verify, the owner must:

1. Create a Supabase project at https://supabase.com/dashboard
2. Copy project URL and anon key to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key`
   - `SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key` (server-side only — never NEXT_PUBLIC_)
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
3. Link the CLI: `supabase link --project-ref <project-id>`
   - The project-ref is the subdomain from the dashboard URL: `app.supabase.com/project/{project-ref}`
   - May need to authenticate first: `npx supabase login` (opens browser) or set `SUPABASE_ACCESS_TOKEN`
4. Push the migration: `npx supabase db push`
5. Verify in dashboard that 4 tables exist with RLS enabled:
   - Go to Table Editor — confirm all 4 tables appear
   - For each table, confirm the RLS badge shows "RLS enabled"
   - Go to Authentication > Policies — confirm policies exist per table

**Status:** checkpoint-deferred — requires user to create Supabase project and run `supabase link && supabase db push`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supabase CLI not installable via npm install -g**
- **Found during:** Task 1
- **Issue:** `npm install -g supabase` fails — Supabase CLI npm package explicitly blocks global installs and directs users to use supported package managers (Scoop, Homebrew, etc.)
- **Fix:** Used `npx supabase init` instead of `npm install -g supabase` followed by `supabase init`. The `npx` invocation downloads and runs the CLI inline, which is a fully supported pattern and produces the same output.
- **Files modified:** supabase/config.toml (created correctly)
- **Commit:** da9cfab (Task 1 commit)

**2. [Rule 3 - Blocking] supabase migration new not run (requires Docker/local DB)**
- **Found during:** Task 1
- **Issue:** `supabase migration new` requires a running local Supabase stack (Docker). The migration file was created directly with the exact filename `20260412000000_initial_schema.sql` specified in the plan frontmatter rather than through the CLI command.
- **Fix:** Wrote the migration file directly using the exact filename from the plan. The file content and behavior are identical to what `supabase migration new` would generate.
- **Files modified:** supabase/migrations/20260412000000_initial_schema.sql
- **Commit:** da9cfab

## Decisions Made

- Used `npx supabase` throughout to avoid global CLI install requirement on Windows
- Migration file named exactly per plan spec: `20260412000000_initial_schema.sql`
- `vin_cache` has RLS enabled with zero policies (not even a DENY policy) — this is the correct Supabase pattern: when RLS is ON and no policies exist, all roles except service-role are denied
- `.gitignore` updated to exclude `supabase/.temp/` and `supabase/.branches/` (local CLI temp directories)

## Known Stubs

None — the migration file is complete SQL. No placeholder values, no TODOs in the schema.

The `supabase/config.toml` `project_id` is set to `"agent-a63ffe3c"` (the worktree directory name from `supabase init`). This will be updated to the real Supabase project-ref when the user runs `supabase link --project-ref <real-ref>`.

## Threat Surface

All threats from the plan's `<threat_model>` are addressed in the migration:

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-01-07 | RLS on bookings + contacts with no anon SELECT policy | In migration — pending push to verify |
| T-01-08 | RLS on vin_cache with zero policies (service-role only) | In migration — pending push to verify |
| T-01-09 | UNIQUE(appt_date, appt_time) on bookings | In migration — prevents double-booking at DB level |
| T-01-10 | analytics_events public INSERT accepted (no DB rate limit) | Accepted per plan — app-layer rate limiting deferred to Phase 6 |
| T-01-11 | contacts.honeypot column for spam tracking | In migration — no PII concern |

No new threat surface introduced beyond what the plan's threat model covers.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| supabase/config.toml exists | FOUND |
| supabase/migrations/20260412000000_initial_schema.sql exists | FOUND |
| .planning/phases/01-foundation/01-03-SUMMARY.md exists | FOUND |
| Commit da9cfab exists | FOUND |
