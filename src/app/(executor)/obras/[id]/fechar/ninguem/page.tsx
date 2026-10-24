import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { NinguemClient } from './ninguem-client'
import { todayISO, formatDateShort } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function NinguemPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()

  const { data: obra } = await supabase
    .from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single()
  if (!obra) notFound()

  // Items scheduled for today that go back to queue
  const { data: catalogItems } = await supabase
    .from('catalog_items')
    .select('id, description, qty_total, qty_done, unit')
    .eq('obra_id', id)
    .order('order_index')

  const openItems = (catalogItems || []).filter(i => i.qty_done < i.qty_total)

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title="Dia sem atividade"
        backHref={`/obras/${id}/fechar`}
        variant="exec"
        actions={<span className="text-[13.5px] font-mono font-semibold text-ink-3">{formatDateShort(today)}</span>}
      />
      <NinguemClient obraId={id} today={today} openItems={openItems} />
    </div>
  )
}
