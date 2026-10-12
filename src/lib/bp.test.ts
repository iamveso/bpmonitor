import { describe, expect, it } from 'vitest'

import {
  averageReadings,
  bucketReadings,
  classifyAverage,
  classifyReading,
  filterByPeriod,
  getPeriodRange,
  granularityForPeriod,
  isBpPeriod,
  parseDisplayDate,
  parseIsoDate,
  toDisplayDate,
  toIsoDate,
} from './bp'

describe('classifyReading', () => {
  it('classifies normal readings (boundary inclusive)', () => {
    expect(classifyReading(119, 79)).toBe('normal')
    expect(classifyReading(90, 60)).toBe('normal')
  })

  it('classifies hypotension before the normal range', () => {
    expect(classifyReading(89, 79)).toBe('hypotension')
    expect(classifyReading(119, 59)).toBe('hypotension')
    expect(classifyReading(85, 55)).toBe('hypotension')
  })

  it('classifies elevated', () => {
    expect(classifyReading(120, 79)).toBe('elevated')
    expect(classifyReading(129, 79)).toBe('elevated')
  })

  it('classifies stage 1', () => {
    expect(classifyReading(130, 79)).toBe('stage-1')
    expect(classifyReading(134, 79)).toBe('stage-1')
    expect(classifyReading(119, 80)).toBe('stage-1')
    expect(classifyReading(125, 84)).toBe('stage-1')
  })

  it('classifies stage 2', () => {
    expect(classifyReading(135, 79)).toBe('stage-2')
    expect(classifyReading(134, 85)).toBe('stage-2')
    // 180/120 is not a crisis (strictly greater than needed).
    expect(classifyReading(180, 120)).toBe('stage-2')
  })

  it('classifies crisis with the highest precedence', () => {
    expect(classifyReading(181, 79)).toBe('crisis')
    expect(classifyReading(200, 130)).toBe('crisis')
    expect(classifyReading(119, 121)).toBe('crisis')
  })

  it('uses the worse of the two numbers', () => {
    expect(classifyReading(100, 85)).toBe('stage-2')
    expect(classifyReading(100, 82)).toBe('stage-1')
    expect(classifyReading(140, 70)).toBe('stage-2')
  })
})

describe('averageReadings', () => {
  it('returns nulls when there are no readings', () => {
    expect(averageReadings([])).toEqual({
      count: 0,
      systolic: null,
      diastolic: null,
      pulsePressure: null,
      heartRate: null,
    })
  })

  it('averages systolic, diastolic and computes pulse pressure', () => {
    expect(
      averageReadings([
        { systolic: 120, diastolic: 80, heartRate: 60 },
        { systolic: 130, diastolic: 90, heartRate: 80 },
      ]),
    ).toEqual({
      count: 2,
      systolic: 125,
      diastolic: 85,
      pulsePressure: 40,
      heartRate: 70,
    })
  })

  it('rounds averages to whole numbers', () => {
    const result = averageReadings([
      { systolic: 120, diastolic: 70 },
      { systolic: 121, diastolic: 71 },
    ])
    expect(result.systolic).toBe(121)
    expect(result.diastolic).toBe(71)
    expect(result.pulsePressure).toBe(50)
  })

  it('ignores missing heart rates', () => {
    const result = averageReadings([
      { systolic: 120, diastolic: 80, heartRate: 60 },
      { systolic: 120, diastolic: 80 },
      { systolic: 120, diastolic: 80, heartRate: null },
    ])
    expect(result.heartRate).toBe(60)
  })
})

describe('classifyAverage', () => {
  it('returns null for an empty set', () => {
    expect(classifyAverage([])).toBeNull()
  })

  it('classifies the rounded average', () => {
    expect(classifyAverage([{ systolic: 118, diastolic: 76 }])).toBe('normal')
    expect(
      classifyAverage([
        { systolic: 140, diastolic: 90 },
        { systolic: 150, diastolic: 95 },
      ]),
    ).toBe('stage-2')
  })
})

describe('date helpers', () => {
  it('round-trips an ISO date without UTC drift', () => {
    expect(toIsoDate(parseIsoDate('2026-04-09'))).toBe('2026-04-09')
    expect(parseIsoDate('2026-04-09').getDate()).toBe(9)
  })

  it('formats a Date as ISO', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('formats ISO dates as DD/MM/YYYY', () => {
    expect(toDisplayDate('2026-04-09')).toBe('09/04/2026')
    expect(toDisplayDate(new Date(2026, 11, 31))).toBe('31/12/2026')
  })

  it('parses DD/MM/YYYY back to ISO', () => {
    expect(parseDisplayDate('09/04/2026')).toBe('2026-04-09')
    expect(parseDisplayDate('9/4/2026')).toBe('2026-04-09')
    expect(parseDisplayDate(' 01/01/2026 ')).toBe('2026-01-01')
  })

  it('rejects impossible or malformed display dates', () => {
    expect(parseDisplayDate('31/02/2026')).toBeNull()
    expect(parseDisplayDate('2026-04-09')).toBeNull()
    expect(parseDisplayDate('09/04/26')).toBeNull()
    expect(parseDisplayDate('')).toBeNull()
  })
})

describe('getPeriodRange', () => {
  const now = new Date(2026, 3, 15) // Wednesday 15 April 2026

  function rangeOf(period: Parameters<typeof getPeriodRange>[0], at: Date) {
    const range = getPeriodRange(period, at)
    if (!range) throw new Error(`expected a range for ${period}`)
    return range
  }

  it('daily covers the whole calendar day', () => {
    const range = rangeOf('daily', now)
    expect(toIsoDate(range.start)).toBe('2026-04-15')
    expect(toIsoDate(range.end)).toBe('2026-04-15')
    expect(range.end.getHours()).toBe(23)
    expect(range.end.getMinutes()).toBe(59)
  })

  it('weekly is the last 7 days', () => {
    const range = rangeOf('weekly', now)
    expect(toIsoDate(range.start)).toBe('2026-04-09')
    expect(toIsoDate(range.end)).toBe('2026-04-15')
  })

  it('monthly runs first to last day', () => {
    const range = rangeOf('monthly', now)
    expect(toIsoDate(range.start)).toBe('2026-04-01')
    expect(toIsoDate(range.end)).toBe('2026-04-30')
  })

  it('quarterly is the last 3 months', () => {
    const range = rangeOf('quarterly', now)
    expect(toIsoDate(range.start)).toBe('2026-01-15')
    expect(toIsoDate(range.end)).toBe('2026-04-15')
  })

  it('yearly is the last 12 months', () => {
    const range = rangeOf('yearly', now)
    expect(toIsoDate(range.start)).toBe('2025-04-15')
    expect(toIsoDate(range.end)).toBe('2026-04-15')
  })

  it('clamps month-end when the target month is shorter', () => {
    const range = rangeOf('quarterly', new Date(2026, 4, 31))
    expect(toIsoDate(range.start)).toBe('2026-02-28')
  })

  it('all time has no range', () => {
    expect(getPeriodRange('all', now)).toBeNull()
  })
})

describe('filterByPeriod', () => {
  const now = new Date(2026, 3, 15)
  const readings = [
    { id: 'a', date: '2026-03-31' },
    { id: 'b', date: '2026-04-01' },
    { id: 'c', date: '2026-04-15' },
    { id: 'd', date: '2026-04-30' },
    { id: 'e', date: '2026-05-01' },
    { id: 'f', date: '2026-12-31' },
    { id: 'g', date: '2027-01-02' },
  ]
  const ids = (list: { id: string }[]) => list.map((r) => r.id)

  it('filters by day', () => {
    expect(ids(filterByPeriod(readings, 'daily', now))).toEqual(['c'])
  })

  it('filters by week', () => {
    expect(ids(filterByPeriod(readings, 'weekly', now))).toEqual(['c'])
  })

  it('filters by month', () => {
    expect(ids(filterByPeriod(readings, 'monthly', now))).toEqual([
      'b',
      'c',
      'd',
    ])
  })

  it('filters by rolling quarter (last 3 months)', () => {
    expect(ids(filterByPeriod(readings, 'quarterly', now))).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('filters by rolling year', () => {
    expect(ids(filterByPeriod(readings, 'yearly', now))).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('returns everything for all time', () => {
    expect(ids(filterByPeriod(readings, 'all', now))).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
    ])
  })
})

describe('bucketReadings', () => {
  const readings = [
    { date: '2026-04-13', systolic: 120, diastolic: 80, heartRate: 60 },
    { date: '2026-04-13', systolic: 130, diastolic: 90, heartRate: 80 },
    { date: '2026-04-14', systolic: 110, diastolic: 70, heartRate: 70 },
  ]

  it('groups by day and averages each bucket', () => {
    const buckets = bucketReadings(readings, 'day')
    expect(buckets.map((b) => b.key)).toEqual(['2026-04-13', '2026-04-14'])
    expect(buckets[0].readings).toHaveLength(2)
    expect(buckets[0].average.systolic).toBe(125)
    expect(buckets[0].average.diastolic).toBe(85)
    expect(buckets[0].average.heartRate).toBe(70)
    expect(buckets[1].average.systolic).toBe(110)
  })

  it('labels day buckets with day + short month', () => {
    expect(bucketReadings(readings, 'day')[0].label).toBe('13 Apr')
  })

  it('groups a whole month into a single bucket', () => {
    const buckets = bucketReadings(readings, 'month')
    expect(buckets).toHaveLength(1)
    expect(buckets[0].key).toBe('2026-04-01')
    expect(buckets[0].label).toBe('Apr 2026')
    expect(buckets[0].average.count).toBe(3)
  })
})

describe('period helpers', () => {
  it('validates period ids', () => {
    expect(isBpPeriod('monthly')).toBe(true)
    expect(isBpPeriod('hourly')).toBe(false)
    expect(isBpPeriod(42)).toBe(false)
  })

  it('picks a natural chart granularity', () => {
    expect(granularityForPeriod('weekly')).toBe('day')
    expect(granularityForPeriod('quarterly')).toBe('week')
    expect(granularityForPeriod('yearly')).toBe('month')
  })
})
