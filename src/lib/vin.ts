import 'server-only'
import { MIN_MODEL_YEAR, type SizeBucket } from '@/types/vehicle'

// The NHTSA host is a fixed literal and is never derived from user input —
// only the VIN path segment is user-controlled, and it is passed through
// `encodeURIComponent` in `decodeVin` below. That is the SSRF control for
// threat T-03-01. The authoritative VIN format gate is `isValidVin`, called
// by the Route Handler before this module is ever reached (plan 03-06) —
// this module documents that precondition rather than duplicating it.
const NHTSA_DECODE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues'

/** VIN-02: outbound NHTSA call budget, in milliseconds. */
export const NHTSA_TIMEOUT_MS = 6000

// The following three allow-lists were pulled live from NHTSA's own
// `GetVehicleVariableValuesList/BODY CLASS` endpoint (71 values total,
// verified during planning). Everything not present in one of these three
// sets — including the empty string, all `Incomplete*` variants,
// `Truck-Tractor`, `Trailer`, `Streetcar/Trolley`, all `Motorcycle - *`
// variants, all `Off-Road Vehicle - *` variants, `Ambulance`, `Street
// Sweeper`, `Fire Apparatus`, and any future NHTSA addition — is
// intentionally unmappable and must trigger D-19. The unmappable set is
// implemented as allow-list negation, never enumerated, so it stays closed
// against future NHTSA additions.
const CAR_BODY_CLASSES = new Set<string>([
    'Sedan/Saloon',
    'Coupe',
    'Convertible/Cabriolet',
    'Hatchback/Liftback/Notchback',
    'Wagon',
    'Roadster',
    'Limousine',
])

const SUV_TRUCK_BODY_CLASSES = new Set<string>([
    'Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]',
    'Crossover Utility Vehicle [CUV]',
    'Pickup',
    'Truck',
    'Sport Utility Truck [SUT]',
])

const VAN_OVERSIZED_BODY_CLASSES = new Set<string>([
    'Van',
    'Minivan',
    'Cargo Van',
    'Step Van/Walk-in Van',
    'Motorhome',
    'Bus',
    'Bus - School Bus',
])

/**
 * Maps an NHTSA `BodyClass` string to one of the three D-02 size buckets.
 *
 * Returns `null` for an empty/absent value or for any value not present in
 * one of the three allow-lists above — this `null` is precisely the D-19
 * trigger. D-19 explicitly forbids guessing a bucket, so a present-but
 * -unrecognized value such as `Truck-Tractor` must be treated identically to
 * an absent one.
 */
export function mapBodyClassToSizeBucket(bodyClass: string | null | undefined): SizeBucket | null {
    const trimmed = bodyClass?.trim() ?? ''

    if (trimmed === '') {
        return null
    }
    if (CAR_BODY_CLASSES.has(trimmed)) {
        return 'car'
    }
    if (SUV_TRUCK_BODY_CLASSES.has(trimmed)) {
        return 'suv-truck'
    }
    if (VAN_OVERSIZED_BODY_CLASSES.has(trimmed)) {
        return 'van-oversized'
    }

    return null
}

/** Outcome of interpreting an NHTSA decode response. */
export type VinDecodeOutcome =
    | {
          outcome: 'decoded'
          modelYear: number
          make: string
          model: string
          bodyClass: string
          sizeBucket: SizeBucket | null
          raw: unknown
      }
    | { outcome: 'no-data' }
    | { outcome: 'unreachable'; reason: 'timeout' | 'network' | 'http-error'; detail: string }

/**
 * Classifies an already-extracted `Results[0]` object from an NHTSA
 * `decodevinvalues` response into exactly one of the three D-17/D-18/D-19
 * outcomes. Pure function — no network I/O, no Supabase access.
 */
export function classifyNhtsaResult(result: Record<string, unknown>): VinDecodeOutcome {
    const modelYearRaw = String(result.ModelYear ?? '').trim()
    const make = String(result.Make ?? '').trim()
    const model = String(result.Model ?? '').trim()
    const bodyClass = String(result.BodyClass ?? '').trim()

    // `ErrorCode` is NOT the success signal. It is an unstructured,
    // comma-joined list with no fixed cardinality (live captures: `"1"` and
    // `"1,7,11,400"`). Non-zero codes routinely accompany fully usable data
    // — a real Ford F-150 VIN with a deliberately wrong check digit returns
    // `ErrorCode: "1"` alongside a complete Make/Model/BodyClass/ModelYear.
    // Branching on `ErrorCode` would show the D-18 "check your VIN
    // characters" message to real customers whose VINs are fine. The
    // reliable signal is the presence of ModelYear, Make, and Model.
    const hasCoreData = modelYearRaw !== '' && make !== '' && model !== ''

    if (!hasCoreData) {
        // D-18 signal: NHTSA answered but has nothing usable for this VIN.
        return { outcome: 'no-data' }
    }

    const currentYear = new Date().getUTCFullYear()
    const modelYear = Number.parseInt(modelYearRaw, 10)
    if (Number.isNaN(modelYear) || modelYear < MIN_MODEL_YEAR || modelYear > currentYear + 1) {
        return { outcome: 'no-data' }
    }

    // A `null` sizeBucket here is still a *successful decode*, not a
    // failure — it is the D-19 signal that the caller both caches and
    // returns as a result, prompting the live vehicle-type selector.
    const sizeBucket = mapBodyClassToSizeBucket(bodyClass)

    return {
        outcome: 'decoded',
        modelYear,
        make,
        model,
        bodyClass,
        sizeBucket,
        // `raw` is for storage in `vin_cache.raw_response` only and must
        // never be forwarded to the browser (threat T-03-04).
        raw: result,
    }
}

/**
 * Calls the NHTSA vPIC `decodevinvalues` endpoint for `vin` and classifies
 * the response into one of the three D-17/D-18/D-19 outcomes. The caller
 * never needs to inspect `ErrorCode` or an HTTP status code.
 */
export async function decodeVin(vin: string): Promise<VinDecodeOutcome> {
    const url = `${NHTSA_DECODE_URL}/${encodeURIComponent(vin)}?format=json`

    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(NHTSA_TIMEOUT_MS) })

        if (!response.ok) {
            // NHTSA returns HTTP 200 for every VIN shape probed during
            // planning — valid, bad-check-digit, all-garbage, too short,
            // invalid characters. A non-2xx status therefore means a
            // genuine service outage and belongs on the D-17 unreachable
            // path, never on D-18. If this branch were the only route into
            // D-18, D-18 would be dead code.
            return { outcome: 'unreachable', reason: 'http-error', detail: `NHTSA returned HTTP ${response.status}` }
        }

        const body = (await response.json()) as { Results?: unknown }

        if (!Array.isArray(body.Results) || body.Results.length === 0) {
            // A shape violation is a service problem, not a bad VIN.
            return { outcome: 'unreachable', reason: 'http-error', detail: 'malformed response' }
        }

        return classifyNhtsaResult(body.Results[0] as Record<string, unknown>)
    } catch (error) {
        // All three reasons below collapse to the same D-17 manual-entry UI
        // branch — the distinction is kept only for server-side logging.
        // `detail` exists for `console.error` on the server and must never
        // escape as a value the caller forwards to the browser (threat
        // T-03-08).
        if (error instanceof DOMException && error.name === 'TimeoutError') {
            return { outcome: 'unreachable', reason: 'timeout', detail: 'NHTSA request exceeded the 6-second budget' }
        }
        if (error instanceof TypeError) {
            const cause = (error as TypeError & { cause?: { code?: string } }).cause
            const detail = cause?.code ? `fetch failed: ${cause.code}` : error.message
            return { outcome: 'unreachable', reason: 'network', detail }
        }

        return { outcome: 'unreachable', reason: 'network', detail: error instanceof Error ? error.message : 'unknown network error' }
    }
}

// Note: this module does not add `next: { revalidate: … }` or any other
// Next.js fetch cache option to the NHTSA call. GET Route Handlers and
// their `fetch` calls are uncached by default in Next.js 15, and adding a
// Data Cache layer here would sit redundantly on top of `vin_cache` with
// different invalidation semantics. The "add `revalidate` caching" line in
// `.planning/research/ARCHITECTURE.md` predates D-21 and is superseded.
