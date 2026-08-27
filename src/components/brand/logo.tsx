import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <ShieldCheck
        className="h-7 w-7 text-primary shrink-0"
        aria-hidden="true"
        strokeWidth={2}
      />
      <span className="font-display font-bold text-sm leading-tight sm:text-base">
        <span className="text-foreground">Alamo City</span>{' '}
        <span className="text-primary">Windshield Repair</span>
      </span>
    </Link>
  )
}
