import { createFileRoute, Link, useNavigate } from '@tanstack/solid-router'
import { createSignal, Show } from 'solid-js'

import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from '../../components/icons'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { authClient } from '../../lib/auth-client'

export const Route = createFileRoute('/_auth/sign-up')({
  component: SignUpPage,
})

function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [showPassword, setShowPassword] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(false)

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signUpError } = await authClient.signUp.email({
      name: name(),
      email: email(),
      password: password(),
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message ?? 'Unable to create account')
      return
    }

    void navigate({ to: '/dashboard' })
  }

  return (
    <div class="animate-fade-up">
      <header class="space-y-1.5">
        <h1 class="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p class="text-sm text-muted-foreground">
          Start tracking your blood pressure in seconds.
        </p>
      </header>

      <form class="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div class="space-y-2">
          <Label for="name">Name</Label>
          <div class="relative">
            <UserIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              required
              autocomplete="name"
              placeholder="Ada Obi"
              class="pl-10"
              value={name()}
              onInput={(event) => setName(event.currentTarget.value)}
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="email">Email</Label>
          <div class="relative">
            <MailIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              required
              autocomplete="email"
              placeholder="you@example.com"
              class="pl-10"
              value={email()}
              onInput={(event) => setEmail(event.currentTarget.value)}
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="password">Password</Label>
          <div class="relative">
            <LockIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword() ? 'text' : 'password'}
              required
              minlength={8}
              autocomplete="new-password"
              placeholder="At least 8 characters"
              class="px-10"
              value={password()}
              onInput={(event) => setPassword(event.currentTarget.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              class="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={showPassword() ? 'Hide password' : 'Show password'}
            >
              <Show
                when={showPassword()}
                fallback={<EyeIcon class="h-4 w-4" />}
              >
                <EyeOffIcon class="h-4 w-4" />
              </Show>
            </button>
          </div>
          <p class="text-xs text-muted-foreground">
            Use 8 or more characters for a stronger password.
          </p>
        </div>

        <Show when={error()}>
          <p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error()}
          </p>
        </Show>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          class="w-full"
          disabled={loading()}
        >
          {loading() ? 'Creating account…' : 'Create account'}
          <ArrowRightIcon />
        </Button>
      </form>

      <p class="mt-7 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/sign-in"
          class="font-medium text-brand underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
