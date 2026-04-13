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
