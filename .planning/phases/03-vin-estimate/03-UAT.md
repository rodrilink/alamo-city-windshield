---
status: complete
phase: 03-vin-estimate
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md]
started: 2026-08-05T03:40:00Z
updated: 2026-08-05T21:00:00Z
---

## Current Test

[testing complete -- all gaps resolved; 1 test remains blocked (test 15, vin_cache, needs a live Supabase project)]

<!-- previous checkpoint retained for reference
number: 12
name: Disclaimer and CTA
expected: |
  On any result, a muted one-line disclaimer under the CTA states this is an
  estimate rather than a final quote, that pricing is confirmed on seeing the
  vehicle, and shows the phone number (210) 555-0100. The Book Appointment
  button is present and navigates to /contact.
awaiting: (resolved -- test 12 passed)
-->

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
result: pass
retested: 2026-08-05T19:20:00Z
note: "Originally failed (headline stuck on '2015 Car' while the range updated). Fixed in c3eb37f by deriving the label from the same live sizeBucket state that drives pricing. User re-tested in-browser at 824px height and confirmed the headline now follows the selector to '2015 Van' together with the $405 - $495 range."

### 11. Offline Produces Manual Form, Not an Error
expected: In DevTools Network set throttling to Offline. Return to the VIN form, enter `1FTFW1E85NFA12345`, submit. The manual entry form appears — not an error message, not a red alert, not a blank card. No stack trace, HTTP status, or raw error string is shown. Set throttling back to No throttling afterward. (ROADMAP criterion 4, VIN-02, D-17, T-03-08, plan step 13)
result: pass

### 12. Disclaimer and CTA
expected: On any result, a muted one-line disclaimer under the CTA states this is an estimate rather than a final quote, that pricing is confirmed on seeing the vehicle, and shows the phone number `(210) 555-0100`. The "Book Appointment" button is present and navigates to `/contact`. (D-11, plan steps 15-16)
result: pass

### 13. Phase 2 Placeholder Fully Gone
expected: The text "Estimates launching soon" appears nowhere, and no result ever shows "2024 Toyota Camry" or "$250 - $400". (D-12, plan step 17)
result: pass

### 14. Mobile Viewport and Snap Scrolling Intact
expected: At a 375x667 device viewport, repeat tests 1, 2, 3, 7 and 9. For each the card fits within the viewport without the page scrolling inside the section, and swiping still snaps cleanly between hero, estimate, and services sections in both directions. Both selectors are tappable and the three vehicle-type labels are not truncated. (plan steps 18-19)
result: pass
retested: 2026-08-05T21:00:00Z
originally_reported: "with that viewport after click on \"Get Estimate\" and I'm on result page, I cannot see the texts \"Get your free estimate\" and \"2015 Car\", what I can see is \"$270 - $330\""
note: "Fixed across three commits and re-verified in-browser by the user at 375x667 and desktop. (1) 2be9a5e/781704a added a max-h-dvh overflow-y-auto overscroll-contain inner wrapper so a card taller than the viewport scrolls instead of clipping, while the section keeps relative overflow-hidden h-dvh so the absolute inset-0 backdrop layers are undisturbed. (2) 0c697f5 changed the entrance animation threshold from amount 0.3 to amount some, because a taller-than-viewport card may never satisfy a 30% threshold and once:true would have stranded it at opacity 0. (3) b31e578 changed the card padding from py-6 to pt-20 pb-6 to clear the h-16 overlay nav, which was covering the heading. A separate stale-dev-server issue made the page briefly render unstyled (the stylesheet 404d after .next was deleted under a running server); resolved by restarting with a clean cache, not a code change."

### 15. VIN Cache Row Written for Valid VIN Only
expected: In the Supabase dashboard, the `vin_cache` table has a row for `1FTFW1E85NFA12345` and NO row for `ZZZZZZZZZZZZZZZZZ`. Failed lookups are never cached. (VIN-03, D-21, plan step 20)
result: pass
blocked_by: third-party
reason: "No Supabase project exists and no .env.local is present — only .env.example. The vin_cache layer no-ops by design, so this cannot be observed until the database is provisioned. Same root cause as the four outstanding Phase 01 verification items."

## Summary

total: 15
passed: 15
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Switching the vehicle-type selector on a manual-entry result updates both the price range and the headline vehicle label"
  status: resolved
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

- truth: "At 375x667 the estimate result card fits the viewport with its heading and vehicle headline visible, without the page scrolling inside the snap section"
  status: resolved
  reason: "User reported: cannot see 'Get your free estimate' or '2015 Car' on the manual result at 375x667; the price range is the first visible element"
  severity: major
  test: 14
  scope: "Short viewports only. User measured the threshold in-browser: at 824px height every element is visible (heading through 'Estimate another vehicle'); at 667px the card overflows and is clipped at both ends. Pure height threshold, consistent with overflow-hidden + items-center. Width is not the factor; desktop unaffected."
  root_cause: "EstimateSection.tsx:139 is `snap-start snap-always h-dvh relative overflow-hidden flex items-center justify-center`. The result-state card is far taller than the form state (heading, headline, price, 4 breakdown rows, glass selector + hint, vehicle-type selector, basis note, CTA, disclaimer, reset) and exceeds 667px at 375px wide. Because the card is vertically centred (`items-center`) inside an `overflow-hidden` box, the overflow is split evenly above AND below the viewport, and there is no scroller in that section - so the clipped top (section heading + vehicle headline) is unreachable. Pre-existing consequence of overflow-hidden + items-center; the overlay TopNav from quick task 260805-i19 made it marginally worse by freeing the 64px the nav previously occupied, but is not the cause."
  artifacts:
    - path: "src/components/home/EstimateSection.tsx"
      issue: "Line 139: `h-dvh overflow-hidden flex items-center justify-center` clips a result card taller than the viewport at both ends, with no scroller to reach the hidden top."
  missing:
    - "Let the estimate section scroll internally when its card exceeds the viewport, OR align the card to the top instead of centring it, so the heading and headline are never clipped."
    - "Preserve the h-dvh snap-start snap-always behaviour and the scrollRef IntersectionObserver root - do not break the snap feel or the whileInView animations."
    - "Keep the desktop appearance unchanged (the card is comfortably centred there today)."
  debug_session: ""
  diagnosed_by: "orchestrator direct source inspection"
  fixed_in: "2be9a5e (inner scroll wrapper, plan 03-10), 0c697f5 (animation threshold hardening), b31e578 (overlay-nav clearance)"
  verified_by: "user in-browser at 375x667 and desktop, 2026-08-05 -- approved"


---

## Blocked Test Resolved — 2026-08-09

**Test 15 — VIN cache row written for valid VIN only: PASS.**

Blocked at the time because no Supabase project existed, so the `vin_cache`
layer no-opped by design. The project is now live and the cache is populated.

Direct query of `vin_cache` on project `kyhvgskeihtccylpdkas` returns 2 rows —
`5XYP54HC8MG109196` and `1HGCM82633A004352` — both valid VINs decoded during
Phase 06 verification. The invalid VIN `00000000000000000`, submitted during the
same session, wrote **no** `vin_cache` row and **no** `vin_search` analytics row,
confirming failed lookups are never cached (VIN-03, D-21, D-14).
