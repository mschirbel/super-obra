import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { FecharClient } from './fechar-client'
import { todayISO, formatDateShort } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function FecharPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()
  const weekStart = getWeekStart(today)

  const [{ data: obra }, { data: assignments }, { data: catalogItems }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase
      .from('obra_assignments')
      .select('team_members(*)')
      .eq('obra_id', id)
      .is('unassigned_at', null),
    supabase.from('catalog_items').select('*').eq('obra_id', id).order('order_index'),
  ])

  if (!obra) notFound()

  const team = ((assignments || []) as any[]).map((a: any) => a.team_members).filter(Boolean)

  const { data: todayEntry } = await supabase
    .from('diary_entries')
    .select('id, date, no_work, closed, diary_workers(team_member_id, came), diary_item_progress(catalog_item_id, qty_done)')
    .eq('obra_id', id)
    .eq('date', today)
    .maybeSingle()

  // Week total from diary entries (already closed this week, excluding today)
  const { data: weekEntries } = await supabase
    .from('diary_entries')
    .select('diary_item_progress(catalog_item_id, qty_done)')
    .eq('obra_id', id)
    .eq('closed', true)
    .gte('date', weekStart)
    .lt('date', today)

  const itemMap = Object.fromEntries((catalogItems || []).map(i => [i.id, i]))
  let weekTotal = 0
  ;(weekEntries || []).forEach((entry: any) => {
    entry.diary_item_progress?.forEach((p: any) => {
      const item = itemMap[p.catalog_item_id]
      if (item) weekTotal += p.qty_done * item.unit_price
    })
  })

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title="Fechar o dia"
        backHref={`/obras/${id}`}
        variant="exec"
        actions={<span className="text-[13.5px] font-mono font-semibold text-ink-3">{formatDateShort(today)}</span>}
      />
      <FecharClient
        obraId={id}
        today={today}
        team={team}
        catalogItems={catalogItems || []}
        todayEntry={todayEntry as any}
        weekTotal={weekTotal}
      />
    </div>
  )
}

function getWeekStart(today: string): string {
  const d = new Date(today + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}
