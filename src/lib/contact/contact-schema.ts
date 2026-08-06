// Shared client/server validation contract for the contact form (CONT-06).
//
// Deliberately NOT build-time server-side-only fenced -- same reasoning as
// `@/lib/booking/booking-schema`: this schema runs both as the
// react-hook-form resolver (client) and inside `createContact` as the
// untrusted-input gate (server).
//
// WR-03: `createContact` is a public, unauthenticated Server Action, so the
// `.max()` caps below are the application-layer bound against a scripted
// POST that never touches the React form. The backing Postgres columns
// remain unbounded `TEXT` by design -- the shared migration (used by Phases
// 1, 3, 5, and 6) is not modified by this change.

import { z } from 'zod'

/**
 * Zod schema for the contact form's fields, matching the
 * `contacts.name`/`last_name`/`phone` `NOT NULL` columns (see the migration).
 * `address` is optional.
 */
export const contactSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(100, 'First name is too long'),
    lastName: z.string().trim().min(1, 'Last name is required').max(100, 'Last name is too long'),
    phone: z.string().trim().min(1, 'Phone number is required').max(30, 'Phone number is too long'),
    address: z.string().trim().max(300, 'Address is too long').nullable(),
    honeypot: z.string().max(200),
})
