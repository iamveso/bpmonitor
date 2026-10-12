// ---------------------------------------------------------------------------
// Blood pressure classification, aggregation and period helpers.
//
// Thresholds use the ACC/AHA *home-monitoring* categories (listed in
// PLAN.md §3.3) because every reading comes from a home electronic device.
// Everything here is pure and framework-free so it can run on the client and
// the server (dashboard + Excel report) and be unit-tested in isolation.
// ---------------------------------------------------------------------------

// --- Classification --------------------------------------------------------

export type BpCategoryId =
  | 'normal'
  | 'elevated'
  | 'stage-1'
  | 'stage-2'
  | 'crisis'
  | 'hypotension'

export interface BpCategoryMeta {
  id: BpCategoryId
  label: string
  /** Short human-readable systolic / diastolic range. */
  range: string
  description: string
  /** Tailwind classes for a pill/badge. */
  chip: string
  /** Tailwind background class for a small status dot. */
  dot: string
}

export const BP_CATEGORIES: Record<BpCategoryId, BpCategoryMeta> = {
  normal: {
    id: 'normal',
    label: 'Normal',
    range: '< 120 / < 80',
    description: 'Within the healthy home-monitoring range.',
    chip: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  elevated: {
    id: 'elevated',
    label: 'Elevated',
    range: '120–129 / < 80',
    description: 'Slightly above normal — worth keeping an eye on.',
    chip: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  'stage-1': {
    id: 'stage-1',
    label: 'Hypertension Stage 1',
    range: '130–134 / 80–84',
    description: 'Stage 1 hypertension (home-monitoring range).',
    chip: 'border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
  'stage-2': {
    id: 'stage-2',
    label: 'Hypertension Stage 2',
    range: '≥ 135 / ≥ 85',
    description: 'Stage 2 hypertension (home-monitoring range).',
    chip: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  crisis: {
    id: 'crisis',
    label: 'Hypertensive Crisis',
    range: '> 180 and/or > 120',
    description: 'Seek emergency medical care immediately.',
    chip: 'border-red-600/40 bg-red-600/15 text-red-700 dark:text-red-300',
    dot: 'bg-red-600',
  },
  hypotension: {
    id: 'hypotension',
    label: 'Low',
    range: '< 90 / < 60',
    description: 'Below the normal range — only concerning if symptomatic.',
    chip: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
}

export const BP_CATEGORY_ORDER: BpCategoryId[] = [
  'hypotension',
  'normal',
  'elevated',
  'stage-1',
  'stage-2',
  'crisis',
]

export function getCategoryMeta(id: BpCategoryId): BpCategoryMeta {
  return BP_CATEGORIES[id]
}

/**
 * Classify a single systolic/diastolic pair. The returned category reflects
 * the *worse* of the two numbers. Crisis is evaluated first so it always wins,
 * and hypotension is checked before the normal range (a low diastolic must not
 * be reported as "normal").
 */
export function classifyReading(
  systolic: number,
  diastolic: number,
): BpCategoryId {
  if (systolic > 180 || diastolic > 120) return 'crisis'
  if (systolic < 90 || diastolic < 60) return 'hypotension'
  if (systolic >= 135 || diastolic >= 85) return 'stage-2'
  if (systolic >= 130 || diastolic >= 80) return 'stage-1'
  if (systolic >= 120) return 'elevated'
  return 'normal'
}

// --- Aggregation -----------------------------------------------------------

export interface ReadingLike {
  systolic: number
  diastolic: number
  heartRate?: number | null
}

export interface ReadingAverage {
  count: number
  systolic: number | null
  diastolic: number | null
  pulsePressure: number | null
  heartRate: number | null
}

const EMPTY_AVERAGE: ReadingAverage = {
  count: 0,
  systolic: null,
  diastolic: null,
  pulsePressure: null,
  heartRate: null,
}

/** Mean systolic/diastolic/pulse pressure and heart rate, rounded to whole numbers. */
export function averageReadings(
  readings: readonly ReadingLike[],
): ReadingAverage {
  if (readings.length === 0) return { ...EMPTY_AVERAGE }

  const count = readings.length
  const systolic = Math.round(
    readings.reduce((sum, r) => sum + r.systolic, 0) / count,
  )
  const diastolic = Math.round(
    readings.reduce((sum, r) => sum + r.diastolic, 0) / count,
  )

  const heartRates = readings
    .map((r) => r.heartRate)
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value),
    )

  const heartRate =
    heartRates.length > 0
      ? Math.round(
          heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length,
        )
      : null

  return {
    count,
    systolic,
    diastolic,
    pulsePressure: systolic - diastolic,
    heartRate,
  }
}

/** Classify the average of a set of readings, or `null` when there are none. */
export function classifyAverage(
  readings: readonly ReadingLike[],
): BpCategoryId | null {
  const average = averageReadings(readings)
  if (average.systolic === null || average.diastolic === null) return null
  return classifyReading(average.systolic, average.diastolic)
}

// --- Dates -----------------------------------------------------------------

/** Parse a stored `YYYY-MM-DD` string into a local `Date` (no UTC shift). */
export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Format a `Date` (or `YYYY-MM-DD` string) as `YYYY-MM-DD`. */
export function toIsoDate(value: Date | string): string {
  const date = typeof value === 'string' ? parseIsoDate(value) : value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Format a stored `YYYY-MM-DD` (or `Date`) as `DD/MM/YYYY` for display. */
export function toDisplayDate(value: Date | string): string {
  const [year, month, day] = toIsoDate(value).split('-')
  return `${day}/${month}/${year}`
}

/**
 * Parse a `DD/MM/YYYY` display string into `YYYY-MM-DD`, or `null` when the
 * text is not a real calendar date (e.g. 31/02/2026).
 */
export function parseDisplayDate(text: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim())
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return toIsoDate(date)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Start of the day `months` calendar months before `date`, clamped to the
 * last valid day when the target month is shorter (e.g. 31 May → 28/29 Feb). */
function monthsAgo(date: Date, months: number): Date {
  const target = new Date(
    date.getFullYear(),
    date.getMonth() - months,
    date.getDate(),
  )
  if (target.getDate() !== date.getDate()) target.setDate(0)
  return startOfDay(target)
}

/** Start of the day `days` days before `date`. */
function daysAgo(date: Date, days: number): Date {
  const start = startOfDay(date)
  start.setDate(start.getDate() - days)
  return start
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  )
}

function startOfWeek(date: Date): Date {
  // ISO week: Monday is the first day of the week.
  const offset = (date.getDay() + 6) % 7
  const start = startOfDay(date)
  start.setDate(start.getDate() - offset)
  return start
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
}

export interface DateRange {
  start: Date
  end: Date
}

// --- Period filtering ------------------------------------------------------

export type BpPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'all'

export const BP_PERIODS: { id: BpPeriod; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'all', label: 'All time' },
]

export function isBpPeriod(value: unknown): value is BpPeriod {
  return typeof value === 'string' && BP_PERIODS.some((p) => p.id === value)
}

/**
 * Inclusive range for the *current* period, or `null` for "all time". Daily
 * and monthly use the current calendar day/month; weekly is the last 7 days,
 * quarterly the last 3 months and yearly the last 12 months (rolling windows
 * ending today).
 */
export function getPeriodRange(
  period: BpPeriod,
  now: Date = new Date(),
): DateRange | null {
  const year = now.getFullYear()

  switch (period) {
    case 'daily':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'weekly':
      return { start: daysAgo(now, 6), end: endOfDay(now) }
    case 'monthly': {
      const start = new Date(year, now.getMonth(), 1)
      const end = new Date(year, now.getMonth() + 1, 0)
      return { start, end: endOfDay(end) }
    }
    case 'quarterly':
      return { start: monthsAgo(now, 3), end: endOfDay(now) }
    case 'yearly':
      return { start: monthsAgo(now, 12), end: endOfDay(now) }
    case 'all':
      return null
  }
}

export interface DatedReading {
  date: string
}

/** Keep only readings whose `date` falls inside the current period. */
export function filterByPeriod<T extends DatedReading>(
  readings: readonly T[],
  period: BpPeriod,
  now: Date = new Date(),
): T[] {
  const range = getPeriodRange(period, now)
  if (!range) return [...readings]

  return readings.filter((reading) => {
    const date = parseIsoDate(reading.date)
    return date >= range.start && date <= range.end
  })
}

// --- Bucketing (for the trend chart) --------------------------------------

export type BucketGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

const PERIOD_GRANULARITY: Record<BpPeriod, BucketGranularity> = {
  daily: 'day',
  weekly: 'day',
  monthly: 'day',
  quarterly: 'week',
  yearly: 'month',
  all: 'month',
}

/** The natural chart granularity for a selected period. */
export function granularityForPeriod(period: BpPeriod): BucketGranularity {
  return PERIOD_GRANULARITY[period]
}

export interface ReadingBucket<T> {
  key: string
  label: string
  start: Date
  readings: T[]
  average: ReadingAverage
}

function bucketStart(date: Date, granularity: BucketGranularity): Date {
  switch (granularity) {
    case 'day':
      return startOfDay(date)
    case 'week':
      return startOfWeek(date)
    case 'month':
      return startOfMonth(date)
    case 'quarter':
      return startOfQuarter(date)
    case 'year':
      return new Date(date.getFullYear(), 0, 1)
  }
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function bucketLabel(start: Date, granularity: BucketGranularity): string {
  switch (granularity) {
    case 'day':
    case 'week':
      return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]}`
    case 'month':
      return `${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()}`
    case 'quarter':
      return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`
    case 'year':
      return String(start.getFullYear())
  }
}

/**
 * Group readings into chronological buckets and compute each bucket's average,
 * ready to plot on the trend chart.
 */
export function bucketReadings<T extends DatedReading & ReadingLike>(
  readings: readonly T[],
  granularity: BucketGranularity,
): ReadingBucket<T>[] {
  const groups = new Map<string, { start: Date; readings: T[] }>()

  for (const reading of readings) {
    const start = bucketStart(parseIsoDate(reading.date), granularity)
    const key = toIsoDate(start)
    const group = groups.get(key)
    if (group) {
      group.readings.push(reading)
    } else {
      groups.set(key, { start, readings: [reading] })
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, group]) => ({
      key,
      label: bucketLabel(group.start, granularity),
      start: group.start,
      readings: group.readings,
      average: averageReadings(group.readings),
    }))
}

/** Convenience wrapper: bucket using the natural granularity for a period. */
export function bucketByPeriod<T extends DatedReading & ReadingLike>(
  readings: readonly T[],
  period: BpPeriod,
): ReadingBucket<T>[] {
  return bucketReadings(readings, granularityForPeriod(period))
}
