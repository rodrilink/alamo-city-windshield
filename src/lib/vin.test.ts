// This suite unit-tests only the two pure functions exported by
// `src/lib/vin.ts` — `classifyNhtsaResult` and `mapBodyClassToSizeBucket`.
// `decodeVin` performs real network I/O against NHTSA and is deliberately
// NOT unit-tested here; its network paths are exercised by the curl checks
// in plan 03-06 and the browser checks in plan 03-08. Do not add a
// live-network test to this file.
import { describe, it, expect } from 'vitest'
import { classifyNhtsaResult, mapBodyClassToSizeBucket, NHTSA_TIMEOUT_MS } from '@/lib/vin'

// From VIN 1FTFW1E85NFA12345 — a real Ford F-150 VIN with a deliberately
// wrong check digit. ErrorCode is non-zero but the payload is fully usable.
const BAD_CHECK_DIGIT_RESULT: Record<string, unknown> = {
    ErrorCode: '1',
    ModelYear: '2022',
    Make: 'FORD',
    Model: 'F-150',
    BodyClass: 'Pickup',
}

// From VIN ZZZZZZZZZZZZZZZZZ — all-garbage VIN, NHTSA answers with nothing usable.
const NO_DATA_RESULT: Record<string, unknown> = {
    ErrorCode: '1,7,11,400',
    ModelYear: '',
    Make: '',
    Model: '',
    BodyClass: '',
}

const UNMAPPABLE_BODY_CLASS_RESULT: Record<string, unknown> = {
    ErrorCode: '0',
    ModelYear: '2019',
    Make: 'FREIGHTLINER',
    Model: 'CASCADIA',
    BodyClass: 'Truck-Tractor',
}

const EMPTY_BODY_CLASS_RESULT: Record<string, unknown> = {
    ErrorCode: '0',
    ModelYear: '2019',
    Make: 'HONDA',
    Model: 'CIVIC',
    BodyClass: '',
}

const NON_NUMERIC_YEAR_RESULT: Record<string, unknown> = {
    ErrorCode: '0',
    ModelYear: 'Not Applicable',
    Make: 'HONDA',
    Model: 'CIVIC',
    BodyClass: 'Sedan/Saloon',
}

describe('classifyNhtsaResult', () => {
    it('classifies a bad-check-digit payload as decoded with a suv-truck bucket', () => {
        // Arrange
        const result = BAD_CHECK_DIGIT_RESULT

        // Act
        const outcome = classifyNhtsaResult(result)

        // Assert
        // This single assertion is what prevents the D-18 regression: if the
        // implementation ever branches on ErrorCode, this test fails.
        expect(outcome).toMatchObject({
            outcome: 'decoded',
            modelYear: 2022,
            make: 'FORD',
            model: 'F-150',
            sizeBucket: 'suv-truck',
        })
    })

    it('classifies an all-empty payload as no-data', () => {
        // Arrange
        const result = NO_DATA_RESULT

        // Act
        const outcome = classifyNhtsaResult(result)

        // Assert
        expect(outcome).toEqual({ outcome: 'no-data' })
    })

    it('classifies full year/make/model with an unmappable BodyClass as decoded with a null sizeBucket', () => {
        // Arrange
        const result = UNMAPPABLE_BODY_CLASS_RESULT

        // Act
        const outcome = classifyNhtsaResult(result)

        // Assert
        expect(outcome).toMatchObject({ outcome: 'decoded', sizeBucket: null })
    })

    it('classifies full year/make/model with an empty BodyClass as decoded with a null sizeBucket', () => {
        // Arrange
        const result = EMPTY_BODY_CLASS_RESULT

        // Act
        const outcome = classifyNhtsaResult(result)

        // Assert
        expect(outcome).toMatchObject({ outcome: 'decoded', sizeBucket: null })
    })

    it('classifies a non-numeric ModelYear as no-data', () => {
        // Arrange
        const result = NON_NUMERIC_YEAR_RESULT

        // Act
        const outcome = classifyNhtsaResult(result)

        // Assert
        expect(outcome).toEqual({ outcome: 'no-data' })
    })
})

describe('three failure modes are distinct', () => {
    it('does not collapse the no-data outcome and the unmappable-BodyClass outcome', () => {
        // Arrange
        const noDataOutcome = classifyNhtsaResult(NO_DATA_RESULT)
        const unmappableOutcome = classifyNhtsaResult(UNMAPPABLE_BODY_CLASS_RESULT)

        // Act
        const outcomesMatch = noDataOutcome.outcome === unmappableOutcome.outcome

        // Assert
        // D-17, D-18, and D-19 are three different UI outcomes. Collapsing
        // any two of them is a regression per CONTEXT.md.
        expect(outcomesMatch).toBe(false)
    })
})

describe('mapBodyClassToSizeBucket', () => {
    it('maps Sedan/Saloon to car', () => {
        // Arrange
        const bodyClass = 'Sedan/Saloon'

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBe('car')
    })

    it('maps Pickup to suv-truck', () => {
        // Arrange
        const bodyClass = 'Pickup'

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBe('suv-truck')
    })

    it('maps Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV] to suv-truck', () => {
        // Arrange
        const bodyClass = 'Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]'

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBe('suv-truck')
    })

    it('maps Minivan to van-oversized', () => {
        // Arrange
        const bodyClass = 'Minivan'

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBe('van-oversized')
    })

    it('returns null for an empty string', () => {
        // Arrange
        const bodyClass = ''

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBeNull()
    })

    it('returns null for Truck-Tractor', () => {
        // Arrange
        const bodyClass = 'Truck-Tractor'

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBeNull()
    })

    it('returns null for Incomplete - Cutaway', () => {
        // Arrange
        const bodyClass = 'Incomplete - Cutaway'

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBeNull()
    })

    it('returns null for Low Speed Vehicle [LSV]/Neighborhood Electric Vehicle [NEV]', () => {
        // Arrange
        const bodyClass = 'Low Speed Vehicle [LSV]/Neighborhood Electric Vehicle [NEV]'

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBeNull()
    })

    it('returns null for Motorcycle - Standard', () => {
        // Arrange
        const bodyClass = 'Motorcycle - Standard'

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBeNull()
    })

    it('tolerates surrounding whitespace', () => {
        // Arrange
        const bodyClass = '  Sedan/Saloon  '

        // Act
        const bucket = mapBodyClassToSizeBucket(bodyClass)

        // Assert
        expect(bucket).toBe('car')
    })
})

describe('NHTSA_TIMEOUT_MS', () => {
    it('equals 6000', () => {
        // Arrange
        const expectedTimeoutMs = 6000

        // Act
        const actualTimeoutMs = NHTSA_TIMEOUT_MS

        // Assert
        expect(actualTimeoutMs).toBe(expectedTimeoutMs)
    })
})
