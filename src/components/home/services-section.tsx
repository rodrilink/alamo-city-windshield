'use client'

import { type RefObject } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Wrench, Replace, ScanLine, Car } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ServicesSectionProps {
  scrollRef: RefObject<HTMLDivElement | null>
}

const SERVICES = [
  {
    icon: Wrench,
    title: 'Windshield Repair',
    description: 'Quick chip and crack repair that restores structural integrity. Most repairs completed in under 30 minutes.',
  },
  {
    icon: Replace,
    title: 'Full Replacement',
    description: 'Complete windshield replacement using OEM-quality glass. We handle all vehicle makes and models.',
  },
  {
    icon: ScanLine,
    title: 'ADAS Calibration',
    description: 'Advanced driver assistance system recalibration after windshield replacement for 2018+ vehicles.',
  },
  {
    icon: Car,
    title: 'Mobile Service',
    description: 'We come to you anywhere in San Antonio. Same-day mobile service at your home or workplace.',
  },
] as const

const TESTIMONIALS = [
  {
    name: 'Maria G.',
    quote: 'They came to my office and replaced my windshield during my lunch break. Professional and fast. Highly recommend!',
  },
  {
    name: 'James R.',
    quote: 'Best price I found in San Antonio. The estimate tool made it easy to know what to expect before I even called.',
  },
  {
    name: 'Carlos M.',
    quote: 'Lifetime warranty on the installation gave me peace of mind. Great communication throughout the whole process.',
  },
] as const

export function ServicesSection({ scrollRef }: ServicesSectionProps) {
  return (
    <section className="snap-start snap-always h-dvh overflow-y-auto bg-background flex items-center">
      <div className="w-full py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Service Cards (per D-14) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            viewport={{ root: scrollRef, once: true, amount: 0.2 }}
          >
            <h2 className="font-display text-3xl font-bold text-center text-foreground mb-8">
              Our Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SERVICES.map((service) => {
                const Icon = service.icon
                return (
                  <Card key={service.title} className="text-center">
                    <CardContent className="pt-6">
                      <Icon className="h-10 w-10 text-primary mx-auto mb-3" />
                      <h3 className="font-semibold text-foreground mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </motion.div>

          {/* Testimonials (per D-15) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            viewport={{ root: scrollRef, once: true, amount: 0.2 }}
            className="mt-10"
          >
            <h2 className="font-display text-2xl font-bold text-center text-foreground mb-6">
              What Our Customers Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="text-center">
                  <p className="text-muted-foreground italic text-sm leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="mt-2 font-semibold text-foreground text-sm">
                    &mdash; {t.name}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Contact CTA (per D-16) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
            viewport={{ root: scrollRef, once: true, amount: 0.5 }}
            className="mt-8 text-center"
          >
            <Link href="/contact">
              <Button size="lg" className="text-base px-8 py-3 h-auto">
                Contact Us
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
