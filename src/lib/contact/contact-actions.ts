'use server'

// Mirrors `createBooking`'s shape minus slot-legality re-validation and the
// '23505' branch: `contacts` carries no `UNIQUE` constraint, so a
// collision-based failure class does not exist for this form (see
// `ContactActionStatus`, which has no `'slot-taken'` member).

import { createAdminClient } from '@/lib/supabase/admin'
import { contactSchema } from '@/lib/contact/contact-schema'
import { CONTACT_COPY, BUSINESS } from '@/lib/constants'
import type { ContactActionState, ContactFormValues } from '@/types/booking'

/**
 * Server Action backing the contact form (CONT-03, CONT-04).
 *
 * Control order: honeypot (CONT-03) -> Zod re-validation -> insert into
 * `contacts` via the admin client (CONT-04) -> `success` or `error`. Unlike
 * `bookings`, the `contacts` table has a real `honeypot` column, so the
 * submitted value is stored there rather than only checked and discarded.
 *
 * @param prevState - The previous action state (unused directly, but required by `useActionState`'s signature).
 * @param formData - The submitted form data.
 * @returns The next `ContactActionState`, preserving submitted values on every non-success path.
 */
export async function createContact(prevState: ContactActionState, formData: FormData): Promise<ContactActionState> {
    const values: ContactFormValues = {
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        address: formData.get('address') ? String(formData.get('address')) : null,
        honeypot: String(formData.get('honeypot') ?? ''),
    }

    // 1. Honeypot (CONT-03). Reject silently -- runs before any database call.
    if (values.honeypot !== '') {
        return { status: 'success', values }
    }

    // 2. Zod re-validation (untrusted-input gate).
    const parsed = contactSchema.safeParse(values)
    if (!parsed.success) {
        const fieldErrors: Partial<Record<keyof ContactFormValues, string>> = {}
        for (const issue of parsed.error.issues) {
            const field = issue.path[0] as keyof ContactFormValues | undefined
            if (field && !fieldErrors[field]) {
                fieldErrors[field] = issue.message
            }
        }
        return { status: 'error', values, fieldErrors, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }

    // 3. Insert (CONT-04).
    try {
        const supabase = createAdminClient()
        const { error } = await supabase.from('contacts').insert({
            name: parsed.data.firstName,
            last_name: parsed.data.lastName,
            phone: parsed.data.phone,
            address: parsed.data.address,
            honeypot: parsed.data.honeypot,
        })

        if (error) {
            console.error('createContact: insert failed', { error })
            return { status: 'error', values, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
        }

        return { status: 'success', values }
    } catch (error) {
        console.error('createContact: unexpected error', { error })
        return { status: 'error', values, message: `${CONTACT_COPY.genericErrorMessage} ${BUSINESS.phone}` }
    }
}
