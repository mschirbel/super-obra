import { NextRequest, NextResponse } from 'next/server'

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
    return NextResponse.json({ items: [] })
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
  try {
    // Use pdf-parse to extract text
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
    const data = await pdfParse(buffer)
    const lines = data.text.split('\n').map((l: string) => l.trim()).filter(Boolean)

    const items: ParsedItem[] = []
    let lineNumber = 0

    // Heuristic: look for lines with numbers at the end that could be prices
    // Pattern: description ... qty unit price
    const pricePattern = /(\d[\d.,]*)\s*$/
    const codePattern = /^([A-Z0-9]{3,12})\s/

    for (const line of lines) {
      if (line.length < 5) continue
      const priceMatch = line.match(pricePattern)
      if (!priceMatch) continue

      // Try to extract code, description, and price
      const codeMatch = line.match(codePattern)
      const code = codeMatch ? codeMatch[1] : ''
      const description = line
        .replace(codePattern, '')
        .replace(/\s+\d[\d.,]*\s*$/, '')
        .trim()

      if (description.length < 3) continue

      lineNumber++
      items.push({
        line_number: lineNumber,
        code,
        description,
        unit: 'un',
        qty: 1,
        unit_price: parseNum(priceMatch[1]),
      })
    }

    return items.slice(0, 200)
  } catch {
    return []
  }
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
