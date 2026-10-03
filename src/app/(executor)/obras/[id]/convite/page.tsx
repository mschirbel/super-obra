import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ConviteClient } from './convite-client'

interface Props { params: Promise<{ id: string }> }

export default async function ConvitePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obra }, { data: members }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase.from('obra_members').select('*').eq('obra_id', id),
  ])

  if (!obra) notFound()

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader title="Convidar cliente" subtitle={obra.name} backHref={`/obras/${id}`} variant="exec" />
      <ConviteClient obraId={id} members={members || []} />
    </div>
  )
}
