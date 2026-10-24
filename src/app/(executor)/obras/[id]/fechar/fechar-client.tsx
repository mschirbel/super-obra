'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { TeamMember, CatalogItem } from '@/lib/types/database'

interface DiaryEntryFull {
  id: string
  date: string
  no_work: boolean
  closed: boolean
  diary_workers: Array<{ team_member_id: string; came: boolean }>
  diary_item_progress: Array<{ catalog_item_id: string; qty_done: number }>
}

interface Props {
  obraId: string
  today: string
  team: TeamMember[]
  catalogItems: CatalogItem[]
  todayEntry: DiaryEntryFull | null
  weekTotal: number
}

export function FecharClient({ obraId, today, team, catalogItems, todayEntry: initial, weekTotal }: Props) {
  const router = useRouter()
  const alreadyClosed = initial?.closed ?? false

  const [workerStates, setWorkerStates] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {}
    team.forEach(m => {
      const dw = initial?.diary_workers.find(w => w.team_member_id === m.id)
      s[m.id] = dw ? dw.came : true
    })
    return s
  })

  const [progressStates, setProgressStates] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {}
    catalogItems.forEach(item => {
      const dp = initial?.diary_item_progress.find(p => p.catalog_item_id === item.id)
      s[item.id] = dp?.qty_done ?? 0
    })
    return s
  })

  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const openItems = catalogItems.filter(item => item.qty_done < item.qty_total)

  function itemStatus(item: CatalogItem): 'pronto' | 'parcial' | 'none' {
    const qty = progressStates[item.id] ?? 0
    if (qty === 0) return 'none'
    const remaining = item.qty_total - item.qty_done
    return qty >= remaining ? 'pronto' : 'parcial'
  }

  function adjustQty(itemId: string, delta: number) {
    const item = catalogItems.find(i => i.id === itemId)!
    const remaining = item.qty_total - item.qty_done
    const current = progressStates[itemId] ?? 0
    const next = Math.max(0, Math.min(remaining, current + delta))
    setProgressStates(prev => ({ ...prev, [itemId]: next }))
  }

  const todayValue = catalogItems.reduce((sum, item) => {
    const qty = progressStates[item.id] ?? 0
    return sum + qty * item.unit_price
  }, 0)

  async function handleClose() {
    setSaving(true)
    const supabase = createClient()

    const { data: entry } = await supabase
      .from('diary_entries')
      .upsert({
        obra_id: obraId,
        date: today,
        no_work: false,
        notes: notes.trim() || null,
        closed: true,
        closed_at: new Date().toISOString(),
      }, { onConflict: 'obra_id,date' })
      .select()
      .single()

    if (!entry) { setSaving(false); return }

    for (const member of team) {
      await supabase.from('diary_workers').upsert({
        diary_entry_id: entry.id,
        team_member_id: member.id,
        came: workerStates[member.id] ?? true,
      }, { onConflict: 'diary_entry_id,team_member_id' })
    }

    for (const item of openItems) {
      const qty = progressStates[item.id] ?? 0
      if (qty > 0) {
        await supabase.from('diary_item_progress').upsert({
          diary_entry_id: entry.id,
          catalog_item_id: item.id,
          qty_done: qty,
        }, { onConflict: 'diary_entry_id,catalog_item_id' })

        const newDone = Math.min(item.qty_total, item.qty_done + qty)
        await supabase.from('catalog_items').update({ qty_done: newDone }).eq('id', item.id)
      }
    }

    router.push(`/obras/${obraId}`)
    router.refresh()
  }

  if (alreadyClosed) {
    return (
      <div className="px-[18px] pt-6 flex flex-col gap-4">
        <div className="bg-success-soft border border-dashed border-success rounded-[10px] p-4 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center font-bold flex-shrink-0">✓</span>
          <div>
            <p className="font-semibold text-success font-display text-[14.5px]">Dia fechado</p>
            <p className="text-[12.5px] text-success/80">O registro de hoje já foi enviado ao cliente.</p>
          </div>
        </div>
        <Button variant="secondary" className="w-full" onClick={() => router.push(`/obras/${obraId}`)}>
          Voltar para a obra
        </Button>
      </div>
    )
  }

  return (
    <div className="px-[18px] pt-4 flex flex-col gap-4 pb-8">
      {/* QUEM VEIO */}
      {team.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Quem veio</span>
            <div className="flex-1 h-px bg-line-soft" />
          </div>
          <div className="flex flex-wrap gap-2">
            {team.map(member => {
              const came = workerStates[member.id] ?? true
              return (
                <button
                  key={member.id}
                  onClick={() => setWorkerStates(prev => ({ ...prev, [member.id]: !prev[member.id] }))}
                  className={cn(
                    'px-4 py-2 rounded-full text-[13.5px] font-semibold border transition-all',
                    came
                      ? 'bg-exec text-white border-exec'
                      : 'bg-chrome text-ink-3 border-chrome-line'
                  )}
                >
                  {member.name}{member.role ? ` · ${member.role}` : ''}
                </button>
              )
            })}
            <button className="px-4 py-2 rounded-full text-[13.5px] font-semibold border border-dashed border-exec text-exec bg-chrome">
              + pessoa
            </button>
          </div>
        </div>
      )}

      {/* O QUE ANDOU */}
      {openItems.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">O que andou</span>
            <div className="flex-1 h-px bg-line-soft" />
          </div>
          <div className="bg-chrome border border-chrome-line rounded-[10px] divide-y divide-line-soft">
            {openItems.map(item => {
              const remaining = item.qty_total - item.qty_done
              const qty = progressStates[item.id] ?? 0
              const status = itemStatus(item)
              return (
                <div key={item.id} className="p-[14px]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10.5px] font-mono text-ink-3 mb-0.5">{item.description.slice(0, 5)}</p>
                      <p className="text-[13.5px] text-ink leading-snug">{item.description}</p>
                    </div>
                    {status !== 'none' && (
                      <span className={cn(
                        'ml-3 px-2 py-0.5 rounded-[5px] text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] flex-shrink-0',
                        status === 'pronto'
                          ? 'bg-success-soft text-success'
                          : 'bg-warning-soft text-warning'
                      )}>
                        {status === 'pronto' ? 'Pronto' : 'Parcial'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-chrome-line rounded-[8px] overflow-hidden bg-frame">
                      <button
                        onClick={() => adjustQty(item.id, -1)}
                        className="w-11 h-11 flex items-center justify-center text-ink-2 font-bold text-lg hover:bg-chrome-line transition-colors"
                      >
                        −
                      </button>
                      <span className="px-3 text-[13.5px] font-mono font-semibold text-ink whitespace-nowrap">
                        {qty} de {remaining} {item.unit}
                      </span>
                      <button
                        onClick={() => adjustQty(item.id, 1)}
                        className="w-11 h-11 flex items-center justify-center text-ink-2 font-bold text-lg hover:bg-chrome-line transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[13.5px] font-mono text-ink-3 ml-auto">
                      {formatCurrency(qty * item.unit_price)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <button className="flex-1 py-3 border border-chrome-line rounded-[8px] text-[13.5px] font-semibold text-ink-2 bg-chrome">
              + Item de outro dia
            </button>
            <button
              className="flex-1 py-3 border border-chrome-line rounded-[8px] text-[13.5px] font-semibold text-ink-2 bg-chrome"
              onClick={() => router.push(`/obras/${obraId}/avulso`)}
            >
              + Fora do orçamento
            </button>
          </div>
        </div>
      )}

      {/* OBSERVAÇÃO */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Observação e fotos (opcional)</span>
          <div className="flex-1 h-px bg-line-soft" />
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ex.: faltou o disjuntor, termina amanhã"
          rows={2}
          className="w-full px-3 py-2.5 text-[15px] border border-chrome-line rounded-[8px] focus:outline-none focus:border-exec bg-chrome resize-none text-ink placeholder:text-ink-3"
        />
      </div>

      {/* TOTAL SEMANA */}
      <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3 flex items-center justify-between">
        <span className="text-[13.5px] text-ink-2">Executado na semana até agora</span>
        <span className="font-mono font-semibold text-[15px] text-ink">
          {formatCurrency(weekTotal + todayValue)}
        </span>
      </div>

      {/* BOTÕES */}
      <Button size="lg" loading={saving} onClick={handleClose} className="w-full">
        Fechar o dia
      </Button>
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={() => router.push(`/obras/${obraId}/fechar/ninguem`)}
      >
        Hoje não veio ninguém
      </Button>
    </div>
  )
}
