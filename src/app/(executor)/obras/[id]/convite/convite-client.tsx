'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ObraMember } from '@/lib/types/database'

interface Props {
  obraId: string
  members: ObraMember[]
}

export function ConviteClient({ obraId, members: initial }: Props) {
  const [members, setMembers] = useState(initial)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [newToken, setNewToken] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')

    const supabase = createClient()

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({ obra_id: obraId, email: email.trim().toLowerCase() })
      .select()
      .single()

    if (inviteError) {
      setError('Erro ao criar convite')
      setSending(false)
      return
    }

    // Create obra_members record
    await supabase.from('obra_members').upsert({
      obra_id: obraId,
      invited_email: email.trim().toLowerCase(),
      role: 'cliente',
    })

    setMembers(prev => [...prev, {
      id: invite.id,
      obra_id: obraId,
      user_id: null,
      invited_email: email.trim().toLowerCase(),
      role: 'cliente' as const,
      invited_at: new Date().toISOString(),
      accepted_at: null,
    }])

    setNewToken(invite.token)
    setEmail('')
    setSending(false)
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/convite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="bg-chrome rounded-2xl border border-chrome-line p-4">
        <p className="font-semibold text-ink mb-3">Convidar por e-mail</p>
        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="cliente@exemplo.com"
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" loading={sending} className="w-full">
            Gerar link de convite
          </Button>
        </form>
      </div>

      {newToken && (
        <div className="bg-exec-soft rounded-2xl p-4 border border-exec/20">
          <p className="text-sm font-semibold text-exec mb-2">✓ Convite criado! Copie e envie este link:</p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-chrome rounded-xl px-3 py-2 text-exec/80 break-all">
              {typeof window !== 'undefined' && `${window.location.origin}/convite/${newToken}`}
            </code>
            <Button size="sm" variant="secondary" onClick={() => copyLink(newToken)}>
              {copiedToken === newToken ? '✓' : 'Copiar'}
            </Button>
          </div>
          <p className="text-xs text-exec/60 mt-2">O link expira em 7 dias.</p>
        </div>
      )}

      {members.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink-2 mb-2">Clientes vinculados</p>
          <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 bg-cli-soft rounded-xl flex items-center justify-center text-sm font-bold text-cli">
                  {m.invited_email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{m.invited_email}</p>
                  <p className="text-xs text-ink-3">
                    {m.accepted_at ? '✓ Aceitou o convite' : 'Aguardando'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
