import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ObraTabBar } from '@/components/layout/obra-tab-bar'
import { ContratoClient } from './contrato-client'

interface Props { params: Promise<{ id: string }> }

export default async function ContratoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obra }, { data: catalogItems }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase.from('catalog_items').select('*').eq('obra_id', id).order('order_index'),
  ])

  if (!obra) notFound()

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <div className="px-[18px] pt-5 pb-1">
        <p className="font-display font-bold text-[22px] text-ink leading-tight">{obra.name}</p>
      </div>
      <ObraTabBar obraId={id} />
      <ContratoClient obraId={id} catalogItems={catalogItems || []} />
    </div>
  )
}
