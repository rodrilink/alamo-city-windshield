import { NextResponse } from 'next/server'
import { decodeVin, mapBodyClassToSizeBucket } from '@/lib/vin'
import { readVinCache, writeVinCache } from '@/lib/vin-cache'
import { computeEstimateMatrix, adasApplies } from '@/lib/pricing'
import { isValidVin, type DecodedVehicle, type VinLookupResponse } from '@/types/vehicle'

// This is the phase's only trust boundary with the outside world (VIN-01) and
// the only place the four application outcomes plus the `invalid` rejection
// are decided. Both this handler and `/api/estimate` are the sole permitted
// importers of `@/lib/pricing` (D-15, T-03-03) — a repo-wide grep in this
// plan's acceptance criteria proves it.
//
// Next.js 15: GET Route Handlers are uncached by default. No `dynamic` or
// `revalidate` export is added — this phase caches exclusively via
// `vin_cache` (D-21), and a Next Data Cache layer on top would have
// different invalidation semantics with no way to bypass it.

export async function GET(request: Request, { params }: { params: Promise<{ vin: string }> }): Promise<NextResponse<VinLookupResponse>> {
    const { vin: rawVin } = await params

    // Step 1 — normalize and validate (V5, threat T-03-01). This is a public
    // unauthenticated GET reachable directly with any path segment (e.g.
    // `curl /api/vin/anything`), so the client-side `VIN_REGEX` check cannot
    // be relied on. This gate must run — and return — before the value is
    // ever used in the outbound NHTSA URL or in a Supabase `.eq('vin', …)`
    // filter, never after a network or database call.
    const vin = rawVin.trim().toUpperCase()
    if (!isValidVin(vin)) {
        return NextResponse.json(
            { status: 'invalid', vehicle: null, estimates: null, adasApplies: false, cached: false } satisfies VinLookupResponse,
            { status: 400 }
        )
    }

    // Step 2 — cache read (VIN-03). `vin_cache` is the phase's sole caching
    // layer per D-21. The bucket is re-derived from the stored `body_class`
    // rather than stored itself, so a future correction to the mapping table
    // applies to already-cached VINs without a cache flush, and keeps the
    // D-19 branch reachable from the cache path.
    const cached = await readVinCache(vin)
    if (cached && cached.model_year !== null) {
        const modelYear = Number.parseInt(cached.model_year, 10)

        // An unparsable cached year means the row is unusable — fall through
        // to a live NHTSA decode rather than returning a broken result.
        if (!Number.isNaN(modelYear)) {
            const sizeBucket = mapBodyClassToSizeBucket(cached.body_class)
            const vehicle: DecodedVehicle = {
                vin: cached.vin,
                modelYear,
                make: cached.make,
                model: cached.model,
                bodyClass: cached.body_class,
                sizeBucket,
            }

            // Step 5 (cache-hit branch) — price and shape the response
            // (VIN-04, D-15). Returning all nine variants keeps the pricing
            // formula off the client (D-15) and makes both the glass toggle
            // and the D-19 vehicle-type selector zero-latency pure client
            // state.
            return NextResponse.json(
                {
                    status: sizeBucket === null ? 'needs-vehicle-type' : 'decoded',
                    vehicle,
                    estimates: computeEstimateMatrix(modelYear),
                    adasApplies: adasApplies(modelYear),
                    cached: true,
                } satisfies VinLookupResponse,
                { status: 200 }
            )
        }
    }

    // Step 3 — decode (VIN-01, VIN-02). On a cache miss (or an unusable
    // cached row), call NHTSA directly.
    const outcome = await decodeVin(vin)

    if (outcome.outcome === 'unreachable') {
        // `detail`/`reason` are for server-side diagnostics only and must
        // never reach the response body (threat T-03-08).
        console.error('VIN decode unreachable', { vin, reason: outcome.reason, detail: outcome.detail })

        // HTTP 200 is deliberate: this is an expected application state, not
        // a server fault. A 5xx would make the browser's `fetch` reject and
        // lose the shaped status. This branch serves D-17 (manual entry
        // form) — a non-2xx from NHTSA lands here too, because NHTSA returns
        // 200 even for garbage VINs. Per D-21, this outcome is never cached.
        return NextResponse.json(
            { status: 'unreachable', vehicle: null, estimates: null, adasApplies: false, cached: false } satisfies VinLookupResponse,
            { status: 200 }
        )
    }

    if (outcome.outcome === 'no-data') {
        // D-18: NHTSA answered, so a typo is the likely cause — a
        // deliberately different outcome from D-17 ('unreachable'), because
        // pushing the user straight to manual entry would hide a fixable
        // mistake. The classifier reached this branch on field presence,
        // never on `ErrorCode`. Per D-21, this outcome is never cached.
        return NextResponse.json(
            { status: 'not-found', vehicle: null, estimates: null, adasApplies: false, cached: false } satisfies VinLookupResponse,
            { status: 200 }
        )
    }

    // Step 4 — cache write (VIN-03, D-21). Only on the 'decoded' outcome.
    // This write happens even when `sizeBucket` is `null`: an unmappable
    // `BodyClass` is still a *successful* NHTSA decode, re-fetching it would
    // return the same unmappable value, and re-deriving the bucket on read
    // keeps the D-19 branch reachable from the cache. This cache-write call
    // swallows its own errors internally, so its result never affects this
    // response — 'unreachable' and 'no-data' above never reach this line,
    // which is exactly what D-21 requires.
    await writeVinCache({
        vin,
        modelYear: outcome.modelYear,
        make: outcome.make,
        model: outcome.model,
        bodyClass: outcome.bodyClass,
        rawResponse: outcome.raw,
    })

    // Step 5 — price and shape the response (VIN-04, D-15). Returning all
    // nine variants keeps the pricing formula off the client (D-15) and
    // makes both the glass toggle and the D-19 vehicle-type selector
    // zero-latency pure client state.
    //
    // The `vehicle` object is built field by field from named properties —
    // never spread from `outcome` and never including `outcome.raw` — so the
    // 154-field NHTSA payload (threat T-03-04) never reaches the browser.
    const vehicle: DecodedVehicle = {
        vin,
        modelYear: outcome.modelYear,
        make: outcome.make,
        model: outcome.model,
        bodyClass: outcome.bodyClass,
        sizeBucket: outcome.sizeBucket,
    }

    return NextResponse.json(
        {
            status: outcome.sizeBucket === null ? 'needs-vehicle-type' : 'decoded',
            vehicle,
            estimates: computeEstimateMatrix(outcome.modelYear),
            adasApplies: adasApplies(outcome.modelYear),
            cached: false,
        } satisfies VinLookupResponse,
        { status: 200 }
    )
}
