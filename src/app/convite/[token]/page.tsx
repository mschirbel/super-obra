import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AcceptInviteClient } from './accept-invite-client'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ConvitePage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .single()

  if (!invite || invite.status !== 'pendente' || new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-dvh bg-ground flex items-center justify-center px-4">
        <div className="bg-chrome rounded-2xl border border-chrome-line p-8 max-w-sm w-full text-center">
          <p className="text-2xl mb-3">⏰</p>
          <h1 className="font-display font-bold text-xl text-ink mb-2">Convite inválido</h1>
          <p className="text-ink-2">Este convite expirou ou já foi usado.</p>
        </div>
      </div>
    )
  }

  const [{ data: { user } }, { data: obra }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('obras').select('name').eq('id', invite.obra_id).single(),
  ])

  return (
    <AcceptInviteClient
      invite={invite as any}
      obraName={obra?.name ?? 'Obra'}
      token={token}
      userEmail={user?.email}
    />
  )
}
