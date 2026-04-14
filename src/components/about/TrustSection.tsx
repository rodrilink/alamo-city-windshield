import { ShieldCheck, MapPin, FileCheck } from 'lucide-react'
import { BUSINESS } from '@/lib/constants'

const TRUST_SIGNALS = [
  {
    icon: ShieldCheck,
    title: 'Lifetime Warranty on Installation',
    description:
      'Every windshield we install comes with a lifetime warranty against leaks and defects. Our work is guaranteed for as long as you own your vehicle.',
  },
  {
    icon: MapPin,
    title: 'Serving All of San Antonio',
    description:
      'From the Alamo to the Medical Center, Stone Oak to Southtown — we provide mobile service across the entire San Antonio metro area. We come to your home, office, or wherever is most convenient.',
    areas: [
      'Downtown & Alamo Heights',
      'North Side & Stone Oak',
      'Medical Center & UTSA',
      'Southtown & South Side',
      'Westside & Helotes',
      'East Side & Converse',
    ],
  },
  {
    icon: FileCheck,
    title: 'Insurance Friendly',
    description:
      "We work with all major insurance providers to make your claim process as smooth as possible. While we don't file claims directly, we provide all the documentation your insurer needs.",
  },
] as const

export function TrustSection() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Why Choose {BUSINESS.name}
        </h2>
        <div className="mt-10 space-y-12">
          {TRUST_SIGNALS.map((signal) => {
            const Icon = signal.icon
            return (
              <div key={signal.title} className="flex gap-4">
                <div className="shrink-0">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {signal.title}
                  </h3>
                  <p className="mt-1 text-muted-foreground leading-relaxed">
                    {signal.description}
                  </p>
                  {'areas' in signal && (
                    <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground">
                      {signal.areas.map((area) => (
                        <li key={area} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
