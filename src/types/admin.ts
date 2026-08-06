// Shared type contracts for the admin dashboard and user-management area
// (Phase 5). This module is imported by BOTH Server Components (dashboard
// reads, user list) and Client Components (charts, forms, dialogs) -- it
// MUST NOT gain the build-time server-side-only import fence, and must
// never contain a secret value, matching `src/types/booking.ts`'s same rule.

/**
 * One day's aggregated count from `bucketByDay` (D-03). `date` is a
 * `'yyyy-MM-dd'` calendar-day string, never a full timestamp -- this is the
 * shape every chart component (`VisitorsChart`, `ContactsChart`,
 * `VinSearchChart`) consumes directly as its x-axis data.
 */
export interface DailyBucket {
  date: string
  count: number
}

/**
 * Discriminated result of a dashboard read (cards, charts, tables). Mirrors
 * `AvailabilityReadResult<TData>` in `src/types/booking.ts` -- defined here
 * rather than imported from `booking.ts` so the dashboard does not depend on
 * the booking module's types. `{ ok: false }` is structurally distinct from
 * `{ ok: true; data: [] }` so a failed query can never be silently rendered
 * as a legitimate zero-row result (RESEARCH.md Pitfall 3).
 */
export type DashboardReadResult<TData> = { ok: true; data: TData } | { ok: false }

/**
 * Values collected by the add-user form (D-12). `confirmPassword` exists
 * only to catch a typo before submission -- it is never persisted.
 */
export interface AddUserFormValues {
  email: string
  password: string
  confirmPassword: string
}

/**
 * Discriminated result of the `addUserAction` Server Action. Mirrors
 * `ContactActionState`'s full shape (`values`, optional `fieldErrors`) since
 * D-12's email/password/confirmPassword form benefits from field-level
 * error redisplay exactly like the contact form.
 */
export type AddUserActionStatus = 'idle' | 'success' | 'error'

export interface AddUserActionState {
  status: AddUserActionStatus
  values: AddUserFormValues
  fieldErrors?: Partial<Record<keyof AddUserFormValues, string>>
  message?: string
  /**
   * D-12: the created account's password, returned to the browser exactly
   * once on success. There is no email delivery to send it to instead. This
   * value MUST NOT be logged (`console.error`/`console.log`) anywhere it
   * passes through, and must never be persisted beyond the single render
   * that shows `ADMIN_COPY.passwordShownOnceNotice`.
   */
  generatedPassword?: string
}

/**
 * Discriminated result of the `removeUserAction` Server Action. No `values`
 * member -- the only input is a user id supplied by the caller (a button
 * click), not a form.
 */
export interface RemoveUserActionState {
  status: 'idle' | 'success' | 'error'
  message?: string
}
