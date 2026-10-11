import { createServerFn } from '@tanstack/solid-start'
import { getRequest } from '@tanstack/solid-start/server'

import { auth } from './auth'

const fetchSession = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  })

  return session
})

type Session = Awaited<ReturnType<typeof fetchSession>>

// The session rarely changes, so cache it on the client. This stops every
// client-side navigation from making a round trip to the server just to check
// who is signed in. The server always reads it fresh per request.
const SESSION_TTL = 5 * 60_000

let cachedSession: Session | undefined
let cachedAt = 0
let inflight: Promise<Session> | undefined

export async function getSession(): Promise<Session> {
  if (typeof window === 'undefined') {
    return fetchSession()
  }

  if (cachedSession !== undefined && Date.now() - cachedAt < SESSION_TTL) {
    return cachedSession
  }

  inflight ??= fetchSession()
    .then((session) => {
      cachedSession = session
      cachedAt = Date.now()
      return session
    })
    .finally(() => {
      inflight = undefined
    })

  return inflight
}

/** Drops the cached session, e.g. after signing out. */
export function invalidateSessionCache(): void {
  cachedSession = undefined
  cachedAt = 0
  inflight = undefined
}
