// The business phone is supplied via `NEXT_PUBLIC_BUSINESS_PHONE` so the real
// number is not committed to a public repository. Set it in `.env.local`
// locally and in the Vercel dashboard for deploys.
//
// This is NOT a secret: `NEXT_PUBLIC_*` values are inlined into the client
// bundle at build time, so the number is readable in page source. That is
// correct and intended -- customers must be able to call. The env var keeps it
// out of git, nothing more.
//
// The fallback is the reserved-fictional 555 placeholder, deliberately NOT the
// real number: if the env var is ever missing, an obviously fake number is a
// visible signal that configuration is broken, whereas a blank would silently
// strip the phone from the header, footer and every "call us" error message.
const BUSINESS_PHONE = process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? '(210) 555-0100'

/**
 * Derives the `tel:` href from the display number so the two can never drift
 * apart. Strips every non-digit, then prefixes the US country code.
 */
function toPhoneHref(displayPhone: string): string {
  const digits = displayPhone.replace(/\D/g, '')
  return `tel:+1${digits}`
}

export const BUSINESS = {
  name: 'Alamo City Windshield Repair',
  phone: BUSINESS_PHONE,
  phoneHref: toPhoneHref(BUSINESS_PHONE),
  location: 'San Antonio, TX',
  serviceArea: 'Mobile service available across San Antonio',
  hours: [
    { days: 'Mon\u2013Fri', open: '8:00 AM', close: '6:00 PM', closed: false },
    { days: 'Sat', open: '9:00 AM', close: '2:00 PM', closed: false },
    { days: 'Sun', open: null, close: null, closed: true },
  ],
} as const

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Admin', href: '/admin' },
] as const

// Copy for the VIN estimate result (Phase 3). No pricing value or year
// threshold belongs here — this module ships to the browser (T-03-03).
export const ESTIMATE_COPY = {
  glassLabels: {
    standard: 'Standard',
    acoustic: 'Acoustic',
    heated: 'Heated',
  },
  glassHints: {
    standard: 'Factory laminated glass — what most vehicles ship with.',
    acoustic:
      'Has a sound-dampening inner layer that noticeably reduces road noise. Common on newer and luxury trims, often marked "Acoustic" or "SoundScreen" in the corner stamp.',
    heated:
      'Has visible heating elements in the glass or a wiper de-icer strip along the bottom edge where the wipers rest.',
  },
  sizeLabels: {
    car: 'Car',
    'suv-truck': 'SUV or Truck',
    'van-oversized': 'Van',
  },
  breakdownLabels: {
    basePrice: 'Base replacement',
    sizeModifier: 'Vehicle size',
    glassModifier: 'Glass type',
    adas: 'Camera recalibration',
  },
  adasNote:
    'Vehicles from 2018 or later often have a camera mounted behind the windshield. If it needs recalibration after the glass is replaced, that cost is included in the upper end of this estimate.',
  adasNotRequired: 'Not required for this vehicle',
  disclaimer:
    'This is an estimate, not a final quote — final pricing is confirmed once we see the vehicle. Questions? Call us at',
  unknownVehicleTypePrompt:
    "We couldn't determine your vehicle type from the VIN. Pick the closest match:",
  manualBasisNote: 'This estimate is based on the vehicle details you entered.',
  notFoundMessage:
    "We couldn't find that vehicle. Double-check the VIN characters and try again.",
  unreachableMessage:
    "We couldn't reach the vehicle lookup service, so enter your vehicle details and we'll still give you an estimate.",
  resetLabel: 'Estimate another vehicle',
  manualEntryLinkLabel: 'Enter your vehicle details manually',
} as const

// Copy for the appointment booking flow (Phase 4). This is the only source
// of user-facing strings for /book — no vehicle pricing value or business
// hours literal belongs here (those live in PRICING and BUSINESS.hours
// respectively). This module ships to the browser (see ESTIMATE_COPY's same
// note above).
export const BOOKING_COPY = {
  calendarLabel: 'Choose an appointment date',
  slotListLabel: 'Available times',
  noSlotsAvailable: 'No appointment times are available on this date. Please choose another date.',
  formFieldLabels: {
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    vin: 'VIN (optional)',
  },
  submitLabel: 'Book appointment',
  // D-10: this message is shown ONLY when the insert fails with Postgres
  // error code 23505 -- the UNIQUE (appt_date, appt_time) violation. It is
  // the sole signal that someone else took the slot first.
  slotTakenMessage: "That time slot was just taken. Please choose another available time.",
  // D-10: every OTHER failure gets this message instead. It must never imply
  // the slot is unavailable -- the slot may still be free -- and it reads as
  // one sentence once the caller appends BUSINESS.phone.
  genericErrorMessage:
    "We couldn't complete your booking due to a temporary problem. Please try again, or call us to book by phone at",
  // D-11/BOOK-07: shown on the confirmation screen. There is no email
  // confirmation in v1 (V2-05 is out of scope), so this phone-call line is
  // the only follow-up the customer is told to expect. The component
  // interpolates the customer's own submitted phone number in place of the
  // trailing colon.
  confirmationHeading: "You're booked!",
  confirmationBody: "We've recorded your appointment. We'll call you at",
  confirmationFollowUp: 'to confirm the details.',
} as const

// Copy for the contact form (Phase 4). This is the only source of
// user-facing strings for /contact's form -- this module ships to the
// browser (see ESTIMATE_COPY's same note above).
export const CONTACT_COPY = {
  formFieldLabels: {
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    address: 'Address (optional)',
  },
  submitLabel: 'Send message',
  // CONT-05
  successMessage: "Thanks for reaching out! We've received your message and will be in touch soon.",
  // Same "transient, includes phone" rule as BOOKING_COPY.genericErrorMessage.
  genericErrorMessage:
    "We couldn't send your message due to a temporary problem. Please try again, or reach us directly at",
} as const

// Copy for the admin area (Phase 5) -- login, dashboard, and user
// management. Follows the same shape and header-comment convention as
// ESTIMATE_COPY/BOOKING_COPY/CONTACT_COPY above. This module ships to the
// browser, so no secret value (a real password, a raw Supabase error, a
// submitted email) belongs in any string here.
export const ADMIN_COPY = {
  // D-14: sidebar nav labels. Kept in this copy module for consistency with
  // every other visible string here, even though they read fine inline.
  navDashboardLabel: 'Dashboard',
  navUsersLabel: 'Users',
  // Points at the public site root `/`, not a `/home` route -- there is no
  // such route. `NAV_LINKS` above already labels `/` as "Home"; this keeps the
  // two navs calling the same destination by the same name.
  navHomeLabel: 'Home',
  // V2 Authentication: identical whether the email exists or not -- no
  // account enumeration. Never interpolate the submitted email into this.
  loginGenericError: 'Incorrect email or password. Please try again.',
  // Distinct from loginGenericError: Supabase itself could not be reached is
  // a different problem than a wrong password (Phase 3 D-17/D-18, Phase 4 D-10).
  loginUnreachableError: "We couldn't reach the login service. Please try again in a moment.",
  // AUTH-05
  logoutLabel: 'Log out',
  // D-01: shown on a chart when the underlying analytics_events table has
  // zero rows for the window -- an honest empty state, not a broken axis.
  dashboardEmptyStateHint: 'No data yet — event tracking arrives in Phase 6.',
  // D-02: shorter subtitle for the two analytics_events-sourced summary cards.
  trackingStartsHint: 'Tracking starts in Phase 6',
  // Shown when a dashboard read returns ok: false. Must read differently
  // from dashboardEmptyStateHint -- a failed query must never be
  // indistinguishable from a legitimate zero-row result (RESEARCH.md Pitfall 3).
  queryFailedMessage: "We couldn't load this data due to a temporary problem. Please refresh the page.",
  // D-11: the fixed part of the removal confirmation. The caller interpolates
  // the target email before this sentence, mirroring BOOKING_COPY.confirmationBody's split.
  removeUserConfirmBody: 'They will immediately lose access.',
  // D-10 guard 1
  selfDeleteError: 'You cannot remove your own account.',
  // D-10 guard 2
  lastAdminError: 'At least one admin must remain.',
  // D-12: shown once on successful user creation, next to the generated
  // password. There is no email delivery, so this is the only time it is shown.
  passwordShownOnceNotice: 'Account created. Save this password — it will not be shown again.',
  // Fallback for a User whose last_sign_in_at is undefined (RESEARCH.md Pitfall 5).
  neverSignedIn: 'Never signed in',
  // Generic failure message for createUser errors -- never echo the raw
  // Supabase error text to the browser.
  addUserGenericError: "We couldn't create that account due to a temporary problem. Please try again.",
} as const
