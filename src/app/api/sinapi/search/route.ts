import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10'), 20)

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = await createClient()

  // Use full-text search first, fallback to trigram
  const { data, error } = await supabase
    .from('sinapi_insumos')
    .select('id, codigo, descricao, unidade, preco_ref')
    .textSearch('search_vector', q.split(' ').map(w => w + ':*').join(' & '), {
      type: 'websearch',
      config: 'portuguese',
    })
    .limit(limit)

  if (error || !data?.length) {
    // Fallback: ilike trigram
    const { data: fallback } = await supabase
      .from('sinapi_insumos')
      .select('id, codigo, descricao, unidade, preco_ref')
      .ilike('descricao', `%${q}%`)
      .limit(limit)

    return NextResponse.json({ results: fallback || [] })
  }

  return NextResponse.json({ results: data })
}
