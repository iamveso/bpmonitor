import { describe, expect, it } from 'vitest'

import { readingInputSchema } from './reading-schema'

const base = {
  date: '2026-04-09',
  timeOfDay: 'morning' as const,
  systolic: 120,
  diastolic: 80,
}

describe('readingInputSchema', () => {
  it('parses a valid minimal reading', () => {
    const result = readingInputSchema.parse(base)
    expect(result.systolic).toBe(120)
    expect(result.diastolic).toBe(80)
  })

  it('accepts omitted optional fields', () => {
    const result = readingInputSchema.parse(base)
    expect(result.heartRate ?? null).toBeNull()
    expect(result.medications ?? null).toBeNull()
  })

  it('trims text and turns blank strings into null', () => {
    const result = readingInputSchema.parse({
      ...base,
      medications: '  Lisinopril  ',
      activities: '',
      notes: '   ',
    })
    expect(result.medications).toBe('Lisinopril')
    expect(result.activities).toBeNull()
    expect(result.notes).toBeNull()
  })

  it('accepts an explicit or null heart rate', () => {
    expect(readingInputSchema.parse({ ...base, heartRate: 64 }).heartRate).toBe(
      64,
    )
    expect(
      readingInputSchema.parse({ ...base, heartRate: null }).heartRate,
    ).toBeNull()
  })

  it('rejects out-of-range values', () => {
    expect(
      readingInputSchema.safeParse({ ...base, systolic: 10 }).success,
    ).toBe(false)
    expect(
      readingInputSchema.safeParse({ ...base, diastolic: 500 }).success,
    ).toBe(false)
    expect(
      readingInputSchema.safeParse({ ...base, heartRate: 500 }).success,
    ).toBe(false)
  })

  it('rejects non-integer blood pressure', () => {
    expect(
      readingInputSchema.safeParse({ ...base, systolic: 120.5 }).success,
    ).toBe(false)
  })

  it('rejects malformed dates and slots', () => {
    expect(
      readingInputSchema.safeParse({ ...base, date: '09/04/2026' }).success,
    ).toBe(false)
    expect(
      readingInputSchema.safeParse({ ...base, timeOfDay: 'noon' }).success,
    ).toBe(false)
    expect(
      readingInputSchema.parse({ ...base, timeOfDay: 'afternoon' }).timeOfDay,
    ).toBe('afternoon')
  })
})
