'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { ExtraItem } from '@/lib/types/database'

interface Props { obraId: string; item: ExtraItem }

export function AditivoClient({ obraId, item }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'aprovar' | 'recusar' | null>(null)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<'aprovado' | 'recusado' | null>(null)

  async function handleAction(action: 'aprovado' | 'recusado') {
    setLoading(action === 'aprovado' ? 'aprovar' : 'recusar')
    const supabase = createClient()
    await supabase.from('extra_items').update({
      aditivo_status: action,
      approved_at: action === 'aprovado' ? new Date().toISOString() : null,
      rejected_at: action === 'recusado' ? new Date().toISOString() : null,
    }).eq('id', item.id)
    setResult(action)
    setDone(true)
    setLoading(null)
  }

  if (done) {
    return (
      <div className="px-[18px] pt-6 flex flex-col gap-4">
        <div className={`border border-dashed rounded-[10px] p-[14px] flex items-center gap-3 ${
          result === 'aprovado' ? 'bg-success-soft border-success' : 'bg-danger-soft border-danger'
        }`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-white ${
            result === 'aprovado' ? 'bg-success' : 'bg-danger'
          }`}>
            {result === 'aprovado' ? '✓' : '×'}
          </span>
          <div>
            <p className={`font-semibold text-[14.5px] ${result === 'aprovado' ? 'text-success' : 'text-danger'}`}>
              {result === 'aprovado' ? 'Serviço aprovado' : 'Serviço recusado'}
            </p>
            <p className={`text-[12.5px] ${result === 'aprovado' ? 'text-success/80' : 'text-danger/80'}`}>
              A decisão foi registrada com data e hora.
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => router.push(`/cliente/${obraId}/financeiro`)} className="w-full">
          Voltar ao contrato
        </Button>
      </div>
    )
  }

  return (
    <div className="px-[18px] pt-4 flex flex-col gap-4 pb-8">
      {/* Card do serviço */}
      <div className="bg-chrome border border-signal rounded-[10px] p-[14px]">
        <div className="flex items-start justify-between mb-2">
          <p className="font-display font-bold text-[14.5px] text-ink flex-1">{item.description}</p>
          <span className="ml-3 font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] bg-signal-soft text-signal px-2 py-0.5 rounded-[5px] flex-shrink-0">
            Aguardando você
          </span>
        </div>
        <p className="text-[13.5px] text-ink-2 mb-3">
          Não consta da proposta v1. A Utsch pede aprovação antes de executar.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] text-ink-2">Valor proposto</span>
          <span className="font-mono font-bold text-[17px] text-ink">
            {item.unit_price ? formatCurrency(item.unit_price * item.qty) : 'R$ [valor a combinar]'}
          </span>
        </div>
      </div>

      {/* Explicação */}
      <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3">
        <p className="text-[13.5px] text-ink-2">
          Se aprovar, vira aditivo à proposta e entra nas próximas medições como qualquer outro item.
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <Button
          size="lg"
          loading={loading === 'aprovar'}
          onClick={() => handleAction('aprovado')}
          className="flex-1"
        >
          Aprovar
        </Button>
        <Button
          variant="secondary"
          size="lg"
          loading={loading === 'recusar'}
          onClick={() => handleAction('recusado')}
          className="flex-1"
        >
          Recusar
        </Button>
      </div>

      <Button variant="secondary" size="lg" className="w-full text-ink-2">
        Tenho uma dúvida
      </Button>

      <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3">
        <p className="text-[12.5px] text-ink-2">
          A decisão fica registrada com data e hora, junto da proposta.
        </p>
      </div>
    </div>
  )
}
