import { format, parse } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ADMIN_COPY } from '@/lib/constants'
import type { UpcomingAppointmentRow } from '@/lib/dashboard/dashboard-queries'
import type { DashboardReadResult } from '@/types/admin'

interface UpcomingAppointmentsTableProps {
    result: DashboardReadResult<UpcomingAppointmentRow[]>
}

/**
 * Formats an `appt_date` (`yyyy-MM-dd`) for reading. Guards against an
 * undefined/invalid value before constructing a `Date` -- never construct
 * one from a possibly-undefined value unguarded.
 */
function formatApptDate(apptDate: string | undefined): string {
    if (!apptDate) {
        return ''
    }
    const parsed = parse(apptDate, 'yyyy-MM-dd', new Date())
    return Number.isNaN(parsed.getTime()) ? apptDate : format(parsed, 'MMM d, yyyy')
}

/**
 * Formats an `appt_time` (`HH:mm:ss`) for reading. Guards against an
 * undefined/invalid value before constructing a `Date`.
 */
function formatApptTime(apptTime: string | undefined): string {
    if (!apptTime) {
        return ''
    }
    const parsed = parse(apptTime, 'HH:mm:ss', new Date())
    return Number.isNaN(parsed.getTime()) ? apptTime : format(parsed, 'h:mm a')
}

/**
 * ADMIN-07: the forward-looking, soonest-first, limit-10 upcoming
 * appointments table (D-16). A Server Component -- static markup from
 * server-fetched props, no interactivity. Per D-15 this is strictly
 * read-only: no row actions of any kind. Renders exactly D-17's column set
 * (date, time, name, phone, `vehicle_desc`, status). `vehicle_desc` is
 * rendered as the plain denormalized string it already is -- no VIN
 * re-decoding, no NHTSA call, matching Phase 4's D-12 intent that this table
 * never need either. `phone` and `vehicle_desc` are kept readable (not
 * truncated) since the whole point is making the confirmation call without
 * opening Supabase.
 */
export function UpcomingAppointmentsTable({ result }: UpcomingAppointmentsTableProps) {
    return (
        <Card data-testid="table-upcoming-appointments">
            <CardHeader>
                <CardTitle>Upcoming appointments</CardTitle>
            </CardHeader>
            <CardContent>
                {!result.ok ? (
                    <p className="text-sm text-muted-foreground" role="alert">
                        {ADMIN_COPY.queryFailedMessage}
                    </p>
                ) : result.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.data.map((appointment, index) => (
                                <TableRow key={`${appointment.appt_date}-${appointment.appt_time}-${index}`} data-testid={`row-appointment-${index}`}>
                                    <TableCell>{formatApptDate(appointment.appt_date)}</TableCell>
                                    <TableCell>{formatApptTime(appointment.appt_time)}</TableCell>
                                    <TableCell>
                                        {appointment.name} {appointment.last_name}
                                    </TableCell>
                                    <TableCell>{appointment.phone}</TableCell>
                                    <TableCell>{appointment.vehicle_desc ?? '—'}</TableCell>
                                    <TableCell className="capitalize">{appointment.status}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
