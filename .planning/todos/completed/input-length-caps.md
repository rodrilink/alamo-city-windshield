---
status: pending
created: 2026-08-06
source: 04-REVIEW.md (WR-03)
type: hardening
severity: warning
---

# No maximum length validation on public free-text fields

`src/lib/booking/booking-schema.ts:34-47` and
`src/lib/contact/contact-schema.ts:16-20` validate `firstName`, `lastName`,
`phone`, and `address` with `.min(1)` only — no `.max()`. The backing columns
in `supabase/migrations/20260412000000_initial_schema.sql` are unbounded
`TEXT`.

**Failure scenario:** a scripted POST directly to the public Server Action
(bypassing the browser form entirely) submits multi-megabyte strings. Zod
accepts them, and Postgres stores them. Repeated, this is a cheap storage and
bandwidth amplification vector against the free-tier database.

**Fix direction:** add `.max()` caps to every public free-text field in both
Zod schemas. The Server Actions already re-validate with `safeParse`
server-side, so schema-level caps are enforced against direct POSTs, not just
the browser form. Consider matching DB-side constraints in a later migration —
but note the migration is shared with Phases 1, 3, 5, and 6, so a schema change
needs wider coordination than a Zod change.

Client-side validation alone is insufficient here — the threat model is a
request that never touches the React form.
