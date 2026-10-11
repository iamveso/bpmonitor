import { createServerFn } from '@tanstack/solid-start'
import { getRequest } from '@tanstack/solid-start/server'
import { and, desc, eq, gt, lt, or } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import { readings } from '../db/schema'
import { auth } from './auth'
import {
  type ReadingDTO,
  readingIdSchema,
  readingInputSchema,
  type TimeOfDay,
} from './reading-schema'

export {
  READING_SLOTS,
  type ReadingDTO,
  type ReadingInput,
  readingIdSchema,
  readingInputSchema,
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
  cursorTime: z.enum(['morning', 'evening']).optional(),
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

export const listReadings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ReadingDTO[]> => {
    const userId = await requireUserId()

    const rows = await db
      .select()
      .from(readings)
      .where(eq(readings.userId, userId))
      .orderBy(desc(readings.date), readings.timeOfDay)

    return rows.map(serialize)
  },
)

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

    const where = cursor
      ? and(
          eq(readings.userId, userId),
          or(
            lt(readings.date, cursor.date),
            and(
              eq(readings.date, cursor.date),
              gt(readings.timeOfDay, cursor.timeOfDay),
            ),
          ),
        )
      : eq(readings.userId, userId)

    const rows = await db
      .select()
      .from(readings)
      .where(where)
      .orderBy(desc(readings.date), readings.timeOfDay)
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

// The dashboard needs the full history to compute aggregates. Cache it on the
// client so navigating back to the dashboard does not re-download everything.
const LIST_CACHE_TTL = 30_000
let listCache: { at: number; data: ReadingDTO[] } | undefined

export async function listReadingsCached(): Promise<ReadingDTO[]> {
  if (
    typeof window !== 'undefined' &&
    listCache &&
    Date.now() - listCache.at < LIST_CACHE_TTL
  ) {
    return listCache.data
  }

  const data = await listReadings()

  if (typeof window !== 'undefined') {
    listCache = { at: Date.now(), data }
  }

  return data
}

/** Clears the client-side cache after any change to the readings. */
export function invalidateReadingsCache(): void {
  listCache = undefined
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

    return serialize(row)
  })

export const deleteReading = createServerFn({ method: 'POST' })
  .validator(readingIdSchema)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const userId = await requireUserId()

    await db
      .delete(readings)
      .where(and(eq(readings.id, data.id), eq(readings.userId, userId)))

    return { ok: true }
  })
