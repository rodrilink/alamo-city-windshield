'use client'

// CONT-02: reuses the SAME decoder as the home page -- fetches the existing
// `/api/vin/[vin]` Route Handler and consumes the existing `VinLookupResponse`
// discriminated union. Deliberately imports neither the server-only decode
// module nor the server-only pricing module (both would fail the build if
// reached from this Client Component, per T-04-07-03). Mirrors
// `EstimateSection.tsx`'s view-state + fetch/switch idiom verbatim so the two
// pages can never disagree on how a given VIN-lookup outcome is handled.
//
// This is a section on a normal-flow page (D-20) -- no snap-scroll, no fixed
// viewport height assumption.

import { useState } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EstimateResult } from '@/components/home/EstimateResult'
import { ManualEntryForm } from '@/components/home/ManualEntryForm'
import { ESTIMATE_COPY } from '@/lib/constants'
import { VIN_REGEX, type EstimateMatrix, type GlassType, type SizeBucket, type VinLookupResponse } from '@/types/vehicle'

/**
 * Discriminated view state, same shape as `EstimateSection.tsx`'s
 * `EstimateViewState` -- one of these renders at a time.
 */
type ContactVinViewState =
  | { kind: 'form' }
  | { kind: 'loading' }
  | {
      kind: 'result'
      headline: string
      headlineFollowsSizeBucket: boolean
      estimates: EstimateMatrix
      adasApplies: boolean
      sizeBucketEditable: boolean
      basisNote?: string
      /** D-18: the normalized VIN that produced this result, carried to the CTA's `/book?vin=` link. Absent on the manual-entry path. */
      vin?: string
    }
  | { kind: 'not-found' }
  | { kind: 'manual' }

export function ContactVinSearch() {
  const [vin, setVin] = useState('')
  const [vinError, setVinError] = useState('')
  const [view, setView] = useState<ContactVinViewState>({ kind: 'form' })
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
      setVinError('Please enter a valid 17-character VIN (letters A-Z excluding I, O, Q and digits 0-9)')
      setView({ kind: 'form' })
      return
    }

    setVinError('')
    // Reset to Standard on every new lookup, matching EstimateSection's D-14 behavior.
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
            vin: normalized,
          })
          break
        }
        case 'needs-vehicle-type': {
          if (data.vehicle === null || data.estimates === null) {
            setView({ kind: 'manual' })
            break
          }
          setSizeBucket('car')
          setView({
            kind: 'result',
            headline: `${data.vehicle.modelYear} ${data.vehicle.make} ${data.vehicle.model}`,
            headlineFollowsSizeBucket: false,
            estimates: data.estimates,
            adasApplies: data.adasApplies,
            sizeBucketEditable: true,
            vin: normalized,
          })
          break
        }
        case 'not-found':
        case 'invalid':
          // Same reasoning as EstimateSection: a typo is the likely cause,
          // so offer a retry prompt rather than jumping to the manual form.
          setView({ kind: 'not-found' })
          break
        case 'unreachable':
          setView({ kind: 'manual' })
          break
      }
    } catch {
      setView({ kind: 'manual' })
    }
  }

  function handleReset() {
    setView({ kind: 'form' })
    setVin('')
    setVinError('')
  }

  return (
    <div className="space-y-4">
      {(view.kind === 'form' || view.kind === 'loading' || view.kind === 'not-found') && (
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="contact-vin-input" className="block text-sm font-medium text-foreground mb-1">
                Vehicle Identification Number
              </label>
              <input
                id="contact-vin-input"
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
                data-testid="input-contact-vin"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="mt-1 text-xs text-muted-foreground">Find your VIN on the driver-side dashboard or door jamb</p>
              {vinError && (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {vinError}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={view.kind === 'loading'} data-testid="btn-contact-vin-submit">
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

          {view.kind === 'not-found' && (
            <div className="mt-4 space-y-2">
              <div className="flex items-start gap-1.5" role="alert">
                <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{ESTIMATE_COPY.notFoundMessage}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setView({ kind: 'manual' })}>
                {ESTIMATE_COPY.manualEntryLinkLabel}
              </Button>
            </div>
          )}
        </div>
      )}

      {view.kind === 'manual' && (
        <ManualEntryForm
          leadIn={ESTIMATE_COPY.unreachableMessage}
          onCancel={() => setView({ kind: 'form' })}
          onEstimate={({ modelYear, sizeBucket: chosenBucket, estimates, adasApplies }) => {
            setSizeBucket(chosenBucket)
            setView({
              kind: 'result',
              headline: String(modelYear),
              headlineFollowsSizeBucket: true,
              estimates,
              adasApplies,
              sizeBucketEditable: true,
              basisNote: ESTIMATE_COPY.manualBasisNote,
              // No VIN on the manual path -- EstimateResult's CTA links to
              // plain /book with no query parameter (D-16/D-18).
            })
          }}
        />
      )}

      {view.kind === 'result' && (
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
          vin={view.vin}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
