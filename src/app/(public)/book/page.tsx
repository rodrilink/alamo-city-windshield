import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'
import { BookingCalendar } from '@/components/booking/BookingCalendar'
import { getMonthAvailability } from '@/lib/booking/booking-availability'
import { getBusinessNowParts } from '@/lib/server-time'
import { readVinCache, writeVinCache } from '@/lib/vin-cache'
import { decodeVin } from '@/lib/vin'
import { BUSINESS } from '@/lib/constants'
import { isValidVin } from '@/types/vehicle'

// D-20: `/book` uses normal-flow chrome, not snap-scroll -- copied verbatim
// from `/about`'s structure. A calendar plus slot list plus form is exactly
// the taller-than-viewport content that caused the Phase 3 clipping bug
// (03-UAT test 14), so no snap-scroll class belongs anywhere on this page.
// `src/app/(public)/layout.tsx` remains a bare passthrough -- this page
// composes `TopNav` + `Footer` itself, exactly like `/about`.

interface BookPageProps {
    searchParams: Promise<{ vin?: string }>
}

/**
 * Re-decodes a `?vin=` search param server-side and derives a human-readable
 * `vehicle_desc` string (D-19). Never trusts `vehicle_desc` or any vehicle
 * identity from the URL -- only the raw 17-character VIN travels there, and
 * this function is the only place that string is turned into a description.
 *
 * Per RESEARCH.md Pitfall 5, a re-decode failure (`unreachable`/`no-data`)
 * must not block the booking flow: this returns `vehicleDesc: null` and lets
 * the caller proceed with the VIN retained but no vehicle line rendered.
 *
 * @param rawVin - The raw, unvalidated `?vin=` search param value.
 * @returns The validated VIN (or `null` if absent/invalid) and the derived `vehicle_desc` (or `null` if undeterminable).
 */
async function resolveVinContext(rawVin: string | undefined): Promise<{ vin: string | null; vehicleDesc: string | null }> {
    if (!rawVin) {
        return { vin: null, vehicleDesc: null }
    }

    const normalized = rawVin.trim().toUpperCase()
    if (!isValidVin(normalized)) {
        return { vin: null, vehicleDesc: null }
    }

    // Same sequence as `/api/vin/[vin]/route.ts`: cache read first, decode on
    // a miss, cache write on a fresh successful decode.
    const cached = await readVinCache(normalized)
    if (cached && cached.model_year !== null && cached.make && cached.model) {
        const modelYear = Number.parseInt(cached.model_year, 10)
        if (!Number.isNaN(modelYear)) {
            return { vin: normalized, vehicleDesc: `${modelYear} ${cached.make} ${cached.model}` }
        }
    }

    const outcome = await decodeVin(normalized)
    if (outcome.outcome !== 'decoded') {
        // Transient NHTSA outage or no data on file -- proceed with the VIN
        // but omit the vehicle line, mirroring D-10's "never disguise a
        // fixable problem as permanent" principle. Booking must still work.
        return { vin: normalized, vehicleDesc: null }
    }

    await writeVinCache({
        vin: normalized,
        modelYear: outcome.modelYear,
        make: outcome.make,
        model: outcome.model,
        bodyClass: outcome.bodyClass,
        rawResponse: outcome.raw,
    })

    return { vin: normalized, vehicleDesc: `${outcome.modelYear} ${outcome.make} ${outcome.model}` }
}

export default async function BookPage({ searchParams }: BookPageProps) {
    const { vin: rawVin } = await searchParams
    const { vin, vehicleDesc } = await resolveVinContext(rawVin)

    const nowParts = getBusinessNowParts()
    const monthAvailability = await getMonthAvailability(nowParts.year, nowParts.month)

    return (
        <div className="flex min-h-screen flex-col">
            <TopNav />
            <main className="flex-1">
                <div className="mx-auto max-w-3xl px-4 py-10">
                    {monthAvailability.ok ? (
                        <BookingCalendar
                            initialYear={nowParts.year}
                            initialMonth={nowParts.month}
                            initialFullyBookedDates={monthAvailability.data.fullyBookedDates}
                            serverToday={nowParts}
                            vin={vin}
                            vehicleDesc={vehicleDesc}
                        />
                    ) : (
                        <p className="text-center text-sm text-muted-foreground" role="alert" data-testid="text-schedule-unavailable">
                            Our appointment schedule is temporarily unavailable. Please call us at{' '}
                            <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a> to book by phone.
                        </p>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}
