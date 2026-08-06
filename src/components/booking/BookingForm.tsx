'use client'

// This repo's first react-hook-form + `useActionState` wiring (RESEARCH.md
// Pattern 4). `useActionState` is imported from `react` (React 19) -- the
// React 18 hook it supersedes (imported from `react-dom`) is intentionally
// not used anywhere in this file.
//
// `values: state.values` on `useForm` is the D-09 mechanism: every
// non-success `BookingActionState` return repopulates the form with the
// customer's own submitted values, so a failed submit only requires
// re-picking a time, never re-typing name/phone/VIN.
//
// D-10: 'slot-taken' and 'error' render distinct messages and never share a
// UI treatment. Only 'slot-taken' triggers the availability re-fetch that
// disables the slot -- 'error' leaves the slot selectable, since it may
// still be free.

import { useActionState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { BookingConfirmation } from '@/components/booking/BookingConfirmation'
import { createBooking } from '@/lib/booking/booking-actions'
import { bookingSchema } from '@/lib/booking/booking-schema'
import { BOOKING_COPY, BUSINESS } from '@/lib/constants'
import type { BookingActionState, BookingFormValues } from '@/types/booking'

interface BookingFormProps {
    apptDate: string
    apptTime: string
    vin: string | null
    vehicleDesc: string | null
    onSlotTaken: () => void
}

const INITIAL_STATE: BookingActionState = {
    status: 'idle',
    values: { firstName: '', lastName: '', phone: '', vin: null, apptDate: '', apptTime: '', honeypot: '' },
}

export function BookingForm({ apptDate, apptTime, vin, vehicleDesc, onSlotTaken }: BookingFormProps) {
    const [state, formAction, isPending] = useActionState(createBooking, INITIAL_STATE)

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
        values: {
            ...state.values,
            firstName: state.values.firstName || '',
            lastName: state.values.lastName || '',
            phone: state.values.phone || '',
            vin: state.values.vin || vin,
            apptDate,
            apptTime,
            honeypot: '',
        },
    })

    // D-10: a lost race disables the just-taken slot without a full page
    // reload -- fires once per transition into 'slot-taken'.
    useEffect(() => {
        if (state.status === 'slot-taken') {
            onSlotTaken()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status])

    if (state.status === 'success') {
        return (
            <BookingConfirmation
                firstName={state.values.firstName}
                lastName={state.values.lastName}
                phone={state.values.phone}
                apptDate={state.values.apptDate}
                apptTime={state.values.apptTime}
                vehicleDesc={vehicleDesc}
            />
        )
    }

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-4" data-testid="form-booking">
                {/* D-19: vehicleDesc is derived server-side by /book, never
                    supplied by the client form. Carried as a hidden field so
                    createBooking can read it via formData.get('serverVehicleDesc'). */}
                <input type="hidden" name="serverVehicleDesc" value={vehicleDesc ?? ''} />
                <input type="hidden" name="apptDate" value={apptDate} />
                <input type="hidden" name="apptTime" value={apptTime} />

                {/* D-14: honeypot. Visually hidden and non-focusable, not
                    type="hidden" -- a bot filling every visible AND invisible
                    field would trip this, whereas type="hidden" fields are
                    often skipped by naive form-fillers. No autocomplete-
                    attracting name. */}
                <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
                    <label htmlFor="booking-honeypot">Leave this field empty</label>
                    <input
                        id="booking-honeypot"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        {...form.register('honeypot')}
                    />
                </div>

                {state.status === 'slot-taken' && (
                    <p className="text-sm text-destructive" role="alert" data-testid="text-slot-taken">
                        {state.message}
                    </p>
                )}
                {state.status === 'error' && (
                    <p className="text-sm text-destructive" role="alert" data-testid="text-booking-error">
                        {state.message}
                    </p>
                )}

                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{BOOKING_COPY.formFieldLabels.firstName}</FormLabel>
                            <FormControl>
                                <input
                                    {...field}
                                    value={field.value ?? ''}
                                    disabled={isPending}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    autoComplete="given-name"
                                    data-testid="input-first-name"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{BOOKING_COPY.formFieldLabels.lastName}</FormLabel>
                            <FormControl>
                                <input
                                    {...field}
                                    value={field.value ?? ''}
                                    disabled={isPending}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    autoComplete="family-name"
                                    data-testid="input-last-name"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{BOOKING_COPY.formFieldLabels.phone}</FormLabel>
                            <FormControl>
                                <input
                                    {...field}
                                    value={field.value ?? ''}
                                    disabled={isPending}
                                    type="tel"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    autoComplete="tel"
                                    data-testid="input-phone"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="vin"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{BOOKING_COPY.formFieldLabels.vin}</FormLabel>
                            <FormControl>
                                <input
                                    {...field}
                                    value={field.value ?? ''}
                                    disabled={isPending}
                                    maxLength={17}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    autoComplete="off"
                                    data-testid="input-vin"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full" disabled={isPending} data-testid="btn-submit-booking">
                    {isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            Booking…
                        </>
                    ) : (
                        BOOKING_COPY.submitLabel
                    )}
                </Button>

                {state.status === 'error' && (
                    <p className="text-center text-xs text-muted-foreground">
                        Prefer to call? {BUSINESS.phone}
                    </p>
                )}
            </form>
        </Form>
    )
}
