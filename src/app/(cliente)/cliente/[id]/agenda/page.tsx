import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function AgendaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: obra } = await supabase.from('obras').select('id, name').eq('id', id).single()
  if (!obra) notFound()

  // Next 10 days of diary entries (closed or not)
  const today = new Date()
  const days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const { data: entries } = await supabase
    .from('diary_entries')
    .select('date, no_work, closed')
    .eq('obra_id', id)
    .in('date', days)

  const { data: catalogItems } = await supabase
    .from('catalog_items')
    .select('description, qty_total, qty_done, unit')
    .eq('obra_id', id)
    .order('order_index')

  const entryMap = new Map(entries?.map(e => [e.date, e]) || [])
  const totalPct = catalogItems?.length
    ? catalogItems.reduce((sum, i) => sum + (i.qty_total > 0 ? (i.qty_done / i.qty_total) : 0), 0) / catalogItems.length * 100
    : 0

  return (
    <div className="pb-4">
      <PageHeader title="Agenda" subtitle={obra.name} variant="cli" />

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Overall progress */}
        {catalogItems && catalogItems.length > 0 && (
          <div className="bg-cli-soft rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-cli">Progresso geral</p>
              <span className="font-mono font-bold text-cli">{Math.round(totalPct)}%</span>
            </div>
            <div className="h-3 bg-cli/20 rounded-full overflow-hidden">
              <div className="h-full bg-cli rounded-full transition-all" style={{ width: `${totalPct}%` }} />
            </div>
          </div>
        )}

        {/* Next 10 days */}
        <div>
          <p className="text-sm font-semibold text-ink-2 mb-2">Próximos 10 dias</p>
          <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
            {days.map(day => {
              const entry = entryMap.get(day)
              return (
                <div key={day} className="flex items-center gap-3 p-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry?.closed ? (entry.no_work ? 'bg-ink-3' : 'bg-success') : 'bg-frame-line'}`} />
                  <span className="text-sm text-ink">{formatDate(day)}</span>
                  <span className="ml-auto text-xs text-ink-3">
                    {entry?.closed ? (entry.no_work ? 'Sem trabalho' : 'Trabalhou') : 'Previsto'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Catalog progress */}
        {catalogItems && catalogItems.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-ink-2 mb-2">Serviços</p>
            <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
              {catalogItems.map((item, i) => {
                const pct = item.qty_total > 0 ? Math.min(100, (item.qty_done / item.qty_total) * 100) : 0
                return (
                  <div key={i} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-ink">{item.description}</p>
                      <span className="text-xs text-ink-3 font-mono">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 bg-frame rounded-full overflow-hidden">
                      <div className="h-full bg-cli rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-ink-3 mt-0.5">{item.qty_done}/{item.qty_total} {item.unit}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
