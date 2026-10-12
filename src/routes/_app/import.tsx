import { createFileRoute, Link } from '@tanstack/solid-router'
import { createSignal, For, Show } from 'solid-js'
import {
  AlertTriangleIcon,
  CheckIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  UploadIcon,
} from '../../components/icons'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { toDisplayDate } from '../../lib/bp'
import type {
  ImportCommitResult,
  ImportPreview,
  ImportRow,
  ImportRowError,
} from '../../lib/excel'
import { invalidateReadingsCache } from '../../lib/readings'
import { cn } from '../../lib/utils'

type ImportStatus = 'idle' | 'previewing' | 'preview' | 'committing' | 'done'

type ImportResult = ImportPreview | ImportCommitResult

export const Route = createFileRoute('/_app/import')({
  component: ImportPage,
})

function ImportPage() {
  const [status, setStatus] = createSignal<ImportStatus>('idle')
  const [file, setFile] = createSignal<File | null>(null)
  const [result, setResult] = createSignal<ImportResult | null>(null)
  const [error, setError] = createSignal<string | null>(null)

  const submit = async (mode: 'preview' | 'commit') => {
    const current = file()
    if (!current) return

    setError(null)
    setStatus(mode === 'commit' ? 'committing' : 'previewing')

    try {
      const form = new FormData()
      form.set('file', current)
      form.set('mode', mode)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: form,
      })
      const data = (await response.json()) as ImportResult | { error: string }

      if (!response.ok) {
        setError('error' in data ? data.error : 'Import failed.')
        setStatus('preview')
        return
      }

      setResult(data as ImportResult)
      if (mode === 'commit') invalidateReadingsCache()
      setStatus(mode === 'commit' ? 'done' : 'preview')
    } catch {
      setError('Could not reach the server. Please try again.')
      setStatus('preview')
    }
  }

  const handleFile = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const selected = input.files?.[0]
    if (!selected) return

    setFile(selected)
    setResult(null)
    void submit('preview')
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setStatus('idle')
  }

  const importing = () => status() === 'committing'

  return (
    <div class="mx-auto max-w-4xl space-y-8">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Import from Excel
          </h1>
          <p class="mt-1 max-w-xl text-sm text-muted-foreground">
            Upload a spreadsheet of past readings. Rows are validated and
            previewed before anything is saved — existing slots are updated, new
            ones are added.
          </p>
        </div>
        <a href="/api/import" download="bp-readings-template.xlsx">
          <Button variant="outline">
            <DownloadIcon />
            Download template
          </Button>
        </a>
      </header>

      <Show when={error()} fallback={null}>
        {(message) => (
          <p class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" />
            {message()}
          </p>
        )}
      </Show>

      <Show
        when={status() !== 'done'}
        fallback={<SuccessPanel result={result} onAnother={reset} />}
      >
        <Card>
          <CardContent class="space-y-6 p-6 sm:p-8">
            <Show when={!file()} fallback={<CurrentFile file={file} />}>
              <DropZone busy={status() === 'previewing'} onFile={handleFile} />
            </Show>

            <Show when={status() === 'preview' && result()}>
              {(current) => (
                <PreviewSection
                  result={current()}
                  busy={importing()}
                  onImport={() => void submit('commit')}
                  onReset={reset}
                />
              )}
            </Show>
          </CardContent>
        </Card>
      </Show>

      <p class="max-w-2xl text-xs leading-relaxed text-muted-foreground">
        Dates are read as <span class="font-medium">DD/MM/YYYY</span>.
        &ldquo;Reading&rdquo; can be a pair like{' '}
        <span class="font-medium">132/78</span>. The required columns are{' '}
        <span class="font-medium">Date</span>,{' '}
        <span class="font-medium">Time of Day</span> (Morning/Afternoon/Evening
        or AM/PM) and <span class="font-medium">Reading</span>; the rest are
        optional. One reading is kept per morning, afternoon and evening each
        day.
      </p>
    </div>
  )
}

function DropZone(props: { busy: boolean; onFile: (event: Event) => void }) {
  return (
    <label class="group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-brand/50 hover:bg-brand/5">
      <span class="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand transition-transform group-hover:scale-105">
        <UploadIcon class="h-6 w-6" />
      </span>
      <span class="text-sm font-medium">
        {props.busy ? 'Reading your file…' : 'Choose an .xlsx file to import'}
      </span>
      <span class="text-sm text-muted-foreground">
        Click to browse, or use the template above to start fresh.
      </span>
      <span class="text-xs text-muted-foreground max-w-md">
        For larger files, upload may take a moment while we analyse it.
      </span>
      <input
        type="file"
        accept=".xlsx"
        class="sr-only"
        onChange={props.onFile}
        disabled={props.busy}
        aria-label="Choose a spreadsheet to import"
      />
    </label>
  )
}

function CurrentFile(props: { file: () => File | null }) {
  const sizeLabel = () => {
    const bytes = props.file()?.size ?? 0
    return bytes > 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return (
    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
        <FileSpreadsheetIcon class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">{props.file()?.name}</p>
        <p class="text-xs text-muted-foreground">{sizeLabel()}</p>
      </div>
      <span class="text-xs text-brand">
        Analysing… (may take a moment for large files)
      </span>
    </div>
  )
}

function PreviewSection(props: {
  result: ImportResult
  busy: boolean
  onImport: () => void
  onReset: () => void
}) {
  return (
    <div class="space-y-4">
      <SummaryBar summary={props.result.summary} />

      <Show when={props.result.errors.length > 0}>
        <ErrorList errors={props.result.errors} />
      </Show>

      <Show when={props.result.rows.length > 0}>
        <PreviewTable rows={props.result.rows} />
        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={props.onReset}>
            Choose another file
          </Button>
          <Button
            type="button"
            variant="gradient"
            onClick={props.onImport}
            disabled={props.busy}
          >
            <UploadIcon />
            {props.busy
              ? 'Importing…'
              : `Import ${props.result.rows.length} reading${props.result.rows.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </Show>
    </div>
  )
}

function SummaryBar(props: {
  summary: { total: number; created: number; updated: number; invalid: number }
}) {
  const items = () => [
    { label: 'Readings', value: props.summary.total, tone: 'text-foreground' },
    {
      label: 'New',
      value: props.summary.created,
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Updated',
      value: props.summary.updated,
      tone: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Skipped',
      value: props.summary.invalid,
      tone: 'text-red-600 dark:text-red-400',
    },
  ]

  return (
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <For each={items()}>
        {(item) => (
          <div class="rounded-xl border border-border bg-background/60 px-4 py-3 text-center">
            <div class={cn('text-2xl font-semibold tabular-nums', item.tone)}>
              {item.value}
            </div>
            <div class="mt-0.5 text-xs font-medium text-muted-foreground">
              {item.label}
            </div>
          </div>
        )}
      </For>
    </div>
  )
}

function ErrorList(props: { errors: ImportRowError[] }) {
  return (
    <div class="space-y-1.5">
      <p class="text-sm font-medium text-destructive">Skipped rows</p>
      <div class="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-destructive/20 bg-destructive/5 p-3">
        <For each={props.errors}>
          {(rowError) => (
            <p class="flex gap-2 text-xs leading-relaxed text-destructive">
              <span class="shrink-0 font-semibold tabular-nums">
                Row {rowError.rowNumber}:
              </span>
              <span>{rowError.message}</span>
            </p>
          )}
        </For>
      </div>
    </div>
  )
}

function PreviewTable(props: { rows: ImportRow[] }) {
  return (
    <div class="overflow-hidden rounded-xl border border-border">
      <div class="max-h-96 overflow-y-auto">
        <table class="w-full text-left text-sm">
          <thead class="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr class="text-xs uppercase tracking-wide text-muted-foreground">
              <th class="px-4 py-2.5 font-semibold">Date</th>
              <th class="px-4 py-2.5 font-semibold">Time</th>
              <th class="px-4 py-2.5 font-semibold">Reading</th>
              <th class="hidden px-4 py-2.5 font-semibold sm:table-cell">
                Heart rate
              </th>
              <th class="hidden px-4 py-2.5 font-semibold md:table-cell">
                Medications
              </th>
              <th class="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <For each={props.rows}>
              {(row) => (
                <tr class="bg-card transition-colors hover:bg-muted/40">
                  <td class="whitespace-nowrap px-4 py-2.5 tabular-nums">
                    {toDisplayDate(row.date)}
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 capitalize">
                    {row.timeOfDay}
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums">
                    {row.systolic}/{row.diastolic}
                    <span class="ml-1 text-xs font-normal text-muted-foreground">
                      mmHg
                    </span>
                  </td>
                  <td class="hidden whitespace-nowrap px-4 py-2.5 tabular-nums sm:table-cell">
                    {row.heartRate ?? '—'}
                  </td>
                  <td class="hidden max-w-[12rem] truncate px-4 py-2.5 text-muted-foreground md:table-cell">
                    {row.medications ?? '—'}
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5">
                    <span
                      class={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-medium',
                        row.status === 'created'
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                      )}
                    >
                      {row.status === 'created' ? 'New' : 'Updated'}
                    </span>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SuccessPanel(props: {
  result: () => ImportResult | null
  onAnother: () => void
}) {
  const summary = props.result
  return (
    <Card class="border-emerald-500/25">
      <CardContent class="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-400">
          <CheckIcon class="h-6 w-6" />
        </span>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">Imported successfully</h2>
          <p class="max-w-sm text-sm text-muted-foreground">
            {summary()?.summary.created} new reading
            {summary()?.summary.created === 1 ? '' : 's'} added and{' '}
            {summary()?.summary.updated} updated.
            {summary()?.summary.invalid
              ? ` ${summary()?.summary.invalid} skipped.`
              : ''}
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <Button variant="gradient" onClick={props.onAnother}>
            <UploadIcon />
            Import another file
          </Button>
          <Link to="/entries">
            <Button variant="outline">View readings</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
