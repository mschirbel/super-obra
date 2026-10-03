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

  const { data: measurements } = await supabase
    .from('measurements')
    .select('*, measurement_items(*)')
    .eq('obra_id', id)
    .neq('status', 'rascunho')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: proposalRaw } = await supabase
    .from('proposals')
    .select('total_value, proposal_items(*)')
    .eq('obra_id', id)
    .eq('status', 'aceita')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  const proposal = proposalRaw as any

  return (
    <div className="pb-4">
      <PageHeader title="Financeiro" subtitle={obra.name} variant="cli" />
      <FinanceiroClient
        obraId={id}
        measurements={measurements || []}
        proposalTotal={proposal?.total_value ?? null}
      />
    </div>
  )
}
