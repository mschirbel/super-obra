import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ObraTabBar } from '@/components/layout/obra-tab-bar'
import { MedicaoClient } from './medicao-client'
import { todayISO, formatDateShort } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function MedicaoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()

  const [{ data: obra }, { data: catalogItems }, { data: measurements }, { data: extraItems }] = await Promise.all([
    supabase.from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single(),
    supabase.from('catalog_items').select('*').eq('obra_id', id).order('order_index'),
    supabase
      .from('measurements')
      .select('*, measurement_items(*)')
      .eq('obra_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('extra_items')
      .select('*')
      .eq('obra_id', id)
      .eq('is_aditivo', true)
      .eq('aditivo_status', 'pendente'),
  ])

  if (!obra) notFound()

  const contractTotal = (catalogItems || []).reduce((s, i) => s + i.qty_total * i.unit_price, 0)
  const measuredTotal = (measurements || [])
    .filter(m => m.status === 'aprovada' || m.status === 'enviada')
    .reduce((s, m) => s + m.total, 0)

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title={obra.name}
        backHref="/obras"
        variant="exec"
        actions={<span className="text-[13.5px] font-mono font-semibold text-ink-3">{formatDateShort(today)}</span>}
      />
      <ObraTabBar obraId={id} />
      <MedicaoClient
        obraId={id}
        measurements={measurements as any || []}
        catalogItems={catalogItems || []}
        extraItemsPendentes={extraItems || []}
        contractTotal={contractTotal}
        measuredTotal={measuredTotal}
        today={today}
      />
    </div>
  )
}
