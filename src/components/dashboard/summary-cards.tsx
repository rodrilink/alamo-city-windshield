import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ADMIN_COPY } from '@/lib/constants'
import type { SummaryTotals } from '@/lib/dashboard/dashboard-queries'
import type { DashboardReadResult } from '@/types/admin'

interface SummaryCardsProps {
    totals: DashboardReadResult<SummaryTotals>
}

interface SummaryCardDefinition {
    testId: string
    label: string
    value: number | null
}

/**
 * ADMIN-05: the four-card summary grid. A Server Component -- it renders
 * static markup from props with no interactivity of its own.
 *
 * All four cards render a plain count. `visitors` and `vinSearches` are
 * `analytics_events`-sourced; `contacts` and `bookings` are real-table counts.
 *
 * Supersedes D-02: those two cards used to carry a "Tracking starts in Phase 6"
 * subtitle because the analytics writes did not exist yet. Phase 6 shipped and
 * was runtime-verified, so the hint was unconditional and actively wrong --
 * it rendered underneath real non-zero counts, implying a live number was
 * somehow provisional.
 *
 * When `totals.ok` is `false`, every card renders `ADMIN_COPY.queryFailedMessage`
 * in place of its number rather than a `0` -- a `0` there would be
 * indistinguishable from the legitimate empty case (RESEARCH.md Pitfall 3).
 */
export function SummaryCards({ totals }: SummaryCardsProps) {
    const cards: SummaryCardDefinition[] = [
        {
            testId: 'card-total-visitors',
            label: 'Visitors',
            value: totals.ok ? totals.data.visitors : null,
        },
        {
            testId: 'card-total-contacts',
            label: 'Contacts',
            value: totals.ok ? totals.data.contacts : null,
        },
        {
            testId: 'card-total-vin-searches',
            label: 'VIN searches',
            value: totals.ok ? totals.data.vinSearches : null,
        },
        {
            testId: 'card-total-bookings',
            label: 'Bookings',
            value: totals.ok ? totals.data.bookings : null,
        },
    ]

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.testId} data-testid={card.testId}>
                    <CardHeader>
                        <CardTitle className="text-muted-foreground">{card.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {totals.ok ? (
                            <p className="text-3xl font-semibold text-primary tabular-nums">{card.value?.toLocaleString()}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground" role="alert">
                                {ADMIN_COPY.queryFailedMessage}
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
