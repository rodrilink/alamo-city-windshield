# Roadmap: Alamo City Windshield Repair

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-08-10) — [archive](milestones/v1.0-ROADMAP.md)

**Live:** https://alamo-city-windshield.vercel.app/
**Repository:** https://github.com/rodrilink/alamo-city-windshield

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-08-10</summary>

- [x] Phase 1: Foundation (5/5 plans) — completed 2026-04-13
- [x] Phase 2: Public Pages (4/4 plans) — completed 2026-04-14
- [x] Phase 3: VIN Estimate (10/10 plans) — completed 2026-08-05
- [x] Phase 4: Booking & Contact (12/12 plans) — completed 2026-08-06
- [x] Phase 5: Admin Backend (9/9 plans) — completed 2026-08-06
- [x] Phase 6: Analytics (7/7 plans) — completed 2026-08-07

Full phase details, goals and success criteria: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
Audit (63/63 requirements, 5/5 E2E flows): [milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-04-13 |
| 2. Public Pages | v1.0 | 4/4 | Complete | 2026-04-14 |
| 3. VIN Estimate | v1.0 | 10/10 | Complete | 2026-08-05 |
| 4. Booking & Contact | v1.0 | 12/12 | Complete | 2026-08-06 |
| 5. Admin Backend | v1.0 | 9/9 | Complete | 2026-08-06 |
| 6. Analytics | v1.0 | 7/7 | Complete | 2026-08-07 |

## Carried Into the Next Milestone

Deferred from v1.0, recorded in `MILESTONES.md`:

- Replace placeholder marketing copy — "since 2020" founding year and three
  invented testimonials in `ServicesSection.tsx`
- Verify Phase 02 (the only phase with no VERIFICATION.md artifact)
- Close open review warnings WR-01, WR-03, WR-04 (analytics robustness) and
  WR-06 (misleading comment in `booking-actions.ts`)
- Add component-test infrastructure (`@testing-library/react` + jsdom) — all
  135 current tests are pure-function
- Remove the verification test booking occupying a real appointment slot

## Phase Numbering

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.
Phase numbering continues from 7 in the next milestone — never restarts at 1.
