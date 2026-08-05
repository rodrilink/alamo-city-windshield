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
        {/*
          `snap-end`, not `snap-start`. As the LAST child of a `snap-mandatory`
          scroller, a stop shorter than the viewport cannot satisfy `snap-start`:
          the scroller can't scroll past its content end, so max scroll would
          leave the Footer's top edge partway down with the tail of
          ServicesSection above it. `snap-end` aligns the bottom edge to the
          scrollport bottom — exactly where max scroll lands. No `overflow-y-auto`
          here, so there is no inner scroller for the wheel to capture.
        */}
        <section className="snap-end snap-always shrink-0">
          <Footer />
        </section>
      </div>
    </div>
  )
}
