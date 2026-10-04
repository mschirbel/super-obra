import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface ParsedItem {
  line_number: number
  code: string
  description: string
  unit: string
  qty: number
  unit_price: number
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ items: [] })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    let items: ParsedItem[] = []

    if (ext === 'xlsx' || ext === 'xls') {
      items = await parseExcel(file)
    } else if (ext === 'csv') {
      items = await parseCsv(file)
    } else if (ext === 'pdf') {
      items = await parsePdf(file)
    }

    return NextResponse.json({ items })
  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json({ items: [], error: String(err) })
  }
}

async function parseExcel(file: File): Promise<ParsedItem[]> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  const items: ParsedItem[] = []
  let lineNumber = 0

  // Try to detect header row
  let dataStart = 0
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((c: any) => String(c).toLowerCase())
    if (row.some((c: string) => c.includes('descri') || c.includes('item') || c.includes('servi'))) {
      dataStart = i + 1
      break
    }
  }

  // Try to detect column indices
  const headerRow = rows[dataStart - 1] || []
  const colIdx = detectColumns(headerRow)

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c: any) => !c)) continue

    const description = String(row[colIdx.desc] || '').trim()
    if (!description || description.length < 3) continue

    lineNumber++
    items.push({
      line_number: lineNumber,
      code: String(row[colIdx.code] || '').trim(),
      description,
      unit: String(row[colIdx.unit] || 'un').trim() || 'un',
      qty: parseNum(row[colIdx.qty]),
      unit_price: parseNum(row[colIdx.price]),
    })
  }

  return items
}

async function parseCsv(file: File): Promise<ParsedItem[]> {
  const text = await file.text()
  const lines = text.split('\n').map(l => l.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, '')))
  if (lines.length < 2) return []

  const headerRow = lines[0]
  const colIdx = detectColumns(headerRow)

  return lines.slice(1)
    .filter(row => row[colIdx.desc]?.length > 2)
    .map((row, i) => ({
      line_number: i + 1,
      code: row[colIdx.code] || '',
      description: row[colIdx.desc] || '',
      unit: row[colIdx.unit] || 'un',
      qty: parseNum(row[colIdx.qty]),
      unit_price: parseNum(row[colIdx.price]),
    }))
}

async function parsePdf(file: File): Promise<ParsedItem[]> {
  const buffer = Buffer.from(await file.arrayBuffer())
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
  const data = await pdfParse(buffer)
  const lines = data.text.split('\n').map((l: string) => l.trim()).filter(Boolean)

  const items: ParsedItem[] = []
  let lineNumber = 0

  // Brazilian budget PDFs commonly have lines like:
  // [code] description  unit  qty  unit_price  total
  // e.g.: "1.1 Demolição de revestimento cerâmico m² 50,00 35,00 1.750,00"
  // We look for lines that contain at least 2 numeric tokens (qty + price or price + total)
  const numToken = /\d[\d.,]*/g

  for (const line of lines) {
    if (line.length < 8) continue

    const nums = [...line.matchAll(numToken)].map(m => m[0])
    if (nums.length < 2) continue

    // Last number is likely total, second-to-last is unit_price, third-to-last is qty
    const total = parseNum(nums[nums.length - 1])
    const unitPrice = parseNum(nums[nums.length - 2])
    const qty = nums.length >= 3 ? parseNum(nums[nums.length - 3]) : 1

    // Unit price must be > 0, total must be >= unit price (sanity check)
    if (unitPrice <= 0) continue
    if (total > 0 && total < unitPrice * 0.5) continue

    // Strip all trailing numbers to get the description
    let description = line
    for (let i = 0; i < Math.min(nums.length, 3); i++) {
      description = description.replace(new RegExp(`\\s*${nums[nums.length - 1 - i].replace('.', '\\.')}\\s*$`), '')
    }

    // Try to detect unit (last non-numeric word that looks like a unit)
    const unitMatch = description.match(/\b(m[²³]?|cm|kg|t\b|l\b|un|vb|cj|gl|hr?|dia|pç|m\.l\.?|ml)\b/i)
    const unit = unitMatch ? unitMatch[1].toLowerCase() : 'un'
    if (unitMatch) description = description.replace(unitMatch[0], '')

    // Try to detect and strip leading code
    const codeMatch = description.match(/^\s*(\d[\d.]*|\d+\.\d+)\s+/)
    const code = codeMatch ? codeMatch[1] : ''
    if (codeMatch) description = description.replace(codeMatch[0], '')

    description = description.trim()
    if (description.length < 4) continue
    // Skip lines that look like headers
    if (/descri[çc]|item|servi[çc]|total\s*geral|subtotal|valor\s*total/i.test(description) && nums.length < 4) continue

    lineNumber++
    items.push({
      line_number: lineNumber,
      code,
      description,
      unit,
      qty: qty > 0 ? qty : 1,
      unit_price: unitPrice,
    })
  }

  return items.slice(0, 300)
}

function detectColumns(headerRow: any[]): Record<string, number> {
  const idx = { desc: 1, code: 0, unit: 2, qty: 3, price: 4 }
  const headers = headerRow.map((h: any) => String(h).toLowerCase())

  headers.forEach((h, i) => {
    if (/descri|item|servi|material/.test(h)) idx.desc = i
    else if (/c[oó]d|code|ref/.test(h)) idx.code = i
    else if (/unid|un\b/.test(h)) idx.unit = i
    else if (/qtd|quant|qtde/.test(h)) idx.qty = i
    else if (/pre[çc]|valor|unit|price/.test(h)) idx.price = i
  })

  return idx
}

function parseNum(val: any): number {
  if (val == null || val === '') return 0
  const str = String(val).replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(str.replace(/[^\d.]/g, ''))
  return isNaN(n) ? 0 : n
}
