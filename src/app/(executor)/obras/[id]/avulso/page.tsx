import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { AvulsoClient } from './avulso-client'
import { todayISO, formatDateShort } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function AvulsoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obra } = await supabase
    .from('obras').select('id, name').eq('id', id).eq('executor_id', user.id).single()
  if (!obra) notFound()

  const today = todayISO()

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title="Fora do orçamento"
        backHref={`/obras/${id}/fechar`}
        variant="exec"
        actions={<span className="text-[13.5px] font-mono font-semibold text-ink-3">{formatDateShort(today)}</span>}
      />
      <AvulsoClient obraId={id} today={today} />
    </div>
  )
}
