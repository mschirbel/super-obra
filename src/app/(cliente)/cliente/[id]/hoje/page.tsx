import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate, formatDateLong, todayISO } from '@/lib/utils'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function HojePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: obra } = await supabase
    .from('obras')
    .select('id, name, status')
    .eq('id', id)
    .single()

  if (!obra) notFound()

  const today = todayISO()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: todayEntryRaw }, { data: recentEntries }, { data: pendingMeasurements }, { data: pendingPurchases }] = await Promise.all([
    supabase.from('diary_entries')
      .select('*, diary_item_progress(qty_done, catalog_items(description, unit))')
      .eq('obra_id', id)
      .eq('date', today)
      .eq('closed', true)
      .single(),
    supabase.from('diary_entries')
      .select('date, no_work, no_work_reason')
      .eq('obra_id', id)
      .eq('closed', true)
      .order('date', { ascending: false })
      .limit(5),
    supabase.from('measurements')
      .select('id, total, sent_at')
      .eq('obra_id', id)
      .eq('status', 'enviada')
      .limit(1),
    supabase.from('purchases')
      .select('id')
      .eq('obra_id', id)
      .eq('status', 'pendente')
      .limit(1),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todayEntry = todayEntryRaw as any

  return (
    <div className="pb-4">
      <PageHeader
        title="Hoje"
        subtitle={obra.name}
        backHref="/cliente"
        variant="cli"
      />

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Date */}
        <div className="bg-cli-soft rounded-2xl p-4">
          <p className="text-sm text-cli/70 font-semibold uppercase tracking-wide">{formatDateLong(today)}</p>
          {todayEntry ? (
            todayEntry.no_work ? (
              <div className="mt-2">
                <p className="font-bold text-cli text-lg">Sem trabalho hoje</p>
                {todayEntry.no_work_reason && <p className="text-sm text-cli/70">{todayEntry.no_work_reason}</p>}
              </div>
            ) : (
              <div className="mt-2">
                <p className="font-bold text-cli text-lg">Trabalho registrado ✓</p>
                {(todayEntry.diary_item_progress as any[]).length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {(todayEntry.diary_item_progress as any[]).slice(0, 3).map((p: any, i: number) => (
                      <li key={i} className="text-sm text-cli/80">
                        • {p.catalog_items?.description}: {p.qty_done} {p.catalog_items?.unit}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          ) : (
            <p className="font-bold text-cli text-lg mt-1">Aguardando fechamento do dia</p>
          )}
        </div>

        {/* Alerts */}
        {pendingMeasurements && pendingMeasurements.length > 0 && (
          <Link href={`/cliente/${id}/financeiro`}>
            <div className="bg-warning-soft border border-warning/20 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-xl">💰</span>
              <div className="flex-1">
                <p className="font-semibold text-ink text-sm">Medição aguardando aprovação</p>
                <p className="text-xs text-ink-3">Toque para revisar →</p>
              </div>
            </div>
          </Link>
        )}

        {pendingPurchases && pendingPurchases.length > 0 && (
          <Link href={`/cliente/${id}/compras`}>
            <div className="bg-frame border border-frame-line rounded-2xl p-4 flex items-center gap-3">
              <span className="text-xl">🛒</span>
              <div className="flex-1">
                <p className="font-semibold text-ink text-sm">Materiais a comprar</p>
                <p className="text-xs text-ink-3">Veja a lista de compras →</p>
              </div>
            </div>
          </Link>
        )}

        {/* Recent days */}
        {recentEntries && recentEntries.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-ink-2 mb-2">Últimos dias</p>
            <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
              {recentEntries.map(entry => (
                <div key={entry.date} className="flex items-center gap-3 p-3">
                  <span className={`w-2 h-2 rounded-full ${entry.no_work ? 'bg-ink-3' : 'bg-success'}`} />
                  <span className="text-sm text-ink">{formatDate(entry.date)}</span>
                  {entry.no_work && (
                    <span className="text-xs text-ink-3">{entry.no_work_reason || 'sem trabalho'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
