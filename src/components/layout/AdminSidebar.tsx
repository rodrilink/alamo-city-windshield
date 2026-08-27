import Link from 'next/link'

import { ADMIN_COPY } from '@/lib/constants'
import { Separator } from '@/components/ui/separator'
import { LogoutButton } from '@/components/auth/LogoutButton'

interface AdminSidebarNavProps {
  adminEmail: string | null
  // Supplied only by the mobile drawer, which must dismiss itself when a link
  // is tapped -- Next.js client-side navigation does not unmount the Sheet, so
  // without this the drawer would stay open over the newly routed page. The
  // desktop rail omits it: there is nothing to close.
  onNavigate?: () => void
}

// D-14: the authenticated admin shell's navigation -- Dashboard and Users
// links, the signed-in admin's email, and the logout control. Deliberately
// not the public nav/site-footer components: those carry marketing chrome
// (customer phone CTA, San Antonio service-area footer) that has no place
// on an internal tool and no natural home for a Users link or logout.
//
// Extracted from `AdminSidebar` so the desktop rail and the mobile drawer
// (`AdminMobileNav`) render the SAME markup rather than two copies that drift.
// Only one of the two is mounted at any viewport (the rail is `hidden md:flex`,
// the drawer trigger is `md:hidden`), so the `data-testid` values below still
// resolve to exactly one element per page.
export function AdminSidebarNav({ adminEmail, onNavigate }: AdminSidebarNavProps) {
  return (
    <>
      <nav className="flex flex-col gap-1">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
          data-testid="link-admin-dashboard"
        >
          {ADMIN_COPY.navDashboardLabel}
        </Link>
        <Link
          href="/admin/users"
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
          data-testid="link-admin-users"
        >
          {ADMIN_COPY.navUsersLabel}
        </Link>
        {/* Last in the group: leaving the admin tool is secondary to the
            admin destinations above. Targets `/` -- the public home page --
            since this app has no `/home` route. */}
        <Link
          href="/"
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
          data-testid="link-admin-home"
        >
          {ADMIN_COPY.navHomeLabel}
        </Link>
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <Separator />
        {adminEmail ? (
          <p className="truncate px-3 text-xs text-muted-foreground" data-testid="text-admin-email">
            {adminEmail}
          </p>
        ) : null}
        <LogoutButton />
      </div>
    </>
  )
}

interface AdminSidebarProps {
  adminEmail: string | null
}

// The persistent desktop rail. `hidden md:flex` -- below `md` the 256px rail
// would consume most of a phone viewport and squeeze the dashboard charts and
// users table into an unusable column, so the mobile viewport gets
// `AdminMobileNav`'s drawer instead.
export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-background p-4 md:flex">
      <AdminSidebarNav adminEmail={adminEmail} />
    </aside>
  )
}
