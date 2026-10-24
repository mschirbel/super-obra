import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ObraTabBar } from '@/components/layout/obra-tab-bar'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function DiarioPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obra } = await supabase
    .from('obras')
    .select('id, name')
    .eq('id', id)
    .eq('executor_id', user.id)
    .single()

  if (!obra) notFound()

  const { data: entries } = await supabase
    .from('diary_entries')
    .select('id, date, no_work, no_work_reason, notes, closed, diary_workers(id, came, team_members(name)), diary_item_progress(id, qty_done, catalog_items(description, unit))')
    .eq('obra_id', id)
    .eq('closed', true)
    .order('date', { ascending: false })
    .limit(30)

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <div className="px-[18px] pt-5 pb-1">
        <p className="font-display font-bold text-[22px] text-ink leading-tight">{obra.name}</p>
      </div>
      <ObraTabBar obraId={id} />

      <div className="px-[18px] pt-4 flex flex-col gap-3">
        {!entries?.length && (
          <div className="bg-chrome border border-chrome-line rounded-[10px] p-[14px] text-center">
            <p className="text-[13.5px] text-ink-2">Nenhum dia fechado ainda.</p>
          </div>
        )}

        {(entries || []).map(entry => {
          const e = entry as any
          const workers = (e.diary_workers || []) as Array<{ came: boolean; team_members: { name: string } | null }>
          const progress = (e.diary_item_progress || []) as Array<{ qty_done: number; catalog_items: { description: string; unit: string } | null }>
          const present = workers.filter(w => w.came).map(w => w.team_members?.name).filter(Boolean)
          const absent = workers.filter(w => !w.came).map(w => w.team_members?.name).filter(Boolean)

          return (
            <div key={e.id} className="bg-chrome border border-chrome-line rounded-[10px] overflow-hidden">
              <div className={cn(
                'px-[14px] py-3 border-b border-chrome-line flex items-center justify-between',
                e.no_work ? 'bg-frame' : 'bg-chrome'
              )}>
                <span className="font-mono font-semibold text-[13px] text-ink">{formatDate(e.date)}</span>
                {e.no_work ? (
                  <span className="text-[11px] font-mono uppercase tracking-[.08em] text-ink-3">Sem atividade</span>
                ) : (
                  <span className="text-[11px] font-mono uppercase tracking-[.08em] text-exec">{present.length} pessoas</span>
                )}
              </div>

              <div className="px-[14px] py-3 flex flex-col gap-2">
                {e.no_work && e.no_work_reason && (
                  <p className="text-[12.5px] text-ink-2">{e.no_work_reason}</p>
                )}

                {!e.no_work && present.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {present.map((name, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-exec text-white text-[11.5px] font-semibold">
                        {name}
                      </span>
                    ))}
                    {absent.map((name, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-frame border border-chrome-line text-ink-3 text-[11.5px] font-semibold line-through">
                        {name}
                      </span>
                    ))}
                  </div>
                )}

                {progress.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {progress.map((p, i) => (
                      <p key={i} className="text-[12.5px] text-ink-2">
                        <span className="font-mono text-ink">{p.qty_done} {p.catalog_items?.unit}</span>
                        {' · '}{p.catalog_items?.description}
                      </p>
                    ))}
                  </div>
                )}

                {e.notes && (
                  <p className="text-[12.5px] text-ink-3 italic">{e.notes}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
