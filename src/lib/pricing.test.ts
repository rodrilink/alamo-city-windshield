import { describe, expect, it } from 'vitest'

import { PRICING, adasApplies, computeEstimateMatrix, computeVariant } from '@/lib/pricing'
import { GLASS_TYPES, SIZE_BUCKETS } from '@/types/vehicle'
import type { GlassType, SizeBucket } from '@/types/vehicle'

// The six locked D-06 fixtures, verified during planning to reconcile exactly
// with the formula in src/lib/pricing.ts. Row 5 (2023 Honda Odyssey, heated)
// is $585-$965 -- NOT $585-$995. The $995 figure in earlier drafts was a
// 6<->9 transposition typo; the user confirmed $965 is authoritative.
const D06_FIXTURES: ReadonlyArray<readonly [string, number, SizeBucket, GlassType, number, number]> = [
    ['2015 Honda Civic (sedan) / standard → $270-$330', 2015, 'car', 'standard', 270, 330],
    ['2020 Toyota Camry (sedan) / standard → $270-$580', 2020, 'car', 'standard', 270, 580],
    ['2020 Toyota Camry (sedan) / acoustic → $360-$690', 2020, 'car', 'acoustic', 360, 690],
    ['2022 Ford F-150 (pickup) / standard → $338-$663', 2022, 'suv-truck', 'standard', 338, 663],
    ['2023 Honda Odyssey van / heated → $585-$965', 2023, 'van-oversized', 'heated', 585, 965],
    ['2016 Chevy Silverado (pickup) / standard → $338-$413', 2016, 'suv-truck', 'standard', 338, 413],
]

describe('D-06 locked fixtures', () => {
    it.each(D06_FIXTURES)('%s', (_name, modelYear, sizeBucket, glassType, expectedLow, expectedHigh) => {
        // Arrange
        // (fixture values provided by the parameterized case)

        // Act
        const variant = computeVariant(modelYear, sizeBucket, glassType)

        // Assert
        expect(variant.low).toBe(expectedLow)
        expect(variant.high).toBe(expectedHigh)
    })
})

describe('rounding contract', () => {
    it('rounds 337.5 and 412.5 half-up, not down, up, or to the nearest $5', () => {
        // Arrange
        // subtotal = 300 + 75 (suv-truck) + 0 (standard) = 375
        // low  = Math.round(375 * 0.90) = Math.round(337.5) = 338
        // high = Math.round(375 * 1.10) = Math.round(412.5) = 413 (pre-2018, no ADAS add)
        // A switch to Math.floor, Math.ceil, toFixed, or nearest-$5 rounding
        // would fail this test.

        // Act
        const variant = computeVariant(2016, 'suv-truck', 'standard')

        // Assert
        expect(variant.low).toBe(338)
        expect(variant.high).toBe(413)
    })
})

describe('VIN-07 ADAS boundary', () => {
    it('does not apply ADAS calibration for a 2017 model year', () => {
        // Arrange
        // (2017 is the last pre-ADAS-boundary model year)

        // Act
        const result = adasApplies(2017)

        // Assert
        expect(result).toBe(false)
    })

    it('applies ADAS calibration for a 2018 model year', () => {
        // Arrange
        // (2018 is the first ADAS-boundary model year)

        // Act
        const result = adasApplies(2018)

        // Assert
        expect(result).toBe(true)
    })

    it('adds nothing to the high end for a 2017 model year', () => {
        // Arrange
        // (2017 is pre-ADAS-boundary)

        // Act
        const variant = computeVariant(2017, 'car', 'standard')

        // Assert
        expect(variant.breakdown.adasHigh).toBe(0)
    })

    it('adds PRICING.adasHighAdd to the high end for a 2018 model year', () => {
        // Arrange
        // (2018 is the first ADAS-boundary model year)

        // Act
        const variant = computeVariant(2018, 'car', 'standard')

        // Assert
        expect(variant.breakdown.adasHigh).toBe(PRICING.adasHighAdd)
    })

    it('leaves the low end identical between 2017 and 2018 -- ADAS touches only the high end', () => {
        // Arrange
        // (D-04: ADAS is a range contribution, not a flat add across both ends)

        // Act
        const preAdas = computeVariant(2017, 'car', 'standard')
        const postAdas = computeVariant(2018, 'car', 'standard')

        // Assert
        expect(preAdas.low).toBe(postAdas.low)
    })
})

describe('estimate matrix shape', () => {
    it('produces exactly three size-bucket keys', () => {
        // Arrange
        // (any model year exercises the same matrix shape)

        // Act
        const matrix = computeEstimateMatrix(2020)

        // Assert
        expect(Object.keys(matrix)).toHaveLength(3)
    })

    it('produces exactly three glass-type keys under each size bucket', () => {
        // Arrange
        // (any model year exercises the same matrix shape)

        // Act
        const matrix = computeEstimateMatrix(2020)

        // Assert
        for (const sizeBucket of SIZE_BUCKETS) {
            expect(Object.keys(matrix[sizeBucket])).toHaveLength(3)
        }
    })

    it('never collapses a range to a single number, for all nine pre-2018 variants', () => {
        // Arrange
        // (pre-2018 isolates the ±10% spread as the only source of separation)
        const matrix = computeEstimateMatrix(2016)

        // Act & Assert
        for (const sizeBucket of SIZE_BUCKETS) {
            for (const glassType of GLASS_TYPES) {
                const variant = matrix[sizeBucket][glassType]
                expect(variant.low).toBeLessThan(variant.high)
            }
        }
    })
})

describe('breakdown internal consistency', () => {
    it('reports a low end that matches Math.round of the summed breakdown times spreadLow', () => {
        // Arrange
        const variant = computeVariant(2022, 'suv-truck', 'standard')
        const { basePrice, sizeModifier, glassModifier } = variant.breakdown

        // Act
        const recomputedLow = Math.round((basePrice + sizeModifier + glassModifier) * PRICING.spreadLow)

        // Assert
        expect(recomputedLow).toBe(variant.low)
    })
})
