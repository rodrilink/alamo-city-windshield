'use client'

import { useRef } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/components/home/HeroSection'
import { EstimateSection } from '@/components/home/EstimateSection'
import { ServicesSection } from '@/components/home/ServicesSection'

export default function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative h-dvh overflow-hidden">
      <TopNav overlay />
      <div
        ref={scrollRef}
        className="h-dvh overflow-y-auto snap-y snap-mandatory"
      >
        <HeroSection scrollRef={scrollRef} />
        <EstimateSection scrollRef={scrollRef} />
        <ServicesSection scrollRef={scrollRef} />
        <div className="snap-start snap-always">
          <Footer />
        </div>
      </div>
    </div>
  )
}
