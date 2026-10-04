'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { TeamMember, CatalogItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface DiaryEntryFull {
  id: string
  date: string
  no_work: boolean
  no_work_reason: string | null
  notes: string | null
  closed: boolean
  diary_workers: Array<{ id: string; team_member_id: string; came: boolean; team_members: TeamMember }>
  diary_item_progress: Array<{ id: string; catalog_item_id: string; qty_done: number }>
}

interface Props {
  obraId: string
  today: string
  team: TeamMember[]
  catalogItems: CatalogItem[]
  todayEntry: DiaryEntryFull | null
  recentEntries: Array<{ id: string; date: string; no_work: boolean; closed: boolean }>
}

export function DiarioClient({ obraId, today, team, catalogItems, todayEntry: initial, recentEntries }: Props) {
  const [entry, setEntry] = useState<DiaryEntryFull | null>(initial)
  const [workerStates, setWorkerStates] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {}
    team.forEach(m => {
      const dw = initial?.diary_workers.find(w => w.team_member_id === m.id)
      state[m.id] = dw ? dw.came : true
    })
    return state
  })
  const [progressStates, setProgressStates] = useState<Record<string, number>>(() => {
    const state: Record<string, number> = {}
    catalogItems.forEach(item => {
      const dp = initial?.diary_item_progress.find(p => p.catalog_item_id === item.id)
      state[item.id] = dp?.qty_done ?? 0
    })
    return state
  })
  const [noWork, setNoWork] = useState(initial?.no_work ?? false)
  const [noWorkReason, setNoWorkReason] = useState(initial?.no_work_reason ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [closed, setClosed] = useState(initial?.closed ?? false)

  async function handleClose() {
    setSaving(true)
    const supabase = createClient()

    // Upsert diary entry
    const { data: diaryEntry } = await supabase
      .from('diary_entries')
      .upsert({
        obra_id: obraId,
        date: today,
        no_work: noWork,
        no_work_reason: noWork ? (noWorkReason || null) : null,
        notes: notes.trim() || null,
        closed: true,
        closed_at: new Date().toISOString(),
      }, { onConflict: 'obra_id,date' })
      .select()
      .single()

    if (!diaryEntry) { setSaving(false); return }

    if (!noWork) {
      // Upsert workers
      for (const member of team) {
        await supabase.from('diary_workers').upsert({
          diary_entry_id: diaryEntry.id,
          team_member_id: member.id,
          came: workerStates[member.id] ?? true,
        }, { onConflict: 'diary_entry_id,team_member_id' })
      }

      // Upsert item progress
      for (const item of catalogItems) {
        const qtyDone = progressStates[item.id] ?? 0
        if (qtyDone > 0) {
          await supabase.from('diary_item_progress').upsert({
            diary_entry_id: diaryEntry.id,
            catalog_item_id: item.id,
            qty_done: qtyDone,
          }, { onConflict: 'diary_entry_id,catalog_item_id' })

          // Update catalog item qty_done
          const newQtyDone = Math.min(item.qty_total, item.qty_done + qtyDone)
          await supabase.from('catalog_items').update({ qty_done: newQtyDone }).eq('id', item.id)
        }
      }
    }

    setClosed(true)
    setSaving(false)
  }

  if (closed) {
    return (
      <div className="px-4 pt-6 text-center">
        <div className="bg-success-soft border border-success/20 rounded-2xl p-6">
          <p className="text-3xl mb-2">✅</p>
          <p className="font-bold text-success text-lg">Dia fechado!</p>
          <p className="text-sm text-success/80 mt-1">{formatDate(today)}</p>
        </div>
        {recentEntries.length > 0 && (
          <div className="mt-4 text-left">
            <p className="text-sm font-semibold text-ink-2 mb-2">Dias anteriores</p>
            <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
              {recentEntries.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3">
                  <span className={cn('w-2 h-2 rounded-full', e.no_work ? 'bg-ink-3' : 'bg-success')} />
                  <span className="text-sm text-ink">{formatDate(e.date)}</span>
                  {e.no_work && <span className="text-xs text-ink-3">sem trabalho</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      {/* No-work toggle */}
      <div className="bg-chrome rounded-2xl border border-chrome-line p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ink">Hoje não houve trabalho</p>
          <button
            onClick={() => setNoWork(!noWork)}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              noWork ? 'bg-ink-2' : 'bg-frame-line'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
              noWork ? 'left-0.5 translate-x-6' : 'left-0.5'
            )} />
          </button>
        </div>
        {noWork && (
          <input
            value={noWorkReason}
            onChange={e => setNoWorkReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="w-full mt-3 px-3 py-2 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome"
          />
        )}
      </div>

      {!noWork && (
        <>
          {/* Workers */}
          {team.length > 0 && (
            <div className="bg-chrome rounded-2xl border border-chrome-line overflow-hidden">
              <div className="px-4 py-3 border-b border-chrome-line">
                <p className="font-semibold text-ink">Quem veio hoje?</p>
              </div>
              <div className="divide-y divide-chrome-line">
                {team.map(member => (
                  <button
                    key={member.id}
                    onClick={() => setWorkerStates(prev => ({ ...prev, [member.id]: !prev[member.id] }))}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-frame transition-colors"
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-colors',
                      workerStates[member.id] ? 'bg-exec text-white' : 'bg-frame text-ink-3'
                    )}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={cn('flex-1 text-left font-medium', workerStates[member.id] ? 'text-ink' : 'text-ink-3 line-through')}>
                      {member.name}
                    </span>
                    <span className={cn('text-sm', workerStates[member.id] ? 'text-exec' : 'text-ink-3')}>
                      {workerStates[member.id] ? 'Veio' : 'Faltou'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {catalogItems.length > 0 && (
            <div className="bg-chrome rounded-2xl border border-chrome-line overflow-hidden">
              <div className="px-4 py-3 border-b border-chrome-line">
                <p className="font-semibold text-ink">Quanto avançou hoje?</p>
                <p className="text-xs text-ink-3">Quantidade executada neste dia</p>
              </div>
              <div className="divide-y divide-chrome-line">
                {catalogItems.map(item => {
                  const progress = progressStates[item.id] ?? 0
                  const pct = item.qty_total > 0 ? Math.min(100, ((item.qty_done + progress) / item.qty_total) * 100) : 0
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-start gap-2 mb-2">
                        <p className="flex-1 text-sm font-medium text-ink">{item.description}</p>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={progress || ''}
                            onChange={e => setProgressStates(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                            placeholder="0"
                            className="w-16 text-sm text-right border border-frame-line rounded-lg px-2 py-1 focus:outline-none focus:border-exec bg-chrome"
                          />
                          <span className="text-xs text-ink-3">{item.unit}</span>
                        </div>
                      </div>
                      {item.qty_total > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-frame rounded-full overflow-hidden">
                            <div className="h-full bg-exec rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-ink-3 font-mono">{Math.round(pct)}%</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {catalogItems.length === 0 && (
            <div className="bg-exec-soft rounded-2xl p-4 text-sm text-exec/80">
              💡 Adicione itens ao catálogo da obra para registrar avanço. Importe a proposta primeiro.
            </div>
          )}
        </>
      )}

      {/* Notes */}
      <div className="bg-chrome rounded-2xl border border-chrome-line p-4">
        <p className="font-semibold text-ink mb-2">Observações</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Algo relevante do dia..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome resize-none"
        />
      </div>

      <Button size="lg" loading={saving} onClick={handleClose} className="w-full">
        Fechar o dia de hoje
      </Button>

      {team.length === 0 && (
        <p className="text-xs text-ink-3 text-center">
          Sem equipe cadastrada.{' '}
          <a href={`/obras/${obraId}/equipe`} className="text-exec underline">Adicionar trabalhadores</a>
        </p>
      )}
    </div>
  )
}
