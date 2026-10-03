import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { ObraStatusBadge } from '@/components/ui/status-badge'

export default async function ClienteObrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: members } = await supabase
    .from('obra_members')
    .select('obra_id, obras(*)')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obras = ((members as unknown) as any[])?.map((m: any) => m.obras).filter(Boolean) || []

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader title="Minhas obras" variant="cli" />

      <div className="px-4 pt-4 flex flex-col gap-3">
        {!obras.length ? (
          <div className="bg-chrome rounded-2xl border border-chrome-line p-8 text-center mt-4">
            <p className="text-4xl mb-3">🏠</p>
            <h2 className="font-display font-bold text-lg text-ink mb-2">Nenhuma obra ainda</h2>
            <p className="text-ink-2 text-sm">Você receberá um link de convite do seu empreiteiro.</p>
          </div>
        ) : (
          obras.map((obra: any) => (
            <Link key={obra.id} href={`/cliente/${obra.id}/hoje`}>
              <div className="bg-chrome border border-chrome-line rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
                <div className="w-11 h-11 bg-cli-soft rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🏠</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink truncate">{obra.name}</h3>
                  {obra.address && <p className="text-sm text-ink-3 truncate">{obra.address}</p>}
                </div>
                <ObraStatusBadge status={obra.status} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
