'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MeasurementStatusBadge } from '@/components/ui/status-badge'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'
import type { Measurement, MeasurementItem, CatalogItem } from '@/lib/types/database'

type MeasurementWithItems = Measurement & { measurement_items: MeasurementItem[] }

interface Props {
  obraId: string
  measurements: MeasurementWithItems[]
  catalogItems: CatalogItem[]
}

interface NewItem {
  catalog_item_id: string | null
  description: string
  unit: string
  qty: number
  unit_price: number
}

export function MedicaoClient({ obraId, measurements: initial, catalogItems }: Props) {
  const [measurements, setMeasurements] = useState(initial)
  const [tab, setTab] = useState<'list' | 'new'>('list')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState(todayISO())
  const [items, setItems] = useState<NewItem[]>([])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  async function handleGenerate() {
    if (!periodStart || !periodEnd) return
    setGenerating(true)
    const supabase = createClient()

    // Fetch diary progress for the period
    const { data: diaries } = await supabase
      .from('diary_entries')
      .select('id, date, diary_item_progress(catalog_item_id, qty_done)')
      .eq('obra_id', obraId)
      .eq('closed', true)
      .gte('date', periodStart)
      .lte('date', periodEnd)

    // Aggregate progress per catalog item
    const progressMap: Record<string, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(diaries as any[])?.forEach((d: any) => {
      d.diary_item_progress.forEach((p: any) => {
        progressMap[p.catalog_item_id] = (progressMap[p.catalog_item_id] || 0) + p.qty_done
      })
    })

    const generatedItems: NewItem[] = catalogItems
      .filter(item => progressMap[item.id] > 0)
      .map(item => ({
        catalog_item_id: item.id,
        description: item.description,
        unit: item.unit,
        qty: progressMap[item.id],
        unit_price: item.unit_price,
      }))

    setItems(generatedItems.length > 0 ? generatedItems : catalogItems.slice(0, 3).map(item => ({
      catalog_item_id: item.id,
      description: item.description,
      unit: item.unit,
      qty: 0,
      unit_price: item.unit_price,
    })))
    setGenerating(false)
  }

  function updateItem(idx: number, field: keyof NewItem, value: any) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function addRow() {
    setItems(prev => [...prev, { catalog_item_id: null, description: '', unit: 'un', qty: 0, unit_price: 0 }])
  }

  async function handleSave() {
    const validItems = items.filter(i => i.description.trim() && i.qty > 0)
    if (!validItems.length || !periodStart || !periodEnd) return
    setSaving(true)
    const supabase = createClient()
    const total = validItems.reduce((sum, i) => sum + i.qty * i.unit_price, 0)

    const { data: measurement } = await supabase
      .from('measurements')
      .insert({ obra_id: obraId, period_start: periodStart, period_end: periodEnd, total })
      .select()
      .single()

    if (measurement) {
      await supabase.from('measurement_items').insert(
        validItems.map(item => ({
          measurement_id: measurement.id,
          catalog_item_id: item.catalog_item_id,
          description: item.description,
          unit: item.unit,
          qty: item.qty,
          unit_price: item.unit_price,
        }))
      )
      setMeasurements(prev => [{ ...measurement, measurement_items: [] }, ...prev])
      setTab('list')
      setItems([])
    }
    setSaving(false)
  }

  async function handleSend(measurementId: string) {
    setSendingId(measurementId)
    const supabase = createClient()
    await supabase.from('measurements').update({ status: 'enviada', sent_at: new Date().toISOString() }).eq('id', measurementId)
    setMeasurements(prev => prev.map(m => m.id === measurementId ? { ...m, status: 'enviada' as const, sent_at: new Date().toISOString() } : m))
    setSendingId(null)
  }

  const total = items.reduce((sum, i) => sum + (Number(i.qty) * Number(i.unit_price)), 0)

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      {tab === 'list' ? (
        <>
          <Button onClick={() => setTab('new')} className="w-full">+ Nova medição</Button>

          {!measurements.length && (
            <div className="bg-chrome rounded-2xl border border-chrome-line p-6 text-center">
              <p className="text-ink-2 text-sm">Nenhuma medição ainda.</p>
            </div>
          )}

          {measurements.map(m => (
            <div key={m.id} className="bg-chrome rounded-2xl border border-chrome-line p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <MeasurementStatusBadge status={m.status} />
                  </div>
                  <p className="font-semibold text-ink">{formatCurrency(m.total)}</p>
                  <p className="text-xs text-ink-3">
                    {formatDate(m.period_start)} – {formatDate(m.period_end)}
                  </p>
                </div>
                {m.status === 'rascunho' && (
                  <Button size="sm" loading={sendingId === m.id} onClick={() => handleSend(m.id)}>
                    Enviar
                  </Button>
                )}
                {m.status === 'contestada' && m.contest_reason && (
                  <div className="mt-2 w-full">
                    <p className="text-xs text-danger bg-danger-soft rounded-lg px-3 py-2">
                      ⚠️ {m.contest_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="bg-chrome rounded-2xl border border-chrome-line p-4 flex flex-col gap-3">
            <p className="font-semibold text-ink">Período de referência</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-ink-3 mb-1 block">De</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={e => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-ink-3 mb-1 block">Até</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={e => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome"
                />
              </div>
            </div>
            <Button variant="secondary" loading={generating} onClick={handleGenerate} disabled={!periodStart || !periodEnd}>
              Gerar a partir do diário
            </Button>
          </div>

          {/* Items table */}
          <div className="bg-chrome rounded-2xl border border-chrome-line overflow-hidden">
            <div className="p-3 border-b border-chrome-line flex items-center justify-between">
              <p className="font-semibold text-ink text-sm">Itens da medição</p>
              <span className="font-mono text-sm font-semibold text-exec">{formatCurrency(total)}</span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="border-b border-chrome-line last:border-0 p-3 flex flex-col gap-2">
                <input
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  placeholder="Descrição"
                  className="w-full text-sm border border-frame-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-exec bg-chrome"
                />
                <div className="flex gap-2">
                  <input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} placeholder="Un"
                    className="w-14 text-xs border border-frame-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-exec bg-chrome" />
                  <input type="number" value={item.qty || ''} onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)} placeholder="Qtd"
                    className="w-16 text-xs border border-frame-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-exec bg-chrome" />
                  <input type="number" value={item.unit_price || ''} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="R$/un"
                    className="w-24 text-xs border border-frame-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-exec bg-chrome" />
                  <span className="text-xs font-mono text-ink-3 self-center">= {formatCurrency(item.qty * item.unit_price)}</span>
                </div>
              </div>
            ))}
            <div className="p-3">
              <button onClick={addRow} className="text-sm text-exec font-semibold hover:underline">+ Adicionar item</button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setTab('list'); setItems([]) }} className="flex-1">Cancelar</Button>
            <Button loading={saving} onClick={handleSave} disabled={!items.some(i => i.description && i.qty > 0)} className="flex-1">
              Salvar medição
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
