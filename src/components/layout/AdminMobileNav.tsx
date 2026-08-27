'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AdminSidebarNav } from '@/components/layout/AdminSidebar'

interface AdminMobileNavProps {
  adminEmail: string | null
}

// The mobile counterpart to `AdminSidebar`'s persistent rail. Below `md` the
// rail is hidden and this hamburger opens the same nav in a left drawer.
//
// This is the ONLY `'use client'` piece of the admin shell -- the dashboard
// layout stays a Server Component so its `supabase.auth.getUser()` call keeps
// revalidating the JWT server-side. Only `adminEmail` crosses the boundary,
// preserving the T-05-05-02 constraint that no identifier beyond the display
// email is serialized into client props.
export function AdminMobileNav({ adminEmail }: AdminMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger render={
        <Button variant="ghost" size="icon" data-testid="btn-admin-nav-toggle">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      } />
      <SheetContent side="left" className="w-[280px] p-4">
        {/* Base UI's dialog requires an accessible name. This drawer has no
            visible header, so the title is screen-reader-only. */}
        <SheetTitle className="sr-only">Admin navigation</SheetTitle>
        <div className="flex h-full flex-col">
          <AdminSidebarNav adminEmail={adminEmail} onNavigate={() => setIsOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
