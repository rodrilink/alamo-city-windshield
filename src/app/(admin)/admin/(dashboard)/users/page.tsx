import { listAdmins } from '@/lib/admin-users/admin-users-actions'
import { UserList } from '@/components/admin-users/user-list'
import { AddUserForm } from '@/components/admin-users/add-user-form'
import { ADMIN_COPY } from '@/lib/constants'

// USER-01/USER-02/USER-03/D-13: /admin/users -- the dedicated route for the
// admin list, add-admin form, and per-row removal. This page performs no
// auth check of its own -- the middleware (AUTH-03) already owns that
// enforcement for every /admin/* route, mirroring the (dashboard)
// layout.tsx's same "single enforcement point" reasoning.
export default async function UsersPage() {
    const result = await listAdmins()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">{ADMIN_COPY.navUsersLabel}</h1>
            </div>

            {result.ok ? (
                <UserList admins={result.data} />
            ) : (
                // A failed query must never render as an empty list -- that
                // would falsely suggest zero admins exist (RESEARCH.md Pitfall 3).
                <p className="text-sm text-destructive" role="alert" data-testid="text-users-query-error">
                    {ADMIN_COPY.queryFailedMessage}
                </p>
            )}

            <AddUserForm />
        </div>
    )
}
