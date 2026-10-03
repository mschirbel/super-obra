import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { MedicaoClient } from './medicao-client'

interface Props { params: Promise<{ id: string }> }

export default async function MedicaoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obra }, { data: measurements }, { data: catalogItems }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase.from('measurements').select('*, measurement_items(*)').eq('obra_id', id).order('created_at', { ascending: false }),
    supabase.from('catalog_items').select('*').eq('obra_id', id).order('order_index'),
  ])

  if (!obra) notFound()

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader title="Medição" subtitle={obra.name} backHref={`/obras/${id}`} variant="exec" />
      <MedicaoClient obraId={id} measurements={measurements || []} catalogItems={catalogItems || []} />
    </div>
  )
}
