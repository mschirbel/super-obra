'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props { obraId: string; today: string }

export function AvulsoClient({ obraId, today }: Props) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState('serviço')
  const [isAditivo, setIsAditivo] = useState(true)
  const [unitPrice, setUnitPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!description.trim()) return
    setSaving(true)
    const supabase = createClient()

    // Get or create today's diary entry
    const { data: entry } = await supabase
      .from('diary_entries')
      .upsert({
        obra_id: obraId,
        date: today,
        no_work: false,
        closed: false,
      }, { onConflict: 'obra_id,date' })
      .select()
      .single()

    await supabase.from('extra_items').insert({
      obra_id: obraId,
      diary_entry_id: entry?.id || null,
      description: description.trim(),
      qty: parseFloat(qty) || 1,
      unit: unit.trim() || 'serviço',
      unit_price: isAditivo && unitPrice ? parseFloat(unitPrice) : null,
      is_aditivo: isAditivo,
      aditivo_status: 'pendente',
    })

    router.push(`/obras/${obraId}/fechar`)
    router.refresh()
  }

  return (
    <div className="px-[18px] pt-4 flex flex-col gap-5 pb-8">
      {/* O que foi feito */}
      <div className="flex flex-col gap-2">
        <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">
          O que foi feito
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Pintura do home office"
          className="w-full px-3 py-2.5 text-[15px] border border-chrome-line rounded-[8px] focus:outline-none focus:border-exec bg-chrome text-ink placeholder:text-ink-3"
        />
      </div>

      {/* Quantidade e Unidade */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Quantidade</label>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            min="0"
            step="0.01"
            className="w-full px-3 py-2.5 text-[15px] border border-chrome-line rounded-[8px] focus:outline-none focus:border-exec bg-chrome text-ink"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Unidade</label>
          <input
            type="text"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="serviço"
            className="w-full px-3 py-2.5 text-[15px] border border-chrome-line rounded-[8px] focus:outline-none focus:border-exec bg-chrome text-ink placeholder:text-ink-3"
          />
        </div>
      </div>

      {/* Possível aditivo */}
      <div className={cn(
        'border rounded-[10px] p-[14px]',
        isAditivo ? 'border-signal bg-signal-soft/20' : 'border-chrome-line bg-chrome'
      )}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-display font-bold text-[14.5px] text-ink">Possível aditivo</p>
          <button
            onClick={() => setIsAditivo(prev => !prev)}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              isAditivo ? 'bg-exec' : 'bg-chrome-line'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
              isAditivo ? 'left-0.5 translate-x-6' : 'left-0.5'
            )} />
          </button>
        </div>
        <p className="text-[13.5px] text-ink-2 mb-3">Não consta da proposta. Peça o valor antes de executar.</p>
        {isAditivo && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Valor proposto</label>
            <input
              type="number"
              value={unitPrice}
              onChange={e => setUnitPrice(e.target.value)}
              placeholder="R$ [valor a combinar]"
              step="0.01"
              min="0"
              className="w-full px-3 py-2.5 text-[15px] border border-chrome-line rounded-[8px] focus:outline-none focus:border-exec bg-chrome text-ink placeholder:text-ink-3"
            />
          </div>
        )}
      </div>

      <Button size="lg" loading={saving} disabled={!description.trim()} onClick={handleSave} className="w-full">
        {isAditivo ? 'Salvar e pedir aprovação' : 'Salvar item extra'}
      </Button>

      <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3">
        <p className="text-[12.5px] text-ink-2">
          Fica fora da medição até o cliente aprovar o valor. Serviço pequeno sem orçamento também entra aqui.
        </p>
      </div>
    </div>
  )
}
