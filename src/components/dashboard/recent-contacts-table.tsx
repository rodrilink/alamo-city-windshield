import { format } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ADMIN_COPY } from '@/lib/constants'
import type { RecentContactRow } from '@/lib/dashboard/dashboard-queries'
import type { DashboardReadResult } from '@/types/admin'

interface RecentContactsTableProps {
    result: DashboardReadResult<RecentContactRow[]>
}

/**
 * Formats a `created_at` ISO timestamp for reading. Guards against an
 * undefined/invalid value before constructing a `Date` -- never construct
 * one from a possibly-undefined value unguarded.
 */
function formatSubmittedDate(createdAt: string | undefined): string {
    if (!createdAt) {
        return ''
    }
    const parsed = new Date(createdAt)
    return Number.isNaN(parsed.getTime()) ? '' : format(parsed, 'MMM d, yyyy')
}

/**
 * ADMIN-06: the newest-first, limit-10 recent-contacts table (D-16). A
 * Server Component -- static markup from server-fetched props, no
 * interactivity. Per D-15 this is strictly read-only: no row actions of any
 * kind. `honeypot` is never rendered -- it is an anti-spam implementation
 * detail with no place on an admin screen. `message` is also omitted here
 * (rather than rendered truncated) to keep rows short, avoiding the
 * short-viewport clipping problem from 03-UAT test 14.
 */
export function RecentContactsTable({ result }: RecentContactsTableProps) {
    return (
        <Card data-testid="table-recent-contacts">
            <CardHeader>
                <CardTitle>Recent contacts</CardTitle>
            </CardHeader>
            <CardContent>
                {!result.ok ? (
                    <p className="text-sm text-muted-foreground" role="alert">
                        {ADMIN_COPY.queryFailedMessage}
                    </p>
                ) : result.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contact submissions yet.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>VIN</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.data.map((contact, index) => (
                                <TableRow key={`${contact.created_at}-${index}`} data-testid={`row-contact-${index}`}>
                                    <TableCell>{formatSubmittedDate(contact.created_at)}</TableCell>
                                    <TableCell>
                                        {contact.name} {contact.last_name}
                                    </TableCell>
                                    <TableCell>{contact.phone}</TableCell>
                                    <TableCell>{contact.vin ?? '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
