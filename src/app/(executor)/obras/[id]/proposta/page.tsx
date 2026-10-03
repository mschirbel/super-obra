import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ProposalClient } from './proposal-client'

interface Props { params: Promise<{ id: string }> }

export default async function PropostaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obra }, { data: proposals }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase.from('proposals').select('*, proposal_items(*)').eq('obra_id', id).order('created_at', { ascending: false }),
  ])

  if (!obra) notFound()

  const { data: members } = await supabase
    .from('obra_members')
    .select('invited_email, accepted_at, user_id')
    .eq('obra_id', id)

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader title="Proposta" subtitle={obra.name} backHref={`/obras/${id}`} variant="exec" />
      <ProposalClient obraId={id} proposals={proposals || []} members={members || []} />
    </div>
  )
}
