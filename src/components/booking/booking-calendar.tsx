'use client'

// D-07's month grid: disables fully-booked, past, out-of-window, and Sunday
// dates while leaving today selectable (D-04 allows same-day booking).
// `month`/`onMonthChange` drive the month-upfront re-fetch when the visible
// month changes; `onSelect` drives the day-level slot list fetch below.
//
// react-day-picker v10 removed several v9 range-bound and focus props
// (RESEARCH.md Pitfall 2); none of those deprecated props are used below.
// The `disabled` function-matcher form covers every condition instead.

import { useState, useTransition } from 'react'

import { Calendar } from '@/components/ui/calendar'
import { SlotList } from '@/components/booking/slot-list'
import { formatLocalDateKeyClient, isDateKeyBeforeServerToday } from '@/components/booking/date-key'
import { BOOKING_COPY } from '@/lib/constants'
import { refreshDayAvailability, refreshMonthAvailability } from '@/lib/booking/availability-actions'
import type { DayAvailability } from '@/types/booking'

/** D-04: the calendar opens this many days ahead of the server's today. Named so the window can be tuned without hunting through comparison logic. */
const BOOKING_WINDOW_DAYS = 30

export interface ServerTodayParts {
    year: number
    month: number
    day: number
    hour: number
    minute: number
}

interface BookingCalendarProps {
    initialYear: number
    initialMonth: number
    initialFullyBookedDates: string[]
    serverToday: ServerTodayParts
    vin: string | null
    vehicleDesc: string | null
}

function isAfterBookingWindow(dateKey: string, serverToday: ServerTodayParts, windowDays: number): boolean {
    const todayLocal = new Date(serverToday.year, serverToday.month - 1, serverToday.day)
    const windowEnd = new Date(todayLocal)
    windowEnd.setDate(windowEnd.getDate() + windowDays)
    const windowEndKey = formatLocalDateKeyClient(windowEnd)
    return dateKey > windowEndKey
}

export function BookingCalendar({
    initialYear,
    initialMonth,
    initialFullyBookedDates,
    serverToday,
    vin,
    vehicleDesc,
}: BookingCalendarProps) {
    const [month, setMonth] = useState<Date>(new Date(initialYear, initialMonth - 1, 1))
    const [fullyBookedDates, setFullyBookedDates] = useState<Set<string>>(new Set(initialFullyBookedDates))
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [dayAvailability, setDayAvailability] = useState<DayAvailability | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleMonthChange(nextMonth: Date) {
        setMonth(nextMonth)
        startTransition(async () => {
            const year = nextMonth.getFullYear()
            const monthIndex = nextMonth.getMonth() + 1
            const result = await refreshMonthAvailability(year, monthIndex)
            if (result.ok) {
                setFullyBookedDates(new Set(result.data.fullyBookedDates))
            }
        })
    }

    function handleSelect(date: Date | undefined) {
        setSelectedDate(date)
        if (!date) {
            setDayAvailability(null)
            return
        }

        const dateKey = formatLocalDateKeyClient(date)
        startTransition(async () => {
            const result = await refreshDayAvailability(dateKey)
            setDayAvailability(result)
        })
    }

    async function handleSlotTakenRefetch() {
        if (!selectedDate) return
        const dateKey = formatLocalDateKeyClient(selectedDate)
        const result = await refreshDayAvailability(dateKey)
        setDayAvailability(result)
    }

    return (
        <div className="space-y-6" data-testid="card-booking-calendar">
            <div>
                <h1 className="mb-4 text-lg font-semibold text-foreground">{BOOKING_COPY.calendarLabel}</h1>
                {/* Sized and centered via the primitive's own `--cell-size` variable
                    rather than by editing `components/ui/calendar.tsx` (a generated
                    shadcn file). Every dimension inside the calendar — day cells, nav
                    buttons, header height — derives from that one variable, so
                    overriding it scales the whole grid proportionally with no layout
                    surgery.

                    `--spacing(7)` (~28px) is the shadcn default and reads small inside
                    this `max-w-3xl` page. `--spacing(11)` (~44px) also clears the 44px
                    minimum touch target, which the default did not.

                    Short-viewport guard (03-UAT test 14 / D-20): the bigger grid is
                    exactly what could reintroduce the Phase 3 clipping bug, so the
                    scale-up is gated behind `sm:`. Below 640px the calendar keeps the
                    original compact size, so the worst case for vertical space is
                    unchanged from what that test verified. `mx-auto` centers the
                    now-narrower-than-container grid; `w-fit` stops the wrapper from
                    stretching full width and re-defeating the centering. */}
                <Calendar
                    mode="single"
                    month={month}
                    onMonthChange={handleMonthChange}
                    selected={selectedDate}
                    onSelect={handleSelect}
                    className="mx-auto w-fit sm:[--cell-size:--spacing(11)]"
                    disabled={(date) => {
                        const dateKey = formatLocalDateKeyClient(date)
                        if (fullyBookedDates.has(dateKey)) return true
                        if (isDateKeyBeforeServerToday(dateKey, serverToday)) return true
                        if (isAfterBookingWindow(dateKey, serverToday, BOOKING_WINDOW_DAYS)) return true
                        return date.getDay() === 0
                    }}
                    data-testid="calendar-booking"
                />
                {isPending && <p className="mt-2 text-sm text-muted-foreground">Loading availability…</p>}
            </div>

            {selectedDate && (
                <SlotList
                    selectedDate={selectedDate}
                    dayAvailability={dayAvailability}
                    vin={vin}
                    vehicleDesc={vehicleDesc}
                    onSlotTakenRefetch={handleSlotTakenRefetch}
                    onFullyBookedDate={(dateKey) => setFullyBookedDates((prev) => new Set(prev).add(dateKey))}
                />
            )}
        </div>
    )
}
