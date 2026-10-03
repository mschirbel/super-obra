'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Blocker {
  id: string
  description: string
  status: string
  created_at: string
}

interface Props {
  obraId: string
  blockers: Blocker[]
}

export function PendenciasClient({ blockers: initial }: Props) {
  const [blockers, setBlockers] = useState(initial)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  async function handleConfirm(id: string) {
    setConfirmingId(id)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('blockers').update({ status: 'confirmado' }).eq('id', id)
    setBlockers(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmado' } : b))
    setConfirmingId(null)
  }

  const open = blockers.filter(b => b.status === 'aberto')
  const confirmed = blockers.filter(b => b.status === 'confirmado')

  if (!blockers.length) {
    return (
      <div className="px-4 pt-6">
        <div className="bg-chrome rounded-2xl border border-chrome-line p-8 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="font-bold text-ink text-lg">Sem pendências</p>
          <p className="text-sm text-ink-2 mt-1">Nenhuma pendência em aberto para você</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      {open.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink-2 mb-2">Aguardando sua confirmação</p>
          <div className="flex flex-col gap-2">
            {open.map(b => (
              <div key={b.id} className="bg-warning-soft border border-warning/20 rounded-2xl p-4">
                <p className="font-medium text-ink mb-3">{b.description}</p>
                <Button
                  size="sm"
                  variant="cli"
                  loading={confirmingId === b.id}
                  onClick={() => handleConfirm(b.id)}
                  className="w-full"
                >
                  Marcar como confirmado
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmed.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink-2 mb-2">Confirmadas</p>
          <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
            {confirmed.map(b => (
              <div key={b.id} className="p-4 flex items-start gap-3">
                <Badge variant="success">Confirmado</Badge>
                <p className="text-sm text-ink-2">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
