'use client'

// AUTH-05: renders a form action bound to the server `logoutAction`. The
// sign-out itself must run server-side (never a client-side call here) so
// the session cookie is cleared in the response and the cached authenticated
// RSC payload is invalidated via `revalidatePath` -- see `auth-actions.ts`'s
// header comment for the same reasoning applied to `loginAction`.

import { logoutAction } from '@/lib/auth/auth-actions'
import { ADMIN_COPY } from '@/lib/constants'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" className="w-full" data-testid="btn-logout">
        {ADMIN_COPY.logoutLabel}
      </Button>
    </form>
  )
}
