// Shared client/server validation contract for the contact form (CONT-06).
//
// Deliberately NOT build-time server-side-only fenced -- same reasoning as
// `@/lib/booking/booking-schema`: this schema runs both as the
// react-hook-form resolver (client) and inside `createContact` as the
// untrusted-input gate (server).

import { z } from 'zod'

/**
 * Zod schema for the contact form's fields, matching the
 * `contacts.name`/`last_name`/`phone` `NOT NULL` columns (see the migration).
 * `address` is optional.
 */
export const contactSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    phone: z.string().trim().min(1, 'Phone number is required'),
    address: z.string().trim().nullable(),
    honeypot: z.string(),
})
