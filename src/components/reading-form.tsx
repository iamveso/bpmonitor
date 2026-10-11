import { createSignal, For, Show } from 'solid-js'

import {
  classifyReading,
  getCategoryMeta,
  parseDisplayDate,
  toDisplayDate,
} from '../lib/bp'
import {
  invalidateReadingsCache,
  READING_SLOTS,
  type ReadingDTO,
  type TimeOfDay,
  upsertReading,
} from '../lib/readings'
import { cn } from '../lib/utils'
import { CheckIcon, ClockIcon, InfoIcon, XIcon } from './icons'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

export interface ReadingFormProps {
  initial?: ReadingDTO
  onSaved?: (reading: ReadingDTO) => void
  onCancel?: () => void
}

function defaultSlot(): TimeOfDay {
  return new Date().getHours() < 12 ? 'morning' : 'evening'
}

export function ReadingForm(props: ReadingFormProps) {
  const [dateText, setDateText] = createSignal(
    props.initial
      ? toDisplayDate(props.initial.date)
      : toDisplayDate(new Date()),
  )
  const [slot, setSlot] = createSignal<TimeOfDay>(
    props.initial?.timeOfDay ?? defaultSlot(),
  )
  const [systolic, setSystolic] = createSignal(
    props.initial ? String(props.initial.systolic) : '',
  )
  const [diastolic, setDiastolic] = createSignal(
    props.initial ? String(props.initial.diastolic) : '',
  )
  const [heartRate, setHeartRate] = createSignal(
    props.initial?.heartRate != null ? String(props.initial.heartRate) : '',
  )
  const [medications, setMedications] = createSignal(
    props.initial?.medications ?? '',
  )
  const [activities, setActivities] = createSignal(
    props.initial?.activities ?? '',
  )
  const [notes, setNotes] = createSignal(props.initial?.notes ?? '')
  const [error, setError] = createSignal<string | null>(null)
  const [saving, setSaving] = createSignal(false)

  const preview = () => {
    const sys = Number(systolic())
    const dia = Number(diastolic())
    if (!Number.isInteger(sys) || !Number.isInteger(dia)) return null
    if (sys <= 0 || dia <= 0) return null
    return getCategoryMeta(classifyReading(sys, dia))
  }

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    setError(null)

    const isoDate = parseDisplayDate(dateText())
    if (!isoDate) {
      setError('Enter the date as DD/MM/YYYY.')
      return
    }

    const sys = Number(systolic())
    if (!Number.isInteger(sys) || sys < 20 || sys > 400) {
      setError('Systolic must be a whole number between 20 and 400.')
      return
    }

    const dia = Number(diastolic())
    if (!Number.isInteger(dia) || dia < 10 || dia > 300) {
      setError('Diastolic must be a whole number between 10 and 300.')
      return
    }

    if (sys <= dia) {
      setError('Systolic should be higher than diastolic.')
      return
    }

    let hr: number | null = null
    const hrText = heartRate().trim()
    if (hrText !== '') {
      const parsed = Number(hrText)
      if (!Number.isInteger(parsed) || parsed < 20 || parsed > 300) {
        setError('Heart rate must be a whole number between 20 and 300.')
        return
      }
      hr = parsed
    }

    setSaving(true)
    try {
      const saved = await upsertReading({
        data: {
          date: isoDate,
          timeOfDay: slot(),
          systolic: sys,
          diastolic: dia,
          heartRate: hr,
          medications: medications(),
          activities: activities(),
          notes: notes(),
        },
      })
      invalidateReadingsCache()
      props.onSaved?.(saved)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save the reading.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form class="space-y-6" onSubmit={handleSubmit}>
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="reading-date">Date</Label>
          <div class="relative">
            <ClockIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reading-date"
              inputmode="numeric"
              placeholder="DD/MM/YYYY"
              class="pl-10 tabular-nums"
              value={dateText()}
              onInput={(event) => setDateText(event.currentTarget.value)}
            />
          </div>
          <p class="text-xs text-muted-foreground">Format: DD/MM/YYYY</p>
        </div>

        <div class="space-y-2">
          <Label>Time of day</Label>
          <div class="grid grid-cols-2 gap-2">
            <For each={READING_SLOTS}>
              {(item) => (
                <button
                  type="button"
                  onClick={() => setSlot(item.id)}
                  class={cn(
                    'h-11 rounded-lg border text-sm font-medium transition-colors',
                    slot() === item.id
                      ? 'border-transparent bg-gradient-to-r from-brand via-brand-2 to-brand-3 text-white shadow-sm'
                      : 'border-input bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                  aria-pressed={slot() === item.id}
                >
                  {item.label}
                </button>
              )}
            </For>
          </div>
          <p class="text-xs text-muted-foreground">
            One reading per morning and evening slot.
          </p>
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-3">
        <div class="space-y-2">
          <Label for="reading-systolic">Systolic (mmHg)</Label>
          <Input
            id="reading-systolic"
            type="number"
            inputmode="numeric"
            min={20}
            max={400}
            required
            placeholder="120"
            class="tabular-nums"
            value={systolic()}
            onInput={(event) => setSystolic(event.currentTarget.value)}
          />
        </div>

        <div class="space-y-2">
          <Label for="reading-diastolic">Diastolic (mmHg)</Label>
          <Input
            id="reading-diastolic"
            type="number"
            inputmode="numeric"
            min={10}
            max={300}
            required
            placeholder="80"
            class="tabular-nums"
            value={diastolic()}
            onInput={(event) => setDiastolic(event.currentTarget.value)}
          />
        </div>

        <div class="space-y-2">
          <Label for="reading-heart-rate">Heart rate (bpm)</Label>
          <Input
            id="reading-heart-rate"
            type="number"
            inputmode="numeric"
            min={20}
            max={300}
            placeholder="Optional"
            class="tabular-nums"
            value={heartRate()}
            onInput={(event) => setHeartRate(event.currentTarget.value)}
          />
        </div>
      </div>

      <Show when={preview()}>
        {(meta) => (
          <div
            class={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3',
              meta().chip,
            )}
          >
            <span class={cn('h-2.5 w-2.5 rounded-full', meta().dot)} />
            <div>
              <div class="text-sm font-semibold">{meta().label}</div>
              <div class="text-xs opacity-80">{meta().description}</div>
            </div>
          </div>
        )}
      </Show>

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="reading-medications">Medications</Label>
          <Input
            id="reading-medications"
            placeholder="e.g. Lisinopril, Amlodipine"
            value={medications()}
            onInput={(event) => setMedications(event.currentTarget.value)}
          />
        </div>

        <div class="space-y-2">
          <Label for="reading-activities">Activities</Label>
          <Input
            id="reading-activities"
            placeholder="e.g. Walked 30 min"
            value={activities()}
            onInput={(event) => setActivities(event.currentTarget.value)}
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="reading-notes">Notes</Label>
        <Textarea
          id="reading-notes"
          placeholder="Anything notable about this reading…"
          value={notes()}
          onInput={(event) => setNotes(event.currentTarget.value)}
        />
      </div>

      <details class="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
        <summary class="flex cursor-pointer items-center gap-2 font-medium text-foreground/90">
          <InfoIcon class="h-4 w-4 text-brand" />
          How to measure accurately
        </summary>
        <ul class="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">
          <li>Sit quietly for 5 minutes before measuring.</li>
          <li>
            Sit with your back supported, feet flat, and arm resting at heart
            level.
          </li>
          <li>
            Use a validated upper-arm cuff; avoid caffeine or smoking for 30
            minutes beforehand.
          </li>
          <li>Take two readings a minute apart and record the average.</li>
          <li>
            Keep the cuff in the same arm each time for consistent trends.
          </li>
          <li>Don&apos;t talk, move, or cross your legs while measuring.</li>
          <li>
            Home readings vary — a single high reading is not a diagnosis. Look
            at the trend over days.
          </li>
        </ul>
      </details>

      <Show when={error()}>
        <p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error()}
        </p>
      </Show>

      <div class="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="gradient" size="lg" disabled={saving()}>
          <CheckIcon />
          {saving()
            ? 'Saving…'
            : props.initial
              ? 'Update reading'
              : 'Save reading'}
        </Button>
        <Show when={props.onCancel}>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => props.onCancel?.()}
          >
            <XIcon />
            Cancel
          </Button>
        </Show>
      </div>
    </form>
  )
}
