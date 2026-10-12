import { createFileRoute, Link } from '@tanstack/solid-router'
import { createEffect, createSignal, For, onMount, Show } from 'solid-js'

import {
  CalendarIcon,
  HeartPulseIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
} from '../../../components/icons'
import { ReadingForm } from '../../../components/reading-form'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import {
  classifyReading,
  getCategoryMeta,
  toDisplayDate,
} from '../../../lib/bp'
import {
  DEFAULT_PAGE_SIZE,
  deleteReading,
  invalidateReadingsCache,
  listReadingsPage,
  type ReadingDTO,
  type ReadingsPageCursor,
  SLOT_ORDER,
} from '../../../lib/readings'
import { cn } from '../../../lib/utils'

export const Route = createFileRoute('/_app/entries/')({
  component: EntriesPage,
})

type LoadStatus = 'loading' | 'ready' | 'error'

function compareReadings(a: ReadingDTO, b: ReadingDTO): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.timeOfDay !== b.timeOfDay)
    return SLOT_ORDER[a.timeOfDay] - SLOT_ORDER[b.timeOfDay]
  return 0
}

function EntriesPage() {
  const [items, setItems] = createSignal<ReadingDTO[]>([])
  const [nextCursor, setNextCursor] = createSignal<ReadingsPageCursor | null>(
    null,
  )
  const [status, setStatus] = createSignal<LoadStatus>('loading')
  const [loadingMore, setLoadingMore] = createSignal(false)
  const [moreError, setMoreError] = createSignal(false)
  const [editing, setEditing] = createSignal<ReadingDTO | null>(null)
  const [deletingId, setDeletingId] = createSignal<string | null>(null)

  const loadFirstPage = async () => {
    setStatus('loading')
    try {
      const page = await listReadingsPage({
        data: { limit: DEFAULT_PAGE_SIZE },
      })
      setItems(page.items)
      setNextCursor(page.nextCursor)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }

  const loadMore = async () => {
    const cursor = nextCursor()
    if (!cursor || loadingMore()) return

    setMoreError(false)
    setLoadingMore(true)
    try {
      const page = await listReadingsPage({
        data: {
          limit: DEFAULT_PAGE_SIZE,
          cursorDate: cursor.date,
          cursorTime: cursor.timeOfDay,
        },
      })
      setItems((prev) => [...prev, ...page.items])
      setNextCursor(page.nextCursor)
    } catch {
      setMoreError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  onMount(() => {
    void loadFirstPage()
  })

  let editRef: HTMLDivElement | undefined
  createEffect(() => {
    if (editing() && editRef) {
      editRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })

  const groups = () => {
    const map = new Map<string, ReadingDTO[]>()
    for (const reading of items()) {
      const list = map.get(reading.date) ?? []
      list.push(reading)
      map.set(reading.date, list)
    }
    return [...map.entries()]
  }

  const handleDelete = async (reading: ReadingDTO) => {
    const label = `${reading.timeOfDay} reading on ${toDisplayDate(reading.date)}`
    if (!window.confirm(`Delete the ${label}? This cannot be undone.`)) return

    setDeletingId(reading.id)
    try {
      await deleteReading({ data: { id: reading.id } })
      invalidateReadingsCache()
      if (editing()?.id === reading.id) setEditing(null)
      setItems((prev) => prev.filter((entry) => entry.id !== reading.id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaved = (saved: ReadingDTO) => {
    const previousId = editing()?.id
    invalidateReadingsCache()
    setItems((prev) => {
      const without = prev.filter(
        (entry) => entry.id !== saved.id && entry.id !== previousId,
      )
      return [...without, saved].sort(compareReadings)
    })
    setEditing(null)
  }

  return (
    <div class="mx-auto max-w-3xl space-y-8">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Readings
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Every morning, afternoon and evening measurement, newest first.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Link to="/import">
            <Button variant="outline">
              <UploadIcon />
              Import
            </Button>
          </Link>
          <Link to="/entries/new">
            <Button variant="gradient">
              <PlusIcon />
              New reading
            </Button>
          </Link>
        </div>
      </header>

      <Show when={editing()}>
        {(current) => (
          <div ref={editRef}>
            <Card class="border-brand/30 shadow-card">
              <CardContent class="p-6">
                <div class="mb-5 flex items-center justify-between">
                  <h2 class="text-lg font-semibold">Edit reading</h2>
                  <span class="text-xs text-muted-foreground">
                    {toDisplayDate(current().date)} · {current().timeOfDay}
                  </span>
                </div>
                <ReadingForm
                  initial={current()}
                  onSaved={handleSaved}
                  onCancel={() => setEditing(null)}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </Show>

      <Show when={status() === 'error'}>
        <Card>
          <CardContent class="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <p class="max-w-sm text-sm text-muted-foreground">
              Unable to load your readings. Please try again.
            </p>
            <Button variant="outline" onClick={() => void loadFirstPage()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </Show>

      <Show when={status() !== 'error'}>
        <Show when={status() === 'ready'} fallback={<ListSkeleton />}>
          <Show when={items().length > 0} fallback={<EmptyState />}>
            <div class="space-y-6">
              <For each={groups()}>
                {([date, list]) => (
                  <section class="space-y-3">
                    <h2 class="text-sm font-semibold text-muted-foreground">
                      {toDisplayDate(date)}
                    </h2>
                    <div class="space-y-2">
                      <For each={list}>
                        {(reading) => (
                          <ReadingRow
                            reading={reading}
                            deleting={deletingId() === reading.id}
                            onEdit={() => setEditing(reading)}
                            onDelete={() => void handleDelete(reading)}
                          />
                        )}
                      </For>
                    </div>
                  </section>
                )}
              </For>
            </div>

            <div class="flex flex-col items-center gap-2 pt-2">
              <Show
                when={nextCursor()}
                fallback={
                  <p class="text-xs text-muted-foreground">
                    That&apos;s all {items().length} reading
                    {items().length === 1 ? '' : 's'}.
                  </p>
                }
              >
                <Button
                  variant="outline"
                  onClick={() => void loadMore()}
                  disabled={loadingMore()}
                >
                  {loadingMore() ? 'Loading…' : 'Load more'}
                </Button>
              </Show>
              <Show when={moreError()}>
                <p class="text-xs text-destructive">
                  Couldn&apos;t load more readings. Please try again.
                </p>
              </Show>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  )
}

interface ReadingRowProps {
  reading: ReadingDTO
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}

function ReadingRow(props: ReadingRowProps) {
  const meta = () =>
    getCategoryMeta(
      classifyReading(props.reading.systolic, props.reading.diastolic),
    )

  return (
    <Card class="animate-fade-up">
      <CardContent class="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
          <HeartPulseIcon class="h-5 w-5" />
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-base font-semibold capitalize tabular-nums">
              {props.reading.systolic}/{props.reading.diastolic}
            </span>
            <span class="text-xs text-muted-foreground">mmHg</span>
            <Show when={props.reading.heartRate}>
              <span class="text-xs text-muted-foreground">
                · {props.reading.heartRate} bpm
              </span>
            </Show>
          </div>
          <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span class="capitalize">{props.reading.timeOfDay}</span>
            <Show when={props.reading.medications}>
              <span class="truncate">· {props.reading.medications}</span>
            </Show>
          </div>
        </div>

        <span
          class={cn(
            'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium',
            meta().chip,
          )}
        >
          {meta().label}
        </span>

        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={props.onEdit}
            class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Edit reading"
          >
            <PencilIcon class="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={props.onDelete}
            disabled={props.deleting}
            class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            aria-label="Delete reading"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function ListSkeleton() {
  return (
    <div class="space-y-2">
      <For each={[0, 1, 2]}>
        {() => (
          <div class="h-[74px] animate-pulse rounded-2xl border border-border bg-muted/40" />
        )}
      </For>
    </div>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent class="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand/15 to-brand-3/15 text-brand ring-1 ring-inset ring-brand/15">
          <CalendarIcon class="h-6 w-6" />
        </span>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">No readings yet</h2>
          <p class="max-w-sm text-sm text-muted-foreground">
            Log your first morning, afternoon or evening reading to start seeing
            your trends.
          </p>
        </div>
        <Link to="/entries/new">
          <Button variant="gradient">
            <PlusIcon />
            Add your first reading
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
