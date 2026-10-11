import { For } from 'solid-js'

import { BP_PERIODS, type BpPeriod } from '../lib/bp'
import { cn } from '../lib/utils'

export function PeriodTabs(props: {
  value: BpPeriod
  onChange: (period: BpPeriod) => void
  class?: string
}) {
  return (
    <div
      class={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/50 p-1',
        props.class,
      )}
      role="tablist"
      aria-label="Select period"
    >
      <For each={BP_PERIODS}>
        {(period) => (
          <button
            type="button"
            role="tab"
            aria-selected={props.value === period.id}
            onClick={() => props.onChange(period.id)}
            class={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
              props.value === period.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {period.label}
          </button>
        )}
      </For>
    </div>
  )
}
