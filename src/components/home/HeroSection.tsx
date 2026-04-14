'use client'

import { type RefObject } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeroSectionProps {
  scrollRef: RefObject<HTMLDivElement | null>
}

export function HeroSection({ scrollRef }: HeroSectionProps) {
  function scrollToEstimate() {
    const container = scrollRef.current
    if (!container) return
    // Scroll to the second snap section (one viewport height down)
    container.scrollTo({ top: container.clientHeight, behavior: 'smooth' })
  }

  return (
    <section className="snap-start snap-always h-dvh relative overflow-hidden flex items-center justify-center">
      {/* Background photo — auto glass / windshield repair technician */}
      <Image
        src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80"
        alt="Auto glass repair technician working on a windshield"
        fill
        className="object-cover"
        priority
      />
      {/* Dark overlay at ~55% opacity (D-03: 50-60% range) */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Content — centered above overlay */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl">
        {/* Headline with entrance animation (D-01, D-04) */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
          className="font-display text-4xl font-bold text-white md:text-5xl lg:text-6xl"
        >
          San Antonio&apos;s Trusted Windshield Repair &amp; Replacement
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
          className="mt-4 text-lg text-white/80 max-w-2xl md:text-xl"
        >
          Expert mobile and in-shop service across San Antonio, TX.
          Get a free estimate in seconds.
        </motion.p>

        {/* CTA button (D-02): brand red bg, white text, scrolls to section 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.6 }}
        >
          <Button
            size="lg"
            className="mt-8 text-base px-8 py-3 h-auto"
            onClick={scrollToEstimate}
          >
            Get Free Estimate
          </Button>
        </motion.div>
      </div>

      {/* Bouncing down-arrow (D-05) — Tailwind animate-bounce, zero extra JS */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce text-white/80">
        <ChevronDown className="h-8 w-8" />
      </div>
    </section>
  )
}
