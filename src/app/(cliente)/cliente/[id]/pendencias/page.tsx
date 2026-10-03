import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { PendenciasClient } from './pendencias-client'

interface Props { params: Promise<{ id: string }> }

export default async function PendenciasPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: obra } = await supabase.from('obras').select('id, name').eq('id', id).single()
  if (!obra) notFound()

  const { data: blockers } = await supabase
    .from('blockers')
    .select('*')
    .eq('obra_id', id)
    .neq('status', 'resolvido')
    .order('created_at', { ascending: false })

  return (
    <div className="pb-4">
      <PageHeader title="Pendências" subtitle={obra.name} variant="cli" />
      <PendenciasClient obraId={id} blockers={blockers || []} />
    </div>
  )
}
