'use client'

// D-05: past slots and booked slots receive the SAME visual disabled
// treatment -- one disabled state serves both reasons, and past slots are
// shown disabled rather than hidden. Follows `ManualEntryForm.tsx`'s
// disabled/error markup conventions (disabled:opacity-50, role="alert").
//
// WR-02 gap closure (04-VERIFICATION.md, .planning/todos/pending/slot-taken-race-recovery.md):
// `handleSlotTakenRefetch` now clears `selectedTime` so a lost race returns
// the customer to the slot grid instead of leaving them stuck resubmitting
// the same known-taken slot. This unmounts `BookingForm`, which would
// destroy the D-09 value-preservation mechanism (confirmed passing in human
// UAT step 13) if nothing else changed -- so `preservedValues` lifts the
// customer's typed data into THIS component's state before the clear, and
// replays it into the next mounted `BookingForm` via `initialValues`.

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { BookingForm } from '@/components/booking/BookingForm'
import { formatLocalDateKeyClient } from '@/components/booking/date-key'
import { BOOKING_COPY } from '@/lib/constants'
import type { BookingFormValues, DayAvailability } from '@/types/booking'

interface SlotListProps {
    selectedDate: Date
    dayAvailability: DayAvailability | null
    vin: string | null
    vehicleDesc: string | null
    onSlotTakenRefetch: () => void
    onFullyBookedDate: (dateKey: string) => void
}

export function SlotList({ selectedDate, dayAvailability, vin, vehicleDesc, onSlotTakenRefetch, onFullyBookedDate }: SlotListProps) {
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [preservedValues, setPreservedValues] = useState<Partial<BookingFormValues> | null>(null)
    const dateKey = formatLocalDateKeyClient(selectedDate)

    if (dayAvailability === null) {
        return <p className="text-sm text-muted-foreground">Loading available times…</p>
    }

    if (!dayAvailability.ok) {
        return (
            <p className="text-sm text-destructive" role="alert" data-testid="text-slot-list-error">
                We couldn&apos;t load available times for this date. Please try selecting the date again.
            </p>
        )
    }

    const { slots } = dayAvailability.data

    if (slots.length === 0) {
        return (
            <p className="text-sm text-muted-foreground" data-testid="text-no-slots">
                {BOOKING_COPY.noSlotsAvailable}
            </p>
        )
    }

    // WR-02: the selected TIME is cleared so the customer is returned to the
    // slot grid to re-pick, since the just-submitted time is now known
    // taken. The entered VALUES are NOT cleared here -- BookingForm lifts
    // them into `preservedValues` via `onValuesPreserved` before this fires
    // (D-09, UAT step 13), so the customer re-picks a time but never re-types
    // their name/phone/VIN.
    //
    // `onFullyBookedDate(dateKey)` is left in place unconditionally -- this is
    // WR-01, which plan 04-11 (depends on this plan) fixes by deriving
    // day-level fully-booked state from the refetch result instead.
    function handleSlotTakenRefetch() {
        onFullyBookedDate(dateKey)
        onSlotTakenRefetch()
        setSelectedTime(null)
    }

    return (
        <div className="space-y-4" data-testid="card-slot-list">
            <h2 className="text-sm font-semibold text-foreground">{BOOKING_COPY.slotListLabel}</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                    <Button
                        key={slot.time}
                        type="button"
                        variant={selectedTime === slot.time ? 'default' : 'outline'}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className="disabled:opacity-50"
                        data-testid={`btn-slot-${slot.time}`}
                    >
                        {slot.time}
                    </Button>
                ))}
            </div>

            {selectedTime && (
                <BookingForm
                    apptDate={dateKey}
                    apptTime={selectedTime}
                    vin={vin}
                    vehicleDesc={vehicleDesc}
                    onSlotTaken={handleSlotTakenRefetch}
                    initialValues={preservedValues}
                    onValuesPreserved={(values) => setPreservedValues(values)}
                />
            )}
        </div>
    )
}
