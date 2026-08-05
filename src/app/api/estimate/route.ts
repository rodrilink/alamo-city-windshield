import { NextResponse } from 'next/server'
import { computeEstimateMatrix, adasApplies } from '@/lib/pricing'
import { MIN_MODEL_YEAR, type ManualEstimateResponse } from '@/types/vehicle'

// This endpoint exists so the D-17 manual-entry form and the D-20 manual
// estimate get the same pricing math without the pricing formula ever
// shipping to the browser.
//
// Design decision (closes RESEARCH.md open question 2, ARCHITECTURE.md
// Pattern 5): this is a Route Handler rather than a Server Action because it
// is a read-only, side-effect-free, idempotent lookup keyed on a single
// scalar — the same rationale that applies to `/api/vin/[vin]`. It is not
// cached by VIN because there is no VIN, and it is not cached at all because
// `computeEstimateMatrix` is a pure in-process computation with nothing to
// cache.
//
// Next.js 15: GET Route Handlers are uncached by default. No `dynamic` or
// `revalidate` export is added.

export async function GET(request: Request): Promise<NextResponse<ManualEstimateResponse>> {
    const yearParam = new URL(request.url).searchParams.get('year')

    // Validate the year (threat T-03-06): must be present, parse cleanly as
    // an integer, and fall within MIN_MODEL_YEAR through the current year
    // plus one. The upper bound is computed at request time from the
    // current year rather than hardcoded so it does not silently expire —
    // a public endpoint must bound its input even when the computation
    // behind it is cheap.
    const currentYear = new Date().getFullYear()
    const modelYear = yearParam === null ? Number.NaN : Number.parseInt(yearParam, 10)

    if (yearParam === null || Number.isNaN(modelYear) || !Number.isInteger(modelYear) || modelYear < MIN_MODEL_YEAR || modelYear > currentYear + 1) {
        return NextResponse.json(
            { status: 'invalid', modelYear: null, estimates: null, adasApplies: false } satisfies ManualEstimateResponse,
            { status: 400 }
        )
    }

    // The response deliberately carries all nine variants rather than only
    // the three for a chosen vehicle type: the manual form asks the user for
    // a vehicle type, and per D-19's principle that also makes it a live
    // selector on the result, so both axes must already be present
    // client-side.
    return NextResponse.json(
        {
            status: 'manual',
            modelYear,
            estimates: computeEstimateMatrix(modelYear),
            adasApplies: adasApplies(modelYear),
        } satisfies ManualEstimateResponse,
        { status: 200 }
    )
}
