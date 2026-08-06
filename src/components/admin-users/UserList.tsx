'use client'

// USER-01/D-07: the admin list -- email, created date, last sign-in, plus a
// per-row removal trigger. A Client Component because each row owns its own
// AlertDialog open/closed state via RemoveUserDialog.
//
// RESEARCH.md Pitfall 5: `lastSignInAt` is normalized to `null` (not
// `undefined`) by `listAdmins()`, but the underlying Supabase field is
// optional either way -- guard it before formatting, since formatting an
// absent value unconditionally produces a visible "Invalid Date", guaranteed
// to occur immediately after every successful add (a freshly created admin
// has never signed in yet).
//
// Hiding/disabling the remove control for the caller's own row would be
// presentation-only convenience, not enforcement -- the D-10 guards inside
// removeUserAction (admin-users-actions.ts) are what actually block a
// self-delete or last-admin removal, regardless of what this UI shows. This
// component does not attempt that hiding: it renders every row identically,
// deferring entirely to the server-side guards.

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RemoveUserDialog } from '@/components/admin-users/RemoveUserDialog'
import { ADMIN_COPY } from '@/lib/constants'
import type { AdminListItem } from '@/lib/admin-users/admin-users-actions'

interface UserListProps {
    admins: AdminListItem[]
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function UserList({ admins }: UserListProps) {
    return (
        <Table data-testid="table-admin-users">
            <TableHeader>
                <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last sign-in</TableHead>
                    <TableHead />
                </TableRow>
            </TableHeader>
            <TableBody>
                {admins.map((admin) => (
                    <TableRow key={admin.id} data-testid={`row-user-${admin.id}`}>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{formatDate(admin.createdAt)}</TableCell>
                        <TableCell>
                            {admin.lastSignInAt ? formatDate(admin.lastSignInAt) : ADMIN_COPY.neverSignedIn}
                        </TableCell>
                        <TableCell>
                            <RemoveUserDialog
                                userId={admin.id}
                                email={admin.email}
                                triggerTestId={`btn-remove-user-${admin.id}`}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
