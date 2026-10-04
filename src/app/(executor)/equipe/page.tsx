import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { EquipeGlobalClient } from './equipe-global-client'

export default async function EquipeGlobalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: members }, { data: assignments }] = await Promise.all([
    supabase.from('team_members').select('*').eq('executor_id', user.id).order('name'),
    supabase.from('obra_assignments').select('team_member_id, obra_id, obras(name)').is('unassigned_at', null),
  ])

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader title="Equipe" subtitle="Seus trabalhadores" variant="exec" />
      <EquipeGlobalClient
        userId={user.id}
        members={members || []}
        assignments={(assignments || []) as any[]}
      />
    </div>
  )
}
