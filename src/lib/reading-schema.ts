import { z } from 'zod'

export type TimeOfDay = 'morning' | 'afternoon' | 'evening'

export const READING_SLOTS: { id: TimeOfDay; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
]

/** Chronological rank of each slot, used to sort readings within a day. */
export const SLOT_ORDER: Record<TimeOfDay, number> = {
  morning: 1,
  afternoon: 2,
  evening: 3,
}

const SLOT_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

export function slotLabel(timeOfDay: TimeOfDay): string {
  return SLOT_LABELS[timeOfDay]
}

/** Serialisable shape handed to the client (dates as ISO strings). */
export interface ReadingDTO {
  id: string
  date: string
  timeOfDay: TimeOfDay
  systolic: number
  diastolic: number
  heartRate: number | null
  medications: string | null
  activities: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullish()

export const readingInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening']),
  systolic: z.number().int().min(20).max(400),
  diastolic: z.number().int().min(10).max(300),
  heartRate: z.number().int().min(20).max(300).nullish(),
  medications: optionalText(500),
  activities: optionalText(1000),
  notes: optionalText(4000),
})

export type ReadingInput = z.infer<typeof readingInputSchema>

export const readingIdSchema = z.object({ id: z.string().min(1) })
