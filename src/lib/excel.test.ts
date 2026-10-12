import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import {
  buildReportBuffer,
  buildTemplateBuffer,
  excelSerialToDate,
  matchColumn,
  normalizeHeader,
  normalizeTimeOfDay,
  parseCellDate,
  parseImportSheet,
  parseReadingCell,
  readWorkbookRows,
} from './excel'

type ExcelLoadData = Parameters<
  InstanceType<typeof ExcelJS.Workbook>['xlsx']['load']
>[0]

describe('normalizeHeader', () => {
  it('lowercases and strips non-alphanumeric characters', () => {
    expect(normalizeHeader('Heart Rate (optional)')).toBe('heartrateoptional')
    expect(normalizeHeader('  Reading  ')).toBe('reading')
    expect(normalizeHeader('Drugs/Medications')).toBe('drugsmedications')
    expect(normalizeHeader('')).toBe('')
  })
})

describe('matchColumn', () => {
  it('matches official headers', () => {
    expect(matchColumn('Date')).toBe('date')
    expect(matchColumn('Time of Day')).toBe('timeOfDay')
    expect(matchColumn('Drugs/Medications')).toBe('medications')
    expect(matchColumn('Activities')).toBe('activities')
    expect(matchColumn('Reading')).toBe('reading')
    expect(matchColumn('Heart Rate (optional)')).toBe('heartRate')
    expect(matchColumn('Notes')).toBe('notes')
  })

  it('matches relaxed aliases', () => {
    expect(matchColumn('BP')).toBe('reading')
    expect(matchColumn('Pulse')).toBe('heartRate')
    expect(matchColumn('Meds')).toBe('medications')
  })

  it('returns null for unknown headers', () => {
    expect(matchColumn('Email')).toBeNull()
    expect(matchColumn('')).toBeNull()
  })
})

describe('parseCellDate', () => {
  it('parses DD/MM/YYYY (Nigerian convention)', () => {
    expect(parseCellDate('09/04/2026')).toBe('2026-04-09')
    expect(parseCellDate('9/4/2026')).toBe('2026-04-09')
  })

  it('parses YYYY-MM-DD and dashed/dotted alternates', () => {
    expect(parseCellDate('2026-04-09')).toBe('2026-04-09')
    expect(parseCellDate('09-04-2026')).toBe('2026-04-09')
    expect(parseCellDate('09.04.2026')).toBe('2026-04-09')
  })

  it('rejects non-calendar dates', () => {
    expect(parseCellDate('31/02/2026')).toBeNull()
    expect(parseCellDate('not a date')).toBeNull()
    expect(parseCellDate('')).toBeNull()
    expect(parseCellDate(null)).toBeNull()
  })

  it('converts Excel serial numbers to dates (without UTC drift)', () => {
    expect(excelSerialToDate(36526)).toEqual(new Date(Date.UTC(2000, 0, 1)))
    expect(parseCellDate(36526)).toBe('2000-01-01')
    // Excel's phantom 1900-02-29 (serial 60) collapses to the real Feb 28.
    expect(parseCellDate(59)).toBe('1900-02-28')
    expect(parseCellDate(60)).toBe('1900-02-28')
    expect(parseCellDate(1)).toBe('1900-01-01')
  })

  it('converts Date objects using the calendar day', () => {
    expect(parseCellDate(new Date(2026, 3, 9))).toBe('2026-04-09')
    expect(parseCellDate(new Date(NaN))).toBeNull()
  })
})

describe('parseReadingCell', () => {
  it('parses 132/78 and spaced variants', () => {
    expect(parseReadingCell('132/78')).toEqual({ systolic: 132, diastolic: 78 })
    expect(parseReadingCell('132 / 78')).toEqual({
      systolic: 132,
      diastolic: 78,
    })
    expect(parseReadingCell(' 110/70 ')).toEqual({
      systolic: 110,
      diastolic: 70,
    })
  })

  it('returns null for non-matching values', () => {
    expect(parseReadingCell('132/78/3')).toBeNull()
    expect(parseReadingCell('none')).toBeNull()
    expect(parseReadingCell(null)).toBeNull()
    expect(parseReadingCell('')).toBeNull()
  })
})

describe('normalizeTimeOfDay', () => {
  it('accepts Morning/AM/PM/Evening variants', () => {
    expect(normalizeTimeOfDay('Morning')).toBe('morning')
    expect(normalizeTimeOfDay('AM')).toBe('morning')
    expect(normalizeTimeOfDay('a.m.')).toBe('morning')
    expect(normalizeTimeOfDay('Evening')).toBe('evening')
    expect(normalizeTimeOfDay('PM')).toBe('evening')
    expect(normalizeTimeOfDay('Afternoon')).toBe('afternoon')
    expect(normalizeTimeOfDay('midday')).toBe('afternoon')
    expect(normalizeTimeOfDay('noon')).toBe('afternoon')
  })

  it('returns null for unrecognised slots', () => {
    expect(normalizeTimeOfDay('Midday')).toBe('afternoon')
    expect(normalizeTimeOfDay(null)).toBeNull()
    expect(normalizeTimeOfDay('')).toBeNull()
  })
})

describe('parseImportSheet', () => {
  const HEADERS = [
    'Date',
    'Time of Day',
    'Drugs/Medications',
    'Activities',
    'Reading',
    'Heart Rate',
  ]
  const ROW = [
    '09/04/2026',
    'Morning',
    'Lisinopril, Amlodipine',
    '30 min walk',
    '132/78',
    72,
  ]

  it('parses valid rows and assigns sheet row numbers', () => {
    const result = parseImportSheet([HEADERS, ROW])
    expect(result.missing).toEqual([])
    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      {
        rowNumber: 2,
        date: '2026-04-09',
        timeOfDay: 'morning',
        systolic: 132,
        diastolic: 78,
        heartRate: 72,
        medications: 'Lisinopril, Amlodipine',
        activities: '30 min walk',
        notes: null,
      },
    ])
  })

  it('normalises medications and time of day', () => {
    const result = parseImportSheet([
      HEADERS,
      ['09/04/2026', 'pm', ' Lisinopril ,  Amlodipine ', '', '120/80', ''],
    ])
    expect(result.rows[0]?.timeOfDay).toBe('evening')
    expect(result.rows[0]?.medications).toBe('Lisinopril, Amlodipine')
    expect(result.rows[0]?.activities).toBeNull()
    expect(result.rows[0]?.heartRate).toBeNull()
  })

  it('skips fully empty rows', () => {
    const result = parseImportSheet([HEADERS, [], ROW])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.rowNumber).toBe(3)
  })

  it('accepts relaxed header spellings', () => {
    const result = parseImportSheet([
      ['date', 'time', 'Meds', 'Activity', 'BP', 'Pulse', 'Notes'],
      ['09/04/2026', 'AM', 'Metoprolol', 'Resting', '128/84', 64, 'Slept well'],
    ])
    expect(result.missing).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      date: '2026-04-09',
      timeOfDay: 'morning',
      systolic: 128,
      diastolic: 84,
      heartRate: 64,
      medications: 'Metoprolol',
      notes: 'Slept well',
    })
  })

  it('reports missing required columns once', () => {
    const result = parseImportSheet([['Date', 'Reading'], ROW])
    expect(result.missing).toEqual(['timeOfDay'])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.rowNumber).toBe(0)
    expect(result.rows).toHaveLength(0)
  })

  it('collects row-level errors without stopping', () => {
    const result = parseImportSheet([
      HEADERS,
      ['31/02/2026', 'Morning', '', '', '132/78', ''],
      ['09/04/2026', 'Lunch', '', '', '132/78', ''],
      ['09/04/2026', 'Morning', '', '', '140/160', ''],
      ['09/04/2026', 'Evening', '', '', 'abc', 'seventy'],
      ROW,
    ])
    expect(result.rows).toHaveLength(1)
    expect(result.errors).toHaveLength(4)
    expect(result.errors[0]?.rowNumber).toBe(2)
    expect(result.errors[1]?.rowNumber).toBe(3)
    expect(result.errors[2]?.rowNumber).toBe(4)
    expect(result.errors[3]?.rowNumber).toBe(5)
  })

  it('enforces the same ranges as the entry form', () => {
    const result = parseImportSheet([
      HEADERS,
      ['09/04/2026', 'Morning', '', '', '19/10', ''],
      ['09/04/2026', 'Morning', '', '', '120/80', '500'],
    ])
    expect(result.rows).toHaveLength(0)
    expect(result.errors).toHaveLength(2)
  })
})

describe('workbook round-trip', () => {
  it('reads back the template buffer', async () => {
    const buffer = await buildTemplateBuffer()
    const rows = await readWorkbookRows(buffer)
    expect(rows[0]).toEqual([
      'Date',
      'Time of Day',
      'Drugs/Medications',
      'Activities',
      'Reading',
      'Heart Rate',
    ])
    expect(rows[1]).toEqual([
      '09/04/2026',
      'Morning',
      'Lisinopril, Amlodipine',
      '30 min walk',
      '132/78',
      72,
    ])
  })
})

const REPORT_READINGS = [
  {
    date: '2026-04-09',
    timeOfDay: 'morning' as const,
    systolic: 132,
    diastolic: 78,
    heartRate: 72,
    medications: 'Lisinopril',
    activities: null,
    notes: null,
  },
  {
    date: '2026-04-09',
    timeOfDay: 'evening' as const,
    systolic: 126,
    diastolic: 82,
    heartRate: null,
    medications: null,
    activities: null,
    notes: 'Slept well',
  },
  {
    date: '2026-05-01',
    timeOfDay: 'evening' as const,
    systolic: 140,
    diastolic: 90,
    heartRate: null,
    medications: null,
    activities: null,
    notes: null,
  },
]

async function loadReport(
  readings = REPORT_READINGS,
  period: 'monthly' | 'daily' = 'monthly',
) {
  const buffer = await buildReportBuffer({
    email: 'person@example.com',
    generatedAt: new Date(2026, 3, 9, 9, 30),
    period,
    readings,
  })
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelLoadData)
  return workbook
}

function cellStrings(workbook: ExcelJS.Workbook, sheetName: string): string[] {
  const sheet = workbook.getWorksheet(sheetName)
  const values: string[] = []
  sheet?.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      values.push(String(cell.value ?? ''))
    })
  })
  return values
}

describe('buildReportBuffer', () => {
  it('writes the Readings, Summary and Notes sheets', async () => {
    const workbook = await loadReport()
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Readings',
      'Summary',
      'Notes',
    ])
  })

  it('lists each reading with its computed category', async () => {
    const workbook = await loadReport()
    const values = cellStrings(workbook, 'Readings')
    expect(values).toContain('09/04/2026')
    expect(values).toContain('132/78')
    expect(values).toContain('Hypertension Stage 2')
    expect(values).toContain('Hypertension Stage 1')
  })

  it('summarises averages, classification and morning/evening split', async () => {
    const workbook = await loadReport()
    const values = cellStrings(workbook, 'Summary')
    expect(values).toContain('person@example.com')
    expect(values).toContain('Monthly')
    expect(values).toContain('09/04/2026 – 01/05/2026')
    expect(values).toContain('133')
    expect(values).toContain('Hypertension Stage 1')
  })

  it('records the classification thresholds and disclaimer', async () => {
    const workbook = await loadReport()
    const notes = cellStrings(workbook, 'Notes').join('\n')
    expect(notes).toContain('ACC/AHA')
    expect(notes).toContain('not a diagnosis')
  })

  it('handles a period with no readings', async () => {
    const workbook = await loadReport([], 'daily')
    const values = cellStrings(workbook, 'Summary')
    expect(values).toContain('No readings in range')
    expect(workbook.getWorksheet('Readings')?.rowCount).toBe(1)
  })
})
