import { createFileRoute, Outlet } from '@tanstack/solid-router'
import { For } from 'solid-js'
import { Dynamic } from 'solid-js/web'

import {
  CalendarIcon,
  HeartPulseIcon,
  PulseIcon,
  TrendingUpIcon,
} from '../components/icons'
import { Logo } from '../components/logo'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

const highlights = [
  {
    icon: HeartPulseIcon,
    title: 'Instant categories',
    body: 'Home-monitoring ranges explained the moment you log a reading.',
  },
  {
    icon: TrendingUpIcon,
    title: 'See the trend',
    body: 'Weekly, monthly and yearly views of your systolic and diastolic.',
  },
  {
    icon: CalendarIcon,
    title: 'One-tap daily entry',
    body: 'Morning and evening readings in seconds — no spreadsheets.',
  },
]

function AuthLayout() {
  return (
    <div class="flex min-h-screen flex-col lg:flex-row">
      <BrandPanel />

      <main class="relative flex flex-1 items-center justify-center px-6 py-12">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand/[0.07] to-transparent" />
        <div class="relative w-full max-w-sm animate-fade-up">
          <div class="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function BrandPanel() {
  return (
    <aside class="relative hidden overflow-hidden bg-gradient-to-br from-brand via-brand-2 to-brand-3 p-10 text-white lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
      <div class="absolute inset-0 bg-grid-light opacity-40" />
      <div class="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div class="absolute -bottom-20 -left-16 h-80 w-80 rounded-full bg-brand-3/40 blur-3xl" />

      <div class="relative inline-flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
          <PulseIcon class="h-5 w-5" />
        </span>
        <span class="flex flex-col leading-tight">
          <span class="text-base font-semibold">Pulse</span>
          <span class="text-xs text-white/70">Blood pressure monitor</span>
        </span>
      </div>

      <div class="relative space-y-7">
        <div class="space-y-4">
          <h1 class="max-w-md text-4xl font-semibold leading-[1.12] tracking-tight">
            Your blood pressure, clearly tracked.
          </h1>
          <p class="max-w-sm text-sm leading-relaxed text-white/80">
            Log morning and evening readings, spot the trend at a glance, and
            bring clean reports to your next appointment.
          </p>
        </div>

        <ul class="space-y-4">
          <For each={highlights}>
            {(item) => (
              <li class="flex items-start gap-3">
                <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/12 ring-1 ring-white/20">
                  <Dynamic component={item.icon} class="h-4 w-4" />
                </span>
                <span class="space-y-0.5">
                  <span class="block text-sm font-medium">{item.title}</span>
                  <span class="block text-xs leading-relaxed text-white/70">
                    {item.body}
                  </span>
                </span>
              </li>
            )}
          </For>
        </ul>
      </div>

      <ReadingPreview />
    </aside>
  )
}

function ReadingPreview() {
  return (
    <div class="relative max-w-xs rounded-2xl bg-white/10 p-4 shadow-xl ring-1 ring-white/20 backdrop-blur-md">
      <div class="flex items-center justify-between text-xs text-white/70">
        <span>Today · Morning</span>
        <span class="rounded-full bg-white/20 px-2 py-0.5 font-medium text-white">
          Normal
        </span>
      </div>

      <div class="mt-3 flex items-end gap-3">
        <div>
          <div class="text-3xl font-semibold tabular-nums">
            118
            <span class="text-lg text-white/60">/76</span>
          </div>
          <div class="text-xs text-white/70">mmHg</div>
        </div>
        <div class="ml-auto flex items-center gap-1 text-xs text-white/80">
          <HeartPulseIcon class="h-4 w-4" />
          64 bpm
        </div>
      </div>

      <svg
        class="mt-4 h-10 w-full text-white/80"
        viewBox="0 0 220 40"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 28 L22 26 L44 30 L66 22 L88 24 L110 16 L132 18 L154 12 L176 15 L198 9 L220 11"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.9"
        />
      </svg>
    </div>
  )
}
