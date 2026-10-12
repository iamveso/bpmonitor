#!/usr/bin/env node
/**
 * Convert pasted blood-pressure text (e.g. copied from WhatsApp) into an
 * `.xlsx` workbook that the site's "Import from Excel" page can read.
 *
 * This is a standalone helper — it is not part of the running site.
 *
 * Input: one reading per line, for example:
 *
 *   1. 9/04/2026 - Evening (Existing Medication): 132/78
 *   54. 03/05/2026 - Evening:121/71; 75 (No 30 minutes walk)
 *
 * Recognised per line: an optional list number, DD/MM/YYYY date, a time of
 * day (Morning / Afternoon / Evening / AM / PM), an optional parenthetical
 * before the colon (recorded as medication), the reading `systolic/diastolic`,
 * an optional `; heartRate`, and an optional trailing parenthetical (recorded
 * as activities). Lines that do not match are listed and skipped.
 *
 * Usage:
 *   node scripts/text-to-excel.mjs <input.txt> [output.xlsx]
 *   node scripts/text-to-excel.mjs - [output.xlsx]        # read stdin
 *   node scripts/text-to-excel.mjs <input.txt> --afternoon=morning
 *
 * The site only stores two readings per day (morning and evening), so
 * "Afternoon" must be folded into one of them. It defaults to Evening; pass
 * `--afternoon=morning` to change it. If folding creates two rows with the
 * same date + slot, the script warns — the site keeps only the last of them.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import process from 'node:process'
import ExcelJS from 'exceljs'

const { Workbook } = ExcelJS

// Must match the site's import template (src/lib/excel.ts TEMPLATE_COLUMNS).
const COLUMNS = [
  { header: 'Date', key: 'date', width: 14 },
  { header: 'Time of Day', key: 'timeOfDay', width: 14 },
  { header: 'Drugs/Medications', key: 'medications', width: 30 },
  { header: 'Activities', key: 'activities', width: 26 },
  { header: 'Reading', key: 'reading', width: 12 },
  { header: 'Heart Rate', key: 'heartRate', width: 12 },
]

const LINE_RE =
  /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*[-–—:]\s*(morning|afternoon|evening|am|pm)\s*(?:\(([^)]*)\))?\s*:\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*(?:;\s*(\d{1,3}))?\s*(?:\(([^)]*)\))?\s*$/i

function pad(value) {
  return String(value).padStart(2, '0')
}

function normalizeSlot(value, afternoon) {
  switch (value.trim().toLowerCase()) {
    case 'morning':
    case 'am':
      return 'Morning'
    case 'afternoon':
      return afternoon === 'morning' ? 'Morning' : 'Evening'
    case 'evening':
    case 'pm':
      return 'Evening'
    default:
      return null
  }
}

/** Returns `YYYY-MM-DD`, or null when the date is not a real calendar day. */
function toIsoDate(day, month, year) {
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Parse one line into a row, or explain why it could not be parsed. */
function parseLine(raw, afternoon) {
  const text = raw.trim().replace(/^\s*\d+\s*[.)]\s*/, '')
  if (text === '') return { ok: false, blank: true }

  const match = LINE_RE.exec(text)
  if (!match) {
    return { ok: false, reason: 'unrecognised line' }
  }

  const [, dayText, monthText, yearText, slotText, medText, sysText, diaText, hrText, actText] =
    match

  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)

  const iso = toIsoDate(day, month, year)
  if (!iso) {
    return { ok: false, reason: `invalid date ${dayText}/${monthText}/${yearText}` }
  }

  const timeOfDay = normalizeSlot(slotText, afternoon)
  if (!timeOfDay) {
    return { ok: false, reason: `unknown time of day "${slotText}"` }
  }

  const systolic = Number(sysText)
  const diastolic = Number(diaText)
  if (systolic <= diastolic) {
    return {
      ok: false,
      reason: `systolic (${systolic}) must be greater than diastolic (${diastolic})`,
    }
  }

  return {
    ok: true,
    row: {
      date: `${pad(day)}/${pad(month)}/${year}`,
      isoDate: iso,
      timeOfDay,
      medications: medText ? medText.trim() : '',
      activities: actText ? actText.trim() : '',
      reading: `${systolic}/${diastolic}`,
      heartRate: hrText === undefined ? '' : Number(hrText),
    },
  }
}

function parseArgs(argv) {
  const options = { input: null, output: null, afternoon: 'evening' }
  const positional = []

  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') {
      options.help = true
    } else if (arg.startsWith('--afternoon=')) {
      const value = arg.slice('--afternoon='.length).toLowerCase()
      if (value !== 'morning' && value !== 'evening') {
        throw new Error(`--afternoon must be "morning" or "evening", got "${value}"`)
      }
      options.afternoon = value
    } else if (arg.startsWith('-') && arg !== '-') {
      throw new Error(`unknown option "${arg}"`)
    } else {
      positional.push(arg)
    }
  }

  options.input = positional[0] ?? null
  options.output = positional[1] ?? null
  return options
}

function usage() {
  return [
    'Convert pasted blood-pressure text into an importable .xlsx file.',
    '',
    'Usage:',
    '  node scripts/text-to-excel.mjs <input.txt> [output.xlsx]',
    '  node scripts/text-to-excel.mjs - [output.xlsx]     # read stdin',
    '',
    'Options:',
    '  --afternoon=morning|evening   slot for "Afternoon" lines (default: evening)',
    '  -h, --help                    show this help',
  ].join('\n')
}

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`Error: ${error.message}\n`)
    console.error(usage())
    process.exitCode = 1
    return
  }

  if (options.help) {
    console.log(usage())
    return
  }

  if (!options.input) {
    console.error(usage())
    process.exitCode = 1
    return
  }

  const fromStdin = options.input === '-'
  const text = fromStdin
    ? readFileSync(0, 'utf8')
    : readFileSync(options.input, 'utf8')

  const output =
    options.output ??
    (fromStdin
      ? 'bp-readings.xlsx'
      : `${basename(options.input, extname(options.input))}.xlsx`)

  const lines = text.split(/\r?\n/)
  const rows = []
  const skipped = []
  const seen = new Map()

  for (const [index, line] of lines.entries()) {
    const result = parseLine(line, options.afternoon)
    if (!result.ok) {
      if (!result.blank && line.trim() !== '') {
        skipped.push({ lineNumber: index + 1, line: line.trim(), reason: result.reason })
      }
      continue
    }

    const key = `${result.row.isoDate} | ${result.row.timeOfDay}`
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    rows.push({ ...result.row, lineNumber: index + 1, duplicate: count > 1 })
  }

  if (rows.length === 0) {
    console.error('No readings were found in the input. Nothing written.')
    process.exitCode = 1
    return
  }

  const workbook = new Workbook()
  workbook.creator = 'Pulse text-to-excel'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Readings')
  sheet.columns = COLUMNS

  const header = sheet.getRow(1)
  header.font = { bold: true }
  header.alignment = { vertical: 'middle' }

  for (const row of rows) {
    sheet.addRow({
      date: row.date,
      timeOfDay: row.timeOfDay,
      medications: row.medications,
      activities: row.activities,
      reading: row.reading,
      heartRate: row.heartRate,
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  writeFileSync(output, Buffer.from(buffer))

  console.log(`Wrote ${rows.length} reading(s) to ${output}`)
  if (options.afternoon === 'evening') {
    console.log('  (Afternoon lines were recorded as Evening)')
  } else {
    console.log('  (Afternoon lines were recorded as Morning)')
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped ${skipped.length} line(s):`)
    for (const item of skipped) {
      console.log(`  line ${item.lineNumber}: ${item.reason}`)
      console.log(`    ${item.line}`)
    }
  }

  const duplicates = rows.filter((row) => row.duplicate)
  if (duplicates.length > 0) {
    console.log(
      `\nWarning: ${duplicates.length} line(s) share a date and slot with an earlier line.`,
    )
    console.log('The site keeps only the last reading per date + slot:')
    for (const row of duplicates) {
      console.log(
        `  ${row.date} ${row.timeOfDay} (line ${row.lineNumber}) — ${row.reading}`,
      )
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
