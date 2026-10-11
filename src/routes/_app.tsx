import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
} from '@tanstack/solid-router'

import {
  ChartIcon,
  LogOutIcon,
  PlusIcon,
  UploadIcon,
} from '../components/icons'
import { Logo } from '../components/logo'
import { Button } from '../components/ui/button'
import { authClient } from '../lib/auth-client'
import { getSession, invalidateSessionCache } from '../lib/session'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const session = await getSession()

    if (!session) {
      throw redirect({ to: '/sign-in' })
    }

    return { session }
  },
  component: AppLayout,
})

function AppLayout() {
  const context = Route.useRouteContext()
  const navigate = useNavigate()

  const user = () => context().session.user
  const initials = () => {
    const name = user().name?.trim()
    if (name) {
      return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    }
    return user().email.charAt(0).toUpperCase()
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    invalidateSessionCache()
    void navigate({ to: '/sign-in' })
  }

  return (
    <div class="min-h-screen bg-background text-foreground">
      <header class="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/dashboard" class="shrink-0">
            <Logo />
          </Link>

          <PrimaryNav class="ml-4 hidden items-center gap-1 md:flex" />

          <div class="ml-auto flex items-center gap-2">
            <div class="hidden text-right sm:block">
              <div class="text-sm font-medium leading-tight">
                {user().name || user().email}
              </div>
              <div class="text-xs leading-tight text-muted-foreground">
                {user().email}
              </div>
            </div>

            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand via-brand-2 to-brand-3 text-xs font-semibold text-white shadow-sm">
              {initials()}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOutIcon />
              <span class="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>

        <div class="border-t border-border/70 md:hidden">
          <div class="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
            <PrimaryNav class="flex items-center gap-1" />
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}

function PrimaryNav(props: { class?: string }) {
  const itemClass =
    'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'

  return (
    <nav class={props.class}>
      <Link
        to="/dashboard"
        class={itemClass}
        activeProps={{ class: 'bg-accent text-foreground' }}
      >
        Dashboard
      </Link>
      <Link
        to="/entries"
        class={itemClass}
        activeProps={{ class: 'bg-accent text-foreground' }}
      >
        <PlusIcon class="h-4 w-4" />
        Readings
      </Link>
      <Link
        to="/import"
        class={itemClass}
        activeProps={{ class: 'bg-accent text-foreground' }}
      >
        <UploadIcon class="h-4 w-4" />
        Import
      </Link>
      <Link
        to="/report"
        class={itemClass}
        activeProps={{ class: 'bg-accent text-foreground' }}
      >
        <ChartIcon class="h-4 w-4" />
        Report
      </Link>
    </nav>
  )
}
