// Shared client/server validation contract for the admin login form (AUTH-01).
//
// Deliberately NOT build-time server-side-only fenced -- same reasoning as
// `@/lib/contact/contact-schema`: this schema runs both as the
// react-hook-form resolver (client) and inside `loginAction` as the
// untrusted-input gate (server).
//
// Deliberately NO `min(8)` (or any other length rule) on `password`. Length
// constraints belong on account creation (`addUserSchema`), not login:
// rejecting a short password here with a validation error -- rather than the
// generic credential error every other failure gets -- would let an attacker
// distinguish "too short to be a real password on this system" from "wrong
// password," which is exactly the account-enumeration signal V2
// Authentication requires avoiding.

import { z } from 'zod'

export const loginSchema = z.object({
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})
