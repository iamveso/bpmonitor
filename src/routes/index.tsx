import { createFileRoute, redirect } from '@tanstack/solid-router'

import { getSession } from '../lib/session'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSession()

    throw redirect({ to: session ? '/dashboard' : '/sign-in' })
  },
})
