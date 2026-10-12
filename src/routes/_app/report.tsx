import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, For } from 'solid-js'
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  InfoIcon,
} from '../../components/icons'
import { PeriodTabs } from '../../components/period-tabs'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { BP_PERIODS, type BpPeriod } from '../../lib/bp'

export const Route = createFileRoute('/_app/report')({
  component: ReportPage,
})

const SHEETS = [
  {
    name: 'Readings',
    detail:
      'Every reading in the selected period — date, time of day, blood pressure, heart rate, medications, activities, notes and the computed category.',
  },
  {
    name: 'Summary',
    detail:
      'Averages for systolic, diastolic, pulse pressure and heart rate, the overall classification, a category breakdown and the morning vs afternoon vs evening split.',
  },
  {
    name: 'Notes',
    detail:
      'The measurement method, the ACC/AHA thresholds used for classification, and a disclaimer.',
  },
]

function ReportPage() {
  const [period, setPeriod] = createSignal<BpPeriod>('all')

  const downloadUrl = () => `/api/report?period=${period()}`
  const periodName = () =>
    BP_PERIODS.find((entry) => entry.id === period())?.label ?? 'All time'

  return (
    <div class="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Export a report
        </h1>
        <p class="mt-1 max-w-xl text-sm text-muted-foreground">
          Download an Excel workbook to share with your doctor. Choose the
          period to include, then download the file — it opens in Excel, Numbers
          or Google Sheets.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Choose a period</CardTitle>
          <CardDescription>
            The report covers readings from the selected period only.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <PeriodTabs value={period()} onChange={setPeriod} />

          <div class="flex flex-wrap items-center gap-3">
            <a href={downloadUrl()}>
              <Button variant="gradient" size="lg">
                <DownloadIcon />
                Download {periodName()} report
              </Button>
            </a>
            <span class="text-xs text-muted-foreground">
              Generates an .xlsx workbook with {SHEETS.length} sheets.
            </span>
          </div>
        </CardContent>
      </Card>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold tracking-tight">
          What's in the workbook
        </h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <For each={SHEETS}>
            {(sheet) => (
              <Card class="h-full">
                <CardContent class="space-y-2 p-5">
                  <div class="flex items-center gap-2 text-brand">
                    <FileSpreadsheetIcon class="h-5 w-5" />
                    <span class="font-semibold text-foreground">
                      {sheet.name}
                    </span>
                  </div>
                  <p class="text-sm text-muted-foreground">{sheet.detail}</p>
                </CardContent>
              </Card>
            )}
          </For>
        </div>
      </div>

      <p class="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        <InfoIcon class="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        Averages are indicative and are not a diagnosis. In a hypertensive
        crisis, seek emergency medical care immediately.
      </p>
    </div>
  )
}
