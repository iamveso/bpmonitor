import { createFileRoute, Link, useNavigate } from '@tanstack/solid-router'
import { createMemo, createResource, For, type JSX, Show } from 'solid-js'

import {
  CalendarIcon,
  ChartIcon,
  DropletIcon,
  HeartPulseIcon,
  InfoIcon,
  MoonIcon,
  PlusIcon,
  ShieldIcon,
  SunIcon,
  TrendingUpIcon,
} from '../../components/icons'
import { PeriodTabs } from '../../components/period-tabs'
import { TrendChart, type TrendPoint } from '../../components/trend-chart'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import {
  averageReadings,
  type BpCategoryId,
  type BpCategoryMeta,
  type BpPeriod,
  bucketByPeriod,
  classifyAverage,
  classifyReading,
  filterByPeriod,
  getCategoryMeta,
  getPeriodRange,
  isBpPeriod,
  type ReadingAverage,
  toDisplayDate,
} from '../../lib/bp'
import { listReadingsCached } from '../../lib/readings'
import { cn } from '../../lib/utils'

export const Route = createFileRoute('/_app/dashboard')({
  validateSearch: (search: Record<string, unknown>): { period?: BpPeriod } => ({
    period: isBpPeriod(search.period) ? search.period : undefined,
  }),
  component: DashboardPage,
})

type Slot = 'morning' | 'evening'

function DashboardPage() {
  const context = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [readings, { refetch }] = createResource(() => listReadingsCached())

  const firstName = () =>
    (context().session.user.name || 'there').trim().split(/\s+/)[0]

  const period = () => search().period ?? 'monthly'
  const setPeriod = (next: BpPeriod) =>
    void navigate({ to: '/dashboard', search: { period: next } })

  const all = () => readings() ?? []
  const filtered = createMemo(() => filterByPeriod(all(), period()))

  const average = createMemo(() => averageReadings(filtered()))
  const avgMeta = createMemo<BpCategoryMeta | null>(() => {
    const id = classifyAverage(filtered())
    return id ? getCategoryMeta(id) : null
  })

  const slotAverage = (slot: Slot) =>
    averageReadings(filtered().filter((reading) => reading.timeOfDay === slot))
  const slotMeta = (slot: Slot) => {
    const id = classifyAverage(
      filtered().filter((reading) => reading.timeOfDay === slot),
    )
    return id ? getCategoryMeta(id) : null
  }

  const categoryCounts = createMemo(() => {
    const counts = new Map<BpCategoryId, number>()
    for (const reading of filtered()) {
      const id = classifyReading(reading.systolic, reading.diastolic)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, meta: getCategoryMeta(id), count }))
      .sort((a, b) => b.count - a.count)
  })
  const maxCategoryCount = createMemo(() =>
    categoryCounts().reduce((max, entry) => Math.max(max, entry.count), 0),
  )

  const trendPoints = createMemo<TrendPoint[]>(() =>
    bucketByPeriod(filtered(), period()).map((bucket) => ({
      label: bucket.label,
      systolic: bucket.average.systolic ?? 0,
      diastolic: bucket.average.diastolic ?? 0,
      heartRate: bucket.average.heartRate,
    })),
  )

  const dateRange = createMemo(() => {
    const list = filtered()
    if (list.length === 0) return null
    const dates = list.map((reading) => reading.date).sort()
    return { from: dates[0], to: dates[dates.length - 1] }
  })

  const rangeLabel = () => {
    const range = dateRange()
    if (range)
      return `${toDisplayDate(range.from)} – ${toDisplayDate(range.to)}`
    const window = getPeriodRange(period())
    if (!window) return 'All time'
    return `${toDisplayDate(window.start)} – ${toDisplayDate(window.end)}`
  }

  return (
    <div class="space-y-8">
      <section class="animate-fade-up">
        <span class="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
          <HeartPulseIcon class="h-3.5 w-3.5" />
          Your blood pressure overview
        </span>
        <h1 class="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back, <span class="text-gradient">{firstName()}</span>
        </h1>
        <p class="mt-2 max-w-xl text-sm text-muted-foreground">
          A clear picture of your readings — averages, categories, and how your
          systolic and diastolic are trending.
        </p>
      </section>

      <Show when={readings.error}>
        <ErrorState onRetry={() => void refetch()} />
      </Show>

      <Show when={!readings.error && readings.loading}>
        <DashboardSkeleton />
      </Show>

      <Show when={!readings.error && !readings.loading && all().length === 0}>
        <EmptyDashboard />
      </Show>

      <Show when={!readings.error && !readings.loading && all().length > 0}>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PeriodTabs value={period()} onChange={setPeriod} />
          <span class="text-xs font-medium text-muted-foreground">
            {rangeLabel()}
          </span>
        </div>

        <Show
          when={filtered().length > 0}
          fallback={<NoDataForPeriod onReset={() => setPeriod('monthly')} />}
        >
          <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Average"
              icon={<HeartPulseIcon class="h-4 w-4" />}
              class="animate-delay-1"
            >
              <div class="text-2xl font-semibold tabular-nums">
                {average().systolic ?? '—'}
                <span class="text-lg text-muted-foreground/70">
                  /{average().diastolic ?? '—'}
                </span>
                <span class="ml-1 text-xs font-normal text-muted-foreground">
                  mmHg
                </span>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {average().count} reading{average().count === 1 ? '' : 's'}
              </p>
            </StatCard>

            <StatCard
              label="Category"
              icon={<ShieldIcon class="h-4 w-4" />}
              class="animate-delay-2"
            >
              <Show
                when={avgMeta()}
                fallback={
                  <span class="text-sm text-muted-foreground">
                    Not enough data
                  </span>
                }
              >
                {(meta) => (
                  <div class="space-y-1">
                    <span
                      class={cn(
                        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                        meta().chip,
                      )}
                    >
                      {meta().label}
                    </span>
                    <p class="text-xs text-muted-foreground">
                      Average of this period
                    </p>
                  </div>
                )}
              </Show>
            </StatCard>

            <StatCard
              label="Heart rate"
              icon={<TrendingUpIcon class="h-4 w-4" />}
              class="animate-delay-3"
            >
              <div class="text-2xl font-semibold tabular-nums">
                {average().heartRate ?? '—'}
                <span class="ml-1 text-xs font-normal text-muted-foreground">
                  bpm
                </span>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">Average pulse</p>
            </StatCard>

            <StatCard
              label="Pulse pressure"
              icon={<DropletIcon class="h-4 w-4" />}
              class="animate-delay-4"
            >
              <div class="text-2xl font-semibold tabular-nums">
                {average().pulsePressure ?? '—'}
                <span class="ml-1 text-xs font-normal text-muted-foreground">
                  mmHg
                </span>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                Systolic - diastolic
              </p>
            </StatCard>
          </section>

          <Card class="animate-fade-up animate-delay-2">
            <CardContent class="p-6">
              <div class="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold">Trend</h2>
                  <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Systolic and diastolic averages across the selected period.
                  </p>
                </div>
                <span class="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand sm:grid">
                  <ChartIcon class="h-5 w-5" />
                </span>
              </div>
              <TrendChart points={trendPoints()} showHeartRate />
            </CardContent>
          </Card>

          <div class="grid gap-4 lg:grid-cols-2">
            <Card class="animate-fade-up">
              <CardContent class="p-6">
                <h2 class="text-lg font-semibold">Categories</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                  How your readings fall across the home-monitoring ranges.
                </p>
                <div class="mt-5 space-y-3.5">
                  <For each={categoryCounts()}>
                    {(entry) => (
                      <div>
                        <div class="flex items-center justify-between text-sm">
                          <span class="flex items-center gap-2">
                            <span
                              class={cn(
                                'h-2.5 w-2.5 rounded-full',
                                entry.meta.dot,
                              )}
                            />
                            {entry.meta.label}
                          </span>
                          <span class="tabular-nums text-muted-foreground">
                            {entry.count}
                          </span>
                        </div>
                        <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            class={cn('h-full rounded-full', entry.meta.dot)}
                            style={{
                              width: `${(entry.count / maxCategoryCount()) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </CardContent>
            </Card>

            <Card class="animate-fade-up animate-delay-1">
              <CardContent class="p-6">
                <h2 class="text-lg font-semibold">Morning vs evening</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                  Averages for each measurement slot.
                </p>
                <div class="mt-5 grid gap-3 sm:grid-cols-2">
                  <SlotSummary
                    label="Morning"
                    icon={<SunIcon class="h-4 w-4" />}
                    average={slotAverage('morning')}
                    meta={slotMeta('morning')}
                  />
                  <SlotSummary
                    label="Evening"
                    icon={<MoonIcon class="h-4 w-4" />}
                    average={slotAverage('evening')}
                    meta={slotMeta('evening')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </Show>
      </Show>

      <p class="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        <InfoIcon class="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        Averages are indicative and are not a diagnosis. In a hypertensive
        crisis, seek emergency medical care immediately.
      </p>
    </div>
  )
}

function StatCard(props: {
  label: string
  icon: JSX.Element
  children: JSX.Element
  class?: string
}) {
  return (
    <Card class={cn('animate-fade-up', props.class)}>
      <CardContent class="p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {props.label}
          </span>
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand">
            {props.icon}
          </span>
        </div>
        <div class="mt-3">{props.children}</div>
      </CardContent>
    </Card>
  )
}

function SlotSummary(props: {
  label: string
  icon: JSX.Element
  average: ReadingAverage
  meta: BpCategoryMeta | null
}) {
  return (
    <div class="rounded-xl border border-border bg-muted/30 p-4">
      <div class="flex items-center gap-2 text-sm font-medium">
        <span class="text-muted-foreground">{props.icon}</span>
        {props.label}
      </div>
      <div class="mt-2 text-2xl font-semibold tabular-nums">
        {props.average.systolic ?? '—'}
        <span class="text-muted-foreground/70">
          /{props.average.diastolic ?? '—'}
        </span>
      </div>
      <p class="text-xs text-muted-foreground">
        {props.average.count} reading{props.average.count === 1 ? '' : 's'}
      </p>
      <Show when={props.meta}>
        {(meta) => (
          <span
            class={cn(
              'mt-3 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              meta().chip,
            )}
          >
            {meta().label}
          </span>
        )}
      </Show>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <For each={[0, 1, 2, 3]}>
          {() => (
            <div class="h-[116px] animate-pulse rounded-2xl border border-border bg-muted/40" />
          )}
        </For>
      </div>
      <div class="h-72 animate-pulse rounded-2xl border border-border bg-muted/40" />
    </div>
  )
}

function ErrorState(props: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent class="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20">
          <InfoIcon class="h-5 w-5" />
        </span>
        <div class="space-y-1">
          <h2 class="text-base font-semibold">Couldn't load your readings</h2>
          <p class="max-w-sm text-sm text-muted-foreground">
            Something went wrong while fetching your data. Check your connection
            and try again.
          </p>
        </div>
        <Button variant="outline" onClick={props.onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

function EmptyDashboard() {
  return (
    <Card>
      <CardContent class="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand/15 to-brand-3/15 text-brand ring-1 ring-inset ring-brand/15">
          <ChartIcon class="h-6 w-6" />
        </span>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">No data to chart yet</h2>
          <p class="max-w-sm text-sm text-muted-foreground">
            Add your first reading and your averages, categories, and trends
            will appear here.
          </p>
        </div>
        <Link to="/entries/new">
          <Button variant="gradient">
            <PlusIcon />
            Add a reading
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function NoDataForPeriod(props: { onReset: () => void }) {
  return (
    <Card>
      <CardContent class="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <CalendarIcon class="h-5 w-5" />
        </span>
        <div class="space-y-1">
          <h2 class="text-base font-semibold">No readings in this period</h2>
          <p class="max-w-sm text-sm text-muted-foreground">
            Try a wider range or log a new reading.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={props.onReset}>
            Show this month
          </Button>
          <Link to="/entries/new">
            <Button variant="gradient">
              <PlusIcon />
              Add a reading
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
