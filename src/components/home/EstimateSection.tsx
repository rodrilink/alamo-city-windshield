'use client'

import { type RefObject, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { Info, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EstimateResult } from '@/components/home/EstimateResult'
import { ManualEntryForm } from '@/components/home/ManualEntryForm'
import { ESTIMATE_COPY } from '@/lib/constants'
import { VIN_REGEX, type EstimateMatrix, type GlassType, type SizeBucket, type VinLookupResponse } from '@/types/vehicle'

interface EstimateSectionProps {
  scrollRef: RefObject<HTMLDivElement | null>
}

/**
 * Discriminated view state replacing the Phase 2 `showResult` boolean.
 * D-07: the VIN form is replaced by the result inside the same card, so
 * exactly one of these renders inside `<CardContent>` at a time.
 */
type EstimateViewState =
  | { kind: 'form' }
  | { kind: 'loading' }
  | {
      kind: 'result'
      headline: string
      /** True only on the D-20 manual path; see EstimateResultProps. */
      headlineFollowsSizeBucket: boolean
      estimates: EstimateMatrix
      adasApplies: boolean
      sizeBucketEditable: boolean
      basisNote?: string
    }
  | { kind: 'not-found' }
  | { kind: 'manual' }

export function EstimateSection({ scrollRef }: EstimateSectionProps) {
  const [vin, setVin] = useState('')
  const [vinError, setVinError] = useState('')
  const [view, setView] = useState<EstimateViewState>({ kind: 'form' })
  const [glassType, setGlassType] = useState<GlassType>('standard')
  const [sizeBucket, setSizeBucket] = useState<SizeBucket>('car')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = vin.trim().toUpperCase()

    if (normalized.length === 0) {
      setVinError('Please enter your VIN')
      setView({ kind: 'form' })
      return
    }

    if (!VIN_REGEX.test(normalized)) {
      setVinError(
        'Please enter a valid 17-character VIN (letters A-Z excluding I, O, Q and digits 0-9)'
      )
      setView({ kind: 'form' })
      return
    }

    setVinError('')
    // D-14: reset to Standard on every new lookup so a fresh VIN never shows
    // an inflated first price carried over from a prior selection.
    setGlassType('standard')
    setView({ kind: 'loading' })

    try {
      const response = await fetch(`/api/vin/${encodeURIComponent(normalized)}`)
      const data = (await response.json()) as VinLookupResponse

      switch (data.status) {
        case 'decoded': {
          if (data.vehicle === null || data.estimates === null || data.vehicle.sizeBucket === null) {
            setView({ kind: 'manual' })
            break
          }
          setSizeBucket(data.vehicle.sizeBucket)
          setView({
            kind: 'result',
            headline: `${data.vehicle.modelYear} ${data.vehicle.make} ${data.vehicle.model}`,
            headlineFollowsSizeBucket: false,
            estimates: data.estimates,
            adasApplies: data.adasApplies,
            sizeBucketEditable: false,
          })
          break
        }
        case 'needs-vehicle-type': {
          // D-19: NHTSA decoded the VIN but BodyClass didn't map to a known
          // bucket. Default to Car and show a live selector rather than
          // silently guessing.
          if (data.vehicle === null || data.estimates === null) {
            setView({ kind: 'manual' })
            break
          }
          setSizeBucket('car')
          setView({
            kind: 'result',
            // D-19: the make/model IS known — the selector only corrects the
            // price, so the identity string must NOT follow it.
            headline: `${data.vehicle.modelYear} ${data.vehicle.make} ${data.vehicle.model}`,
            headlineFollowsSizeBucket: false,
            estimates: data.estimates,
            adasApplies: data.adasApplies,
            sizeBucketEditable: true,
          })
          break
        }
        case 'not-found':
        case 'invalid':
          // D-18: NHTSA answered (or the server rejected the format), so a
          // typo is the likely cause. This is deliberately NOT the manual
          // form — jumping there would hide a fixable mistake.
          setView({ kind: 'not-found' })
          break
        case 'unreachable':
          // D-17: NHTSA timed out or errored. Show the manual entry
          // fallback rather than an error state (ROADMAP success criterion 4).
          setView({ kind: 'manual' })
          break
      }
    } catch {
      // A failure to reach our own endpoint is indistinguishable to the user
      // from NHTSA being unreachable — D-17 says the answer is the fallback
      // form, not an error screen.
      setView({ kind: 'manual' })
    }
  }

  function handleReset() {
    setView({ kind: 'form' })
    setVin('')
    setVinError('')
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

      {/* Inner scroll wrapper (UAT gap 2 / test 14 fix): conditional scroller so the
          card stays fully reachable on short viewports without the section itself
          scrolling. `max-h-dvh` (not `h-full`) means this only engages once the card's
          natural height exceeds the viewport — desktop and >=~824px-tall viewports are
          pixel-identical to before, since the wrapper never reaches its cap there.
          Kept OUTSIDE the motion.div so the scrollRef IntersectionObserver root's
          geometry relative to the observed element is unchanged. */}
      <div className="relative z-10 w-full max-h-dvh overflow-y-auto overscroll-contain">
        {/* Centered white card with fade-in + slide-up animation (D-08, D-10) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          viewport={{ root: scrollRef, once: true, amount: 0.3 }}
          className="w-full max-w-md mx-auto px-4 py-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-display font-bold text-center">
                Get Your Free Estimate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {(view.kind === 'form' || view.kind === 'loading' || view.kind === 'not-found') && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
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
                            if (view.kind !== 'form') setView({ kind: 'form' })
                          }}
                          placeholder="Enter your 17-character VIN"
                          maxLength={17}
                          disabled={view.kind === 'loading'}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
                      <Button type="submit" className="w-full" disabled={view.kind === 'loading'}>
                        {view.kind === 'loading' ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            Decoding VIN…
                          </>
                        ) : (
                          'Get Estimate'
                        )}
                      </Button>
                    </form>

                    {/* D-18: NHTSA answered but rejected the VIN — likely a typo.
                        The form stays visible/editable so the user can correct
                        it; a secondary link offers manual entry rather than
                        jumping straight to the fallback form. */}
                    {view.kind === 'not-found' && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-start gap-1.5" role="alert">
                          <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <p className="text-sm text-muted-foreground">{ESTIMATE_COPY.notFoundMessage}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setView({ kind: 'manual' })}
                        >
                          {ESTIMATE_COPY.manualEntryLinkLabel}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* D-17: NHTSA unreachable — manual entry fallback, not an error state. */}
                {view.kind === 'manual' && (
                  <motion.div
                    key="manual"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ManualEntryForm
                      leadIn={ESTIMATE_COPY.unreachableMessage}
                      onCancel={() => setView({ kind: 'form' })}
                      onEstimate={({ modelYear, sizeBucket: chosenBucket, estimates, adasApplies }) => {
                        setSizeBucket(chosenBucket)
                        setView({
                          kind: 'result',
                          // Year only — EstimateResult appends the bucket label
                          // from live state so it tracks the selector (D-20).
                          headline: String(modelYear),
                          headlineFollowsSizeBucket: true,
                          estimates,
                          adasApplies,
                          sizeBucketEditable: true,
                          basisNote: ESTIMATE_COPY.manualBasisNote,
                        })
                      }}
                    />
                  </motion.div>
                )}

                {view.kind === 'result' && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EstimateResult
                      headline={view.headline}
                      headlineFollowsSizeBucket={view.headlineFollowsSizeBucket}
                      estimates={view.estimates}
                      adasApplies={view.adasApplies}
                      glassType={glassType}
                      onGlassTypeChange={setGlassType}
                      sizeBucket={sizeBucket}
                      onSizeBucketChange={setSizeBucket}
                      sizeBucketEditable={view.sizeBucketEditable}
                      basisNote={view.basisNote}
                      onReset={handleReset}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
