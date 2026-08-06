import { ActivityChart } from '@/components/dashboard/ActivityChart'
import type { DailyBucket, DashboardReadResult } from '@/types/admin'

interface VinSearchChartProps {
    series: DashboardReadResult<DailyBucket[]>
}

/**
 * ADMIN-04. Source is `analytics_events`, so per D-01 this reads a
 * zero-filled window until Phase 6 wires the writes -- same empty state as
 * `VisitorsChart`. Renders with data-testid="chart-vin-searches" (via
 * `ActivityChart`'s `testId` prop).
 */
export function VinSearchChart({ series }: VinSearchChartProps) {
    return <ActivityChart title="VIN searches" seriesKey="vinSearches" seriesLabel="VIN searches" result={series} testId="chart-vin-searches" />
}
