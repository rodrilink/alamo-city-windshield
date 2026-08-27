import { ActivityChart } from '@/components/dashboard/activity-chart'
import type { DailyBucket, DashboardReadResult } from '@/types/admin'

interface VisitorsChartProps {
    series: DashboardReadResult<DailyBucket[]>
}

/**
 * ADMIN-02. Source is `analytics_events`, so per D-01 this reads a
 * zero-filled window until Phase 6 wires the writes -- the empty state,
 * not the bar chart, is what renders today. Renders with
 * data-testid="chart-visitors" (via `ActivityChart`'s `testId` prop).
 */
export function VisitorsChart({ series }: VisitorsChartProps) {
    return <ActivityChart title="Visitors" seriesKey="visitors" seriesLabel="Visitors" result={series} testId="chart-visitors" />
}
