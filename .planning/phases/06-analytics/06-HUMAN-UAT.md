---
status: partial
phase: 06-analytics
source: [06-VERIFICATION.md]
started: 2026-08-07T22:15:00Z
updated: 2026-08-07T22:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Honeypot-filled contact submission writes no rows
expected: Un-hide the hidden honeypot input on `/contact` via DevTools, type any value into it, and submit. The form reports success (intended bot-fooling behavior), but **no** new `contact_submit` row appears in `analytics_events` AND **no** new row appears in `contacts`.

Reference query:
`select event_type, count(*) from analytics_events group by event_type;`

Why it matters: if a row appears, a bot can inflate the conversion metric and `analytics_events` will disagree with the source `contacts` table.

Static evidence: `06-04-SUMMARY.md` records both honeypot early-returns as eventless, and code inspection during verification confirmed the tracking call sits past both. Never exercised at runtime.

result: [pending]

### 2. Duplicate booking of a taken slot writes no row
expected: Book an open slot at `/book` (succeeds, writes `booking_created`). Then attempt to book **the same slot again**. The usual "slot taken" message appears and **no** new `booking_created` row is written — a lost race created no booking.

Why it matters: the `'23505'` unique-constraint branch must not be mistaken for a success path.

Static evidence: `booking-actions.ts:121` places the tracking call past both the `'23505'` slot-taken branch and the generic error branch. Never exercised at runtime.

result: [pending]

### 3. NULL-session rows are excluded from the Visitors count
expected: With at least one `page_view` row whose `session_id IS NULL` present in the table, the Visitors KPI does **not** count it — the card shows only the count of distinct non-null sessions.

Reference query:
`select session_id, count(*) from analytics_events where event_type = 'page_view' group by session_id;`

Why it matters: counting each NULL row as its own session would recreate the page-views-as-visitors bug that plan 06-06 fixed; collapsing all NULLs into one would invent a visitor that does not exist. Exclusion undercounts, which is the deliberate safe direction.

Static evidence: the exclusion branch is unit-tested and was confirmed by code inspection in both `getSummaryTotals` and `getVisitorSeries`. All rows currently in the live table carry a `session_id`, so the branch has never run against real NULL data.

result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
