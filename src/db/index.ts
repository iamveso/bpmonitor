import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import { env } from '../env'
import * as schema from './schema'

// A single libSQL client works for both Turso (remote) and a local SQLite file
// (`file:local.db`), so dev and production share one code path.
export const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_TOKEN,
})

export const db = drizzle(client, { schema })

export type Database = typeof db
export { schema }
