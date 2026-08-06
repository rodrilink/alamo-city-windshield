'use client'

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { ADMIN_COPY } from '@/lib/constants'
import type { DailyBucket } from '@/types/admin'
import type { DashboardReadResult } from '@/types/admin'

interface ActivityChartProps {
    title: string
    seriesKey: string
    seriesLabel: string
    result: DashboardReadResult<DailyBucket[]>
    testId: string
}

/**
 * Shared Client Component wrapper for the three ADMIN-02/03/04 time-series
 * charts (D-04: Recharts needs the DOM, so this must be `'use client'`). The
 * empty state, failure state and theming live here once instead of being
 * near-copied across `VisitorsChart`/`ContactsChart`/`VinSearchChart`.
 *
 * Precedence, checked in order:
 *   1. Read failed -> `ADMIN_COPY.queryFailedMessage`, no axis rendered.
 *   2. Read succeeded but every bucket's count is 0 -> D-01's explicit
 *      empty-state message, never a blank box or broken axis.
 *   3. Otherwise -> the chart, themed from a CSS variable only (no color
 *      literal -- white/red/black is a hard brand constraint).
 *
 * Never fetches. Receives only plain serializable props, matching
 * `book/page.tsx`'s Server-Component-fetches-then-passes-props discipline.
 */
export function ActivityChart({ title, seriesKey, seriesLabel, result, testId }: ActivityChartProps) {
    const chartConfig: ChartConfig = {
        [seriesKey]: {
            label: seriesLabel,
            color: 'var(--primary)',
        },
    }

    const chartData = result.ok ? result.data.map((bucket) => ({ date: bucket.date, [seriesKey]: bucket.count })) : []
    const hasActivity = result.ok && result.data.some((bucket) => bucket.count > 0)

    return (
        <Card data-testid={testId}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {!result.ok ? (
                    <p className="text-sm text-muted-foreground" role="alert">
                        {ADMIN_COPY.queryFailedMessage}
                    </p>
                ) : !hasActivity ? (
                    <p className="text-sm text-muted-foreground">{ADMIN_COPY.dashboardEmptyStateHint}</p>
                ) : (
                    <ChartContainer config={chartConfig}>
                        <BarChart data={chartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey={seriesKey} fill={`var(--color-${seriesKey})`} radius={4} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
