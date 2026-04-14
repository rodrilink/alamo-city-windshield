'use client'

import { useRef } from 'react'
import { HeroSection } from '@/components/home/HeroSection'
import { EstimateSection } from '@/components/home/EstimateSection'
import { ServicesSection } from '@/components/home/ServicesSection'

export default function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={scrollRef}
      className="h-dvh overflow-y-auto snap-y snap-mandatory"
    >
      <HeroSection scrollRef={scrollRef} />
      <EstimateSection scrollRef={scrollRef} />
      <ServicesSection scrollRef={scrollRef} />
    </div>
  )
}
