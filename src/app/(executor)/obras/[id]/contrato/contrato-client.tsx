'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { CatalogItem } from '@/lib/types/database'

interface Props {
  obraId: string
  catalogItems: CatalogItem[]
}

export function ContratoClient({ obraId, catalogItems: initial }: Props) {
  const [items, setItems] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ description: '', unit: 'un', qty_total: '', unit_price: '' })
  const [saving, setSaving] = useState(false)

  const total = items.reduce((sum, i) => sum + i.qty_total * i.unit_price, 0)
  const done = items.reduce((sum, i) => sum + i.qty_done * i.unit_price, 0)

  function startEdit(item: CatalogItem) {
    setEditId(item.id)
    setFormData({
      description: item.description,
      unit: item.unit,
      qty_total: String(item.qty_total),
      unit_price: String(item.unit_price),
    })
    setShowForm(true)
  }

  function startNew() {
    setEditId(null)
    setFormData({ description: '', unit: 'un', qty_total: '', unit_price: '' })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.description.trim()) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      obra_id: obraId,
      description: formData.description.trim(),
      unit: formData.unit.trim() || 'un',
      qty_total: parseFloat(formData.qty_total) || 0,
      unit_price: parseFloat(formData.unit_price) || 0,
      order_index: editId ? (items.find(i => i.id === editId)?.order_index || 0) : items.length,
    }

    if (editId) {
      const { data } = await supabase.from('catalog_items').update(payload).eq('id', editId).select().single()
      if (data) setItems(prev => prev.map(i => i.id === editId ? data : i))
    } else {
      const { data } = await supabase.from('catalog_items').insert(payload).select().single()
      if (data) setItems(prev => [...prev, data])
    }

    setShowForm(false)
    setEditId(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('catalog_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      {/* Summary */}
      <div className="bg-exec-soft rounded-2xl p-4 flex gap-4">
        <div className="flex-1 text-center">
          <p className="font-bold font-mono text-exec">{formatCurrency(total)}</p>
          <p className="text-xs text-exec/70">valor total</p>
        </div>
        <div className="w-px bg-exec/20" />
        <div className="flex-1 text-center">
          <p className="font-bold font-mono text-exec">{formatCurrency(done)}</p>
          <p className="text-xs text-exec/70">executado</p>
        </div>
        <div className="w-px bg-exec/20" />
        <div className="flex-1 text-center">
          <p className="font-bold font-mono text-exec">{items.length}</p>
          <p className="text-xs text-exec/70">itens</p>
        </div>
      </div>

      {/* Items list */}
      <div className="bg-chrome rounded-2xl border border-chrome-line overflow-hidden">
        {!items.length && (
          <div className="p-6 text-center text-sm text-ink-2">
            Nenhum item no catálogo ainda. Importe a proposta ou adicione manualmente.
          </div>
        )}
        {items.map(item => {
          const pct = item.qty_total > 0 ? Math.min(100, (item.qty_done / item.qty_total) * 100) : 0
          return (
            <div key={item.id} className="border-b border-chrome-line last:border-0 p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink text-sm">{item.description}</p>
                  <p className="text-xs text-ink-3 font-mono">
                    {item.qty_total} {item.unit} × {formatCurrency(item.unit_price)} = {formatCurrency(item.qty_total * item.unit_price)}
                  </p>
                </div>
                <button onClick={() => startEdit(item)} className="text-xs text-ink-3 hover:text-exec ml-2">Editar</button>
              </div>
              {item.qty_total > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-frame rounded-full overflow-hidden">
                    <div className="h-full bg-exec rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-ink-3 font-mono">{Math.round(pct)}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm ? (
        <form onSubmit={handleSave} className="bg-chrome rounded-2xl border border-chrome-line p-4 flex flex-col gap-3">
          <p className="font-semibold text-ink">{editId ? 'Editar item' : 'Novo item'}</p>
          <input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            placeholder="Descrição do serviço" required
            className="w-full px-3 py-2.5 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome" />
          <div className="flex gap-2">
            <input value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} placeholder="Un"
              className="w-16 px-2 py-2.5 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome" />
            <input type="number" value={formData.qty_total} onChange={e => setFormData(p => ({ ...p, qty_total: e.target.value }))} placeholder="Quantidade total"
              className="flex-1 px-3 py-2.5 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome" />
            <input type="number" value={formData.unit_price} onChange={e => setFormData(p => ({ ...p, unit_price: e.target.value }))} placeholder="R$ por un"
              className="flex-1 px-3 py-2.5 text-sm border border-frame-line rounded-xl focus:outline-none focus:border-exec bg-chrome" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving} className="flex-1">{editId ? 'Salvar' : 'Adicionar'}</Button>
            {editId && <Button type="button" variant="danger" size="sm" onClick={() => { handleDelete(editId!); setShowForm(false) }}>Excluir</Button>}
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={startNew} className="w-full">+ Adicionar item ao catálogo</Button>
      )}
    </div>
  )
}
