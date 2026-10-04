import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { EquipeClient } from './equipe-client'

interface Props { params: Promise<{ id: string }> }

export default async function EquipePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obra } = await supabase
    .from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single()
  if (!obra) notFound()

  const [{ data: allMembers }, { data: obraAssignments }, { data: allActiveAssignments }] = await Promise.all([
    supabase.from('team_members').select('*').eq('executor_id', user.id).order('name'),
    supabase.from('obra_assignments').select('*').eq('obra_id', id),
    supabase.from('obra_assignments').select('team_member_id, obra_id').is('unassigned_at', null),
  ])

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader title="Equipe" subtitle={obra.name} backHref={`/obras/${id}`} variant="exec" />
      <EquipeClient
        obraId={id}
        userId={user.id}
        allMembers={allMembers || []}
        obraAssignments={obraAssignments || []}
        allActiveAssignments={allActiveAssignments || []}
      />
    </div>
  )
}
