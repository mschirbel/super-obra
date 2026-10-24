'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TIPOS = ['Compra', 'Decisão', 'Mobilização', 'Acesso']

interface CatalogItem { id: string; description: string }

interface Props {
  obraId: string
  catalogItems: CatalogItem[]
  clienteName: string
  executorName: string
}

export function PendenciaClient({ obraId, catalogItems, clienteName, executorName }: Props) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [tipo, setTipo] = useState<string | null>(null)
  const [responsible, setResponsible] = useState<'cliente' | 'executor' | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [catalogItemId, setCatalogItemId] = useState<string | null>(null)
  const [notifyClient, setNotifyClient] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!description.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('blockers').insert({
      obra_id: obraId,
      description: description.trim(),
      type: tipo?.toLowerCase().replace('ã', 'a').replace('ç', 'c') || null,
      responsible: responsible,
      due_date: dueDate || null,
      catalog_item_id: catalogItemId,
      notify_client: notifyClient,
      status: 'aberta',
    })
    router.push(`/obras/${obraId}/travas`)
    router.refresh()
  }

  return (
    <div className="px-[18px] pt-4 flex flex-col gap-5 pb-8">
      {/* Descrição */}
      <div className="flex flex-col gap-2">
        <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">
          O que precisa acontecer
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Confirmar a entrega da marmoraria"
          rows={2}
          className="w-full px-3 py-2.5 text-[15px] border border-chrome-line rounded-[8px] focus:outline-none focus:border-exec bg-chrome resize-none text-ink placeholder:text-ink-3"
        />
      </div>

      {/* Tipo */}
      <div className="flex flex-col gap-2">
        <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Tipo</label>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map(t => (
            <button
              key={t}
              onClick={() => setTipo(prev => prev === t ? null : t)}
              className={cn(
                'px-4 py-2 rounded-full text-[13.5px] font-semibold border transition-all',
                tipo === t ? 'bg-exec text-white border-exec' : 'bg-chrome text-ink border-chrome-line'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Quem resolve */}
      <div className="flex flex-col gap-2">
        <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Quem resolve</label>
        <div className="flex gap-2">
          <button
            onClick={() => setResponsible(prev => prev === 'cliente' ? null : 'cliente')}
            className={cn(
              'px-4 py-2 rounded-full text-[13.5px] font-semibold border transition-all',
              responsible === 'cliente' ? 'bg-exec text-white border-exec' : 'bg-chrome text-ink border-chrome-line'
            )}
          >
            {clienteName} · cliente
          </button>
          <button
            onClick={() => setResponsible(prev => prev === 'executor' ? null : 'executor')}
            className={cn(
              'px-4 py-2 rounded-full text-[13.5px] font-semibold border transition-all',
              responsible === 'executor' ? 'bg-exec text-white border-exec' : 'bg-chrome text-ink border-chrome-line'
            )}
          >
            {executorName}
          </button>
        </div>
      </div>

      {/* Até quando */}
      <div className="flex flex-col gap-2">
        <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Até quando</label>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full px-3 py-2.5 text-[15px] border border-chrome-line rounded-[8px] focus:outline-none focus:border-exec bg-chrome text-ink"
        />
      </div>

      {/* O que ela trava */}
      {catalogItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">O que ela trava</label>
          <div className="bg-chrome border border-chrome-line rounded-[10px] divide-y divide-line-soft max-h-48 overflow-y-auto">
            {catalogItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCatalogItemId(prev => prev === item.id ? null : item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-[14px] py-3 text-left transition-colors',
                  catalogItemId === item.id ? 'bg-exec-soft' : 'hover:bg-frame'
                )}
              >
                <p className={cn('flex-1 text-[13.5px]', catalogItemId === item.id ? 'text-exec font-semibold' : 'text-ink')}>
                  {item.description}
                </p>
                {catalogItemId === item.id && (
                  <span className="text-[10.5px] font-mono font-semibold bg-alert-soft text-alert px-2 py-0.5 rounded-[5px] uppercase tracking-[.06em]">
                    Trava
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Avisar cliente */}
      <div className="flex items-center justify-between py-2">
        <span className="text-[15px] text-ink">Avisar o cliente por e-mail</span>
        <button
          onClick={() => setNotifyClient(prev => !prev)}
          className={cn(
            'relative w-12 h-6 rounded-full transition-colors',
            notifyClient ? 'bg-exec' : 'bg-chrome-line'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            notifyClient ? 'left-0.5 translate-x-6' : 'left-0.5'
          )} />
        </button>
      </div>

      <Button size="lg" loading={saving} disabled={!description.trim()} onClick={handleSave} className="w-full">
        Criar pendência
      </Button>
    </div>
  )
}
