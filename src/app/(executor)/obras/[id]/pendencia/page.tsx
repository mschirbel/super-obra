import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { PendenciaClient } from './pendencia-client'
import { todayISO, formatDateShort } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function PendenciaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obra } = await supabase
    .from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single()
  if (!obra) notFound()

  const { data: catalogItems } = await supabase
    .from('catalog_items')
    .select('id, description')
    .eq('obra_id', id)
    .order('order_index')

  const { data: member } = await supabase
    .from('obra_members')
    .select('invited_email')
    .eq('obra_id', id)
    .not('accepted_at', 'is', null)
    .limit(1)
    .maybeSingle()

  const today = todayISO()
  const clienteName = member?.invited_email?.split('@')[0] || 'Cliente'

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title="Nova pendência"
        backHref={`/obras/${id}/travas`}
        variant="exec"
        actions={<span className="text-[13.5px] font-mono font-semibold text-ink-3">{formatDateShort(today)}</span>}
      />
      <PendenciaClient
        obraId={id}
        catalogItems={catalogItems || []}
        clienteName={clienteName}
        executorName="Utsch"
      />
    </div>
  )
}
