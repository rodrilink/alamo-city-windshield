---
phase: 03-vin-estimate
verified: 2026-08-05T22:30:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
acknowledged_gaps:
  - truth: "vin_cache rows are written for valid VINs and never for rejected ones (VIN-03, D-21)"
    status: blocked-by-third-party
    reason: "No Supabase project and no .env.local exist in this environment — only .env.example. createAdminClient() hard-fails on missing env vars by design, and readVinCache/writeVinCache swallow that failure and degrade to a live NHTSA lookup with no persistence. The read/write code paths were verified directly against source (correct upsert/onConflict/ignoreDuplicates, correct skip on 'unreachable' and 'no-data' outcomes, exactly one call site) and match the D-21 requirement exactly. Runtime behavior cannot be observed until a Supabase project is provisioned. Same root cause as four outstanding Phase 01 verification items. Does not block phase passage per explicit instruction — this is an external dependency, not a code defect."
    evidence: "src/lib/vin-cache.ts, src/app/api/vin/[vin]/route.ts:107-122; 03-UAT.md test 15 (status: blocked, blocked_by: third-party)"
---

# Phase 3: VIN Estimate Verification Report

**Phase Goal:** Users can enter a VIN, receive a decoded vehicle identity and a formula-based price range with line-item breakdown, with fallback for API failures
**Verified:** 2026-08-05T22:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria, verbatim)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Entering a valid VIN returns the vehicle year, make, and model alongside a low/high price range within a reasonable wait | VERIFIED | Live `curl http://localhost:3000/api/vin/1FTFW1E85NFA12345` returned `"status":"decoded","vehicle":{"modelYear":2022,"make":"FORD","model":"F-150","sizeBucket":"suv-truck"}` with `estimates["suv-truck"]["standard"] = {"low":338,"high":663}`. Matches D-06 row 4 exactly. UAT test 1: pass. |
| 2 | The estimate displays as a range (low/high) with a visible line-item breakdown (base price, vehicle size modifier, windshield type modifier, ADAS calibration modifier) | VERIFIED | `EstimateResult.tsx` lines 73-100 renders all four `breakdown.*` rows unconditionally (never gated on `adasApplies` for visibility, only for wording) — confirmed by direct source read. UAT test 2: pass. |
| 3 | A windshield type selector (standard/acoustic/heated) appears and updates the estimate when changed | VERIFIED | `SegmentedControl<GlassType>` bound to live `glassType` state in `EstimateResult.tsx:105-116`; all nine variants precomputed server-side in the API response (`computeEstimateMatrix`), so toggling is pure client state with zero network requests. UAT test 3: pass ("no new network request appears" observed directly by user in DevTools). |
| 4 | If the NHTSA API times out or fails, a manual entry fallback is shown instead of an error state | VERIFIED | `src/lib/vin.ts` `decodeVin` classifies timeout/network/non-2xx uniformly as `'unreachable'`; `EstimateSection.tsx`'s `catch` block and the `'unreachable'` switch case both route to `{ kind: 'manual' }`, rendering `ManualEntryForm`, never an error string. UAT test 11: pass (DevTools Offline throttling produced the manual form, not an error). |
| 5 | Vehicles from 2018 or later display an ADAS calibration notice indicating the estimate includes potential calibration cost | VERIFIED | `adasApplies(modelYear) = modelYear >= 2018` computed server-side (`pricing.ts:48-50`); `EstimateResult.tsx:137-143` renders the note only when the server-computed flag is true. UAT test 4: pass (2022 Ford F-150 shows the note); UAT test 9 confirms the negative case (2015 manual entry shows no note).|

**Score:** 5/5 ROADMAP success criteria verified.

### Additional Must-Haves (from PLAN frontmatter, not restating the above)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | D-06: all six locked worked examples reproduce exactly from the implemented formula | VERIFIED | `src/lib/pricing.test.ts` — 16 assertions across 5 describe blocks, all passing (`npm test`: 33/33). Live curl of suv-truck/standard/2022 → 338/663; car/standard/2015 → 270/330; van-oversized/heated/2023 (implicit in matrix) → 585/965 — all match D-06 exactly, including the corrected Odyssey row. |
| 7 | D-18: a rejected VIN produces a distinct message from D-17's unreachable fallback, and the form stays fixable | VERIFIED | `classifyNhtsaResult` never branches on `ErrorCode` (grep-verified, comment explains why); `'no-data'` maps to `{kind:'not-found'}` (form stays visible + secondary manual link) while `'unreachable'` maps to `{kind:'manual'}` (full fallback form) — two distinct code paths and two distinct UI branches, confirmed in `EstimateSection.tsx:112-123`. UAT test 7: pass. |
| 8 | D-19: unmappable BodyClass surfaces a live vehicle-type selector rather than a guess | VERIFIED | `mapBodyClassToSizeBucket` returns `null` (never a guessed bucket) for anything outside the three allow-lists; Route Handler sets `status: 'needs-vehicle-type'` when `sizeBucket === null`; `EstimateSection.tsx` sets `sizeBucketEditable: true` and defaults to `'car'`. Confirmed by source read; UAT test 14 exercises the same selector UI on the structurally identical manual path. |
| 9 | `src/lib/pricing.ts` is server-only and not importable from a Client Component | VERIFIED | `head -1 src/lib/pricing.ts` = `import 'server-only'`. Repo-wide grep: only `src/app/api/estimate/route.ts` and `src/app/api/vin/[vin]/route.ts` import it in executable code; all other matches are comments. `npm run build` exits 0, which exercises the real (non-stubbed) `server-only` resolution. |
| 10 | NHTSA responses classified by field presence, never ErrorCode (pinned regression test) | VERIFIED | `src/lib/vin.test.ts` includes the bad-check-digit fixture (`ErrorCode:"1"` with full data → classifies `decoded`) and asserts `no-data`/unmappable-BodyClass outcomes stay distinct. `grep` confirms no `if...ErrorCode` branching in executable lines of `vin.ts`. |
| 11 | Failed lookups never written to vin_cache (D-21) | VERIFIED IN SOURCE (runtime blocked, see Acknowledged Gaps) | `src/app/api/vin/[vin]/route.ts:79-105` returns immediately on `'unreachable'` and `'no-data'` outcomes, before reaching the single `writeVinCache` call at line 115 (only reachable on `'decoded'`). `grep -c writeVinCache` returns exactly 2 (import + one call). Runtime observation blocked by missing Supabase project — documented, does not affect phase status per instruction. |
| 12 | Nine price variants precomputed server-side; selector changes are zero-network | VERIFIED | Live curl shows all nine `estimates[bucket][glass]` variants present in a single response; UAT test 3 confirms zero new network requests when toggling glass type in-browser. |

**Score:** 12/12 must-haves verified (5 ROADMAP criteria + 7 architectural/decision invariants).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/vehicle.ts` | Shared client-safe contract | VERIFIED | All 15 exports present exactly as specified in 03-02-SUMMARY.md; no `server-only` import, no pricing literal (grep-confirmed) |
| `src/lib/pricing.ts` | D-01..D-05 formula, server-only | VERIFIED | `PRICING`, `adasApplies`, `computeVariant`, `computeEstimateMatrix` all present and match plan signatures exactly |
| `src/lib/pricing.test.ts` | Six D-06 fixtures + rounding/ADAS tests | VERIFIED | 16 assertions, all passing |
| `src/lib/vin.ts` | NHTSA decode + 3-way classification | VERIFIED | `decodeVin`, `classifyNhtsaResult`, `mapBodyClassToSizeBucket`, `NHTSA_TIMEOUT_MS=6000` all present; allow-list Sets contain the exact NHTSA BodyClass strings specified |
| `src/lib/vin.test.ts` | Classifier assertions from live payloads | VERIFIED | 17 assertions including the bad-check-digit non-regression test |
| `src/lib/vin-cache.ts` | Failure-tolerant vin_cache access | VERIFIED | `readVinCache`/`writeVinCache`, both wrapped in try/catch, `maybeSingle` (not `single`), `upsert` with `onConflict`+`ignoreDuplicates` |
| `src/lib/supabase/admin.ts` | Service-role client | VERIFIED | `createAdminClient`, hard-fails on missing env vars, no cookies/next-headers, `persistSession:false` etc. |
| `src/components/ui/segmented-control.tsx` | Base UI radiogroup primitive | VERIFIED | `SegmentedControl`/`SegmentedControlItem`, generic over `Value`, `state.checked` function-form className, no Radix import |
| `src/components/home/EstimateResult.tsx` | Presentational result card | VERIFIED | All 10 render sections present; `headlineFollowsSizeBucket` gap-fix wired; no `lib/pricing` import; no pricing literal |
| `src/components/home/ManualEntryForm.tsx` | D-17 two-field fallback | VERIFIED | Exactly one `<input>` (year) + one `SegmentedControl` (vehicle type); calls `/api/estimate`; `finally`-guaranteed loading reset |
| `src/components/home/EstimateSection.tsx` | Five-state rewired flow | VERIFIED | Discriminated `EstimateViewState` union with all 5 kinds; D-12 placeholder fully removed; gap-fix scroll wrapper (03-10) present and correctly scoped |
| `src/app/api/vin/[vin]/route.ts` | GET Route Handler | VERIFIED | All 5 statuses reachable; correct operation order (validate → cache-read → decode → cache-write → price); live curl matches spec |
| `src/app/api/estimate/route.ts` | GET manual-estimate handler | VERIFIED | Year validated and bounded; live curl matches D-06 rows 1 and 2 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `EstimateResult.tsx` | `ESTIMATE_COPY.sizeLabels[sizeBucket]` | live state read shared with pricing | WIRED | `EstimateResult.tsx:64-66` derives the label from the same `sizeBucket` that indexes `activeVariant` one line above — verified by source read and live-equivalent (matches UAT test 10 re-test result) |
| `EstimateSection.tsx` | `EstimateResult` | `headlineFollowsSizeBucket` prop | WIRED | Set correctly per branch: `false` on `decoded` and `needs-vehicle-type` (real make/model must not follow selector), `true` only on manual `onEstimate` |
| `route.ts [vin]` | `src/lib/vin.ts` | `decodeVin` | WIRED | Confirmed by source and live curl |
| `route.ts [vin]` | `src/lib/vin-cache.ts` | `readVinCache`/`writeVinCache` | WIRED | Confirmed by source; write gated to `'decoded'` outcome only |
| `route.ts [vin]` | `src/lib/pricing.ts` | `computeEstimateMatrix` | WIRED | Confirmed by source and live curl (9-variant matrix present) |
| `EstimateSection.tsx` | `/api/vin/[vin]` | `fetch` | WIRED | Confirmed by source; error/catch path routes to manual fallback per D-17 |
| `ManualEntryForm.tsx` | `/api/estimate` | `fetch` with year param | WIRED | Confirmed by source and live curl |
| `EstimateSection.tsx <section>` | absolute backdrop layers | `relative overflow-hidden h-dvh` (unchanged) | WIRED | Confirmed unchanged by grep (`h-dvh relative overflow-hidden flex items-center justify-center` appears once); backdrop layers byte-identical per 03-10-SUMMARY.md diff inspection |
| `motion.div` | `scrollRef` | `viewport={{ root: scrollRef, once: true, amount: 'some' }}` | WIRED | Present verbatim; `amount: 'some'` hardening confirmed (not the original `0.3`), documented rationale in source comment |

### Behavioral Spot-Checks (live dev server, port 3000)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Invalid VIN rejected before any network/DB call | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/vin/short` | `400` | PASS |
| Valid VIN decodes with correct price | `curl -s http://localhost:3000/api/vin/1FTFW1E85NFA12345` | `"status":"decoded"`, `suv-truck.standard = {338,663}`, `adasApplies:true` | PASS |
| Rejected VIN distinct from unreachable | `curl -s http://localhost:3000/api/vin/ZZZZZZZZZZZZZZZZZ` | `"status":"not-found"`, `estimates:null` | PASS |
| Manual estimate matches D-06 row 1 | `curl -s "http://localhost:3000/api/estimate?year=2015"` | `car.standard = {270,330}`, `adasApplies:false` | PASS |
| Manual estimate input validation | `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/estimate?year=abc"` | `400` | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| VIN-01 | 03-04, 03-06 | Server-side Route Handler calls NHTSA vPIC | SATISFIED | Live curl + source |
| VIN-02 | 03-04, 03-06, 03-07 | 6s timeout with graceful failure + manual fallback | SATISFIED | `NHTSA_TIMEOUT_MS=6000`, `AbortSignal.timeout`; UAT test 11 |
| VIN-03 | 03-02, 03-04, 03-06 | Decoded VIN cached in Supabase | SATISFIED (code); runtime unobservable — see Acknowledged Gaps | Source-verified read/write/skip logic; UAT test 15 blocked by missing Supabase project |
| VIN-04 | 03-01, 03-02, 03-03, 03-06 | Pricing formula: base + size + glass + ADAS modifiers | SATISFIED | `pricing.ts`; 16 passing tests; live curl |
| VIN-05 | 03-02, 03-05, 03-07, 03-09, 03-10 | Range with line-item breakdown | SATISFIED | `EstimateResult.tsx`; UAT tests 1-2 |
| VIN-06 | 03-02, 03-05, 03-07, 03-09 | Windshield type selector | SATISFIED | `SegmentedControl`; UAT test 3 |
| VIN-07 | 03-03, 03-05 | ADAS flag for 2018+ | SATISFIED | `adasApplies`; UAT tests 4, 9 |

No orphaned requirements: all seven VIN-01..VIN-07 IDs from `REQUIREMENTS.md`'s Phase 3 traceability row are claimed by at least one plan; no plan claims an ID outside this set.

### Anti-Patterns Found

None. Scanned all twelve phase-03 source files for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/`dangerouslySetInnerHTML` — zero matches. No stub returns, no hardcoded empty data flowing to render, no console-log-only implementations.

### Human Verification Required

None new. `03-UAT.md` (status: complete, 14 passed / 0 issues / 1 blocked) already covers all human-observable behavior for this phase, including the two gap re-tests (UAT test 10 — manual headline follows selector; UAT test 14 — short-viewport clipping) both confirmed resolved by the user in-browser on 2026-08-05. This verification found no new code path requiring human eyes beyond what UAT already covered.

## Acknowledged Gaps

**UAT test 15 (`vin_cache` row written for valid VIN, never for rejected VIN) — blocked by third-party, not a code defect.**

No Supabase project and no `.env.local` exist in this environment (confirmed: `ls .env.local` → not found; only `.env.example` present). `createAdminClient()` hard-fails on missing env vars by design; `readVinCache`/`writeVinCache` catch that failure and silently degrade to "no cache," which is the documented fail-safe behavior (a cache outage must never fail a customer's estimate request). This means the runtime claim "a row exists for the valid VIN and none for the rejected VIN" cannot be observed in this environment.

The underlying code was verified directly against source, independent of runtime observation:
- `src/app/api/vin/[vin]/route.ts` returns on `'unreachable'` (line 89) and `'no-data'` (line 101) *before* reaching the single `writeVinCache` call at line 115, which is reachable only from the `'decoded'` branch.
- `grep -c "writeVinCache"` on the route file returns exactly 2 (one import, one call) — there is no second write path that could bypass this gating.
- `src/lib/vin-cache.ts`'s `writeVinCache` uses `upsert` with `onConflict: 'vin', ignoreDuplicates: true`, matching the plan's concurrency-safety requirement.

This is the same root cause as four outstanding Phase 01 verification items and does not indicate a defect in Phase 3's code. It does not downgrade phase status per explicit instruction — it is recorded here as a known, external, unresolvable-in-this-environment gap rather than folded into the pass/fail score.

**Note on `.planning/STATE.md` staleness (non-blocking, informational):** `STATE.md`'s frontmatter (`stopped_at`, `last_updated`) and its "Blockers/Concerns" section describe an intermediate state (UAT `diagnosed`, 10 passed / 1 issue / 4 pending / 1 blocked) that predates the final UAT completion at commit `5662d8c` ("UAT complete - 14 passed, 0 issues, 1 blocked"). This is a tracking-document lag, not a code gap — `03-UAT.md` itself (the source of truth read for this verification) correctly reflects the final 14/0/1 state. Flagged for the next tracking-doc sync; does not affect this phase's verification outcome.

---

*Verified: 2026-08-05T22:30:00Z*
*Verifier: Claude (gsd-verifier)*
