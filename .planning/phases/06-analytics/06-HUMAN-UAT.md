---
status: complete
phase: 06-analytics
source: [06-VERIFICATION.md]
started: 2026-08-07T22:15:00Z
updated: 2026-08-07T22:40:00Z
---

## Current Test

[all tests complete]

## Tests

### 1. Honeypot-filled contact submission writes no rows
expected: Un-hide the hidden honeypot input on `/contact` via DevTools, type any value into it, and submit. The form reports success (intended bot-fooling behavior), but **no** new `contact_submit` row appears in `analytics_events` AND **no** new row appears in `contacts`.

Reference query:
`select event_type, count(*) from analytics_events group by event_type;`

Why it matters: if a row appears, a bot can inflate the conversion metric and `analytics_events` will disagree with the source `contacts` table.

RUNTIME EVIDENCE (2026-08-07): the real `createContact` Server Action was invoked with `honeypot` set to a non-empty value. It returned `status: success` (the intended bot-fooling response) and wrote NOTHING: `contact_submit` events stayed at 1 and `contacts` rows stayed at 1 against a captured baseline. No probe row leaked into either table. Rejection occurs at `contact-actions.ts:37`, before any database call.

result: passed

### 2. Duplicate booking of a taken slot writes no row
expected: Book an open slot at `/book` (succeeds, writes `booking_created`). Then attempt to book **the same slot again**. The usual "slot taken" message appears and **no** new `booking_created` row is written — a lost race created no booking.

Why it matters: the `'23505'` unique-constraint branch must not be mistaken for a success path.

RUNTIME EVIDENCE (2026-08-07): the real `createBooking` Server Action was invoked against the already-occupied slot 2026-08-08 10:30. It returned a non-success status and wrote NOTHING: `bookings` stayed at 1 row and `booking_created` events stayed at 1 against a captured baseline. No probe row leaked.

result: passed

### 3. NULL-session rows are excluded from the Visitors count
expected: With at least one `page_view` row whose `session_id IS NULL` present in the table, the Visitors KPI does **not** count it — the card shows only the count of distinct non-null sessions.

Reference query:
`select session_id, count(*) from analytics_events where event_type = 'page_view' group by session_id;`

Why it matters: counting each NULL row as its own session would recreate the page-views-as-visitors bug that plan 06-06 fixed; collapsing all NULLs into one would invent a visitor that does not exist. Exclusion undercounts, which is the deliberate safe direction.

RUNTIME EVIDENCE (2026-08-07): a real `page_view` row with `session_id = NULL` was inserted into the live table (simulating a visitor with sessionStorage unavailable). With 5 page_view rows present — 4 carrying a session_id, 1 NULL — the distinct-session count evaluated to 2, proving the NULL row is neither counted as its own visitor nor collapsed into a phantom session. The probe row was then deleted.

result: passed

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
