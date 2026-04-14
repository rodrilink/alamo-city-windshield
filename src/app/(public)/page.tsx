'use client'

import { useRef } from 'react'
import { HeroSection } from '@/components/home/HeroSection'
import { EstimateSection } from '@/components/home/EstimateSection'

export default function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={scrollRef}
      className="h-dvh overflow-y-auto snap-y snap-mandatory"
    >
      <HeroSection scrollRef={scrollRef} />
      <EstimateSection scrollRef={scrollRef} />
      {/* Section 3: ServicesSection — added in Plan 03 */}
      <section className="snap-start snap-always h-dvh flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Services Section (Plan 03)</p>
      </section>
    </div>
  )
}
