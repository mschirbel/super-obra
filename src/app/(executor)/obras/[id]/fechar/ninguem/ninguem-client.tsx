'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'

const MOTIVOS = ['Chuva', 'Falta de equipe', 'Sem material', 'Cliente pediu', 'Outro']

interface OpenItem { id: string; description: string; qty_total: number; qty_done: number; unit: string }

interface Props {
  obraId: string
  today: string
  openItems: OpenItem[]
}

export function NinguemClient({ obraId, today, openItems }: Props) {
  const router = useRouter()
  const [motivo, setMotivo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('diary_entries')
      .upsert({
        obra_id: obraId,
        date: today,
        no_work: true,
        no_work_reason: motivo,
        closed: true,
        closed_at: new Date().toISOString(),
      }, { onConflict: 'obra_id,date' })
    router.push(`/obras/${obraId}`)
    router.refresh()
  }

  return (
    <div className="px-[18px] pt-4 flex flex-col gap-4 pb-8">
      {/* MOTIVO */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Motivo (opcional)</span>
          <div className="flex-1 h-px bg-line-soft" />
        </div>
        <div className="flex flex-wrap gap-2">
          {MOTIVOS.map(m => (
            <button
              key={m}
              onClick={() => setMotivo(prev => prev === m ? null : m)}
              className={cn(
                'px-4 py-2 rounded-full text-[13.5px] font-semibold border transition-all',
                motivo === m
                  ? 'bg-exec text-white border-exec'
                  : 'bg-chrome text-ink border-chrome-line'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* VOLTA PARA A FILA */}
      {openItems.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">Volta para a fila</span>
            <div className="flex-1 h-px bg-line-soft" />
          </div>
          <div className="bg-chrome border border-chrome-line rounded-[10px] divide-y divide-line-soft">
            {openItems.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center gap-3 px-[14px] py-3">
                <p className="flex-1 text-[13.5px] text-ink">{item.description}</p>
                <span className="text-[10.5px] font-mono font-semibold bg-frame border border-chrome-line text-ink-3 px-2 py-0.5 rounded-[5px] uppercase tracking-[.06em]">
                  Fila
                </span>
              </div>
            ))}
            {openItems.length > 3 && (
              <div className="px-[14px] py-2">
                <p className="text-[12.5px] text-ink-3">+ {openItems.length - 3} outros itens</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* O CLIENTE VAI VER */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10.5px] font-mono font-semibold tracking-[.11em] uppercase text-ink-3">O cliente vai ver</span>
          <div className="flex-1 h-px bg-line-soft" />
        </div>
        <div className="border border-dashed border-chrome-line rounded-[10px] px-[14px] py-3 flex items-center justify-between bg-frame">
          <span className="text-[12.5px] font-mono font-semibold uppercase tracking-[.06em] text-ink">
            {formatDateShort(today)} · Sem atividade
          </span>
          {motivo && (
            <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] bg-frame border border-chrome-line text-ink-2 px-2 py-0.5 rounded-[5px]">
              {motivo}
            </span>
          )}
        </div>
      </div>

      <Button size="lg" loading={saving} onClick={handleSave} className="w-full">
        Registrar dia sem atividade
      </Button>

      <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3">
        <p className="text-[12.5px] text-ink-2">
          Dia vazio é informação. Fica no diário e entra na medição como dia sem execução.
        </p>
      </div>
    </div>
  )
}
