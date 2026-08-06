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
    // D-02: ONLY the two analytics_events-sourced cards (visitors, vinSearches)
    // carry this hint. Do NOT add it to contacts/bookings -- those are real
    // counts today, and the asymmetry is the decision, not an inconsistency
    // to "fix" by making all four cards uniform.
    showTrackingHint: boolean
}

/**
 * ADMIN-05: the four-card summary grid. A Server Component -- it renders
 * static markup from props with no interactivity of its own.
 *
 * Per D-02, `visitors` and `vinSearches` are `analytics_events`-sourced and
 * read `0` until Phase 6 wires the writes, so they carry
 * `ADMIN_COPY.trackingStartsHint`. `contacts` and `bookings` are real-table
 * counts today and must NEVER carry that hint -- doing so would suggest a
 * real number is somehow provisional.
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
            showTrackingHint: true,
        },
        {
            testId: 'card-total-contacts',
            label: 'Contacts',
            value: totals.ok ? totals.data.contacts : null,
            showTrackingHint: false,
        },
        {
            testId: 'card-total-vin-searches',
            label: 'VIN searches',
            value: totals.ok ? totals.data.vinSearches : null,
            showTrackingHint: true,
        },
        {
            testId: 'card-total-bookings',
            label: 'Bookings',
            value: totals.ok ? totals.data.bookings : null,
            showTrackingHint: false,
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
                            <>
                                <p className="text-3xl font-semibold text-primary tabular-nums">{card.value?.toLocaleString()}</p>
                                {card.showTrackingHint && <p className="mt-1 text-xs text-muted-foreground">{ADMIN_COPY.trackingStartsHint}</p>}
                            </>
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
