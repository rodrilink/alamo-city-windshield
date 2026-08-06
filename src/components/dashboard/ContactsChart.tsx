import { ActivityChart } from '@/components/dashboard/ActivityChart'
import type { DailyBucket, DashboardReadResult } from '@/types/admin'

interface ContactsChartProps {
    series: DashboardReadResult<DailyBucket[]>
}

/**
 * ADMIN-03. **D-18 amendment: this chart's data source deliberately differs
 * from its two siblings (`VisitorsChart`, `VinSearchChart`).** It reads the
 * real `contacts` table, not `analytics_events`, because `contacts` already
 * holds real Phase 4 rows -- showing "no data yet" here while the contacts
 * summary card shows a real count would read as a bug (D-02's mixed-source
 * honesty rule). Do NOT "unify" the three charts by switching this back to
 * `analytics_events` -- that would silently revert D-18. Renders with
 * data-testid="chart-contacts" (via `ActivityChart`'s `testId` prop).
 */
export function ContactsChart({ series }: ContactsChartProps) {
    return <ActivityChart title="Contacts" seriesKey="contacts" seriesLabel="Contacts" result={series} testId="chart-contacts" />
}
