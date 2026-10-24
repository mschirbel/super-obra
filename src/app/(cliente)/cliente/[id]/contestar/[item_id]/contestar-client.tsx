'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const MOTIVOS = [
  { id: 'nao_foi_feito', label: 'Não foi feito' },
  { id: 'feito_em_parte', label: 'Feito em parte' },
  { id: 'valor_diferente', label: 'Valor diferente' },
  { id: 'outro', label: 'Outro' },
]

interface Props {
  obraId: string
  item: {
    id: string
    description: string
    unit: string
    qty: number
    unit_price: number
    total: number
    measurement_id: string
  }
  measurementNum: number
}

export function ContestarClient({ obraId, item, measurementNum }: Props) {
  const router = useRouter()
  const [motivo, setMotivo] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSend() {
    if (!motivo && !text.trim()) return
    setSaving(true)
    const supabase = createClient()

    // Mark the item as contested
    await supabase.from('measurement_items').update({
      contested: true,
      contest_reason: text.trim() || null,
      contest_type: motivo,
    }).eq('id', item.id)

    // Check if all items in this measurement are contested
    const { data: allItems } = await supabase
      .from('measurement_items')
      .select('id, contested')
      .eq('measurement_id', item.measurement_id)

    const allContested = (allItems || []).every(i => i.id === item.id || i.contested)
    if (allContested) {
      await supabase.from('measurements').update({
        status: 'contestada',
        contest_reason: text.trim() || motivo,
        contested_at: new Date().toISOString(),
      }).eq('id', item.measurement_id)
    }

    setDone(true)
    setSaving(false)
  }

  if (done) {
    return (
      <div className="px-[18px] pt-6 flex flex-col gap-4">
        <div className="bg-success-soft border border-dashed border-success rounded-[10px] p-[14px] flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center font-bold flex-shrink-0">✓</span>
          <div>
            <p className="font-semibold text-success text-[14.5px]">Contestação enviada</p>
            <p className="text-[12.5px] text-success/80">A Utsch vai revisar e responder.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => router.push(`/cliente/${obraId}/financeiro`)} className="w-full">
          Voltar ao contrato
        </Button>
      </div>
    )
  }

  return (
    <div className="px-[18px] pt-4 flex flex-col gap-5 pb-8">
      {/* Item contestado */}
      <div className="bg-chrome border border-chrome-line rounded-[10px] p-[14px]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11.5px] font-mono text-ink-3 mb-0.5">{item.id.slice(0, 5)}</p>
            <p className="font-semibold text-[13.5px] text-ink">{item.description}</p>
            <p className="text-[11.5px] text-ink-3 mt-0.5">{item.qty} de {item.qty} {item.unit}</p>
          </div>
          <span className="font-mono font-semibold text-[13.5px] text-ink ml-3">
            {formatCurrency(item.total)}
          </span>
        </div>
      </div>

      {/* O que não bate */}
      <div className="flex flex-col gap-2">
        <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">
          O que não bate
        </label>
        <div className="flex flex-wrap gap-2">
          {MOTIVOS.map(m => (
            <button
              key={m.id}
              onClick={() => setMotivo(prev => prev === m.id ? null : m.id)}
              className={cn(
                'px-4 py-2 rounded-full text-[13.5px] font-semibold border transition-all',
                motivo === m.id ? 'bg-exec text-white border-exec' : 'bg-chrome text-ink border-chrome-line'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conte o que você viu */}
      <div className="flex flex-col gap-2">
        <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">
          Conte o que você viu
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 text-[15px] border border-chrome-line rounded-[8px] focus:outline-none focus:border-exec bg-chrome resize-none text-ink placeholder:text-ink-3"
          placeholder="Ex.: só vi duas tomadas novas na cozinha."
        />
      </div>

      <button className="w-full py-3 border border-chrome-line rounded-[8px] text-[13.5px] font-semibold text-ink-2 bg-chrome">
        + Anexar foto
      </button>

      <Button
        variant="cli"
        size="lg"
        loading={saving}
        disabled={!motivo && !text.trim()}
        onClick={handleSend}
        className="w-full"
      >
        Enviar contestação
      </Button>

      <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3">
        <p className="text-[12.5px] text-ink-2">
          Os outros itens podem ser aprovados agora. Este fica parado até a Utsch responder.
        </p>
      </div>
    </div>
  )
}
