'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Phone } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { BUSINESS, NAV_LINKS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface TopNavProps {
  overlay?: boolean
}

export function TopNav({ overlay = false }: TopNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav
      className={cn(
        overlay ? 'absolute top-0' : 'sticky top-0',
        'z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'transition-colors hover:text-primary',
                  pathname === link.href
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {/* Phone — always visible (per NAV-02) */}
          <a
            href={BUSINESS.phoneHref}
            className="flex items-center gap-1.5 font-semibold text-primary hover:underline text-sm"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{BUSINESS.phone}</span>
          </a>

          {/* Mobile hamburger menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            } />
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4 px-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'text-lg font-medium transition-colors hover:text-primary px-2 py-1',
                      pathname === link.href
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href={BUSINESS.phoneHref}
                  className="mt-4 flex items-center gap-2 text-lg font-semibold text-primary"
                >
                  <Phone className="h-5 w-5" />
                  {BUSINESS.phone}
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
