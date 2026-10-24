import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { ObraTabBar } from '@/components/layout/obra-tab-bar'
import { formatDateShort, formatCurrency, todayISO } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function ObraPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()

  const [{ data: obra }, { data: catalogItems }, { data: blockers }, { data: measurements }] = await Promise.all([
    supabase.from('obras').select('*').eq('id', id).eq('executor_id', user.id).single(),
    supabase.from('catalog_items').select('*').eq('obra_id', id).order('order_index'),
    supabase
      .from('blockers')
      .select('*')
      .eq('obra_id', id)
      .is('resolved_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('measurements')
      .select('id, period_start, period_end, total, status')
      .eq('obra_id', id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  if (!obra) notFound()

  const { data: todayEntry } = await supabase
    .from('diary_entries')
    .select('id, closed, no_work, diary_item_progress(catalog_item_id, qty_done)')
    .eq('obra_id', id)
    .eq('date', today)
    .maybeSingle()

  const items = catalogItems || []
  const activeBlockers = blockers || []
  const latestMeasurement = measurements?.[0] ?? null

  // Week total
  const weekStart = getWeekStart(today)
  const { data: weekEntries } = await supabase
    .from('diary_entries')
    .select('diary_item_progress(catalog_item_id, qty_done)')
    .eq('obra_id', id)
    .eq('closed', true)
    .gte('date', weekStart)
    .lte('date', today)

  const itemMap = Object.fromEntries(items.map(i => [i.id, i]))
  let weekTotal = 0
  ;(weekEntries || []).forEach((e: any) => {
    e.diary_item_progress?.forEach((p: any) => {
      const item = itemMap[p.catalog_item_id]
      if (item) weekTotal += p.qty_done * item.unit_price
    })
  })

  const contractTotal = items.reduce((s, i) => s + i.qty_total * i.unit_price, 0)
  const measuredTotal = latestMeasurement
    ? (await supabase.from('measurements').select('total').eq('obra_id', id).in('status', ['aprovada', 'enviada']).then(
        r => (r.data || []).reduce((s, m) => s + m.total, 0)
      ))
    : 0

  const todayClosed = todayEntry?.closed ?? false
  const previstoItems = items.filter(i => i.qty_done < i.qty_total)

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title={obra.name}
        backHref="/obras"
        variant="exec"
        actions={<span className="text-[13.5px] font-mono font-semibold text-ink-3">{formatDateShort(today)}</span>}
      />
      <ObraTabBar obraId={id} />

      <div className="px-[18px] pt-4 flex flex-col gap-4">
        {/* Fechar o dia card */}
        {!todayClosed ? (
          <Link href={`/obras/${id}/fechar`}>
            <div className="bg-chrome border border-signal rounded-[10px] p-[14px]">
              <div className="flex items-start justify-between mb-3">
                <p className="font-display font-bold text-[14.5px] text-ink">Fechar o dia</p>
                <span className="bg-signal-soft text-signal font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px]">
                  17:40
                </span>
              </div>
              <p className="text-[13.5px] text-ink-2 mb-3">
                {previstoItems.length} {previstoItems.length === 1 ? 'item previsto' : 'itens previstos'} para hoje. Registre quem veio e quanto andou.
              </p>
              <div className="bg-exec text-white rounded-[8px] py-3 text-center font-semibold text-[15px]">
                Fechar o dia
              </div>
              <p className="text-[11.5px] text-ink-3 mt-2">Leva menos de 2 minutos.</p>
            </div>
          </Link>
        ) : (
          <div className="bg-success-soft border border-dashed border-success rounded-[10px] p-[14px] flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center font-bold flex-shrink-0">✓</span>
            <div>
              <p className="font-semibold text-success text-[14.5px]">Dia fechado</p>
              <p className="text-[12.5px] text-success/80">Registro enviado ao cliente.</p>
            </div>
          </div>
        )}

        {/* HOJE - previsto */}
        {previstoItems.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">
                Hoje · {formatDateShort(today)}
              </span>
              <div className="flex-1 h-px bg-line-soft" />
            </div>
            <div className="bg-chrome border border-chrome-line rounded-[10px]">
              <div className="flex items-center justify-between px-[14px] py-2 bg-frame border-b border-line-soft rounded-t-[10px]">
                <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] text-ink-2">Previsto</span>
              </div>
              {previstoItems.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center gap-3 px-[14px] py-2.5 border-b border-line-soft last:border-0">
                  <div className="w-4 h-4 rounded border border-chrome-line flex-shrink-0" />
                  <p className="flex-1 text-[13.5px] text-ink">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRAVANDO A OBRA */}
        {activeBlockers.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Travando a obra</span>
              <div className="flex-1 h-px bg-line-soft" />
            </div>
            {activeBlockers.slice(0, 2).map(blocker => (
              <div key={blocker.id} className="bg-chrome border border-alert rounded-[10px] p-[14px] mb-2">
                <div className="flex items-start justify-between">
                  <p className="font-display font-bold text-[14.5px] text-ink flex-1">{blocker.description}</p>
                  {blocker.due_date && (
                    <span className="ml-3 bg-signal-soft text-signal font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px] flex-shrink-0">
                      Até {formatDateShort(blocker.due_date)}
                    </span>
                  )}
                </div>
                {blocker.responsible && (
                  <p className="text-[12.5px] text-ink-2 mt-1">
                    {blocker.responsible === 'cliente' ? 'Cliente' : 'Utsch'} · {blocker.type || ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ESTA SEMANA */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Esta semana</span>
            <div className="flex-1 h-px bg-line-soft" />
          </div>
          <div className="bg-chrome border border-chrome-line rounded-[10px] p-[14px] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] text-ink-2">Medição da semana até agora</span>
              <span className="font-mono font-semibold text-[15px] text-ink">{formatCurrency(weekTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] text-ink-2">Contrato medido</span>
              <span className="font-mono font-semibold text-[13.5px] text-ink">
                {formatCurrency(measuredTotal as number)} de {formatCurrency(contractTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="flex gap-2">
          <Link href={`/obras/${id}/avulso`} className="flex-1">
            <div className="bg-chrome border border-chrome-line rounded-[8px] py-3 text-center text-[13.5px] font-semibold text-ink-2">
              + Fora do orçamento
            </div>
          </Link>
          <Link href={`/obras/${id}/pendencia`} className="flex-1">
            <div className="bg-chrome border border-chrome-line rounded-[8px] py-3 text-center text-[13.5px] font-semibold text-ink-2">
              + Pendência
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

function getWeekStart(today: string): string {
  const d = new Date(today + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}
