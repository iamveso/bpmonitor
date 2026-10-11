import { type JSX, splitProps } from 'solid-js'

import { cn } from '../../lib/utils'

export function Textarea(
  props: JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const [local, rest] = splitProps(props, ['class'])

  return (
    <textarea
      class={cn(
        'flex min-h-[88px] w-full rounded-lg border border-input bg-background/60 px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        local.class,
      )}
      {...rest}
    />
  )
}
