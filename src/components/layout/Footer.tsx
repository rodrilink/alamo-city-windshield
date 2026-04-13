import { BUSINESS } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand + Service Area */}
          <div>
            <p className="font-display font-bold text-foreground mb-2">
              {BUSINESS.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {BUSINESS.serviceArea}
            </p>
          </div>

          {/* Business Hours */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Business Hours</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {BUSINESS.hours.map((h) => (
                <li key={h.days} className="flex justify-between gap-4 max-w-[200px]">
                  <span>{h.days}</span>
                  <span>{h.closed ? 'Closed' : `${h.open} \u2013 ${h.close}`}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Location + Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Contact</h3>
            <p className="text-sm text-muted-foreground">{BUSINESS.location}</p>
            <a
              href={BUSINESS.phoneHref}
              className="mt-2 block text-sm font-medium text-primary hover:underline"
            >
              {BUSINESS.phone}
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
