import { createFileRoute } from '@tanstack/solid-router'
import { asc, eq } from 'drizzle-orm'

import { db } from '../../db'
import { readings } from '../../db/schema'
import { auth } from '../../lib/auth'
import { filterByPeriod, isBpPeriod, toIsoDate } from '../../lib/bp'
import { buildReportBuffer, XLSX_CONTENT_TYPE } from '../../lib/excel'

export const Route = createFileRoute('/api/report')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const url = new URL(request.url)
        const requestedPeriod = url.searchParams.get('period')
        const period = isBpPeriod(requestedPeriod) ? requestedPeriod : 'all'

        const all = await db
          .select()
          .from(readings)
          .where(eq(readings.userId, session.user.id))
          .orderBy(asc(readings.date), asc(readings.timeOfDay))

        const scoped = filterByPeriod(all, period)

        const buffer = await buildReportBuffer({
          email: session.user.email,
          generatedAt: new Date(),
          period,
          readings: scoped,
        })

        const filename = `pulse-report-${period}-${toIsoDate(new Date())}.xlsx`
        return new Response(buffer as BodyInit, {
          headers: {
            'content-type': XLSX_CONTENT_TYPE,
            'content-disposition': `attachment; filename="${filename}"`,
          },
        })
      },
    },
  },
})
