import { createFileRoute } from '@tanstack/solid-router'
import { and, eq, inArray } from 'drizzle-orm'

import { db } from '../../db'
import { readings } from '../../db/schema'
import { auth } from '../../lib/auth'
import {
  buildTemplateBuffer,
  type ImportCommitResult,
  type ImportPreview,
  type ImportRow,
  parseImportSheet,
  readWorkbookRows,
  XLSX_CONTENT_TYPE,
} from '../../lib/excel'
import { invalidateDashboardStats } from '../../lib/readings'

const MAX_FILE_BYTES = 5 * 1024 * 1024

export const Route = createFileRoute('/api/import')({
  server: {
    handlers: {
      GET: async () => {
        const buffer = await buildTemplateBuffer()
        return new Response(buffer as BodyInit, {
          headers: {
            'content-type': XLSX_CONTENT_TYPE,
            'content-disposition':
              'attachment; filename="bp-readings-template.xlsx"',
          },
        })
      },

      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: 'Not authenticated' }, { status: 401 })
        }
        const userId = session.user.id

        const form = await request.formData()
        const file = form.get('file')
        const mode = form.get('mode') === 'commit' ? 'commit' : 'preview'

        if (!(file instanceof File)) {
          return Response.json(
            { error: 'Please attach an .xlsx file.' },
            { status: 400 },
          )
        }
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
          return Response.json(
            { error: 'Only .xlsx files are supported.' },
            { status: 400 },
          )
        }

        const buffer = new Uint8Array(await file.arrayBuffer())
        if (buffer.byteLength > MAX_FILE_BYTES) {
          return Response.json(
            { error: 'That file is too large (maximum 5 MB).' },
            { status: 400 },
          )
        }

        const sheet = await readWorkbookRows(buffer)
        const parsed = parseImportSheet(sheet)

        if (parsed.missing.length > 0) {
          const headerError = parsed.errors.find(
            (error) => error.rowNumber === 0,
          )
          return Response.json(
            { error: headerError?.message ?? 'Unrecognised sheet format.' },
            { status: 400 },
          )
        }

        const dates = [...new Set(parsed.rows.map((row) => row.date))]
        const existing =
          dates.length > 0
            ? await db
                .select({ date: readings.date, timeOfDay: readings.timeOfDay })
                .from(readings)
                .where(
                  and(
                    eq(readings.userId, userId),
                    inArray(readings.date, dates),
                  ),
                )
            : []

        const slotKey = (date: string, timeOfDay: string) =>
          `${date}\u0000${timeOfDay}`
        const existingSlots = new Set(
          existing.map((row) => slotKey(row.date, row.timeOfDay)),
        )

        const rows: ImportRow[] = parsed.rows.map((row) => ({
          ...row,
          status: existingSlots.has(slotKey(row.date, row.timeOfDay))
            ? 'updated'
            : 'created',
        }))

        const summary = {
          total: rows.length,
          created: rows.filter((row) => row.status === 'created').length,
          updated: rows.filter((row) => row.status === 'updated').length,
          invalid: parsed.errors.length,
        }

        if (mode === 'preview') {
          const preview: ImportPreview = {
            mode: 'preview',
            rows,
            errors: parsed.errors,
            summary,
          }
          return Response.json(preview)
        }

        if (rows.length === 0) {
          return Response.json(
            { error: 'No valid rows to import.' },
            { status: 400 },
          )
        }

        await db.transaction(async (tx) => {
          for (const row of rows) {
            await tx
              .insert(readings)
              .values({
                userId,
                date: row.date,
                timeOfDay: row.timeOfDay,
                systolic: row.systolic,
                diastolic: row.diastolic,
                heartRate: row.heartRate,
                medications: row.medications,
                activities: row.activities,
                notes: row.notes,
              })
              .onConflictDoUpdate({
                target: [readings.userId, readings.date, readings.timeOfDay],
                set: {
                  systolic: row.systolic,
                  diastolic: row.diastolic,
                  heartRate: row.heartRate,
                  medications: row.medications,
                  activities: row.activities,
                  notes: row.notes,
                  updatedAt: new Date(),
                },
              })
          }
        })

        const result: ImportCommitResult = {
          mode: 'commit',
          rows,
          errors: parsed.errors,
          summary,
        }
        invalidateDashboardStats(userId)
        return Response.json(result)
      },
    },
  },
})
