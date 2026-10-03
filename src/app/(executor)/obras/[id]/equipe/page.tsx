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

  const [{ data: obra }, { data: team }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase.from('obra_team').select('*').eq('obra_id', id).order('name'),
  ])

  if (!obra) notFound()

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader title="Equipe" subtitle={obra.name} backHref={`/obras/${id}`} variant="exec" />
      <EquipeClient obraId={id} team={team || []} />
    </div>
  )
}
