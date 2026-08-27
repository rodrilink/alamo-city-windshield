'use client'

// D-11/BOOK-07: purely presentational confirmation screen, in the style of
// `EstimateResult.tsx` -- props only, no data fetching, no action import.
// Renders the vehicle line ONLY when `vehicleDesc` was successfully derived
// (RESEARCH.md Pitfall 5) -- a VIN re-decode failure on `/book` must omit the
// line entirely rather than render a placeholder. There is no email
// confirmation in v1 (V2-05 is out of scope), so the "we'll call you"
// sentence here is the only artifact the customer leaves with.

import { BOOKING_COPY, BUSINESS } from '@/lib/constants'

interface BookingConfirmationProps {
    firstName: string
    lastName: string
    phone: string
    apptDate: string
    apptTime: string
    vehicleDesc: string | null
}

export function BookingConfirmation({ firstName, lastName, phone, apptDate, apptTime, vehicleDesc }: BookingConfirmationProps) {
    return (
        <div className="space-y-3" data-testid="card-booking-confirmation">
            <p className="text-xl font-semibold text-foreground">{BOOKING_COPY.confirmationHeading}</p>

            <div className="space-y-1 text-sm">
                <p className="text-foreground">
                    <span className="text-muted-foreground">Name: </span>
                    {firstName} {lastName}
                </p>
                <p className="text-foreground">
                    <span className="text-muted-foreground">Date: </span>
                    {apptDate}
                </p>
                <p className="text-foreground">
                    <span className="text-muted-foreground">Time: </span>
                    {apptTime}
                </p>
                {vehicleDesc && (
                    <p className="text-foreground">
                        <span className="text-muted-foreground">Vehicle: </span>
                        {vehicleDesc}
                    </p>
                )}
            </div>

            <p className="text-sm text-muted-foreground">
                {BOOKING_COPY.confirmationBody} {phone} {BOOKING_COPY.confirmationFollowUp}
            </p>

            <p className="text-xs text-muted-foreground">
                Questions? Call us at <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.
            </p>
        </div>
    )
}
