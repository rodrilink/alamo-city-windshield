import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { VisitorsChart } from '@/components/dashboard/VisitorsChart'
import { ContactsChart } from '@/components/dashboard/ContactsChart'
import { VinSearchChart } from '@/components/dashboard/VinSearchChart'
import { RecentContactsTable } from '@/components/dashboard/RecentContactsTable'
import { UpcomingAppointmentsTable } from '@/components/dashboard/UpcomingAppointmentsTable'
import {
    getSummaryTotals,
    getVisitorSeries,
    getContactSeries,
    getVinSearchSeries,
    getRecentContacts,
    getUpcomingAppointments,
} from '@/lib/dashboard/dashboard-queries'

// D-04: this page fetches server-side and passes plain serializable props
// into Client Components -- the same boundary discipline as
// `(public)/book/page.tsx`. No browser-side data retrieval of any kind
// happens anywhere below. Auth is not re-checked here: the middleware (AUTH-03) owns
// the route guard and `(dashboard)/layout.tsx` owns the identity display --
// this page is a pure composition layer.
//
// All six reads run through a single `Promise.all` and each is handled
// independently below (each is its own `DashboardReadResult`), so one
// failing read degrades only its own card/chart/table rather than blanking
// the whole page.

export default async function AdminDashboardPage() {
    const [totals, visitorSeries, contactSeries, vinSearchSeries, recentContacts, upcomingAppointments] = await Promise.all([
        getSummaryTotals(),
        getVisitorSeries(),
        getContactSeries(),
        getVinSearchSeries(),
        getRecentContacts(),
        getUpcomingAppointments(),
    ])

    return (
        <div className="space-y-6">
            <SummaryCards totals={totals} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <VisitorsChart series={visitorSeries} />
                <ContactsChart series={contactSeries} />
                <VinSearchChart series={vinSearchSeries} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <RecentContactsTable result={recentContacts} />
                <UpcomingAppointmentsTable result={upcomingAppointments} />
            </div>
        </div>
    )
}
