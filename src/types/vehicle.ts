// Shared vehicle and estimate contract.
//
// This module is imported by BOTH Client Components and server modules (Route
// Handlers, lib/pricing.ts, lib/vin.ts). It must never import `server-only` and
// must never contain a pricing constant — the estimate matrix carries precomputed
// numbers so the browser gets numbers instead of a formula (D-15). See threat
// T-03-03: this file is the client side of the trust boundary and is enforced by
// acceptance-criteria greps for pricing literals.

/** Windshield glass type modifier categories (D-03). */
export type GlassType = 'standard' | 'acoustic' | 'heated'

/** Vehicle size modifier categories, mapped from NHTSA `BodyClass` (D-02). */
export type SizeBucket = 'car' | 'suv-truck' | 'van-oversized'

/**
 * Outcome of a VIN lookup against the NHTSA decode Route Handler.
 * - `decoded` — happy path: NHTSA decoded the VIN and BodyClass mapped to a bucket.
 * - `needs-vehicle-type` — D-19: NHTSA decoded the VIN but `BodyClass` did not map
 *   to a known size bucket. The UI shows a live vehicle-type selector.
 * - `not-found` — D-18: NHTSA answered but rejected the VIN (bad checksum, no data
 *   on file). Likely a typo; the UI offers a manual-entry link, not the full form.
 * - `unreachable` — D-17: NHTSA timed out (6s), a network error occurred, or NHTSA
 *   returned a non-2xx status. The UI shows the manual entry form (year + type).
 * - `invalid` — the VIN failed server-side format validation. This can only happen
 *   when `/api/vin/[vin]` is called directly, bypassing the client-side check.
 */
export type VinLookupStatus = 'decoded' | 'needs-vehicle-type' | 'not-found' | 'unreachable' | 'invalid'

/**
 * Ordered glass type options. `standard` is first because D-14 makes it the
 * preselected default in the glass toggle.
 */
export const GLASS_TYPES: readonly GlassType[] = ['standard', 'acoustic', 'heated'] as const

/** Ordered vehicle size bucket options, matching the D-02 three-bucket model. */
export const SIZE_BUCKETS: readonly SizeBucket[] = ['car', 'suv-truck', 'van-oversized'] as const

/**
 * Earliest model year the 17-character VIN standard covers. Both the manual-entry
 * form and the `/api/estimate` Route Handler bound model year input by this value.
 */
export const MIN_MODEL_YEAR = 1981 as const

// VIN regex: 17 chars, uppercase A-Z excluding I, O, Q + digits 0-9
// Source: NHTSA VIN specification
export const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/

/**
 * Validates a VIN string against the shared format rule. Trims and uppercases
 * before testing so callers do not need to normalize first.
 *
 * This is the single function both the browser and the Route Handler call — the
 * Route Handler calling it is the V5 input-validation control for threat T-03-01.
 *
 * @param value - Raw VIN input, in any case, with optional surrounding whitespace.
 * @returns `true` when the normalized value is a well-formed 17-character VIN.
 */
export function isValidVin(value: string): boolean {
    return VIN_REGEX.test(value.trim().toUpperCase())
}

/**
 * The four line-item rows D-09 requires the estimate UI to always render. These
 * travel as data so the UI never needs the pricing formula.
 */
export interface EstimateBreakdown {
    basePrice: number
    sizeModifier: number
    glassModifier: number
    adasHigh: number
}

/** A single low/high estimate range with its supporting breakdown. */
export interface EstimateVariant {
    low: number
    high: number
    breakdown: EstimateBreakdown
}

/**
 * Full 3x3 matrix of every size-bucket / glass-type combination, precomputed
 * server-side in one response. A full matrix (rather than just the three glass
 * variants) is required because D-13/D-15 make the glass toggle instant client
 * state, and D-19/D-17 make the vehicle-type selector equally instant — both axes
 * must already be present in the response for either toggle to be free of latency.
 */
export type EstimateMatrix = Record<SizeBucket, Record<GlassType, EstimateVariant>>

/**
 * Vehicle details decoded from a VIN (or supplied manually). `sizeBucket` being
 * `null` is precisely the D-19 signal that the vehicle type could not be
 * determined and must be selected by the user.
 */
export interface DecodedVehicle {
    vin: string | null
    modelYear: number
    make: string | null
    model: string | null
    bodyClass: string | null
    sizeBucket: SizeBucket | null
}

/** Response body of `GET /api/vin/[vin]`. */
export interface VinLookupResponse {
    status: VinLookupStatus
    vehicle: DecodedVehicle | null
    estimates: EstimateMatrix | null
    adasApplies: boolean
    cached: boolean
}

/**
 * Response body of `GET /api/estimate?year=YYYY`, serving the D-17/D-20 manual
 * entry path (model year + vehicle type only, no VIN).
 */
export interface ManualEstimateResponse {
    status: 'manual' | 'invalid'
    modelYear: number | null
    estimates: EstimateMatrix | null
    adasApplies: boolean
}

/**
 * Row shape of the `vin_cache` Supabase table. `model_year` is `string | null`
 * because the column is `TEXT`, not an integer — callers must `Number.parseInt`
 * it. No generated Supabase `Database` type exists in this repo, so this
 * hand-written interface is the row contract.
 *
 * `raw_response` is stored for server-side debugging only and is deliberately
 * absent from `VinLookupResponse` — the NHTSA payload has 154 fields (verified
 * live during planning) and proxying it verbatim to the browser would be an
 * information-disclosure defect (threat T-03-04).
 */
export interface VinCacheRow {
    id: string
    created_at: string
    vin: string
    model_year: string | null
    make: string | null
    model: string | null
    body_class: string | null
    raw_response: unknown
}
