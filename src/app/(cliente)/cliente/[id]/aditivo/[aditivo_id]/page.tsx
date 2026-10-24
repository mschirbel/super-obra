import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { AditivoClient } from './aditivo-client'
import { formatDateShort, todayISO } from '@/lib/utils'

interface Props { params: Promise<{ id: string; aditivo_id: string }> }

export default async function AditivoPage({ params }: Props) {
  const { id, aditivo_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify client membership
  const { data: member } = await supabase
    .from('obra_members')
    .select('id')
    .eq('obra_id', id)
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  if (!member) redirect(`/cliente/${id}/hoje`)

  const { data: extraItem } = await supabase
    .from('extra_items')
    .select('*')
    .eq('id', aditivo_id)
    .eq('obra_id', id)
    .eq('is_aditivo', true)
    .single()

  if (!extraItem) notFound()

  const today = todayISO()

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title="Serviço fora do contrato"
        backHref={`/cliente/${id}/financeiro`}
        variant="cli"
        actions={<span className="text-[13.5px] font-mono font-semibold text-ink-3">{formatDateShort(today)}</span>}
      />
      <AditivoClient obraId={id} item={extraItem as any} />
    </div>
  )
}
