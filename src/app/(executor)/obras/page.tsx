import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { ObraStatusBadge } from '@/components/ui/status-badge'
import { getObrasLimit, tierLabel } from '@/lib/utils'
import type { Obra } from '@/lib/types/database'

export default async function ObrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: obras }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('obras').select('*').eq('executor_id', user.id).order('created_at', { ascending: false }),
  ])

  const limit = getObrasLimit(profile?.tier || 'free')
  const count = obras?.length || 0
  const canCreate = count < limit

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title="Minhas obras"
        subtitle={`${tierLabel(profile?.tier || 'free')} · ${count}/${limit === 99999 ? '∞' : limit} obras`}
        variant="exec"
        actions={
          canCreate ? (
            <Link
              href="/obras/nova"
              className="flex items-center justify-center w-9 h-9 bg-exec text-white rounded-xl font-bold text-xl hover:bg-exec/90 transition-colors"
              aria-label="Nova obra"
            >
              +
            </Link>
          ) : null
        }
      />

      <div className="px-4 pt-4 flex flex-col gap-3">
        {!obras?.length ? (
          <div className="bg-chrome rounded-2xl border border-chrome-line p-8 text-center mt-4">
            <p className="text-4xl mb-3">🏗️</p>
            <h2 className="font-display font-bold text-lg text-ink mb-2">Nenhuma obra ainda</h2>
            <p className="text-ink-2 text-sm mb-5">Crie sua primeira obra para começar</p>
            <Link
              href="/obras/nova"
              className="inline-flex items-center gap-2 bg-exec text-white font-semibold px-5 py-3 rounded-xl hover:bg-exec/90 transition-colors"
            >
              + Criar obra
            </Link>
          </div>
        ) : (
          obras.map(obra => <ObraCard key={obra.id} obra={obra} />)
        )}

        {!canCreate && obras && obras.length > 0 && (
          <div className="bg-cli-soft border border-cli/20 rounded-2xl p-4 text-center">
            <p className="text-sm text-ink-2 mb-2">
              Limite de obras atingido ({count}/{limit})
            </p>
            <Link href="/planos" className="text-sm font-semibold text-cli hover:underline">
              Fazer upgrade →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function ObraCard({ obra }: { obra: Obra }) {
  return (
    <Link href={`/obras/${obra.id}`}>
      <div className="bg-chrome border border-chrome-line rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
        <div className="w-11 h-11 bg-exec-soft rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🏗️</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ink truncate">{obra.name}</h3>
          {obra.address && (
            <p className="text-sm text-ink-3 truncate">{obra.address}</p>
          )}
        </div>
        <ObraStatusBadge status={obra.status} />
      </div>
    </Link>
  )
}
