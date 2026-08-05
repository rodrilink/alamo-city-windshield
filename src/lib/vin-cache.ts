import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { VinCacheRow } from '@/types/vehicle'

/**
 * Reads a cached VIN decode result.
 *
 * Uses `maybeSingle`, not `single`, because a cache miss is the normal case
 * and `single` treats zero matching rows as an error. Any thrown error or
 * any Supabase-reported error is swallowed and reported as a miss — a cache
 * failure must degrade gracefully and never surface to the caller. The
 * request can always fall through to a live NHTSA lookup.
 */
export async function readVinCache(vin: string): Promise<VinCacheRow | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('vin_cache').select('*').eq('vin', vin).maybeSingle()

    if (error) {
      return null
    }

    return data as VinCacheRow | null
  } catch {
    return null
  }
}

/**
 * Writes a decoded VIN result to the cache.
 *
 * Maps the camelCase argument onto the snake_case `vin_cache` columns,
 * converting `modelYear` to a string because the column is `TEXT`.
 *
 * `ignoreDuplicates` plus the surrounding try/catch handles the benign race
 * in which two concurrent first-time lookups of the same VIN both miss the
 * cache and both attempt to insert, colliding on the `UNIQUE (vin)`
 * constraint. The second request already has its freshly-computed answer in
 * hand and does not need the write to have succeeded, so any error here is
 * swallowed rather than propagated.
 */
export async function writeVinCache(entry: {
  vin: string
  modelYear: number
  make: string
  model: string
  bodyClass: string
  rawResponse: unknown
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    const row = {
      vin: entry.vin,
      model_year: String(entry.modelYear),
      make: entry.make,
      model: entry.model,
      body_class: entry.bodyClass,
      raw_response: entry.rawResponse,
    }

    await supabase.from('vin_cache').upsert(row, { onConflict: 'vin', ignoreDuplicates: true })
  } catch {
    // Swallowed — a cache write failure must never fail the caller's request.
  }
}
