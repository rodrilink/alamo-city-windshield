# Milestones

## v1.0 MVP (Shipped: 2026-08-10)

**Live:** https://alamo-city-windshield.vercel.app/
**Repository:** https://github.com/rodrilink/alamo-city-windshield
**Phases completed:** 6 phases, 47 plans, 88 tasks
**Audit:** `passed` — 63/63 requirements, 23/23 integrations, 5/5 E2E flows

**Delivered:** A production windshield-repair site for a San Antonio business
where a visitor enters their VIN, gets an instant replacement estimate for their
specific vehicle, and books an appointment — with an admin dashboard behind auth
showing real traffic and conversion data.

**Key accomplishments:**

- **Instant VIN-based estimates (the core value).** A visitor enters a 17-character
  VIN, which is decoded via the NHTSA vPIC API through a server-side Route Handler
  proxy (6-second timeout, `vin_cache` table for repeat lookups) and priced by a
  formula keyed on vehicle size, glass type and ADAS. Verified in production:
  a 2003 Honda Accord decodes to a full line-item estimate. A manual
  year/make/model fallback covers failed or unreachable lookups.

- **Appointment booking with race-safe slot allocation.** Visual calendar built on
  react-day-picker v9. Slots are stored as `DATE` + `TIME` columns rather than
  `TIMESTAMPTZ` to avoid timezone math, and a `UNIQUE (appt_date, appt_time)`
  constraint — not a check-then-insert — is the sole arbiter under concurrency.
  A lost race returns "slot taken" and writes nothing.

- **Authenticated admin dashboard.** Supabase Auth via `@supabase/ssr` with
  `getUser()` (never `getSession()`) in middleware. Recharts visualizations of
  visitors, VIN searches and contacts, plus recent-activity tables and admin user
  management with a last-admin-removal guard.

- **Analytics that cannot silently drift.** Four event types (`page_view`,
  `vin_search`, `contact_submit`, `booking_created`) resolve their string literals
  from one shared contract that the dashboard reader also imports — so a
  producer/consumer mismatch is a compile error rather than a silently empty
  chart. Fire-and-forget by design: no tracking failure can block or error the
  user action that triggered it.

- **Three latent metric bugs caught and fixed before launch.** Human UAT found the
  Visitors KPI counting page views as people (one visitor browsing three pages
  read as 3). The fix introduced session-based counting; code review of that fix
  then found the visitors query would silently freeze at Supabase's 1000-row cap
  (HTTP 200 with a truncated body — no error), plus two timezone defects that
  double-counted sessions spanning UTC midnight and skewed the analytics window by
  5 hours on Vercel. All three were invisible to static checks and to a
  Chicago-set dev machine.

- **A pre-deploy auth bypass fix.** The v1.0 audit found that a missing or
  mistyped Supabase env var would cause middleware to serve every `/admin/*` route
  **unauthenticated, with no error and no log**. Fixed to fail closed before the
  first deploy; production now correctly returns `307 → /admin/login`.

**Production verification (against the live URL, not self-reported):**

| Check | Result |
|---|---|
| All public routes | HTTP 200 |
| `/admin` unauthenticated | 307 → `/admin/login` |
| VIN decode end-to-end | 2003 Honda Accord + full estimate |
| Live DB write | production VIN call wrote a `vin_search` row |
| Business phone | real number rendered; placeholder absent |

### Known Gaps and Deferred Items

Recorded honestly rather than omitted:

- **Placeholder marketing copy retained by owner decision** — "since 2020" founding
  year and three invented testimonial quotes in `ServicesSection.tsx`.
- **Phase 02 has no VERIFICATION.md** — the only phase never run through the
  verifier. Its 10 requirements (HOME-01..06, ABOUT-01..04) were assessed on
  SUMMARY and direct source evidence and all held, but it carries no independent
  verification artifact.
- **Open review warnings:** WR-01 (no length constraint on the client-supplied
  `analytics_events.session_id` despite a public INSERT policy), WR-03
  (`PageViewTracker` sets its dedupe marker before confirming the insert
  succeeded, so an ad-blocked visitor permanently loses that page's tracking),
  WR-04 (`trackBrowserEvent` discards the error value), WR-06 (a comment in
  `booking-actions.ts` that contradicts the line beneath it).
- **REQUIREMENTS.md traceability table reads `Pending` for all 63 rows** despite
  63/63 being satisfied — a known bookkeeping defect (`phase.complete` reported
  `requirements_updated: false` for every phase). Per-phase VERIFICATION.md files
  are the authoritative delivery record.
- **No component-test infrastructure** — no `@testing-library/react`, no jsdom.
  All 135 tests are pure-function; component behavior is covered by manual UAT.
- **Test data in the live database** — one contact row and one booking occupying a
  real appointment slot, created during verification.

---
