import { ActivityChart } from '@/components/dashboard/activity-chart'
import type { DailyBucket, DashboardReadResult } from '@/types/admin'

interface VinSearchChartProps {
    series: DashboardReadResult<DailyBucket[]>
}

/**
 * ADMIN-04. Source is `analytics_events`, which Phase 6 now writes to --
 * same behaviour as `VisitorsChart`: the bar chart when the window has
 * activity, the D-01 empty state when it genuinely does not. Renders with
 * data-testid="chart-vin-searches" (via `ActivityChart`'s `testId` prop).
 */
export function VinSearchChart({ series }: VinSearchChartProps) {
    return <ActivityChart title="VIN searches" seriesKey="vinSearches" seriesLabel="VIN searches" result={series} testId="chart-vin-searches" />
}
