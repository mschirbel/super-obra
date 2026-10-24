import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { LogoutButton } from '@/components/ui/logout-button'
import { formatCurrency, todayISO } from '@/lib/utils'
import { getObrasLimit } from '@/lib/utils'
import type { Obra, CatalogItem } from '@/lib/types/database'

export default async function ObrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()

  const [{ data: profile }, { data: obras }] = await Promise.all([
    supabase.from('profiles').select('*, name').eq('id', user.id).single(),
    supabase.from('obras').select('*').eq('executor_id', user.id).order('created_at', { ascending: false }),
  ])

  const limit = getObrasLimit(profile?.tier || 'free')
  const canCreate = (obras?.length || 0) < limit

  const ativas = (obras || []).filter(o => o.status === 'ativa' || o.status === 'pre_obra')
  const concluidas = (obras || []).filter(o => o.status === 'concluida' || o.status === 'pausada')

  // Load catalog + diary data for active obras
  const obraIds = ativas.map(o => o.id)
  const [{ data: allCatalog }, { data: todayEntries }, { data: allBlockers }] = await Promise.all([
    obraIds.length ? supabase.from('catalog_items').select('id, obra_id, qty_total, qty_done, unit_price').in('obra_id', obraIds) : { data: [] },
    obraIds.length ? supabase.from('diary_entries').select('obra_id, closed').eq('date', today).in('obra_id', obraIds) : { data: [] },
    obraIds.length ? supabase.from('blockers').select('obra_id, id').is('resolved_at', null).in('obra_id', obraIds) : { data: [] },
  ])

  const catalogByObra: Record<string, CatalogItem[]> = {}
  ;(allCatalog || []).forEach((item: any) => {
    if (!catalogByObra[item.obra_id]) catalogByObra[item.obra_id] = []
    catalogByObra[item.obra_id].push(item)
  })

  const todayClosedSet = new Set((todayEntries || []).filter((e: any) => e.closed).map((e: any) => e.obra_id))
  const blockerCount: Record<string, number> = {}
  ;(allBlockers || []).forEach((b: any) => {
    blockerCount[b.obra_id] = (blockerCount[b.obra_id] || 0) + 1
  })

  const companyName = (profile as any)?.company_name || profile?.name || ''

  return (
    <div className="min-h-dvh bg-ground pb-24">
      <PageHeader
        title="Minhas obras"
        variant="exec"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-mono font-semibold uppercase tracking-[.06em] text-ink-3">
              {companyName}
            </span>
            <LogoutButton />
          </div>
        }
      />

      <div className="px-[18px] pt-4 flex flex-col gap-3">
        {/* Nova obra */}
        {canCreate && (
          <Link href="/obras/nova">
            <div className="border-2 border-dashed border-exec/40 rounded-[10px] p-[14px] flex items-center gap-4 bg-chrome active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-[8px] bg-exec-soft flex items-center justify-center flex-shrink-0">
                <span className="text-exec font-bold text-xl leading-none">+</span>
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-[14.5px] text-ink">Nova obra</p>
                <p className="text-[12.5px] text-ink-2">Comece pela proposta que você já mandou ao cliente</p>
              </div>
              <svg className="text-ink-3" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        )}

        {/* Em andamento */}
        {ativas.length > 0 && (
          <>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">
                Em andamento · {ativas.length}
              </span>
              <div className="flex-1 h-px bg-line-soft" />
            </div>
            {ativas.map(obra => (
              <ObraCard
                key={obra.id}
                obra={obra}
                catalog={catalogByObra[obra.id] || []}
                todayClosed={todayClosedSet.has(obra.id)}
                blockers={blockerCount[obra.id] || 0}
              />
            ))}
          </>
        )}

        {/* Concluídas */}
        {concluidas.length > 0 && (
          <>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Concluídas</span>
              <div className="flex-1 h-px bg-line-soft" />
            </div>
            <div className="bg-frame border border-chrome-line rounded-[10px] p-[14px]">
              <p className="text-[13.5px] text-ink-2">
                Obras encerradas ficam aqui, com o histórico de diário e medições.
              </p>
              <div className="flex flex-col gap-2 mt-3">
                {concluidas.map(obra => (
                  <Link key={obra.id} href={`/obras/${obra.id}`}>
                    <div className="flex items-center gap-3 py-1">
                      <p className="flex-1 text-[13.5px] text-ink-2">{obra.name}</p>
                      <svg className="text-ink-3" width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {!obras?.length && (
          <div className="bg-chrome rounded-[10px] border border-chrome-line p-8 text-center mt-4">
            <p className="font-display font-bold text-[14.5px] text-ink mb-2">Nenhuma obra ainda</p>
            <p className="text-[13.5px] text-ink-2 mb-4">Crie sua primeira obra para começar</p>
            <Link
              href="/obras/nova"
              className="inline-flex items-center gap-2 bg-exec text-white font-semibold px-5 py-3 rounded-[8px]"
            >
              + Nova obra
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function ObraCard({
  obra, catalog, todayClosed, blockers,
}: {
  obra: Obra
  catalog: CatalogItem[]
  todayClosed: boolean
  blockers: number
}) {
  const total = catalog.reduce((s, i) => s + i.qty_total * i.unit_price, 0)
  const done = catalog.reduce((s, i) => s + i.qty_done * i.unit_price, 0)
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0

  return (
    <Link href={`/obras/${obra.id}`}>
      <div className="bg-chrome border border-chrome-line rounded-[10px] p-[14px] active:scale-[0.98] transition-transform">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[14.5px] text-ink">{obra.name}</p>
            {obra.description && (
              <p className="text-[12.5px] text-ink-2 truncate">{obra.description}</p>
            )}
          </div>
          {blockers > 0 ? (
            <span className="ml-3 bg-alert-soft text-alert font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px] flex-shrink-0">
              {blockers} {blockers === 1 ? 'trava' : 'travas'}
            </span>
          ) : todayClosed ? (
            <span className="ml-3 bg-success-soft text-success font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px] flex-shrink-0">
              Em dia
            </span>
          ) : (
            <span className="ml-3 bg-signal-soft text-signal font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px] flex-shrink-0">
              Fechar o dia
            </span>
          )}
        </div>

        {total > 0 && (
          <div className="mb-2">
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className="h-full bg-exec rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {total > 0 ? (
            <p className="text-[12.5px] font-mono text-ink-2">
              {formatCurrency(done)} de {formatCurrency(total)} medidos
            </p>
          ) : obra.address ? (
            <p className="text-[12.5px] text-ink-3 truncate">{obra.address}</p>
          ) : null}
          <svg className="text-ink-3 flex-shrink-0 ml-auto" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </Link>
  )
}
