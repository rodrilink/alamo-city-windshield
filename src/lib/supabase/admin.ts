import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client factory.
 *
 * `vin_cache` has row-level security enabled with zero policies (see
 * `supabase/migrations/20260412000000_initial_schema.sql`), so the anon
 * client (`src/lib/supabase/client.ts`) and the cookie-based server client
 * (`src/lib/supabase/server.ts`) both get zero access to it by design. Only
 * this service-role client can read or write that table.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` bypasses ALL row-level security. It must never
 * carry the `NEXT_PUBLIC_` prefix — doing so would inline it into the browser
 * bundle and expose full, unrestricted database access to every visitor
 * (Phase 1 D-21).
 *
 * `import 'server-only'` above turns an accidental import of this module from
 * a Client Component into a build error, rather than a silent key leak at
 * runtime.
 *
 * Unlike `src/lib/supabase/middleware.ts`, which silently continues when
 * Supabase env vars are absent, a missing service-role key here is a hard
 * failure — silently proceeding would produce a confusing empty-result path
 * that looks identical to a cache miss.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!serviceRoleKey) {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }

  // No cookies, no `next/headers` — this client authenticates as the
  // service role, not as the visiting user, so there is no session to
  // persist or refresh.
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
