import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { DiarioClient } from './diario-client'
import { todayISO, formatDate } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function DiarioPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obra }, { data: team }, { data: catalogItems }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase
      .from('obra_assignments')
      .select('team_members(*)')
      .eq('obra_id', id)
      .is('unassigned_at', null)
      .order('team_members(name)'),
    supabase.from('catalog_items').select('*').eq('obra_id', id).order('order_index'),
  ])

  if (!obra) notFound()

  const today = todayISO()
  const { data: todayEntry } = await supabase
    .from('diary_entries')
    .select('*, diary_workers(*, team_members(*)), diary_item_progress(*)')
    .eq('obra_id', id)
    .eq('date', today)
    .single()

  // Recent closed entries
  const { data: recentEntries } = await supabase
    .from('diary_entries')
    .select('id, date, no_work, closed')
    .eq('obra_id', id)
    .eq('closed', true)
    .order('date', { ascending: false })
    .limit(7)

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title="Fechar o dia"
        subtitle={formatDate(today)}
        backHref={`/obras/${id}`}
        variant="exec"
      />
      <DiarioClient
        obraId={id}
        today={today}
        team={((team || []) as any[]).map((a: any) => a.team_members).filter(Boolean)}
        catalogItems={catalogItems || []}
        todayEntry={todayEntry as any}
        recentEntries={recentEntries || []}
      />
    </div>
  )
}
