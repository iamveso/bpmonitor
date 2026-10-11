// biome-ignore-all lint/a11y/noLabelWithoutControl: label association is provided by the consuming form
import { type JSX, splitProps } from 'solid-js'

import { cn } from '../../lib/utils'

export function Label(props: JSX.LabelHTMLAttributes<HTMLLabelElement>) {
  const [local, rest] = splitProps(props, ['class'])

  return (
    <label
      class={cn(
        'text-sm font-medium leading-none text-foreground/90',
        local.class,
      )}
      {...rest}
    />
  )
}
