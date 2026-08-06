import Link from 'next/link'

import { ADMIN_COPY } from '@/lib/constants'
import { Separator } from '@/components/ui/separator'
import { LogoutButton } from '@/components/auth/LogoutButton'

interface AdminSidebarProps {
  adminEmail: string | null
}

// D-14: the authenticated admin shell's navigation -- Dashboard and Users
// links, the signed-in admin's email, and the logout control. Deliberately
// not the public nav/site-footer components: those carry marketing chrome
// (customer phone CTA, San Antonio service-area footer) that has no place
// on an internal tool and no natural home for a Users link or logout.
export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-background p-4">
      <nav className="flex flex-col gap-1">
        <Link
          href="/admin"
          className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
          data-testid="link-admin-dashboard"
        >
          {ADMIN_COPY.navDashboardLabel}
        </Link>
        <Link
          href="/admin/users"
          className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
          data-testid="link-admin-users"
        >
          {ADMIN_COPY.navUsersLabel}
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
    </aside>
  )
}
