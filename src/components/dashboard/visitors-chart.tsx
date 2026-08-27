import { ActivityChart } from '@/components/dashboard/activity-chart'
import type { DailyBucket, DashboardReadResult } from '@/types/admin'

interface VisitorsChartProps {
    series: DashboardReadResult<DailyBucket[]>
}

/**
 * ADMIN-02. Source is `analytics_events`, which Phase 6 now writes to, so
 * this renders the bar chart whenever the window has activity. Per D-01 a
 * genuinely quiet window still falls back to the empty state rather than a
 * broken axis. Renders with data-testid="chart-visitors" (via
 * `ActivityChart`'s `testId` prop).
 */
export function VisitorsChart({ series }: VisitorsChartProps) {
    return <ActivityChart title="Visitors" seriesKey="visitors" seriesLabel="Visitors" result={series} testId="chart-visitors" />
}
