import 'server-only'

// This module holds non-public business pricing data (base price, size/glass
// modifiers, ADAS add-on, spread multipliers) and must never be imported from
// a Client Component (D-15). The `server-only` import above turns any
// transitive client-side import of this module into a Next.js build error
// rather than a silent bundle leak of business pricing data (T-03-03).

import { GLASS_TYPES, SIZE_BUCKETS, type EstimateMatrix, type EstimateVariant, type GlassType, type SizeBucket } from '@/types/vehicle'

/**
 * Locked pricing constants for the windshield replacement estimate formula.
 * Every member below encodes one of the D-01..D-05 decisions confirmed with
 * the user and reproduced exactly by the six D-06 fixtures.
 */
export const PRICING = {
    /** D-01: flat base price added to every estimate regardless of vehicle. */
    basePrice: 300,
    /** D-02: vehicle size modifier — exactly three buckets, no fourth. */
    sizeModifiers: {
        car: 0,
        'suv-truck': 75,
        'van-oversized': 150,
    },
    /** D-03: windshield glass type modifier — exactly three options, no fourth. */
    glassModifiers: {
        standard: 0,
        acoustic: 100,
        heated: 200,
    },
    /** D-04: amount added to the high end only when ADAS calibration applies. */
    adasHighAdd: 250,
    /** D-04, VIN-07: model years at or after this value require ADAS calibration. */
    adasMinModelYear: 2018,
    /** D-05: low end of the estimate range is 90% of the subtotal. */
    spreadLow: 0.9,
    /** D-05: high end of the estimate range is 110% of the subtotal. */
    spreadHigh: 1.1,
} as const

/**
 * Returns whether a vehicle of the given model year requires ADAS (Advanced
 * Driver-Assistance Systems) calibration, per D-04/VIN-07.
 *
 * @param modelYear - The vehicle's model year.
 * @returns `true` when `modelYear` is at or after `PRICING.adasMinModelYear`.
 */
export function adasApplies(modelYear: number): boolean {
    return modelYear >= PRICING.adasMinModelYear
}

/**
 * Computes a single low/high estimate variant for one size-bucket / glass-type
 * combination, per the locked D-01..D-05 formula.
 *
 * @param modelYear - The vehicle's model year, used to determine ADAS applicability.
 * @param sizeBucket - The vehicle's size bucket (D-02).
 * @param glassType - The windshield glass type (D-03).
 * @returns The computed `EstimateVariant`, including the breakdown the UI renders as D-09's four line items.
 */
export function computeVariant(modelYear: number, sizeBucket: SizeBucket, glassType: GlassType): EstimateVariant {
    const sizeModifier = PRICING.sizeModifiers[sizeBucket]
    const glassModifier = PRICING.glassModifiers[glassType]
    const subtotal = PRICING.basePrice + sizeModifier + glassModifier
    const adasHigh = adasApplies(modelYear) ? PRICING.adasHighAdd : 0

    const low = Math.round(subtotal * PRICING.spreadLow)
    // Math.round is applied to the ±10% spread BEFORE the ADAS term is added.
    // Reordering these two operations (rounding after the add) breaks D-06
    // rows 4 and 6, which depend on Math.round(337.5) -> 338 and
    // Math.round(412.5) -> 413 happening on the spread alone.
    const high = Math.round(subtotal * PRICING.spreadHigh) + adasHigh

    return {
        low,
        high,
        breakdown: {
            basePrice: PRICING.basePrice,
            sizeModifier,
            glassModifier,
            adasHigh,
        },
    }
}

/**
 * Computes the full 3x3 matrix of every size-bucket / glass-type combination
 * for a given model year. The full matrix (rather than just the selected
 * variant) is precomputed in one response because D-13/D-15 make the glass
 * toggle instant client state and D-17/D-19 make the vehicle-type selector
 * an equally instant live selector — both axes must already be present for
 * either toggle to be free of latency.
 *
 * @param modelYear - The vehicle's model year.
 * @returns An `EstimateMatrix` with all nine variants.
 */
export function computeEstimateMatrix(modelYear: number): EstimateMatrix {
    const matrix = {} as EstimateMatrix

    for (const sizeBucket of SIZE_BUCKETS) {
        const glassVariants = {} as Record<GlassType, EstimateVariant>

        for (const glassType of GLASS_TYPES) {
            glassVariants[glassType] = computeVariant(modelYear, sizeBucket, glassType)
        }

        matrix[sizeBucket] = glassVariants
    }

    return matrix
}
