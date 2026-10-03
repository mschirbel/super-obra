'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MeasurementStatusBadge } from '@/components/ui/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Measurement, MeasurementItem } from '@/lib/types/database'

type MeasurementWithItems = Measurement & { measurement_items: MeasurementItem[] }

interface Props {
  obraId: string
  measurements: MeasurementWithItems[]
  proposalTotal: number | null
}

export function FinanceiroClient({ measurements: initial, proposalTotal }: Props) {
  const [measurements, setMeasurements] = useState(initial)
  const [contestingId, setContestingId] = useState<string | null>(null)
  const [contestReason, setContestReason] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  const totalApproved = measurements
    .filter(m => m.status === 'aprovada')
    .reduce((sum, m) => sum + m.total, 0)

  async function handleApprove(id: string) {
    setActionId(id)
    const supabase = createClient()
    await supabase.from('measurements').update({
      status: 'aprovada',
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, status: 'aprovada' as const } : m))
    setActionId(null)
  }

  async function handleContest(id: string) {
    if (!contestReason.trim()) return
    setActionId(id)
    const supabase = createClient()
    await supabase.from('measurements').update({
      status: 'contestada',
      contest_reason: contestReason,
      contested_at: new Date().toISOString(),
    }).eq('id', id)
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, status: 'contestada' as const, contest_reason: contestReason } : m))
    setContestingId(null)
    setContestReason('')
    setActionId(null)
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      {/* Summary */}
      <div className="bg-cli-soft rounded-2xl p-4 flex gap-4">
        {proposalTotal != null && (
          <>
            <div className="flex-1 text-center">
              <p className="font-bold font-mono text-cli">{formatCurrency(proposalTotal)}</p>
              <p className="text-xs text-cli/70">contrato</p>
            </div>
            <div className="w-px bg-cli/20" />
          </>
        )}
        <div className="flex-1 text-center">
          <p className="font-bold font-mono text-cli">{formatCurrency(totalApproved)}</p>
          <p className="text-xs text-cli/70">aprovado</p>
        </div>
        {proposalTotal != null && (
          <>
            <div className="w-px bg-cli/20" />
            <div className="flex-1 text-center">
              <p className="font-bold font-mono text-cli">
                {formatCurrency(Math.max(0, proposalTotal - totalApproved))}
              </p>
              <p className="text-xs text-cli/70">saldo</p>
            </div>
          </>
        )}
      </div>

      {/* Measurements */}
      {!measurements.length && (
        <div className="bg-chrome rounded-2xl border border-chrome-line p-6 text-center">
          <p className="text-ink-2 text-sm">Nenhuma medição enviada ainda</p>
        </div>
      )}

      {measurements.map(m => (
        <div key={m.id} className="bg-chrome rounded-2xl border border-chrome-line">
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <MeasurementStatusBadge status={m.status} />
                <p className="font-bold text-ink text-lg mt-1">{formatCurrency(m.total)}</p>
                <p className="text-xs text-ink-3">
                  {formatDate(m.period_start)} – {formatDate(m.period_end)}
                </p>
              </div>
            </div>

            {/* Items */}
            {m.measurement_items.length > 0 && (
              <div className="border-t border-chrome-line mt-3 pt-3 flex flex-col gap-1.5">
                {m.measurement_items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-ink-2 truncate flex-1 mr-3">{item.description}</span>
                    <span className="font-mono text-ink text-xs">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            )}

            {m.status === 'contestada' && m.contest_reason && (
              <div className="mt-3 bg-danger-soft rounded-xl px-3 py-2">
                <p className="text-xs text-danger">{m.contest_reason}</p>
              </div>
            )}
          </div>

          {m.status === 'enviada' && (
            <div className="px-4 pb-4 flex flex-col gap-2">
              {contestingId === m.id ? (
                <>
                  <textarea
                    value={contestReason}
                    onChange={e => setContestReason(e.target.value)}
                    placeholder="Descreva o motivo da contestação..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-danger bg-chrome resize-none"
                  />
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" loading={actionId === m.id} onClick={() => handleContest(m.id)} className="flex-1">
                      Contestar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setContestingId(null)} className="flex-1">
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button variant="cli" size="sm" loading={actionId === m.id} onClick={() => handleApprove(m.id)} className="flex-1">
                    Aprovar medição
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setContestingId(m.id)} className="flex-1">
                    Contestar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
