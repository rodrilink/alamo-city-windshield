---
phase: 04-booking-contact
plan: 02
type: execute
status: complete
completed: 2026-08-06
requirements: [BOOK-04, BOOK-05]
---

# Plan 04-02 Summary: Supabase Provisioning & Migration Push

## What Happened

The blocking infrastructure gate for the whole phase. A hosted Supabase project now
exists, `.env.local` holds working credentials, and the Phase 01 migration —
committed since Phase 01 but **never pushed** — is applied to a live Postgres
instance.

**Project ref:** `kyhvgskeihtccylpdkas` (keys deliberately not recorded here)

### Task 1 — Human action: project creation

The developer created the project and supplied the URL, anon key, service-role key,
and database password.

One correction applied: the supplied URL included the REST path suffix
(`.../rest/v1/`). `NEXT_PUBLIC_SUPABASE_URL` must be the bare project origin — the
Supabase client libraries append `/rest/v1/` themselves. Written as
`https://kyhvgskeihtccylpdkas.supabase.co`. The project ref was derived from the
URL subdomain rather than supplied separately.

### Task 2 — `.env.local` written

`.gitignore:35` was confirmed to cover `.env.local` **before** any secret was
written. File mirrors `.env.example`'s exact variable names and ordering.
`NEXT_PUBLIC_SITE_URL` set to `http://localhost:3000` for local development.

Automated verification returned `ENV_OK`. All acceptance criteria pass:

- `.env.local` exists with a real `https://<ref>.supabase.co` URL, not the placeholder
- Real anon and service-role values present
- No variable matches `NEXT_PUBLIC_.*SERVICE_ROLE` — service-role key never browser-exposed
- `git check-ignore .env.local` exits 0
- `.env.example` unmodified

### Task 3 — Migration pushed and verified against the live database

`npx supabase login` could not run inside the session shell
(`LegacyLoginMissingTokenError` — non-TTY). The developer ran it in their own
terminal instead, which kept the access token out of the transcript entirely. The
CLI is not on PATH, so all commands were invoked via `npx supabase` as the plan
directed.

```
npx supabase link --project-ref kyhvgskeihtccylpdkas   -> {"project_ref":"kyhvgskeihtccylpdkas"}
npx supabase db push                                   -> Applied 20260412000000_initial_schema.sql
npx supabase migration list --linked                   -> local 20260412000000 / remote 20260412000000
```

**Verification method:** live REST API probes using the service-role and anon keys,
plus `npx supabase inspect db table-stats`. Schema state was verified behaviorally
rather than by trusting command exit codes.

| Check | Result |
|-------|--------|
| Migration in remote ledger | ✓ `20260412000000` local + remote |
| Four tables exist | ✓ `bookings`, `contacts`, `analytics_events`, `vin_cache` all HTTP 200 |
| BOOK-04 date/time types | ✓ `appt_date` accepted `2099-12-31`, `appt_time` accepted `08:00:00` as bare DATE/TIME |
| BOOK-05 unique constraint | ✓ `bookings_appt_date_appt_time_key` over exactly `(appt_date, appt_time)` |
| **Duplicate insert raises `23505`** | ✓ **Confirmed** — see below |
| RLS enforced | ✓ Proven with a seeded row (see below) |
| Migration file unmodified | ✓ `git diff --name-only` lists neither it nor `.env.example` |

**The `23505` proof (D-08 depends on this exact code):**

```
INSERT #1              -> HTTP 201
INSERT #2 (duplicate)  -> HTTP 409
   {"code":"23505",
    "details":"Key (appt_date, appt_time)=(2099-12-31, 08:00:00) already exists.",
    "message":"duplicate key value violates unique constraint
               \"bookings_appt_date_appt_time_key\""}
```

D-08's chosen error code is the real one this database emits. Plan `04-05`'s
double-booking error handling can rely on it.

**The RLS proof:** an initial anon SELECT returning `0 rows` on empty tables was
ambiguous — it could not distinguish "RLS blocked the read" from "table is empty".
Re-tested by seeding one row with the service-role key: the service-role key saw
`1 row`, the anon key saw `0 rows`. This proves the `admin_select_bookings` policy
(`auth.role() = 'authenticated'`) actively blocks anonymous reads.

Both probe rows were deleted; `bookings` is empty and the working tree is clean.

## Deviations

1. **URL suffix corrected** — supplied URL carried `/rest/v1/`; stored as bare origin.
2. **Project ref derived, not supplied** — taken from the URL subdomain.
3. **CLI login moved to the developer's own terminal** — the session shell is non-TTY,
   so `npx supabase login` could not complete there. Net security improvement: the
   access token never entered the transcript.
4. **RLS verification strengthened** — the first anon-read check was inconclusive
   against empty tables, so a seeded-row differential test was substituted.

## Security Note (carried forward)

The service-role key and database password were pasted into the session transcript
during Task 1 and are therefore in the session log. Both are rotatable from the
Supabase dashboard. **Recommend rotating before this project moves beyond local
development.** `.env.local` itself is correctly gitignored and was never committed.

## Key Files

created:
  - .env.local (gitignored — not committed, contents never echoed)
modified: []

`supabase/migrations/20260412000000_initial_schema.sql` and `.env.example` are both
unmodified, as required — the migration is shared with Phases 1, 3, 5, and 6.

## What This Unblocks

The false-positive trap is closed: before this plan, `npm run build` and `tsc` passed
while `bookings` did not exist (proven — a pre-push probe returned `PGRST205`
"Could not find the table 'public.bookings'"). Every downstream plan in this phase can
now be verified against real database state.

Also resolves the root cause of 4 outstanding Phase 01 verification items and the
blocked `vin_cache` test (03-UAT test 15).

## Self-Check: PASSED

- [x] Live Supabase project exists and is active
- [x] `.env.local` holds real credentials, is gitignored, no `NEXT_PUBLIC_` service-role prefix
- [x] Migration `20260412000000` applied and present in the remote ledger
- [x] All four tables exist with RLS enabled and enforced
- [x] `appt_date` is DATE and `appt_time` is TIME (BOOK-04)
- [x] Unique constraint over `(appt_date, appt_time)` exists (BOOK-05)
- [x] Duplicate insert demonstrably raises Postgres `23505`
- [x] Migration file and `.env.example` unmodified
