---
status: diagnosed
phase: 03-vin-estimate
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md]
started: 2026-08-05T03:40:00Z
updated: 2026-08-05T05:10:00Z
---

## Current Test

number: 12
name: Disclaimer and CTA
expected: |
  On any result, a muted one-line disclaimer under the CTA states this is an
  estimate rather than a final quote, that pricing is confirmed on seeing the
  vehicle, and shows the phone number (210) 555-0100. The Book Appointment
  button is present and navigates to /contact.
awaiting: user response -- session paused here (user switched to /gsd-progress)

## Tests

### 1. Valid VIN Returns Identity and Range
expected: Enter `1FTFW1E85NFA12345` and submit. Result appears within a few seconds reading "2022 Ford F-150" with range $338 - $663. (ROADMAP criterion 1, plan step 1)
result: pass

### 2. Line-Item Breakdown Visible Without Interaction
expected: On that result, four breakdown rows are visible with no clicking — a base replacement row, a vehicle size row, a glass type row, and a camera recalibration row reading "up to $250". (ROADMAP criterion 2, plan step 2)
result: pass

### 3. Glass Selector Updates Range With Zero Network Requests
expected: With DevTools Network open — clicking Acoustic changes range to $428 - $773 and the hint line changes to describe acoustic glass; Heated changes it to $518 - $883; Standard returns it to $338 - $663. No new network request appears for any of the three. (ROADMAP criterion 3, VIN-06, T-03-18, plan steps 3-5)
result: pass

### 4. ADAS Notice Present for 2018+ Vehicle
expected: A note below the breakdown explains that vehicles from 2018 or later often have a camera behind the windshield and that recalibration cost is included in the upper estimate. (ROADMAP criterion 5, VIN-07, plan step 6)
result: pass

### 5. Result Replaces Form In Place, With Return Path
expected: The VIN input is gone — replaced inside the same card, not pushed below it. An "Estimate another vehicle" affordance is present; clicking it returns the empty form. (D-07, plan step 7)
result: pass

### 6. Loading State Does Not Shift Layout
expected: Submitting a valid VIN turns the button into a spinner reading "Decoding VIN…", the input locks while it spins, and the card does not change height or jump. (D-08, plan step 8)
result: pass

### 7. Rejected VIN Stays Fixable, Does Not Absorb Into Fallback
expected: Enter `ZZZZZZZZZZZZZZZZZ` and submit. The VIN form stays visible and editable, a message below asks you to double-check the VIN characters, and a secondary manual-entry option is offered. The message is NOT styled as a hard red validation error, and the manual form does NOT open by itself. (D-18 distinctness, plan step 9)
result: pass

### 8. Manual Form Has Exactly Two Fields
expected: Click the manual-entry option. A form appears asking only for a model year and a vehicle type with exactly three choices — Car, SUV or Truck, Van. There is no make field and no model field. (D-17, plan step 10)
result: pass

### 9. Manual Result Prices Correctly and Omits ADAS
expected: Enter year `2015`, choose Car, submit. Result reads "2015 Car" with $270 - $330; the camera recalibration row says it is not required for this vehicle; there is NO ADAS note; one line notes the estimate is based on the details you entered. (D-20, VIN-07 negative case, plan step 11)
result: pass

### 10. Vehicle-Type Selector Live on Manual Result
expected: The vehicle type is still a live selector on that result. Switching it to Van changes the range to $405 - $495 and the headline to "2015 Van". (D-19 pattern, plan steps 12 and 14)
result: issue
reported: "I switch to van but headline still says 2015 Car"
severity: major
scope_note: "Confirmed with user: the price range DOES update correctly to $405 - $495 on switching to Van. Only the headline vehicle label is stale. The selector and pricing wiring work; the label is not deriving from the same selected-type state."

### 11. Offline Produces Manual Form, Not an Error
expected: In DevTools Network set throttling to Offline. Return to the VIN form, enter `1FTFW1E85NFA12345`, submit. The manual entry form appears — not an error message, not a red alert, not a blank card. No stack trace, HTTP status, or raw error string is shown. Set throttling back to No throttling afterward. (ROADMAP criterion 4, VIN-02, D-17, T-03-08, plan step 13)
result: pass

### 12. Disclaimer and CTA
expected: On any result, a muted one-line disclaimer under the CTA states this is an estimate rather than a final quote, that pricing is confirmed on seeing the vehicle, and shows the phone number `(210) 555-0100`. The "Book Appointment" button is present and navigates to `/contact`. (D-11, plan steps 15-16)
result: [pending]

### 13. Phase 2 Placeholder Fully Gone
expected: The text "Estimates launching soon" appears nowhere, and no result ever shows "2024 Toyota Camry" or "$250 - $400". (D-12, plan step 17)
result: [pending]

### 14. Mobile Viewport and Snap Scrolling Intact
expected: At a 375x667 device viewport, repeat tests 1, 2, 3, 7 and 9. For each the card fits within the viewport without the page scrolling inside the section, and swiping still snaps cleanly between hero, estimate, and services sections in both directions. Both selectors are tappable and the three vehicle-type labels are not truncated. (plan steps 18-19)
result: [pending]

### 15. VIN Cache Row Written for Valid VIN Only
expected: In the Supabase dashboard, the `vin_cache` table has a row for `1FTFW1E85NFA12345` and NO row for `ZZZZZZZZZZZZZZZZZ`. Failed lookups are never cached. (VIN-03, D-21, plan step 20)
result: blocked
blocked_by: third-party
reason: "No Supabase project exists and no .env.local is present — only .env.example. The vin_cache layer no-ops by design, so this cannot be observed until the database is provisioned. Same root cause as the four outstanding Phase 01 verification items."

## Summary

total: 15
passed: 10
issues: 1
pending: 4
skipped: 0
blocked: 1

## Gaps

- truth: "Switching the vehicle-type selector on a manual-entry result updates both the price range and the headline vehicle label"
  status: failed
  reason: "User reported: I switch to van but headline still says 2015 Car"
  severity: major
  test: 10
  scope: "Range updates correctly ($405 - $495); only the headline label is stale. Selector state and pricing lookup are wired; the headline is not reading the same selected type."
  root_cause: "EstimateResult receives `headline` as a precomputed string prop while `sizeBucket` is separate live state. Pricing reads the live state (`estimates[sizeBucket][glassType]`, EstimateResult.tsx:51) so it reprices on selector change, but `headline` (EstimateResult.tsx:21,56) is a frozen string built once by the caller. On the manual path, EstimateSection.tsx:254 builds it from `chosenBucket` — the value captured at submit time — so the label stays pinned to the originally submitted type while the selector and price move on. The decoded-VIN path (EstimateSection.tsx:81,99) is correctly unaffected: a real make/model must NOT change when the user corrects the size bucket."
  artifacts:
    - path: "src/components/home/EstimateResult.tsx"
      issue: "`headline` is a precomputed string prop (line 21, rendered line 56) that cannot track the component's own live `sizeBucket` state (line 45) which drives pricing (line 51)."
    - path: "src/components/home/EstimateSection.tsx"
      issue: "Line 254 freezes the manual-path headline from `chosenBucket` at submit time; it never recomputes when the vehicle-type selector changes."
  missing:
    - "On the manual-entry path only, derive the displayed vehicle-type label from the same live sizeBucket state that drives pricing, so label and price can never disagree."
    - "Leave the decoded-VIN path's headline as the literal decoded make/model — it must NOT follow the size-bucket selector."
    - "Add a regression test asserting that changing sizeBucket on a manual result updates both the price range AND the rendered vehicle label together."
  debug_session: ""
  fixed_in: "c3eb37f fix(03): derive manual-path vehicle label from live sizeBucket state"
  fix_status: "code fix applied and verified (tsc 0, lint 0, 33/33 tests). Awaiting user browser re-test of UAT test 10. Regression test deferred to 03-09-PLAN.md (needs component-test dependencies)."
  diagnosed_by: "orchestrator direct source inspection (narrow, well-localized state bug; no debug agent spawned)"
