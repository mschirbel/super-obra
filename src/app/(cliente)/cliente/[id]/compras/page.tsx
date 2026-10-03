import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { PurchaseStatusBadge } from '@/components/ui/status-badge'
import { formatCurrency } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function ClienteComprasPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: obra } = await supabase.from('obras').select('id, name').eq('id', id).single()
  if (!obra) notFound()

  const { data: purchases } = await supabase
    .from('purchases')
    .select('*')
    .eq('obra_id', id)
    .order('created_at', { ascending: false })

  const total = purchases?.reduce((sum, p) => sum + (p.estimated_price ? p.estimated_price * p.qty : 0), 0) || 0

  return (
    <div className="pb-4">
      <PageHeader title="Compras" subtitle={obra.name} variant="cli" />

      <div className="px-4 pt-4 flex flex-col gap-4">
        {total > 0 && (
          <div className="bg-cli-soft rounded-2xl p-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-cli">Estimativa total</p>
            <p className="font-bold font-mono text-cli">{formatCurrency(total)}</p>
          </div>
        )}

        {!purchases?.length ? (
          <div className="bg-chrome rounded-2xl border border-chrome-line p-6 text-center">
            <p className="text-ink-2 text-sm">Nenhum material na lista</p>
          </div>
        ) : (
          <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
            {purchases.map(p => (
              <div key={p.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink text-sm truncate">{p.description}</p>
                  <p className="text-xs text-ink-3 font-mono">
                    {p.qty} {p.unit}
                    {p.estimated_price != null && ` · ~${formatCurrency(p.estimated_price * p.qty)}`}
                  </p>
                </div>
                <PurchaseStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
