import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/LoginForm'

// D-14: this route sits OUTSIDE the (dashboard) route group's authenticated
// shell -- no sidebar, no logout control, no admin email. A logged-out
// visitor has no session, so authenticated chrome here would be nonsense.
// D-20/D-14: no snap-scroll and no public marketing navigation/footer chrome
// -- this is an internal admin surface, not marketing chrome.
//
// This file must stay at exactly this path. Moving it would change the
// pathname `src/lib/supabase/middleware.ts`'s `isLoginPage` equality check
// compares against and reintroduce the infinite-redirect bug AUTH-04 exists
// to prevent.
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center font-display text-2xl font-bold">Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
