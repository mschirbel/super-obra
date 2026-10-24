import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { ObraTabBar } from '@/components/layout/obra-tab-bar'
import { formatDateShort, todayISO } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default async function ProgramacaoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()
  const day1 = today
  const day2 = addDays(today, 1)
  const day3 = addDays(today, 2)
  const nextDays = [day1, day2, day3]

  const [{ data: obra }, { data: catalogItems }, { data: blockers }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase.from('catalog_items').select('*').eq('obra_id', id).order('order_index'),
    supabase.from('blockers').select('id, description, catalog_item_id').eq('obra_id', id).is('resolved_at', null),
  ])

  if (!obra) notFound()

  const blockedItemIds = new Set((blockers || []).map(b => b.catalog_item_id).filter(Boolean))
  const openItems = (catalogItems || []).filter(i => i.qty_done < i.qty_total)
  const filaItems = openItems.filter(i => !blockedItemIds.has(i.id))
  const travasItems = openItems.filter(i => blockedItemIds.has(i.id))

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
        {/* Info box */}
        <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3">
          <p className="font-display font-bold text-[14.5px] text-ink">Janela de 3 dias</p>
          <p className="text-[13.5px] text-ink-2 mt-1">
            Só isto é compromisso com o cliente. O resto fica na fila, sem data.
          </p>
        </div>

        {/* Próximos 3 dias */}
        {nextDays.map((day, idx) => (
          <div key={day} className="bg-chrome border border-chrome-line rounded-[10px]">
            <div className="flex items-center justify-between px-[14px] py-2 bg-frame border-b border-line-soft rounded-t-[10px]">
              <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] text-exec">
                {formatDateShort(day)}
              </span>
              {idx === 0 && filaItems.length > 0 && (
                <span className="text-[10.5px] font-mono font-semibold text-ink-3">
                  {filaItems.slice(0, 3).map(i => i.description.slice(0, 2).toUpperCase()).join(' ')}
                </span>
              )}
            </div>
            {idx === 0 && filaItems.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center gap-3 px-[14px] py-2.5 border-b border-line-soft last:border-0">
                <div className="w-4 h-4 rounded border border-chrome-line flex-shrink-0" />
                <p className="flex-1 text-[13.5px] text-ink">{item.description}</p>
              </div>
            ))}
            {idx === 1 && filaItems.slice(3, 5).map(item => (
              <div key={item.id} className="flex items-center gap-3 px-[14px] py-2.5 border-b border-line-soft last:border-0">
                <div className="w-4 h-4 rounded border border-chrome-line flex-shrink-0" />
                <p className="flex-1 text-[13.5px] text-ink">{item.description}</p>
              </div>
            ))}
            {idx === 2 && (
              <div className="flex items-center justify-between px-[14px] py-3">
                <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] text-ink-3">
                  {formatDateShort(day)} · Nada previsto
                </span>
                <button className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] bg-exec-soft text-exec px-2 py-1 rounded-[5px]">
                  Puxar da fila
                </button>
              </div>
            )}
          </div>
        ))}

        {/* FILA SEM DATA */}
        {filaItems.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Fila sem data</span>
              <div className="flex-1 h-px bg-line-soft" />
            </div>
            <div className="bg-chrome border border-chrome-line rounded-[10px] divide-y divide-line-soft">
              {filaItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-[14px] py-3">
                  <p className="flex-1 text-[13.5px] text-ink">
                    {item.description}{item.qty_total - item.qty_done !== item.qty_total ? ` · ${item.qty_total - item.qty_done} ${item.unit}` : ''}
                  </p>
                  <button className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] bg-exec-soft text-exec px-2 py-1 rounded-[5px]">
                    + Dia
                  </button>
                </div>
              ))}
              {travasItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-[14px] py-3">
                  <p className="flex-1 text-[13.5px] text-ink">{item.description}</p>
                  <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] bg-alert-soft text-alert px-2 py-1 rounded-[5px]">
                    Travada
                  </span>
                </div>
              ))}
              {filaItems.length > 5 && (
                <div className="px-[14px] py-2">
                  <p className="text-[12.5px] text-ink-3">Ver toda a fila ›</p>
                </div>
              )}
            </div>
          </div>
        )}

        <Link href={`/obras/${id}/travas`}>
          <div className="bg-exec text-white rounded-[8px] py-3 text-center font-semibold text-[15px]">
            Avisar o cliente
          </div>
        </Link>

        <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3">
          <p className="text-[12.5px] text-ink-2">
            Se um dia não acontecer, o que estava nele volta sozinho para a fila. Ninguém replana à mão.
          </p>
        </div>
      </div>
    </div>
  )
}
