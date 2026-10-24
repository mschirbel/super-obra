import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ContestarClient } from './contestar-client'
import { formatCurrency } from '@/lib/utils'

interface Props { params: Promise<{ id: string; item_id: string }> }

export default async function ContestarPage({ params }: Props) {
  const { id, item_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('obra_members')
    .select('id')
    .eq('obra_id', id)
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  if (!member) redirect(`/cliente/${id}/financeiro`)

  const { data: item } = await supabase
    .from('measurement_items')
    .select('*, measurements!inner(obra_id, status)')
    .eq('id', item_id)
    .single()

  if (!item || (item as any).measurements?.obra_id !== id) notFound()

  const measurementNum = await supabase
    .from('measurements')
    .select('id')
    .eq('obra_id', id)
    .order('created_at')
    .then(r => {
      const idx = (r.data || []).findIndex(m => m.id === (item as any).measurement_id)
      return idx >= 0 ? idx + 1 : 1
    })

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title="Contestar item"
        backHref={`/cliente/${id}/financeiro`}
        variant="cli"
        actions={<span className="text-[13.5px] font-mono font-semibold text-ink-3">Medição {measurementNum}</span>}
      />
      <ContestarClient
        obraId={id}
        item={item as any}
        measurementNum={measurementNum}
      />
    </div>
  )
}
