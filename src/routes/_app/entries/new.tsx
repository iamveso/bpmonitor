import { createFileRoute, useNavigate } from '@tanstack/solid-router'

import { ReadingForm } from '../../../components/reading-form'
import { Card, CardContent } from '../../../components/ui/card'

export const Route = createFileRoute('/_app/entries/new')({
  component: NewEntryPage,
})

function NewEntryPage() {
  const navigate = useNavigate()
  const goBack = () => void navigate({ to: '/entries' })

  return (
    <div class="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          New reading
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Record a morning, afternoon or evening measurement. Saving the same
          date and slot again updates it.
        </p>
      </header>

      <Card class="animate-fade-up">
        <CardContent class="p-6">
          <ReadingForm onSaved={goBack} onCancel={goBack} />
        </CardContent>
      </Card>
    </div>
  )
}
