import { BUSINESS } from '@/lib/constants'

export function MissionSection() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Our Mission
        </h2>
        <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Serving San Antonio since 2020, {BUSINESS.name} is dedicated to providing
            every driver with fast, affordable, and high-quality windshield repair and
            replacement services. We believe that a damaged windshield shouldn&apos;t
            disrupt your day or drain your wallet.
          </p>
          <p>
            We&apos;re committed to making the process simple: get an instant estimate,
            book a time that works for you, and let our certified technicians handle the
            rest. Whether you come to us or we come to you, we treat every vehicle as if
            it were our own.
          </p>
          <p>
            Safety is at the core of everything we do. A properly installed windshield
            protects you and your passengers in a collision, and we never cut corners on
            materials or workmanship.
          </p>
        </div>
      </div>
    </section>
  )
}
