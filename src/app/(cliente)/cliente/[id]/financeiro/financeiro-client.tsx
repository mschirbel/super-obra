'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MeasurementStatusBadge } from '@/components/ui/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Measurement, MeasurementItem } from '@/lib/types/database'
import type { ExtraItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'

type MeasurementWithItems = Measurement & { measurement_items: MeasurementItem[] }

interface Props {
  obraId: string
  measurements: MeasurementWithItems[]
  extraItems: ExtraItem[]
  proposalTotal: number | null
}

export function FinanceiroClient({ obraId, measurements: initial, extraItems, proposalTotal }: Props) {
  const router = useRouter()
  const [measurements, setMeasurements] = useState(initial)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const totalApproved = measurements
    .filter(m => m.status === 'aprovada')
    .reduce((sum, m) => sum + m.total, 0)

  const pendingAditivos = extraItems.filter(e => e.aditivo_status === 'pendente')

  async function handleApprove(id: string) {
    setApprovingId(id)
    const supabase = createClient()
    await supabase.from('measurements').update({
      status: 'aprovada',
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, status: 'aprovada' as const } : m))
    setApprovingId(null)
  }

  return (
    <div className="px-[18px] pt-4 flex flex-col gap-4 pb-8">
      {/* Summary */}
      <div className="bg-cli-soft rounded-[10px] p-[14px] flex gap-4">
        {proposalTotal != null && (
          <>
            <div className="flex-1 text-center">
              <p className="font-bold font-mono text-[17px] text-cli">{formatCurrency(proposalTotal)}</p>
              <p className="text-[11px] font-mono uppercase tracking-[.08em] text-cli/70">contrato</p>
            </div>
            <div className="w-px bg-cli/20" />
          </>
        )}
        <div className="flex-1 text-center">
          <p className="font-bold font-mono text-[17px] text-cli">{formatCurrency(totalApproved)}</p>
          <p className="text-[11px] font-mono uppercase tracking-[.08em] text-cli/70">aprovado</p>
        </div>
        {proposalTotal != null && (
          <>
            <div className="w-px bg-cli/20" />
            <div className="flex-1 text-center">
              <p className="font-bold font-mono text-[17px] text-cli">
                {formatCurrency(Math.max(0, proposalTotal - totalApproved))}
              </p>
              <p className="text-[11px] font-mono uppercase tracking-[.08em] text-cli/70">saldo</p>
            </div>
          </>
        )}
      </div>

      {/* Pending aditivos */}
      {pendingAditivos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">
            Serviços fora do contrato
          </p>
          {pendingAditivos.map(item => (
            <button
              key={item.id}
              onClick={() => router.push(`/cliente/${obraId}/aditivo/${item.id}`)}
              className="w-full bg-chrome border border-signal rounded-[10px] p-[14px] text-left flex items-start justify-between gap-3"
            >
              <div className="flex-1">
                <p className="font-semibold text-[13.5px] text-ink">{item.description}</p>
                {item.unit_price && (
                  <p className="font-mono text-[13px] text-ink-2 mt-0.5">
                    {formatCurrency(item.unit_price * item.qty)}
                  </p>
                )}
              </div>
              <span className="text-[11px] font-mono uppercase tracking-[.06em] bg-signal-soft text-signal px-2 py-0.5 rounded-[5px] flex-shrink-0 mt-0.5">
                Aguardando você
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Measurements */}
      {!measurements.length && (
        <div className="bg-chrome border border-chrome-line rounded-[10px] p-[14px] text-center">
          <p className="text-[13.5px] text-ink-2">Nenhuma medição enviada ainda</p>
        </div>
      )}

      {measurements.map((m, idx) => {
        const num = measurements.length - idx
        return (
          <div key={m.id} className="bg-chrome border border-chrome-line rounded-[10px] overflow-hidden">
            <div className="px-[14px] py-3 border-b border-chrome-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-[13px] text-ink">Medição {num}</span>
                <MeasurementStatusBadge status={m.status} />
              </div>
              <span className="font-mono font-bold text-[15px] text-ink">{formatCurrency(m.total)}</span>
            </div>

            <div className="px-[14px] py-2">
              <p className="text-[11.5px] text-ink-3 mb-2">
                {formatDate(m.period_start)} – {formatDate(m.period_end)}
              </p>

              {m.measurement_items.length > 0 && (
                <div className="flex flex-col gap-1">
                  {m.measurement_items.map(item => (
                    <div key={item.id} className={cn(
                      'flex items-center justify-between py-1.5 border-b border-chrome-line last:border-0',
                      (item as any).contested && 'opacity-50'
                    )}>
                      <div className="flex-1 mr-2">
                        <p className="text-[13px] text-ink">{item.description}</p>
                        {(item as any).contested && (
                          <p className="text-[11px] text-danger mt-0.5">Contestado</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-[13px] text-ink">{formatCurrency(item.total)}</span>
                        {m.status === 'enviada' && !(item as any).contested && (
                          <button
                            onClick={() => router.push(`/cliente/${obraId}/contestar/${item.id}`)}
                            className="text-[11.5px] text-ink-3 border border-chrome-line rounded-[6px] px-2 py-0.5 hover:border-danger hover:text-danger transition-colors"
                          >
                            Contestar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {m.status === 'contestada' && m.contest_reason && (
              <div className="mx-[14px] mb-3 bg-danger-soft border border-danger/20 rounded-[8px] px-3 py-2">
                <p className="text-[12px] text-danger">{m.contest_reason}</p>
              </div>
            )}

            {m.status === 'enviada' && (
              <div className="px-[14px] pb-3">
                <Button
                  variant="cli"
                  size="sm"
                  loading={approvingId === m.id}
                  onClick={() => handleApprove(m.id)}
                  className="w-full"
                >
                  Aprovar medição inteira
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
