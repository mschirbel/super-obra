'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Props {
  invite: { id: string; obra_id: string; email: string }
  obraName: string
  token: string
  userEmail?: string
}

export function AcceptInviteClient({ invite, obraName, token, userEmail }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isLoggedIn = !!userEmail
  const isCorrectUser = !userEmail || userEmail === invite.email

  async function handleAccept() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/convite/${token}`)}`)
      return
    }

    // Accept invite: update member and invite status
    const { error: memberError } = await supabase
      .from('obra_members')
      .update({ user_id: user.id, accepted_at: new Date().toISOString() })
      .eq('obra_id', invite.obra_id)
      .eq('invited_email', invite.email)

    if (memberError) {
      setError('Erro ao aceitar convite. Tente novamente.')
      setLoading(false)
      return
    }

    await supabase
      .from('invites')
      .update({ status: 'aceito' })
      .eq('id', invite.id)

    router.push('/cliente')
    router.refresh()
  }

  return (
    <div className="min-h-dvh bg-ground flex items-center justify-center px-4">
      <div className="bg-chrome rounded-2xl border border-chrome-line shadow-sm p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-cli-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🏗️</span>
        </div>
        <h1 className="font-display font-bold text-xl text-ink mb-2">
          Convite para obra
        </h1>
        <p className="text-ink-2 mb-1">Você foi convidado para acompanhar</p>
        <p className="font-semibold text-ink text-lg mb-6">{obraName}</p>

        {error && (
          <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {isLoggedIn ? (
          <div className="flex flex-col gap-3">
            {!isCorrectUser && (
              <p className="text-sm text-warning bg-warning-soft rounded-lg px-3 py-2">
                Este convite foi enviado para {invite.email}, mas você está logado como {userEmail}.
              </p>
            )}
            <Button variant="cli" size="lg" className="w-full" loading={loading} onClick={handleAccept}>
              Aceitar convite
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Button variant="cli" size="lg" className="w-full" loading={loading} onClick={handleAccept}>
              Criar conta e aceitar
            </Button>
            <Link href={`/login?next=${encodeURIComponent(`/convite/${token}`)}`}>
              <Button variant="secondary" size="lg" className="w-full">
                Já tenho conta
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
