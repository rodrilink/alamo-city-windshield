// Shared client/server validation contract for the add-user form (D-12).
//
// Deliberately NOT build-time server-side-only fenced -- same reasoning as
// `@/lib/contact/contact-schema`: this schema runs both as the
// react-hook-form resolver (client) and inside `addUserAction` as the
// untrusted-input gate (server). Supabase Auth's own password policy is the
// server-side backstop (D-12) -- this schema is the client-side and
// Server-Action-side gate, not the only one.

import { z } from 'zod'

export const addUserSchema = z
    .object({
        email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(8, 'Confirm the password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })
