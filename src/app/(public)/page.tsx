'use client'

import { useRef } from 'react'
import { HeroSection } from '@/components/home/HeroSection'

export default function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={scrollRef}
      className="h-dvh overflow-y-auto snap-y snap-mandatory"
    >
      <HeroSection scrollRef={scrollRef} />
      {/* Section 2: EstimateSection — added in Plan 02 */}
      <section className="snap-start snap-always h-dvh flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">VIN Estimate Section (Plan 02)</p>
      </section>
      {/* Section 3: ServicesSection — added in Plan 03 */}
      <section className="snap-start snap-always h-dvh flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Services Section (Plan 03)</p>
      </section>
    </div>
  )
}
