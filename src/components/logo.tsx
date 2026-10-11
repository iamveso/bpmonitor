import { cn } from '../lib/utils'
import { PulseIcon } from './icons'

type LogoProps = {
  class?: string
  wordmark?: boolean
}

export function Logo(props: LogoProps) {
  return (
    <span class={cn('inline-flex items-center gap-2.5', props.class)}>
      <span class="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand via-brand-2 to-brand-3 text-white shadow-lg shadow-brand/30">
        <span class="absolute inset-0 rounded-xl bg-gradient-to-br from-brand via-brand-2 to-brand-3 opacity-60 blur-md" />
        <PulseIcon class="relative h-5 w-5" />
      </span>
      {props.wordmark === false ? null : (
        <span class="flex flex-col leading-none">
          <span class="text-[0.95rem] font-semibold tracking-tight">Pulse</span>
          <span class="text-[0.7rem] font-medium text-muted-foreground">
            BP Monitor
          </span>
        </span>
      )}
    </span>
  )
}
