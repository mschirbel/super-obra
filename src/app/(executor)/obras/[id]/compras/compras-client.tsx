'use client'
import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PurchaseStatusBadge } from '@/components/ui/status-badge'
import { formatCurrency } from '@/lib/utils'
import type { Purchase, SinapiInsumo } from '@/lib/types/database'

interface Props {
  obraId: string
  purchases: Purchase[]
}

export function ComprasClient({ obraId, purchases: initial }: Props) {
  const [purchases, setPurchases] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SinapiInsumo[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SinapiInsumo | null>(null)
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState('un')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleSearch = useCallback((q: string) => {
    setSearch(q)
    setSelected(null)
    clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/sinapi/search?q=${encodeURIComponent(q)}&limit=8`)
        const data = await res.json()
        setResults(data.results || [])
      } catch { setResults([]) }
      setSearching(false)
    }, 300)
  }, [])

  function selectInsumo(insumo: SinapiInsumo) {
    setSelected(insumo)
    setDescription(insumo.descricao)
    setUnit(insumo.unidade || 'un')
    setSearch(insumo.descricao)
    setResults([])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('purchases').insert({
      obra_id: obraId,
      description: description.trim(),
      qty: parseFloat(qty) || 1,
      unit: unit.trim() || 'un',
      sinapi_id: selected?.id || null,
      estimated_price: selected?.preco_ref || null,
      notes: notes.trim() || null,
      source: 'extra',
    }).select().single()

    if (data) {
      setPurchases(prev => [data, ...prev])
      setShowForm(false)
      setDescription('')
      setSearch('')
      setSelected(null)
      setQty('1')
      setUnit('un')
      setNotes('')
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: Purchase['status']) {
    const supabase = createClient()
    await supabase.from('purchases').update({ status }).eq('id', id)
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const pending = purchases.filter(p => p.status === 'pendente')
  const ordered = purchases.filter(p => p.status === 'pedido')
  const delivered = purchases.filter(p => p.status === 'entregue')

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} className="w-full">
        {showForm ? 'Cancelar' : '+ Adicionar material'}
      </Button>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-chrome rounded-2xl border border-chrome-line p-4 flex flex-col gap-3">
          <p className="font-semibold text-ink">Buscar no SINAPI</p>
          <div className="relative">
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar material (ex: cimento, areia, tijolo...)"
              className="w-full px-3 py-2.5 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome pr-8"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-exec border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {results.length > 0 && (
            <div className="border border-frame-line rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {results.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectInsumo(r)}
                  className="w-full text-left px-3 py-2.5 border-b border-frame-line last:border-0 hover:bg-exec-soft transition-colors"
                >
                  <p className="text-sm font-medium text-ink line-clamp-1">{r.descricao}</p>
                  <p className="text-xs text-ink-3 font-mono">
                    {r.codigo} · {r.unidade} · {formatCurrency(r.preco_ref ?? 0)}
                  </p>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="bg-exec-soft rounded-xl px-3 py-2 text-xs text-exec">
              ✓ SINAPI {selected.codigo} · Ref: {formatCurrency(selected.preco_ref ?? 0)}/{selected.unidade}
            </div>
          )}

          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição do material"
            required
            className="w-full px-3 py-2.5 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome"
          />

          <div className="flex gap-2">
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qtd" step="0.01"
              className="w-20 px-2 py-2.5 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome" />
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Un"
              className="w-16 px-2 py-2.5 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome" />
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observação"
              className="flex-1 px-2 py-2.5 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome" />
          </div>

          <Button type="submit" loading={saving} className="w-full">Adicionar</Button>
        </form>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <Section title="A comprar" items={pending} onStatus={updateStatus} />
      )}
      {ordered.length > 0 && (
        <Section title="Pedido" items={ordered} onStatus={updateStatus} />
      )}
      {delivered.length > 0 && (
        <Section title="Entregue" items={delivered} onStatus={updateStatus} />
      )}

      {!purchases.length && (
        <div className="bg-chrome rounded-2xl border border-chrome-line p-6 text-center">
          <p className="text-ink-2 text-sm">Nenhum material na lista ainda.</p>
        </div>
      )}
    </div>
  )
}

function Section({ title, items, onStatus }: {
  title: string
  items: Purchase[]
  onStatus: (id: string, status: Purchase['status']) => void
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink-2 mb-2">{title}</p>
      <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
        {items.map(item => (
          <div key={item.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink text-sm truncate">{item.description}</p>
              <p className="text-xs text-ink-3 font-mono">
                {item.qty} {item.unit}
                {item.estimated_price != null && ` · ~${formatCurrency(item.estimated_price * item.qty)}`}
              </p>
              {item.notes && <p className="text-xs text-ink-3">{item.notes}</p>}
            </div>
            <div className="flex flex-col gap-1">
              {item.status === 'pendente' && (
                <button onClick={() => onStatus(item.id, 'pedido')}
                  className="text-xs font-semibold text-exec border border-exec/30 rounded-lg px-2 py-1 hover:bg-exec-soft transition-colors">
                  Pedido
                </button>
              )}
              {item.status === 'pedido' && (
                <button onClick={() => onStatus(item.id, 'entregue')}
                  className="text-xs font-semibold text-success border border-success/30 rounded-lg px-2 py-1 hover:bg-success-soft transition-colors">
                  Entregue
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
