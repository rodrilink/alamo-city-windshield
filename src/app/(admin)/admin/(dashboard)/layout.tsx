import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav'

// D-14: this is the FIRST real (non-passthrough) layout in this repo --
// `(public)/layout.tsx` is a documented bare passthrough with no chrome of
// its own. This file wraps `/admin` and `/admin/users` ONLY.
//
// This lives at `(admin)/admin/(dashboard)/layout.tsx`, a SECOND nested route
// group inside `(admin)/admin/`. `src/app/(admin)/admin/login/page.tsx`
// remains a sibling of this `(dashboard)` folder, so it inherits only the
// root `src/app/layout.tsx` and never this sidebar shell. Do NOT create
// `src/app/(admin)/admin/layout.tsx` -- that path would wrap every route
// under `admin/`, including `admin/login/`, putting a logout button and a
// signed-in admin's email on the login screen where no session exists
// (RESEARCH.md Pitfall 1).
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // CRITICAL: getUser() revalidates the JWT server-side against the auth
  // server rather than decoding an unverified cookie claim (CVE-2025-29927).
  // See `src/lib/supabase/middleware.ts` lines 41-45 for the same
  // load-bearing reasoning. Do NOT replace this with the session-cookie-only
  // read that call has a comment warning against.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Deliberately no navigation-away call here when user is null. The
  // middleware (AUTH-03) already owns that enforcement; duplicating it in
  // this layout would create two enforcement points that can drift out of
  // sync (T-05-05-05). Render the email as absent instead.
  //
  // Only user.email is passed down -- never the whole user object, never
  // user.id, never a token -- so no identifier beyond the display email is
  // serialized into the Client Component's props (T-05-05-02).
  //
  // Responsive shell: at `md`+ the persistent 256px rail sits beside the
  // content. Below `md` that rail is hidden (`AdminSidebar` is `hidden md:flex`)
  // because it would consume most of a phone viewport, and the same navigation
  // is reached through `AdminMobileNav`'s hamburger-triggered drawer in the
  // top bar instead. `AdminMobileNav` is the only Client Component here -- this
  // layout stays a Server Component so the `getUser()` revalidation above is
  // unaffected.
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar adminEmail={user?.email ?? null} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-background px-4 py-2 md:hidden">
          <AdminMobileNav adminEmail={user?.email ?? null} />
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
