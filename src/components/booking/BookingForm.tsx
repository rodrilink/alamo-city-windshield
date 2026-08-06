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
//
// 04-VERIFICATION gap closure (CONT-06/BOOK-06): submission now runs through
// `form.handleSubmit(onValidSubmit)`, mirroring `ContactForm.tsx`. The native
// `action={formAction}` dispatch was deliberately REMOVED rather than kept
// alongside `onSubmit` -- having both re-enables the ungated native path.
// `onValidSubmit` builds `FormData` explicitly and only calls `formAction`
// once the Zod resolver passes, so an invalid submit never reaches
// `createBooking`. `state.fieldErrors` is now read via `form.setError` so a
// server round-trip failure also renders per-field, not only as generic text.
//
// `initialValues` and `onValuesPreserved` exist solely to keep D-09 intact
// across the WR-02 remount: `SlotList` clears `selectedTime` on a lost race
// (unmounting this component), so the customer's typed values are captured
// via `onValuesPreserved` BEFORE that happens and replayed into the next
// mounted instance via `initialValues`.

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
    /** Task 2 (WR-02): customer-typed values lifted by the parent across the remount caused by clearing a taken slot. */
    initialValues?: Partial<BookingFormValues> | null
    /** Task 2 (WR-02): fired with the Server-Action-echoed values immediately before signaling a slot-taken transition, so the parent can capture them before this component unmounts. */
    onValuesPreserved?: (values: BookingFormValues) => void
}

const INITIAL_STATE: BookingActionState = {
    status: 'idle',
    values: { firstName: '', lastName: '', phone: '', vin: null, apptDate: '', apptTime: '', honeypot: '' },
}

export function BookingForm({ apptDate, apptTime, vin, vehicleDesc, onSlotTaken, initialValues = null, onValuesPreserved }: BookingFormProps) {
    const [state, formAction, isPending] = useActionState(createBooking, INITIAL_STATE)

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
        values: {
            ...state.values,
            firstName: state.values.firstName || initialValues?.firstName || '',
            lastName: state.values.lastName || initialValues?.lastName || '',
            phone: state.values.phone || initialValues?.phone || '',
            vin: state.values.vin || initialValues?.vin || vin,
            apptDate,
            apptTime,
            honeypot: '',
        },
    })

    // D-10: a lost race disables the just-taken slot without a full page
    // reload -- fires once per transition into 'slot-taken'. Preserve first,
    // then signal (WR-02/D-09): the parent must capture `state.values` before
    // `onSlotTaken` triggers the remount that would otherwise destroy them.
    useEffect(() => {
        if (state.status === 'slot-taken') {
            onValuesPreserved?.(state.values)
            onSlotTaken()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status])

    // Gap closure: render server-returned per-field errors (state.fieldErrors)
    // onto the same <FormMessage/> elements the client-side resolver targets,
    // so a server round-trip failure also surfaces per-field, not only via
    // the generic state.message paragraph below.
    useEffect(() => {
        if (state.status === 'error' && state.fieldErrors) {
            for (const [field, message] of Object.entries(state.fieldErrors)) {
                if (message && (field === 'firstName' || field === 'lastName' || field === 'phone' || field === 'vin')) {
                    form.setError(field, { type: 'server', message })
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.fieldErrors, state.status])

    // Gap closure (CONT-06/BOOK-06): react-hook-form's Zod resolver runs
    // before any dispatch to the Server Action. Mirrors ContactForm.tsx's
    // onValidSubmit -- FormData is built explicitly here since `onSubmit`
    // replaces `action`, so the browser no longer serializes the <form>
    // element itself.
    function onValidSubmit(values: BookingFormValues) {
        const formData = new FormData()
        formData.set('firstName', values.firstName)
        formData.set('lastName', values.lastName)
        formData.set('phone', values.phone)
        if (values.vin) formData.set('vin', values.vin)
        formData.set('apptDate', apptDate)
        formData.set('apptTime', apptTime)
        formData.set('honeypot', values.honeypot)
        formData.set('serverVehicleDesc', vehicleDesc ?? '')
        formAction(formData)
    }

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
            <form onSubmit={form.handleSubmit(onValidSubmit)} className="space-y-4" noValidate data-testid="form-booking">
                {/* D-19: vehicleDesc is derived server-side by /book, never
                    supplied by the client form. `onValidSubmit` reads the
                    `vehicleDesc` prop directly and sets `serverVehicleDesc` on
                    the FormData it builds -- no hidden input needed since
                    `onSubmit` (not `action`) drives submission. */}

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
