import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ComprasClient } from './compras-client'

interface Props { params: Promise<{ id: string }> }

export default async function ComprasPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obra }, { data: purchases }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase.from('purchases').select('*').eq('obra_id', id).order('created_at', { ascending: false }),
  ])

  if (!obra) notFound()

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader title="Compras" subtitle={obra.name} backHref={`/obras/${id}`} variant="exec" />
      <ComprasClient obraId={id} purchases={purchases || []} />
    </div>
  )
}
