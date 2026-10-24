'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateShort, todayISO } from '@/lib/utils'
import type { Measurement, MeasurementItem, CatalogItem, ExtraItem } from '@/lib/types/database'

type MeasurementFull = Measurement & { measurement_items: MeasurementItem[] }

interface Props {
  obraId: string
  measurements: MeasurementFull[]
  catalogItems: CatalogItem[]
  extraItemsPendentes: ExtraItem[]
  contractTotal: number
  measuredTotal: number
  today: string
}

export function MedicaoClient({
  obraId, measurements: initial, catalogItems, extraItemsPendentes,
  contractTotal, measuredTotal, today
}: Props) {
  const router = useRouter()
  const [measurements, setMeasurements] = useState(initial)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [periodStart, setPeriodStart] = useState(getWeekStart(today))
  const [periodEnd, setPeriodEnd] = useState(today)
  const [generatedItems, setGeneratedItems] = useState<Array<{
    catalog_item_id: string; description: string; unit: string; qty: number; unit_price: number
  }>>([])
  const [saving, setSaving] = useState(false)

  async function handleGenerate() {
    if (!periodStart || !periodEnd) return
    setGenerating(true)
    const supabase = createClient()
    const { data: diaries } = await supabase
      .from('diary_entries')
      .select('id, date, diary_item_progress(catalog_item_id, qty_done)')
      .eq('obra_id', obraId)
      .eq('closed', true)
      .gte('date', periodStart)
      .lte('date', periodEnd)

    const progressMap: Record<string, number> = {}
    ;(diaries as any[])?.forEach((d: any) => {
      d.diary_item_progress?.forEach((p: any) => {
        progressMap[p.catalog_item_id] = (progressMap[p.catalog_item_id] || 0) + p.qty_done
      })
    })

    const items = catalogItems
      .filter(item => progressMap[item.id] > 0)
      .map(item => ({
        catalog_item_id: item.id,
        description: item.description,
        unit: item.unit,
        qty: progressMap[item.id],
        unit_price: item.unit_price,
      }))

    setGeneratedItems(items)
    setGenerating(false)
  }

  async function handleSave() {
    if (!generatedItems.length) return
    setSaving(true)
    const supabase = createClient()
    const total = generatedItems.reduce((s, i) => s + i.qty * i.unit_price, 0)

    const { data: measurement } = await supabase
      .from('measurements')
      .insert({ obra_id: obraId, period_start: periodStart, period_end: periodEnd, total })
      .select()
      .single()

    if (measurement) {
      await supabase.from('measurement_items').insert(
        generatedItems.map(i => ({
          measurement_id: measurement.id,
          catalog_item_id: i.catalog_item_id,
          description: i.description,
          unit: i.unit,
          qty: i.qty,
          unit_price: i.unit_price,
        }))
      )
      setMeasurements(prev => [{ ...measurement, measurement_items: [] }, ...prev])
      setShowNew(false)
      setGeneratedItems([])
    }
    setSaving(false)
  }

  async function handleSend(measurementId: string) {
    setSending(measurementId)
    const supabase = createClient()
    await supabase.from('measurements').update({ status: 'enviada', sent_at: new Date().toISOString() }).eq('id', measurementId)
    setMeasurements(prev => prev.map(m => m.id === measurementId ? { ...m, status: 'enviada' as const } : m))
    setSending(null)
    router.refresh()
  }

  const measNum = measurements.length + 1
  const generatedTotal = generatedItems.reduce((s, i) => s + i.qty * i.unit_price, 0)

  if (showNew) {
    return (
      <div className="px-[18px] pt-4 flex flex-col gap-4 pb-8">
        {/* Período */}
        <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3 flex gap-3">
          <div className="flex-1">
            <label className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] text-ink-3 block mb-1">De</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
              className="w-full text-[13.5px] border border-chrome-line rounded-[8px] px-2 py-1.5 bg-chrome focus:outline-none focus:border-exec" />
          </div>
          <div className="flex-1">
            <label className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] text-ink-3 block mb-1">Até</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
              className="w-full text-[13.5px] border border-chrome-line rounded-[8px] px-2 py-1.5 bg-chrome focus:outline-none focus:border-exec" />
          </div>
        </div>

        <Button variant="secondary" loading={generating} onClick={handleGenerate} className="w-full">
          Gerar a partir dos dias fechados
        </Button>

        {generatedItems.length > 0 && (
          <>
            {/* Sumário */}
            <div className="bg-frame border border-chrome-line rounded-[10px] px-[14px] py-3">
              <div className="flex items-baseline justify-between">
                <p className="font-display font-bold text-[14.5px] text-ink">
                  Medição {measNum} · {formatDateShort(periodStart)} a {formatDateShort(periodEnd)}
                </p>
                <span className="font-mono font-bold text-[17px] text-ink">{formatCurrency(generatedTotal)}</span>
              </div>
              <p className="text-[12.5px] text-ink-2 mt-1">
                Saiu de {measurements.filter(m => m.status !== 'rascunho').length} dias fechados. Executado × preço do contrato.
              </p>
            </div>

            {/* Itens */}
            <div className="bg-chrome border border-chrome-line rounded-[10px] divide-y divide-line-soft">
              {generatedItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 px-[14px] py-3">
                  <div className="flex-1">
                    <p className="text-[11.5px] font-mono text-ink-3">{item.catalog_item_id.slice(0, 5)}</p>
                    <p className="text-[13.5px] text-ink">{item.description}</p>
                    <p className="text-[11.5px] text-ink-3">{item.qty} de {item.qty} · {item.unit}</p>
                  </div>
                  <span className="font-mono text-[13.5px] text-ink">{formatCurrency(item.qty * item.unit_price)}</span>
                </div>
              ))}
            </div>

            {/* Não entra */}
            {extraItemsPendentes.length > 0 && (
              <div className="bg-chrome border border-chrome-line rounded-[10px]">
                <div className="flex items-center justify-between px-[14px] py-2 bg-frame border-b border-line-soft rounded-t-[10px]">
                  <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[.06em] text-ink-3">Não entra</span>
                  <span className="text-[10.5px] font-mono font-semibold text-ink-3">{extraItemsPendentes.length}</span>
                </div>
                {extraItemsPendentes.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-[14px] py-3 border-b border-line-soft last:border-0">
                    <p className="flex-1 text-[13.5px] text-ink-2">{item.description}</p>
                    <span className="font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] bg-signal-soft text-signal px-2 py-0.5 rounded-[5px]">
                      Aditivo pendente
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[13.5px] text-ink-2">Contrato medido até aqui</span>
              <span className="font-mono font-semibold text-[13.5px] text-ink">
                {formatCurrency(measuredTotal + generatedTotal)} de {formatCurrency(contractTotal)}
              </span>
            </div>

            <Button size="lg" loading={saving} onClick={handleSave} className="w-full">
              Enviar para o cliente
            </Button>
            <p className="text-[11.5px] text-ink-3 text-center">
              Toque num item para ver os dias em que foi apontado. Você ainda pode corrigir antes de enviar.
            </p>
          </>
        )}

        <Button variant="secondary" onClick={() => setShowNew(false)} className="w-full">Cancelar</Button>
      </div>
    )
  }

  return (
    <div className="px-[18px] pt-4 flex flex-col gap-4 pb-8">
      <Button onClick={() => setShowNew(true)} className="w-full">+ Fechar medição da semana</Button>

      {!measurements.length && (
        <div className="bg-chrome rounded-[10px] border border-chrome-line p-6 text-center">
          <p className="text-[13.5px] text-ink-2">Nenhuma medição ainda.</p>
        </div>
      )}

      {measurements.map((m, idx) => {
        const measIdx = measurements.length - idx
        return (
          <div key={m.id} className="bg-chrome border border-chrome-line rounded-[10px]">
            <div className="px-[14px] pt-[14px] pb-3">
              <div className="flex items-baseline justify-between mb-1">
                <p className="font-display font-bold text-[14.5px] text-ink">
                  Medição {measIdx} · {formatDateShort(m.period_start)} a {formatDateShort(m.period_end)}
                </p>
                <span className="font-mono font-bold text-[17px] text-ink ml-3">{formatCurrency(m.total)}</span>
              </div>
              <span className={`font-mono font-semibold text-[10.5px] uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px] ${
                m.status === 'aprovada' ? 'bg-success-soft text-success' :
                m.status === 'enviada' ? 'bg-exec-soft text-exec' :
                m.status === 'contestada' ? 'bg-danger-soft text-danger' :
                'bg-frame border border-chrome-line text-ink-3'
              }`}>
                {m.status === 'aprovada' ? 'Aprovada' : m.status === 'enviada' ? 'Enviada' : m.status === 'contestada' ? 'Contestada' : 'Rascunho'}
              </span>

              {m.measurement_items.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {m.measurement_items.map(item => (
                    <div key={item.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-[13.5px] text-ink">{item.description}</p>
                        <p className="text-[11.5px] text-ink-3">{item.qty} {item.unit}</p>
                      </div>
                      <span className="font-mono text-[13.5px] text-ink">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {m.status === 'contestada' && m.contest_reason && (
                <div className="mt-3 bg-danger-soft rounded-[8px] px-3 py-2">
                  <p className="text-[12.5px] text-danger">{m.contest_reason}</p>
                </div>
              )}
            </div>

            {m.status === 'rascunho' && (
              <div className="px-[14px] pb-[14px]">
                <Button size="sm" loading={sending === m.id} onClick={() => handleSend(m.id)} className="w-full">
                  Enviar para o cliente
                </Button>
              </div>
            )}
          </div>
        )
      })}

      {measurements.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[13.5px] text-ink-2">Contrato medido até aqui</span>
          <span className="font-mono font-semibold text-[13.5px] text-ink">
            {formatCurrency(measuredTotal)} de {formatCurrency(contractTotal)}
          </span>
        </div>
      )}
    </div>
  )
}

function getWeekStart(today: string): string {
  const d = new Date(today + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}
