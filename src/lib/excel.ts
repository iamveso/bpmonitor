import type {
  CellErrorValue,
  CellFormulaValue,
  CellHyperlinkValue,
  CellRichTextValue,
  CellValue,
} from 'exceljs'
import ExcelJS from 'exceljs'

import type { BpCategoryId, BpPeriod } from './bp'
import {
  averageReadings,
  BP_CATEGORY_ORDER,
  BP_PERIODS,
  classifyAverage,
  classifyReading,
  getCategoryMeta,
  parseDisplayDate,
  toDisplayDate,
  toIsoDate,
} from './bp'

const { Workbook } = ExcelJS

import {
  slotLabel as formatSlotLabel,
  readingInputSchema,
  type TimeOfDay,
} from './reading-schema'

// ---------------------------------------------------------------------------
// Excel import. The pure helpers in the first half are framework-free so they
// can be unit-tested and use the same input validation as the entry form
// (via `readingInputSchema`). The exceljs wrappers at the end run server-side
// only (parsing templates + building the downloadable template workbook).
// ---------------------------------------------------------------------------

// --- Columns ---------------------------------------------------------------

export const IMPORT_COLUMNS = [
  'date',
  'timeOfDay',
  'medications',
  'activities',
  'reading',
  'heartRate',
  'notes',
] as const

export type ImportColumn = (typeof IMPORT_COLUMNS)[number]

export interface ImportColumnDef {
  key: ImportColumn
  /** Header label used in the downloadable template. */
  label: string
  required: boolean
  /** Normalised header aliases accepted in a user's own spreadsheet. */
  aliases: string[]
}

export const IMPORT_COLUMN_DEFS: ImportColumnDef[] = [
  {
    key: 'date',
    label: 'Date',
    required: true,
    aliases: ['date'],
  },
  {
    key: 'timeOfDay',
    label: 'Time of Day',
    required: true,
    aliases: ['timeofday', 'time', 'slot'],
  },
  {
    key: 'medications',
    label: 'Drugs/Medications',
    required: false,
    aliases: ['drugsmedications', 'medications', 'medication', 'drugs', 'meds'],
  },
  {
    key: 'activities',
    label: 'Activities',
    required: false,
    aliases: ['activities', 'activity'],
  },
  {
    key: 'reading',
    label: 'Reading',
    required: true,
    aliases: ['reading', 'bloodpressure', 'bp'],
  },
  {
    key: 'heartRate',
    label: 'Heart Rate',
    required: false,
    aliases: ['heartrate', 'heartrateoptional', 'pulse', 'hr'],
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false,
    aliases: ['notes', 'note', 'comments', 'comment'],
  },
]

/** The columns present in the downloadable template (mirrors the old Excel file). */
export const TEMPLATE_COLUMNS: { header: string; width: number }[] = [
  { header: 'Date', width: 14 },
  { header: 'Time of Day', width: 14 },
  { header: 'Drugs/Medications', width: 30 },
  { header: 'Activities', width: 26 },
  { header: 'Reading', width: 12 },
  { header: 'Heart Rate', width: 12 },
]

export const EXAMPLE_RECORD = {
  date: '09/04/2026',
  timeOfDay: 'Morning',
  medications: 'Lisinopril, Amlodipine',
  activities: '30 min walk',
  reading: '132/78',
  heartRate: 72,
}

/** MIME type for `.xlsx` workbooks (used by both import and report routes). */
export const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// --- Pure parsing helpers ---------------------------------------------------

/** `Date` → `Date`, `  Reading ` → `reading`, `Heart Rate (optional)` → `heartrateoptional`. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Match a raw header cell against the known column aliases. */
export function matchColumn(header: unknown): ImportColumn | null {
  const key = normalizeHeader(header)
  if (!key) return null

  for (const def of IMPORT_COLUMN_DEFS) {
    if (def.aliases.includes(key)) return def.key
  }

  return null
}

/**
 * Parse a date cell into `YYYY-MM-DD`. Accepts `DD/MM/YYYY` and `YYYY-MM-DD`
 * strings (Nigerian convention used by the report), real Excel serial numbers
 * and `Date` objects.
 */
export function parseCellDate(value: unknown): string | null {
  if (value == null) return null

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null
    return dateFromSerial(value)
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return calendarDate(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    )
  }

  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return null

    const display = parseDisplayDate(text)
    if (display) return display

    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
    if (iso) {
      return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    }

    const alternate = /^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/.exec(text)
    if (alternate) {
      return calendarDate(
        Number(alternate[3]),
        Number(alternate[2]),
        Number(alternate[1]),
      )
    }
  }

  return null
}

/**
 * Excel stores dates as days since 1899-12-30 (Lotus 1-2-3 1900 leap-year
 * bug): serial 60 is the phantom 1900-02-29 and collapses to 1900-02-28, so
 * serials ≤ 59 run a day behind the real calendar. Returns a `Date` at UTC
 * midnight of the real calendar day.
 */
export function excelSerialToDate(serial: number): Date {
  const adjusted = serial <= 59 ? serial + 1 : serial
  return new Date(Math.round((adjusted - 25569) * 86_400_000))
}

function dateFromSerial(serial: number): string | null {
  const date = excelSerialToDate(serial)
  return calendarDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  )
}

function calendarDate(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return toIsoDate(date)
}

/** Split a `Reading` cell on `/` → `{ systolic, diastolic }` (`132/78`, `132 / 78`). */
export function parseReadingCell(
  value: unknown,
): { systolic: number; diastolic: number } | null {
  if (value == null) return null

  const match = /^(\d{1,3})\s*\/\s*(\d{1,3})$/.exec(String(value).trim())
  if (!match) return null

  return { systolic: Number(match[1]), diastolic: Number(match[2]) }
}

const TIME_OF_DAY_ALIASES: Record<string, TimeOfDay | null> = {
  morning: 'morning',
  am: 'morning',
  afternoon: 'afternoon',
  midday: 'afternoon',
  noon: 'afternoon',
  pm: 'evening',
  evening: 'evening',
}

/** Normalise a `Time of Day` cell case-insensitively. */
export function normalizeTimeOfDay(value: unknown): TimeOfDay | null {
  if (value == null) return null

  const text = String(value).trim().toLowerCase().replace(/[.\s]/g, '')
  if (text.length === 0) return null

  return TIME_OF_DAY_ALIASES[text] ?? null
}

function parseOptionalInt(
  value: unknown,
): { ok: true; result: number | null } | { ok: false; message: string } {
  if (value == null || value === '') return { ok: true, result: null }

  const text = String(value).trim()
  if (!/^\d{1,3}$/.test(text)) {
    return {
      ok: false,
      message: `Invalid "Heart Rate" (expected a number, got "${text}").`,
    }
  }

  return { ok: true, result: Number(text) }
}

function parseOptionalText(value: unknown): string | null {
  if (value == null) return null

  const text = String(value).trim().replace(/\s+/g, ' ')
  return text === '' ? null : text
}

/** Keep medications as comma-separated text, trimmed of stray whitespace. */
function parseMedications(value: unknown): string | null {
  if (value == null) return null

  const parts = String(value)
    .split(',')
    .map((part) => part.trim().replace(/\s+/g, ' '))
    .filter((part) => part.length > 0)

  return parts.length === 0 ? null : parts.join(', ')
}

// --- Sheet parsing ---------------------------------------------------------

export interface ParsedImportRow {
  /** 1-based row number in the sheet (header is row 1). */
  rowNumber: number
  date: string
  timeOfDay: TimeOfDay
  systolic: number
  diastolic: number
  heartRate: number | null
  medications: string | null
  activities: string | null
  notes: string | null
}

export interface ImportRowError {
  rowNumber: number
  message: string
}

export interface ParsedImportSheet {
  rows: ParsedImportRow[]
  errors: ImportRowError[]
  /** Required columns that were missing from the header row. */
  missing: ImportColumn[]
}

function rowIsEmpty(row: readonly unknown[]): boolean {
  return row.every((cell) => cell === undefined || cell === null || cell === '')
}

function columnIndex(columns: Map<ImportColumn, number>, key: ImportColumn) {
  return columns.get(key)
}

function parseImportRow(
  row: readonly unknown[],
  columns: Map<ImportColumn, number>,
): { row: ParsedImportRow } | { errors: string[] } {
  const errors: string[] = []
  const readCell = (key: ImportColumn): unknown => {
    const index = columnIndex(columns, key)
    return index === undefined ? undefined : row[index]
  }

  const date = parseCellDate(readCell('date'))
  if (!date) errors.push('Invalid date (expected DD/MM/YYYY).')

  const timeOfDay = normalizeTimeOfDay(readCell('timeOfDay'))
  if (!timeOfDay)
    errors.push(
      'Invalid "Time of Day" (expected Morning/Afternoon/Evening or AM/PM).',
    )

  const reading = parseReadingCell(readCell('reading'))
  if (!reading) {
    errors.push('Invalid "Reading" (expected a pair like 132/78).')
  } else if (reading.systolic <= reading.diastolic) {
    errors.push('Systolic must be greater than diastolic.')
  }

  const heartRate = parseOptionalInt(readCell('heartRate'))
  if (!heartRate.ok) errors.push(heartRate.message)

  if (errors.length > 0) return { errors }
  if (!reading)
    return { errors: ['Invalid "Reading" (expected a pair like 132/78).'] }
  if (!heartRate.ok) return { errors: [heartRate.message] }

  const candidate = {
    date,
    timeOfDay,
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    heartRate: heartRate.result,
    medications: parseMedications(readCell('medications')),
    activities: parseOptionalText(readCell('activities')),
    notes: parseOptionalText(readCell('notes')),
  }

  const validated = readingInputSchema.safeParse(candidate)
  if (!validated.success) {
    const messages = validated.error.issues.map(
      (issue: import('zod').ZodIssue) => issue.message,
    )
    return { errors: messages }
  }

  const data = validated.data
  return {
    row: {
      rowNumber: 0,
      date: data.date,
      timeOfDay: data.timeOfDay,
      systolic: data.systolic,
      diastolic: data.diastolic,
      heartRate: data.heartRate ?? null,
      medications: data.medications ?? null,
      activities: data.activities ?? null,
      notes: data.notes ?? null,
    },
  }
}

/**
 * Parse a 2-D array of cell values (first row = headers) into validated rows
 * plus per-row errors. Fully empty rows are skipped.
 */
export function parseImportSheet(
  sheet: readonly (readonly unknown[])[],
): ParsedImportSheet {
  const errors: ImportRowError[] = []
  const missing: ImportColumn[] = []

  const columns = new Map<ImportColumn, number>()
  for (const [index, cell] of (sheet[0] ?? []).entries()) {
    const matched = matchColumn(cell)
    if (matched && !columns.has(matched)) columns.set(matched, index)
  }

  for (const def of IMPORT_COLUMN_DEFS) {
    if (def.required && !columns.has(def.key)) missing.push(def.key)
  }

  if (missing.length > 0) {
    const labels = missing
      .map(
        (key) =>
          IMPORT_COLUMN_DEFS.find((def) => def.key === key)?.label ?? key,
      )
      .join(', ')
    errors.push({
      rowNumber: 0,
      message: `Missing required column(s): ${labels}. Expected "Date", "Time of Day" and "Reading".`,
    })
    return { rows: [], errors, missing }
  }

  const rows: ParsedImportRow[] = []
  for (let i = 1; i < sheet.length; i++) {
    const row = sheet[i]
    if (rowIsEmpty(row)) continue

    const parsed = parseImportRow(row, columns)
    if ('errors' in parsed) {
      errors.push({ rowNumber: i + 1, message: parsed.errors.join(' ') })
      continue
    }

    rows.push({ ...parsed.row, rowNumber: i + 1 })
  }

  return { rows, errors, missing }
}

// --- ExcelJS wrappers (server only) ----------------------------------------

// exceljs declares its own global `Buffer` interface that clashes with
// @types/node, so its typed `Buffer` parameters are unusable directly. Extract
// the exact signature type and cast through it instead.
type ExcelWorkbookInstance = InstanceType<typeof Workbook>
type ExcelLoadData = Parameters<ExcelWorkbookInstance['xlsx']['load']>[0]
type ExcelWriteData = Awaited<
  ReturnType<ExcelWorkbookInstance['xlsx']['writeBuffer']>
>

/** Flatten a worksheet cell value into the scalar a user would see in Excel. */
function scalar(value: CellValue): unknown {
  if (value === null || value === undefined || value instanceof Date) {
    return value
  }

  if (typeof value === 'object') {
    if ('result' in value) {
      const result = (value as CellFormulaValue).result
      return typeof result === 'object' && result !== null && 'error' in result
        ? String((result as CellErrorValue).error)
        : result
    }
    if ('richText' in value) {
      return (value as CellRichTextValue).richText.map((t) => t.text).join('')
    }
    if ('text' in value) {
      return (value as CellHyperlinkValue).text
    }
    if ('error' in value) {
      return String((value as CellErrorValue).error)
    }
  }

  return value
}

/**
 * Read the first worksheet into a 2-D array of scalar cell values. Row and
 * column positions are preserved (empty cells are `undefined`).
 */
export async function readWorkbookRows(
  buffer: Uint8Array,
): Promise<unknown[][]> {
  const workbook = new Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelLoadData)

  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const rows: unknown[][] = []
  for (let r = 1; r <= sheet.rowCount; r++) {
    const values: unknown[] = []
    sheet.getRow(r).eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = scalar(cell.value)
    })
    rows.push(values)
  }

  return rows
}

/** Build the downloadable `.xlsx` template workbook. */
export async function buildTemplateBuffer(): Promise<Uint8Array> {
  const workbook = new Workbook()
  workbook.creator = 'Pulse'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Readings')
  sheet.columns = TEMPLATE_COLUMNS

  const header = sheet.getRow(1)
  header.font = { bold: true }
  header.alignment = { vertical: 'middle' }

  sheet.addRow([
    EXAMPLE_RECORD.date,
    EXAMPLE_RECORD.timeOfDay,
    EXAMPLE_RECORD.medications,
    EXAMPLE_RECORD.activities,
    EXAMPLE_RECORD.reading,
    EXAMPLE_RECORD.heartRate,
  ])
  sheet.getRow(2).font = { color: { argb: 'FF64748B' } }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer as unknown as ExcelWriteData)
}

// --- Report export ---------------------------------------------------------

/** A reading row as exported to a doctor-facing report. */
export interface ReportReading {
  date: string
  timeOfDay: TimeOfDay
  systolic: number
  diastolic: number
  heartRate: number | null
  medications: string | null
  activities: string | null
  notes: string | null
}

export interface ReportInput {
  email: string
  generatedAt: Date
  period: BpPeriod
  readings: readonly ReportReading[]
}

function periodLabel(period: BpPeriod): string {
  return BP_PERIODS.find((entry) => entry.id === period)?.label ?? 'All time'
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function buildReadingsSheet(
  workbook: ExcelWorkbookInstance,
  readings: readonly ReportReading[],
): void {
  const sheet = workbook.addWorksheet('Readings')
  sheet.columns = [
    { header: 'Date', width: 14 },
    { header: 'Time of Day', width: 14 },
    { header: 'Reading', width: 12 },
    { header: 'Heart Rate', width: 12 },
    { header: 'Medications', width: 30 },
    { header: 'Activities', width: 26 },
    { header: 'Notes', width: 32 },
    { header: 'Category', width: 22 },
  ]

  const header = sheet.getRow(1)
  header.font = { bold: true }
  header.alignment = { vertical: 'middle' }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  for (const reading of readings) {
    const category = getCategoryMeta(
      classifyReading(reading.systolic, reading.diastolic),
    )
    sheet.addRow([
      toDisplayDate(reading.date),
      formatSlotLabel(reading.timeOfDay),
      `${reading.systolic}/${reading.diastolic}`,
      reading.heartRate ?? '',
      reading.medications ?? '',
      reading.activities ?? '',
      reading.notes ?? '',
      category.label,
    ])
  }

  sheet.autoFilter = {
    from: 'A1',
    to: `H${Math.max(1, readings.length + 1)}`,
  }
}

function buildSummarySheet(
  workbook: ExcelWorkbookInstance,
  input: ReportInput,
): void {
  const sheet = workbook.addWorksheet('Summary')
  sheet.columns = [{ width: 28 }, { width: 34 }]

  const addSection = (title: string) => {
    const row = sheet.addRow([title, ''])
    row.font = { bold: true }
  }
  const addPair = (label: string, value: string | number) => {
    sheet.addRow([label, value])
  }

  const { readings } = input
  const average = averageReadings(readings)
  const overall = classifyAverage(readings)
  const dates = readings.map((reading) => reading.date).sort()
  const dateRange =
    dates.length > 0
      ? `${toDisplayDate(dates[0])} – ${toDisplayDate(dates[dates.length - 1])}`
      : '—'

  addSection('Report')
  addPair('Patient', input.email)
  addPair('Generated', formatTimestamp(input.generatedAt))
  addPair('Period', periodLabel(input.period))
  addPair('Readings', average.count)
  addPair('Date range', dateRange)
  sheet.addRow([''])

  addSection('Averages')
  addPair('Systolic', average.systolic ?? '—')
  addPair('Diastolic', average.diastolic ?? '—')
  addPair('Pulse pressure', average.pulsePressure ?? '—')
  addPair('Heart rate', average.heartRate ?? '—')
  addPair('Classification', overall ? getCategoryMeta(overall).label : '—')
  sheet.addRow([''])

  addSection('Category breakdown')
  const counts = new Map<BpCategoryId, number>()
  for (const reading of readings) {
    const category = classifyReading(reading.systolic, reading.diastolic)
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  let anyCategory = false
  for (const id of BP_CATEGORY_ORDER) {
    const count = counts.get(id) ?? 0
    if (count === 0) continue
    anyCategory = true
    addPair(getCategoryMeta(id).label, count)
  }
  if (!anyCategory) addPair('No readings in range', '')
  sheet.addRow([''])

  addSection('Morning vs afternoon vs evening')
  for (const slot of ['morning', 'afternoon', 'evening'] as const) {
    const slotReadings = readings.filter((r) => r.timeOfDay === slot)
    const slotAverage = averageReadings(slotReadings)
    const summary =
      slotAverage.count > 0
        ? `${slotAverage.count} reading(s) · ${slotAverage.systolic}/${slotAverage.diastolic}`
        : 'No readings'
    addPair(formatSlotLabel(slot), summary)
  }
}

function buildNotesSheet(workbook: ExcelWorkbookInstance): void {
  const sheet = workbook.addWorksheet('Notes')
  sheet.columns = [{ width: 100 }]

  const notes = [
    'Measurement method: readings were taken by the patient at home using a home blood pressure monitor.',
    'Classification follows the ACC/AHA home-monitoring categories:',
    '- Normal: below 120 / 80',
    '- Elevated: 120–129 systolic and below 80 diastolic',
    '- Hypertension Stage 1: 130–134 systolic or 80–84 diastolic',
    '- Hypertension Stage 2: 135 or above systolic or 85 or above diastolic',
    '- Hypertensive crisis: above 180 systolic and/or above 120 diastolic — seek emergency care',
    '- Low: below 90 systolic or below 60 diastolic',
    'A reading is classified by the worse of the two values (systolic or diastolic).',
    'One reading is kept per morning, afternoon and evening for each day.',
    'Disclaimer: averages are indicative and are not a diagnosis. Discuss these readings with a healthcare professional. In a hypertensive crisis, seek emergency medical care immediately.',
  ]

  for (const line of notes) {
    sheet.addRow([line])
  }
}

/** Build the downloadable `.xlsx` report (Readings, Summary, Notes sheets). */
export async function buildReportBuffer(
  input: ReportInput,
): Promise<Uint8Array> {
  const workbook = new Workbook()
  workbook.creator = 'Pulse'
  workbook.created = input.generatedAt

  buildReadingsSheet(workbook, input.readings)
  buildSummarySheet(workbook, input)
  buildNotesSheet(workbook)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer as unknown as ExcelWriteData)
}

export interface ImportSummary {
  total: number
  created: number
  updated: number
  invalid: number
}

export interface ImportRow extends ParsedImportRow {
  status: 'created' | 'updated'
}

export interface ImportPreview {
  mode: 'preview'
  rows: ImportRow[]
  errors: ImportRowError[]
  summary: ImportSummary
}

export interface ImportCommitResult {
  mode: 'commit'
  rows: ImportRow[]
  errors: ImportRowError[]
  summary: ImportSummary
}
