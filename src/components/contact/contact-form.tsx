'use client'

// D-13/D-17: the contact form is wired directly to the `createContact` Server
// Action from plan `04-05` -- react-hook-form supplies client-side validation
// via the shared `contactSchema` resolver, and React 19's `useActionState`
// (imported from `react`, not the deprecated pre-19 form-state hook)
// preserves submitted values across a failed submit (D-09's pattern, applied
// here for contact rather than booking). CONT-01 fields only: first name,
// last name, phone required, address optional. No free-text message field --
// CONTEXT.md's Deferred Ideas leaves the contacts table's message column
// unused in v1.

import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createContact } from '@/lib/contact/contact-actions'
import { contactSchema } from '@/lib/contact/contact-schema'
import { CONTACT_COPY, BUSINESS } from '@/lib/constants'
import type { ContactActionState, ContactFormValues } from '@/types/booking'

const initialState: ContactActionState = {
    status: 'idle',
    values: {
        firstName: '',
        lastName: '',
        phone: '',
        address: null,
        honeypot: '',
    },
}

export function ContactForm() {
    const [state, formAction, isPending] = useActionState(createContact, initialState)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ContactFormValues>({
        resolver: zodResolver(contactSchema),
        values: state.values,
    })

    if (state.status === 'success') {
        return (
            <div className="space-y-4" data-testid="card-contact-success">
                <p className="text-foreground">{CONTACT_COPY.successMessage}</p>
            </div>
        )
    }

    // CONT-06: react-hook-form's `handleSubmit` runs the Zod resolver first --
    // an invalid submit never reaches `formAction`, satisfying "does not call
    // the action" on a missing required field. On success, the validated
    // values are packed into FormData (the shape `createContact` expects)
    // and handed to `useActionState`'s dispatcher.
    function onValidSubmit(values: ContactFormValues) {
        const formData = new FormData()
        formData.set('firstName', values.firstName)
        formData.set('lastName', values.lastName)
        formData.set('phone', values.phone)
        if (values.address) formData.set('address', values.address)
        formData.set('honeypot', values.honeypot)
        formAction(formData)
    }

    return (
        <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-4" noValidate>
            {/* CONT-03/D-14: honeypot -- visually hidden, not `type="hidden"`, non-focusable. */}
            <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="contact-honeypot">Leave this field blank</label>
                <input
                    id="contact-honeypot"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    {...register('honeypot')}
                />
            </div>

            <div>
                <Label htmlFor="contact-first-name-input" className="block mb-1">
                    {CONTACT_COPY.formFieldLabels.firstName}
                </Label>
                <input
                    id="contact-first-name-input"
                    type="text"
                    disabled={isPending}
                    data-testid="input-contact-first-name"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    autoComplete="given-name"
                    {...register('firstName')}
                />
                {errors.firstName && (
                    <p className="mt-1 text-sm text-destructive" role="alert">
                        {errors.firstName.message}
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor="contact-last-name-input" className="block mb-1">
                    {CONTACT_COPY.formFieldLabels.lastName}
                </Label>
                <input
                    id="contact-last-name-input"
                    type="text"
                    disabled={isPending}
                    data-testid="input-contact-last-name"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    autoComplete="family-name"
                    {...register('lastName')}
                />
                {errors.lastName && (
                    <p className="mt-1 text-sm text-destructive" role="alert">
                        {errors.lastName.message}
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor="contact-phone-input" className="block mb-1">
                    {CONTACT_COPY.formFieldLabels.phone}
                </Label>
                <input
                    id="contact-phone-input"
                    type="tel"
                    disabled={isPending}
                    data-testid="input-contact-phone"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    autoComplete="tel"
                    {...register('phone')}
                />
                {errors.phone && (
                    <p className="mt-1 text-sm text-destructive" role="alert">
                        {errors.phone.message}
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor="contact-address-input" className="block mb-1">
                    {CONTACT_COPY.formFieldLabels.address}
                </Label>
                <input
                    id="contact-address-input"
                    type="text"
                    disabled={isPending}
                    data-testid="input-contact-address"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    autoComplete="street-address"
                    {...register('address')}
                />
                {errors.address && (
                    <p className="mt-1 text-sm text-destructive" role="alert">
                        {errors.address.message}
                    </p>
                )}
            </div>

            {state.status === 'error' && (
                <p className="text-sm text-destructive" role="alert" data-testid="text-contact-error">
                    {state.message ?? `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}`}
                </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending} data-testid="btn-contact-submit">
                {isPending ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending…
                    </>
                ) : (
                    CONTACT_COPY.submitLabel
                )}
            </Button>
        </form>
    )
}
