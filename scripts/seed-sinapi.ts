/**
 * Seed SINAPI insumos from XLSX file into Supabase
 * Run: npx ts-node --esm scripts/seed-sinapi.ts
 *      OR: npx tsx scripts/seed-sinapi.ts
 */

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as fs from 'fs'

const XLSX_PATH = process.env.SINAPI_XLSX || path.join(
  'C:/Users/mschi/Downloads/SINAPI_ref_Insumos_Composicoes_SP_202412_NaoDesonerado',
  'SINAPI_Preco_Ref_Insumos_SP_202412_NaoDesonerado.xlsx'
)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://luldlaklrgdjgeytergw.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface Row {
  codigo: string
  descricao: string
  unidade: string
  preco_ref: number | null
}

function readSinapiXlsx(): Row[] {
  console.log(`Reading ${XLSX_PATH}`)
  const buffer = fs.readFileSync(XLSX_PATH)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  // Find header row (contains CÓDIGO or DESCRIÇÃO)
  let headerIdx = 0
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i].map((c: any) => String(c).toLowerCase())
    if (row.some((c: string) => c.includes('c\u00f3digo') || c.includes('codigo') || c.includes('descri'))) {
      headerIdx = i
      break
    }
  }

  const headers = rows[headerIdx].map((h: any) => String(h).toLowerCase())
  console.log('Headers found:', headers.slice(0, 8))

  const codigoIdx = headers.findIndex((h: string) => h.includes('c\u00f3digo') || h.includes('codigo') || h === 'código')
  const descIdx = headers.findIndex((h: string) => h.includes('descri'))
  const unidIdx = headers.findIndex((h: string) => h.includes('unidad') || h === 'un' || h === 'uni')
  const precoIdx = headers.findIndex((h: string) => h.includes('pre\u00e7o') || h.includes('preco') || h.includes('custo') || h.includes('media'))

  console.log(`Columns: codigo=${codigoIdx} desc=${descIdx} unid=${unidIdx} preco=${precoIdx}`)

  const result: Row[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const descricao = String(row[descIdx] || '').trim()
    if (!descricao || descricao.length < 3) continue

    const preco = row[precoIdx]
    let preco_ref: number | null = null
    if (preco !== '' && preco != null) {
      const n = parseFloat(String(preco).replace(',', '.').replace(/[^\d.]/g, ''))
      if (!isNaN(n) && n > 0) preco_ref = n
    }

    result.push({
      codigo: String(row[codigoIdx] || '').trim(),
      descricao,
      unidade: String(row[unidIdx] || '').trim().toUpperCase() || 'UN',
      preco_ref,
    })
  }

  return result
}

async function seed() {
  const rows = readSinapiXlsx()
  console.log(`Found ${rows.length} insumos`)

  const BATCH = 500
  let inserted = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(r => ({
      ...r,
      estado: 'SP',
      mes_ref: '202412',
    }))

    const { error } = await supabase
      .from('sinapi_insumos')
      .upsert(batch, { onConflict: 'codigo,estado', ignoreDuplicates: false })

    if (error) {
      console.error(`Batch ${i}-${i + BATCH} error:`, error.message)
      errors++
    } else {
      inserted += batch.length
      process.stdout.write(`\r${inserted}/${rows.length} inserted...`)
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${errors} batches with errors.`)
}

seed().catch(console.error)
