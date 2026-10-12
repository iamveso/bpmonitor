import { createServerFn } from '@tanstack/solid-start'
import { getRequest } from '@tanstack/solid-start/server'
import { and, desc, eq, gte, lt, lte, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import { readings, timeOfDayOrder } from '../db/schema'
import { auth } from './auth'
import {
  averageReadings,
  type BpCategoryId,
  type BpPeriod,
  bucketByPeriod,
  classifyAverage,
  classifyReading,
  getPeriodRange,
  type ReadingAverage,
  toIsoDate,
} from './bp'
import {
  type ReadingDTO,
  readingIdSchema,
  readingInputSchema,
  SLOT_ORDER,
  type TimeOfDay,
} from './reading-schema'

export {
  READING_SLOTS,
  type ReadingDTO,
  type ReadingInput,
  readingIdSchema,
  readingInputSchema,
  SLOT_ORDER,
  slotLabel,
  type TimeOfDay,
} from './reading-schema'

/** Number of readings fetched per page on the readings list. */
export const DEFAULT_PAGE_SIZE = 20

export interface ReadingsPageCursor {
  date: string
  timeOfDay: TimeOfDay
}

export interface ReadingsPage {
  items: ReadingDTO[]
  nextCursor: ReadingsPageCursor | null
}

const readingsPageSchema = z.object({
  cursorDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  cursorTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers })

  if (!session) {
    throw new Error('Not authenticated')
  }

  return session.user.id
}

function serialize(row: typeof readings.$inferSelect): ReadingDTO {
  return {
    id: row.id,
    date: row.date,
    timeOfDay: row.timeOfDay,
    systolic: row.systolic,
    diastolic: row.diastolic,
    heartRate: row.heartRate,
    medications: row.medications,
    activities: row.activities,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Fetches a single page of readings, newest first. Pagination is keyset based
 * on `(date, timeOfDay)`, which is unique per user, so pages never skip or
 * repeat rows even when readings are added between requests.
 */
export const listReadingsPage = createServerFn({ method: 'GET' })
  .validator(readingsPageSchema)
  .handler(async ({ data }): Promise<ReadingsPage> => {
    const userId = await requireUserId()
    const limit = data.limit ?? DEFAULT_PAGE_SIZE

    const cursor =
      data.cursorDate && data.cursorTime
        ? { date: data.cursorDate, timeOfDay: data.cursorTime }
        : null

    const rows = await db
      .select()
      .from(readings)
      .where(
        and(
          eq(readings.userId, userId),
          cursor
            ? or(
                lt(readings.date, cursor.date),
                and(
                  eq(readings.date, cursor.date),
                  lt(timeOfDayOrder, SLOT_ORDER[cursor.timeOfDay]),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(readings.date), desc(timeOfDayOrder))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    const last = pageRows.at(-1)

    return {
      items: pageRows.map(serialize),
      nextCursor:
        hasMore && last ? { date: last.date, timeOfDay: last.timeOfDay } : null,
    }
  })

// --- Dashboard statistics --------------------------------------------------
//
// The dashboard needs aggregate numbers, not the raw rows. We compute them on
// the server, scoped to the selected period with a date-range query, and return
// a compact payload. Results are cached on both the client (per period, so tab
// switches are instant) and the server (per user + period) to avoid repeating
// the scans; server entries are dropped whenever readings change.

export interface DashboardTrendPoint {
  label: string
  systolic: number
  diastolic: number
  heartRate: number | null
}

export interface DashboardSlotStats {
  average: ReadingAverage
  category: BpCategoryId | null
}

export interface DashboardCategoryCount {
  id: BpCategoryId
  count: number
}

export interface DashboardStats {
  /** Total readings across every period (drives the empty state). */
  totalReadings: number
  /** Readings inside the selected period. */
  periodCount: number
  average: ReadingAverage
  averageCategory: BpCategoryId | null
  categories: DashboardCategoryCount[]
  slots: Record<TimeOfDay, DashboardSlotStats>
  trend: DashboardTrendPoint[]
  range: { from: string; to: string } | null
}

const DASHBOARD_PERIODS = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'all',
] as const satisfies readonly BpPeriod[]

const dashboardStatsSchema = z.object({
  period: z.enum(DASHBOARD_PERIODS),
})

type ReadingRow = typeof readings.$inferSelect

function buildDashboardStats(
  rows: readonly ReadingRow[],
  period: BpPeriod,
  totalReadings: number,
): DashboardStats {
  const categoryCounts = new Map<BpCategoryId, number>()
  for (const reading of rows) {
    const category = classifyReading(reading.systolic, reading.diastolic)
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
  }

  const slots = {} as Record<TimeOfDay, DashboardSlotStats>
  for (const slot of ['morning', 'afternoon', 'evening'] as const) {
    const slotReadings = rows.filter((r) => r.timeOfDay === slot)
    slots[slot] = {
      average: averageReadings(slotReadings),
      category: classifyAverage(slotReadings),
    }
  }

  const trend = bucketByPeriod(rows, period).map((bucket) => ({
    label: bucket.label,
    systolic: bucket.average.systolic ?? 0,
    diastolic: bucket.average.diastolic ?? 0,
    heartRate: bucket.average.heartRate,
  }))

  const dates = rows.map((reading) => reading.date).sort()
  const window = getPeriodRange(period)
  const range =
    dates.length > 0
      ? { from: dates[0], to: dates[dates.length - 1] }
      : window
        ? { from: toIsoDate(window.start), to: toIsoDate(window.end) }
        : null

  return {
    totalReadings,
    periodCount: rows.length,
    average: averageReadings(rows),
    averageCategory: classifyAverage(rows),
    categories: [...categoryCounts.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count),
    slots,
    trend,
    range,
  }
}

const STATS_TTL = 30_000

// Server-side cache: keyed by user + period, invalidated on every write.
const serverStatsCache = new Map<string, { at: number; data: DashboardStats }>()

const statsKey = (userId: string, period: BpPeriod) =>
  `${userId}\u0000${period}`

/** Drop cached dashboard stats for a user after their readings change. */
export function invalidateDashboardStats(userId: string): void {
  const prefix = `${userId}\u0000`
  for (const key of serverStatsCache.keys()) {
    if (key.startsWith(prefix)) serverStatsCache.delete(key)
  }
}

export const getDashboardStats = createServerFn({ method: 'GET' })
  .validator(dashboardStatsSchema)
  .handler(async ({ data }): Promise<DashboardStats> => {
    const userId = await requireUserId()
    const { period } = data

    const key = statsKey(userId, period)
    const cached = serverStatsCache.get(key)
    if (cached && Date.now() - cached.at < STATS_TTL) return cached.data

    const range = getPeriodRange(period)
    const rows = await db
      .select()
      .from(readings)
      .where(
        and(
          eq(readings.userId, userId),
          range ? gte(readings.date, toIsoDate(range.start)) : undefined,
          range ? lte(readings.date, toIsoDate(range.end)) : undefined,
        ),
      )

    let totalReadings = rows.length
    if (period !== 'all') {
      const [countRow] = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(readings)
        .where(eq(readings.userId, userId))
      totalReadings = countRow?.count ?? 0
    }

    const stats = buildDashboardStats(rows, period, totalReadings)
    serverStatsCache.set(key, { at: Date.now(), data: stats })
    return stats
  })

// Client-side cache: keyed by period so revisiting a tab does not refetch.
const clientStatsCache = new Map<
  BpPeriod,
  { at: number; data: DashboardStats }
>()

/**
 * Read dashboard stats for a period, preferring the client cache. Returns the
 * cached value synchronously when warm so tab switches do not flash a skeleton.
 */
export function getDashboardStatsCached(
  period: BpPeriod,
): DashboardStats | Promise<DashboardStats> {
  if (typeof window !== 'undefined') {
    const cached = clientStatsCache.get(period)
    if (cached && Date.now() - cached.at < STATS_TTL) return cached.data
  }

  return getDashboardStats({ data: { period } }).then((data) => {
    if (typeof window !== 'undefined') {
      clientStatsCache.set(period, { at: Date.now(), data })
    }
    return data
  })
}

/** Clears the client-side cache after any change to the readings. */
export function invalidateReadingsCache(): void {
  clientStatsCache.clear()
}

export const upsertReading = createServerFn({ method: 'POST' })
  .validator(readingInputSchema)
  .handler(async ({ data }): Promise<ReadingDTO> => {
    const userId = await requireUserId()

    const values = {
      userId,
      date: data.date,
      timeOfDay: data.timeOfDay,
      systolic: data.systolic,
      diastolic: data.diastolic,
      heartRate: data.heartRate ?? null,
      medications: data.medications ?? null,
      activities: data.activities ?? null,
      notes: data.notes ?? null,
    }

    const [row] = await db
      .insert(readings)
      .values(values)
      .onConflictDoUpdate({
        target: [readings.userId, readings.date, readings.timeOfDay],
        set: {
          systolic: values.systolic,
          diastolic: values.diastolic,
          heartRate: values.heartRate,
          medications: values.medications,
          activities: values.activities,
          notes: values.notes,
          updatedAt: new Date(),
        },
      })
      .returning()

    invalidateDashboardStats(userId)
    return serialize(row)
  })

export const deleteReading = createServerFn({ method: 'POST' })
  .validator(readingIdSchema)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const userId = await requireUserId()

    await db
      .delete(readings)
      .where(and(eq(readings.id, data.id), eq(readings.userId, userId)))

    invalidateDashboardStats(userId)
    return { ok: true }
  })
