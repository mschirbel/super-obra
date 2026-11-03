import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { ObraTabBar } from '@/components/layout/obra-tab-bar'
import { formatDateShort, todayISO } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function TravasPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()

  const [{ data: obra }, { data: blockers }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase
      .from('blockers')
      .select('*')
      .eq('obra_id', id)
      .is('resolved_at', null)
      .order('due_date', { ascending: true, nullsFirst: false }),
  ])

  if (!obra) notFound()

  const criticas = (blockers || []).filter(b => b.due_date && b.due_date <= today)
  const atencao = (blockers || []).filter(b => b.due_date && b.due_date > today)
  const abertas = (blockers || []).filter(b => !b.due_date)

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
        {!blockers?.length && (
          <div className="bg-success-soft border border-dashed border-success rounded-[10px] p-[14px] text-center">
            <p className="font-semibold text-success text-[14.5px]">Sem travas no momento</p>
            <p className="text-[12.5px] text-success/80 mt-1">A obra está fluindo sem pendências críticas.</p>
          </div>
        )}

        {/* TRAVANDO A OBRA (críticas) */}
        {criticas.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Travando a obra</span>
              <div className="flex-1 h-px bg-line-soft" />
            </div>
            {criticas.map(b => (
              <BlockerCard key={b.id} blocker={b} today={today} obraId={id} critical />
            ))}
          </div>
        )}

        {/* COMPRAS E MOBILIZAÇÕES */}
        {atencao.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">
                {atencao[0].type === 'compra' ? 'Compras e mobilizações' : 'Pendências com prazo'}
              </span>
              <div className="flex-1 h-px bg-line-soft" />
            </div>
            <div className="bg-chrome border border-chrome-line rounded-[10px] divide-y divide-line-soft">
              {atencao.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-[14px] py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink">{b.description}</p>
                    <p className="text-[11.5px] text-ink-3">
                      {b.responsible === 'cliente' ? 'cliente' : 'executor'} · até {formatDateShort(b.due_date)}
                    </p>
                  </div>
                  <span className={cn(
                    'font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px] flex-shrink-0',
                    'bg-alert-soft text-alert'
                  )}>
                    Trava {b.due_date === today ? 'Hoje' : formatDateShort(b.due_date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABERTAS (sem prazo) */}
        {abertas.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Abertas</span>
              <div className="flex-1 h-px bg-line-soft" />
            </div>
            <div className="bg-chrome border border-chrome-line rounded-[10px] divide-y divide-line-soft">
              {abertas.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-[14px] py-3">
                  <p className="flex-1 text-[13.5px] text-ink">{b.description}</p>
                  <span className="font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px] bg-frame border border-chrome-line text-ink-3">
                    {b.responsible === 'executor' ? 'Utsch' : 'Cliente'} · Aberta
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href={`/obras/${id}/pendencia`}>
          <div className="bg-chrome border border-chrome-line rounded-[8px] py-3 text-center text-[13.5px] font-semibold text-ink-2">
            + Nova pendência
          </div>
        </Link>
      </div>
    </div>
  )
}

function BlockerCard({ blocker, today, obraId, critical }: {
  blocker: any; today: string; obraId: string; critical?: boolean
}) {
  const isToday = blocker.due_date === today
  return (
    <div className={cn(
      'bg-chrome border rounded-[10px] p-[14px] mb-2',
      critical ? 'border-alert' : 'border-signal'
    )}>
      <div className="flex items-start justify-between mb-1">
        <p className="font-display font-bold text-[14.5px] text-ink flex-1">{blocker.description}</p>
        <span className={cn(
          'ml-3 font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px] flex-shrink-0',
          isToday ? 'bg-alert-soft text-alert' : 'bg-signal-soft text-signal'
        )}>
          {isToday ? 'É hoje' : `Até ${formatDateShort(blocker.due_date)}`}
        </span>
      </div>
      {blocker.responsible && (
        <p className="text-[12.5px] text-ink-2 mb-3">
          {blocker.responsible === 'executor' ? 'Utsch' : 'Cliente'} · {blocker.description}
        </p>
      )}
      <div className="flex gap-2">
        <button className="flex-1 py-2 border border-chrome-line rounded-[8px] text-[13.5px] font-semibold text-ink bg-chrome">
          Cobrar
        </button>
        <button className="flex-1 py-2 border border-chrome-line rounded-[8px] text-[13.5px] font-semibold text-ink bg-chrome">
          Remarcar
        </button>
      </div>
    </div>
  )
}
