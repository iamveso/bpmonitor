import { type JSX, splitProps } from 'solid-js'

import { cn } from '../../lib/utils'

export function Card(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class'])

  return (
    <div
      class={cn(
        'rounded-2xl border border-border bg-card text-card-foreground shadow-soft',
        local.class,
      )}
      {...rest}
    />
  )
}

export function CardHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class'])

  return <div class={cn('space-y-1 p-6', local.class)} {...rest} />
}

export function CardTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>) {
  const [local, rest] = splitProps(props, ['class'])

  return (
    <h3
      class={cn('text-lg font-semibold tracking-tight', local.class)}
      {...rest}
    />
  )
}

export function CardDescription(
  props: JSX.HTMLAttributes<HTMLParagraphElement>,
) {
  const [local, rest] = splitProps(props, ['class'])

  return (
    <p class={cn('text-sm text-muted-foreground', local.class)} {...rest} />
  )
}

export function CardContent(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class'])

  return <div class={cn('p-6 pt-0', local.class)} {...rest} />
}
