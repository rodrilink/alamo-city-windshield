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
