import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/solid-router'

import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools'

import '@fontsource/inter/400.css'

import { Suspense } from 'solid-js'
import { HydrationScript } from 'solid-js/web'

import { InfoIcon } from '../components/icons'
import { Button } from '../components/ui/button'
import styleCss from '../styles.css?url'

export const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Pulse — Blood Pressure Monitor' },
      {
        name: 'description',
        content:
          'Track morning and evening blood pressure readings, see your trends, and export clean reports.',
      },
      { name: 'theme-color', content: '#4f46e5' },
    ],
    links: [{ rel: 'stylesheet', href: styleCss }],
  }),
  shellComponent: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: NotFoundComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HydrationScript />
        <HeadContent />
      </head>
      <body>
        <Suspense>
          <Outlet />
          <TanStackRouterDevtools />
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}

function RootErrorComponent(props: ErrorComponentProps) {
  const message = () =>
    props.error instanceof Error ? props.error.message : 'Something went wrong.'

  return (
    <div class="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div class="flex max-w-md flex-col items-center gap-4 text-center">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20">
          <InfoIcon class="h-6 w-6" />
        </span>
        <div class="space-y-1">
          <h1 class="text-xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p class="text-sm text-muted-foreground">{message()}</p>
        </div>
        <Button variant="gradient" onClick={() => props.reset()}>
          Try again
        </Button>
      </div>
    </div>
  )
}

function NotFoundComponent() {
  return (
    <div class="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div class="flex max-w-md flex-col items-center gap-4 text-center">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <InfoIcon class="h-6 w-6" />
        </span>
        <div class="space-y-1">
          <h1 class="text-xl font-semibold tracking-tight">Page not found</h1>
          <p class="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has moved.
          </p>
        </div>
        <Link to="/dashboard">
          <Button variant="gradient">Go to dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
