'use client'

// D-17 fallback form: exactly two fields (model year, vehicle type). Rejected
// by CONTEXT.md's <deferred> section: make/model fields. This component must
// never import `@/lib/pricing` — it collects two values and asks the server
// for the numbers via `/api/estimate` (T-03-03).

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { ESTIMATE_COPY } from '@/lib/constants'
import { MIN_MODEL_YEAR, SIZE_BUCKETS, type EstimateMatrix, type ManualEstimateResponse, type SizeBucket } from '@/types/vehicle'

interface ManualEntryFormProps {
  onEstimate: (result: { modelYear: number; sizeBucket: SizeBucket; estimates: EstimateMatrix; adasApplies: boolean }) => void
  onCancel: () => void
  leadIn?: string
}

const MAX_MODEL_YEAR_OFFSET = 1

export function ManualEntryForm({ onEstimate, onCancel, leadIn }: ManualEntryFormProps) {
  const [modelYear, setModelYear] = useState('')
  const [sizeBucket, setSizeBucket] = useState<SizeBucket>('car')
  const [yearError, setYearError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedYear = Number.parseInt(modelYear, 10)
    const maxYear = new Date().getFullYear() + MAX_MODEL_YEAR_OFFSET

    if (modelYear.trim().length === 0 || Number.isNaN(parsedYear) || parsedYear < MIN_MODEL_YEAR || parsedYear > maxYear) {
      setYearError(`Please enter a model year between ${MIN_MODEL_YEAR} and ${maxYear}`)
      return
    }

    setYearError('')
    setIsLoading(true)

    try {
      const response = await fetch(`/api/estimate?year=${parsedYear}`)
      const data = (await response.json()) as ManualEstimateResponse

      if (!response.ok || data.status !== 'manual' || data.estimates === null) {
        setYearError('We could not calculate an estimate for that year. Please check it and try again.')
        return
      }

      onEstimate({
        modelYear: parsedYear,
        sizeBucket,
        estimates: data.estimates,
        adasApplies: data.adasApplies,
      })
    } catch {
      // A failed fetch or unparseable body here means our own endpoint could
      // not be reached — show the same generic retry message rather than any
      // diagnostic detail (T-03-08).
      setYearError('We could not calculate an estimate for that year. Please check it and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {leadIn && <p className="text-sm text-muted-foreground">{leadIn}</p>}

      <div>
        <label htmlFor="manual-year-input" className="block text-sm font-medium text-foreground mb-1">
          Model Year
        </label>
        <input
          id="manual-year-input"
          type="text"
          inputMode="numeric"
          value={modelYear}
          onChange={(e) => {
            setModelYear(e.target.value)
            if (yearError) setYearError('')
          }}
          placeholder="e.g. 2020"
          maxLength={4}
          disabled={isLoading}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          autoComplete="off"
        />
        {yearError && (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {yearError}
          </p>
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-foreground">Vehicle Type</p>
        <SegmentedControl<SizeBucket>
          value={sizeBucket}
          onValueChange={setSizeBucket}
          aria-label="Vehicle type"
        >
          {SIZE_BUCKETS.map((bucket) => (
            <SegmentedControlItem key={bucket} value={bucket} disabled={isLoading}>
              {ESTIMATE_COPY.sizeLabels[bucket]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Calculating estimate…
          </>
        ) : (
          'Get Estimate'
        )}
      </Button>

      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onCancel} disabled={isLoading}>
        Back to VIN lookup
      </Button>
    </form>
  )
}
