'use client'

// Purely presentational VIN estimate result. Every number rendered here
// arrives precomputed in the `estimates` prop (D-15) — this component must
// never import `@/lib/pricing`, which is `server-only` and would fail the
// build if reached from a Client Component (T-03-03).
//
// Deliberately reusable: Phase 4 renders this same result from the contact
// page's VIN search, so it stays free of any home-page-specific or
// snap-scroll-specific assumption.

import Link from 'next/link'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { BUSINESS, ESTIMATE_COPY } from '@/lib/constants'
import { GLASS_TYPES, SIZE_BUCKETS, type EstimateMatrix, type GlassType, type SizeBucket } from '@/types/vehicle'

interface EstimateResultProps {
  headline: string
  estimates: EstimateMatrix
  adasApplies: boolean
  glassType: GlassType
  onGlassTypeChange: (value: GlassType) => void
  sizeBucket: SizeBucket
  onSizeBucketChange: (value: SizeBucket) => void
  sizeBucketEditable: boolean
  basisNote?: string
  onReset: () => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function EstimateResult({
  headline,
  estimates,
  adasApplies,
  glassType,
  onGlassTypeChange,
  sizeBucket,
  onSizeBucketChange,
  sizeBucketEditable,
  basisNote,
  onReset,
}: EstimateResultProps) {
  const activeVariant = estimates[sizeBucket][glassType]

  return (
    <div className="space-y-3">
      {/* 1. Headline */}
      <p className="font-semibold text-foreground">{headline}</p>

      {/* 2. Price range */}
      <p aria-live="polite" className="text-2xl font-bold text-foreground">
        {currencyFormatter.format(activeVariant.low)} – {currencyFormatter.format(activeVariant.high)}
      </p>

      <Separator />

      {/* 3. Four-row breakdown (D-09) — always renders all four rows */}
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{ESTIMATE_COPY.breakdownLabels.basePrice}</span>
          <span className="text-foreground">{currencyFormatter.format(activeVariant.breakdown.basePrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{ESTIMATE_COPY.breakdownLabels.sizeModifier}</span>
          <span className="text-foreground">{currencyFormatter.format(activeVariant.breakdown.sizeModifier)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{ESTIMATE_COPY.breakdownLabels.glassModifier}</span>
          <span className="text-foreground">{currencyFormatter.format(activeVariant.breakdown.glassModifier)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{ESTIMATE_COPY.breakdownLabels.adas}</span>
          <span className="text-foreground">
            {adasApplies ? `up to ${currencyFormatter.format(activeVariant.breakdown.adasHigh)}` : ESTIMATE_COPY.adasNotRequired}
          </span>
        </div>
      </div>

      {/* 4. Glass type selector (D-13, D-14, VIN-06) */}
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">{ESTIMATE_COPY.breakdownLabels.glassModifier}</p>
        <SegmentedControl<GlassType>
          value={glassType}
          onValueChange={onGlassTypeChange}
          aria-label="Glass type"
        >
          {GLASS_TYPES.map((type) => (
            <SegmentedControlItem key={type} value={type}>
              {ESTIMATE_COPY.glassLabels[type]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <p className="mt-1 text-xs text-muted-foreground">{ESTIMATE_COPY.glassHints[glassType]}</p>
      </div>

      {/* 5. Vehicle type selector — only when unmappable (D-19, D-17) */}
      {sizeBucketEditable && (
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">{ESTIMATE_COPY.unknownVehicleTypePrompt}</p>
          <SegmentedControl<SizeBucket>
            value={sizeBucket}
            onValueChange={onSizeBucketChange}
            aria-label="Vehicle type"
          >
            {SIZE_BUCKETS.map((bucket) => (
              <SegmentedControlItem key={bucket} value={bucket}>
                {ESTIMATE_COPY.sizeLabels[bucket]}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      )}

      {/* 6. ADAS info note — only for 2018+ vehicles (D-10, VIN-07) */}
      {adasApplies && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{ESTIMATE_COPY.adasNote}</span>
        </div>
      )}

      {/* 7. Manual-entry basis note (D-20) */}
      {basisNote && <p className="text-xs text-muted-foreground">{basisNote}</p>}

      {/* 8. Book Appointment CTA — links to /contact in Phase 3; Phase 4 rewires to booking calendar */}
      <Link href="/contact" className="block">
        <Button className="w-full">Book Appointment</Button>
      </Link>

      {/* 9. Disclaimer (D-11) — phone number always pulled from BUSINESS.phone */}
      <p className="text-xs text-muted-foreground">
        {ESTIMATE_COPY.disclaimer} <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.
      </p>

      {/* 10. Reset affordance (D-07) */}
      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onReset}>
        {ESTIMATE_COPY.resetLabel}
      </Button>
    </div>
  )
}
