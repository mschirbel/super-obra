import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { FinanceiroClient } from './financeiro-client'

interface Props { params: Promise<{ id: string }> }

export default async function FinanceiroPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: obra } = await supabase.from('obras').select('id, name').eq('id', id).single()
  if (!obra) notFound()

  const [{ data: measurements }, { data: extraItems }, proposalResult] = await Promise.all([
    supabase
      .from('measurements')
      .select('*, measurement_items(*)')
      .eq('obra_id', id)
      .neq('status', 'rascunho')
      .order('created_at', { ascending: false }),
    supabase
      .from('extra_items')
      .select('*')
      .eq('obra_id', id)
      .eq('is_aditivo', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('proposals')
      .select('total_value')
      .eq('obra_id', id)
      .eq('status', 'aceita')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  return (
    <div className="pb-4">
      <PageHeader title="Financeiro" subtitle={obra.name} variant="cli" />
      <FinanceiroClient
        obraId={id}
        measurements={measurements || []}
        extraItems={extraItems || []}
        proposalTotal={(proposalResult.data as any)?.total_value ?? null}
      />
    </div>
  )
}
