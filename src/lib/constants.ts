export const BUSINESS = {
  name: 'Alamo City Windshield Repair',
  phone: '(210) 555-0100',
  phoneHref: 'tel:+12105550100',
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
