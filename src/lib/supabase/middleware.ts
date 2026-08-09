import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Env guard: if Supabase is not configured, we cannot authenticate anyone.
  //
  // This MUST fail closed for `/admin/*`. The previous version returned
  // `NextResponse.next()` unconditionally on the theory that "in production,
  // these env vars are always set on Vercel" -- but a missing or mistyped env
  // var in the Vercel dashboard is exactly the case that theory does not
  // cover, and the failure mode was a silently PUBLIC admin dashboard: no
  // error, no log, no redirect. A security gate must never treat "I could not
  // check" as "allowed".
  //
  // Public routes still pass through, so `npm run dev` without `.env.local`
  // keeps working -- that was the original convenience and it is preserved.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
    const isLoginPage = request.nextUrl.pathname === '/admin/login'

    if (isAdminRoute && !isLoginPage) {
      // Loud on the server (visible in Vercel logs), silent to the visitor --
      // the redirect is indistinguishable from a normal logged-out bounce, so
      // this never advertises a misconfiguration to an attacker.
      console.error(
        'middleware: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing — refusing to serve /admin/* unauthenticated'
      )
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: getUser() not getSession() — revalidates JWT server-side (CVE-2025-29927)
  // Do NOT replace with getSession() even if it seems simpler.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect /admin/* routes EXCEPT /admin/login (prevents infinite redirect loop)
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  if (isAdminRoute && !isLoginPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
