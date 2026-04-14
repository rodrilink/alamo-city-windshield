'use client'

import { type RefObject, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BUSINESS } from '@/lib/constants'

interface EstimateSectionProps {
  scrollRef: RefObject<HTMLDivElement | null>
}

// VIN regex: 17 chars, uppercase A-Z excluding I, O, Q + digits 0-9
// Source: NHTSA VIN specification
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/

export function EstimateSection({ scrollRef }: EstimateSectionProps) {
  const [vin, setVin] = useState('')
  const [vinError, setVinError] = useState('')
  const [showResult, setShowResult] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = vin.trim().toUpperCase()

    if (normalized.length === 0) {
      setVinError('Please enter your VIN')
      setShowResult(false)
      return
    }

    if (!VIN_REGEX.test(normalized)) {
      setVinError(
        'Please enter a valid 17-character VIN (letters A-Z excluding I, O, Q and digits 0-9)'
      )
      setShowResult(false)
      return
    }

    setVinError('')
    setShowResult(true)
  }

  return (
    <section className="snap-start snap-always h-dvh relative overflow-hidden flex items-center justify-center">
      {/* Background photo — different from hero (D-09): close-up of automobile windshield */}
      <Image
        src="https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=1920&q=80"
        alt="Close-up of automobile windshield"
        fill
        className="object-cover"
      />
      {/* Dark overlay at ~55% opacity — matches hero style */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Centered white card with fade-in + slide-up animation (D-08, D-10) */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        viewport={{ root: scrollRef, once: true, amount: 0.3 }}
        className="relative z-10 w-full max-w-md mx-auto px-4"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-display font-bold text-center">
              Get Your Free Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="vin-input"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Vehicle Identification Number
                </label>
                <input
                  id="vin-input"
                  type="text"
                  value={vin}
                  onChange={(e) => {
                    setVin(e.target.value.toUpperCase())
                    if (vinError) setVinError('')
                    if (showResult) setShowResult(false)
                  }}
                  placeholder="Enter your 17-character VIN"
                  maxLength={17}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Find your VIN on the driver-side dashboard or door jamb
                </p>
                {vinError && (
                  <p className="mt-1 text-sm text-destructive" role="alert">
                    {vinError}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Get Estimate
              </Button>
            </form>

            {/* Fake result card (D-11) — Phase 2 placeholder, wired to real API in Phase 3 */}
            {showResult && (
              <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
                <p className="font-semibold text-foreground">2024 Toyota Camry</p>
                <p className="text-muted-foreground">
                  Estimated replacement: $250 – $400
                </p>
                <p className="mt-2 text-xs text-muted-foreground italic">
                  Estimates launching soon — call {BUSINESS.phone} for an immediate
                  quote.
                </p>
                {/* Book Appointment CTA (D-12) — links to /contact in Phase 2; Phase 4 rewires to booking calendar */}
                <Link href="/contact" className="block mt-3">
                  <Button className="w-full">Book Appointment</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </section>
  )
}
