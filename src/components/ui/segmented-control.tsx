'use client'

import { RadioGroup } from '@base-ui/react/radio-group'
import { Radio } from '@base-ui/react/radio'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const segmentedControlVariants = cva(
  'inline-flex w-full rounded-lg border border-input bg-muted p-1 gap-1'
)

interface SegmentedControlProps<Value>
  extends Omit<RadioGroup.Props<Value>, 'className'>,
    VariantProps<typeof segmentedControlVariants> {
  className?: string
}

export function SegmentedControl<Value>({
  className,
  children,
  ...props
}: SegmentedControlProps<Value>) {
  return (
    <RadioGroup
      data-slot="segmented-control"
      className={cn(segmentedControlVariants(), className)}
      {...props}
    >
      {children}
    </RadioGroup>
  )
}

const segmentedControlItemBaseClassName =
  'flex-1 cursor-pointer select-none rounded-md px-3 py-2 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface SegmentedControlItemProps<Value>
  extends Omit<Radio.Root.Props<Value>, 'className'> {
  className?: string
}

export function SegmentedControlItem<Value>({
  className,
  children,
  ...props
}: SegmentedControlItemProps<Value>) {
  return (
    <Radio.Root
      data-slot="segmented-control-item"
      className={(state) =>
        cn(
          segmentedControlItemBaseClassName,
          state.checked
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
          className
        )
      }
      {...props}
    >
      {children}
    </Radio.Root>
  )
}
