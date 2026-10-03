'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProposalStatusBadge } from '@/components/ui/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Proposal, ProposalItem } from '@/lib/types/database'

type ProposalWithItems = Proposal & { proposal_items: ProposalItem[] }

interface Props {
  obraId: string
  proposals: ProposalWithItems[]
  members: { invited_email: string; accepted_at: string | null; user_id: string | null }[]
}

interface ParsedItem {
  line_number: number
  code: string
  description: string
  unit: string
  qty: number
  unit_price: number
}

export function ProposalClient({ obraId, proposals: initialProposals, members }: Props) {
  const [proposals, setProposals] = useState(initialProposals)
  const [tab, setTab] = useState<'list' | 'new'>('list')
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setParsing(true)
    const formData = new FormData()
    formData.append('file', f)
    try {
      const res = await fetch('/api/proposta/parse', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.items) setParsedItems(data.items)
    } catch {
      // Show empty editable table
      setParsedItems([{ line_number: 1, code: '', description: '', unit: 'un', qty: 1, unit_price: 0 }])
    }
    setParsing(false)
  }

  function updateItem(idx: number, field: keyof ParsedItem, value: string | number) {
    setParsedItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function addRow() {
    setParsedItems(prev => [...prev, {
      line_number: prev.length + 1,
      code: '',
      description: '',
      unit: 'un',
      qty: 1,
      unit_price: 0,
    }])
  }

  function removeRow(idx: number) {
    setParsedItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    const items = parsedItems.filter(i => i.description.trim())
    if (!items.length) return
    setSaving(true)

    const supabase = createClient()
    const total = items.reduce((sum, i) => sum + i.qty * i.unit_price, 0)

    // Upload file if present
    let fileUrl: string | null = null
    let fileName: string | null = null
    if (file) {
      const { data: uploadData } = await supabase.storage
        .from('proposals')
        .upload(`${obraId}/${Date.now()}_${file.name}`, file)
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('proposals').getPublicUrl(uploadData.path)
        fileUrl = urlData.publicUrl
        fileName = file.name
      }
    }

    const { data: proposal } = await supabase
      .from('proposals')
      .insert({ obra_id: obraId, file_url: fileUrl, file_name: fileName, total_value: total })
      .select()
      .single()

    if (proposal) {
      await supabase.from('proposal_items').insert(
        items.map(item => ({
          proposal_id: proposal.id,
          line_number: item.line_number,
          code: item.code || null,
          description: item.description,
          unit: item.unit,
          qty: item.qty,
          unit_price: item.unit_price,
        }))
      )
      setProposals(prev => [{ ...proposal, proposal_items: [] }, ...prev])
      setTab('list')
      setParsedItems([])
      setFile(null)
    }
    setSaving(false)
  }

  async function handleSend(proposalId: string) {
    setSendingId(proposalId)
    const supabase = createClient()
    await supabase.from('proposals').update({ status: 'enviada', sent_at: new Date().toISOString() }).eq('id', proposalId)
    setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: 'enviada', sent_at: new Date().toISOString() } : p))
    setSendingId(null)
  }

  const total = parsedItems.reduce((sum, i) => sum + (Number(i.qty) * Number(i.unit_price)), 0)

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      {tab === 'list' ? (
        <>
          <Button onClick={() => setTab('new')} className="w-full">
            + Importar proposta
          </Button>

          {!proposals.length && (
            <div className="bg-chrome rounded-2xl border border-chrome-line p-6 text-center">
              <p className="text-ink-2 text-sm">Nenhuma proposta ainda. Importe o orçamento da obra.</p>
            </div>
          )}

          {proposals.map(p => (
            <div key={p.id} className="bg-chrome rounded-2xl border border-chrome-line">
              <div className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <ProposalStatusBadge status={p.status} />
                    <span className="text-xs text-ink-3">{formatDate(p.created_at)}</span>
                  </div>
                  <p className="font-semibold text-ink">{formatCurrency(p.total_value)}</p>
                  {p.file_name && <p className="text-xs text-ink-3 truncate">{p.file_name}</p>}
                </div>
                {p.status === 'rascunho' && (
                  <Button
                    size="sm"
                    loading={sendingId === p.id}
                    onClick={() => handleSend(p.id)}
                    disabled={!members.length}
                  >
                    Enviar
                  </Button>
                )}
              </div>
              {!members.length && p.status === 'rascunho' && (
                <p className="text-xs text-ink-3 px-4 pb-3">
                  Adicione um cliente antes de enviar →{' '}
                  <a href={`/obras/${obraId}/convite`} className="text-exec underline">Convidar</a>
                </p>
              )}
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="bg-chrome rounded-2xl border border-chrome-line p-4">
            <p className="font-semibold text-ink mb-3">Arquivo do orçamento</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFilePick}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={parsing} className="w-full">
              {file ? `📎 ${file.name}` : '📎 Selecionar arquivo (PDF, Excel, CSV)'}
            </Button>
            <p className="text-xs text-ink-3 mt-2">
              O sistema tenta ler os itens automaticamente. Você pode editar a tabela abaixo.
            </p>
          </div>

          {/* Editable items table */}
          <div className="bg-chrome rounded-2xl border border-chrome-line overflow-hidden">
            <div className="p-3 border-b border-chrome-line flex items-center justify-between">
              <p className="font-semibold text-ink text-sm">Itens da proposta</p>
              <span className="font-mono text-sm font-semibold text-exec">{formatCurrency(total)}</span>
            </div>

            {parsedItems.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-sm text-ink-3 mb-3">Selecione um arquivo ou adicione itens manualmente</p>
              </div>
            )}

            <div className="overflow-x-auto">
              {parsedItems.map((item, idx) => (
                <div key={idx} className="border-b border-chrome-line last:border-0 p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-ink-3 w-5">{idx + 1}</span>
                    <input
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      placeholder="Descrição do item"
                      className="flex-1 text-sm border border-frame-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-exec bg-chrome"
                    />
                    <button onClick={() => removeRow(idx)} className="text-ink-3 hover:text-danger text-xs px-1">✕</button>
                  </div>
                  <div className="flex gap-2 ml-7">
                    <input
                      value={item.code}
                      onChange={e => updateItem(idx, 'code', e.target.value)}
                      placeholder="Código"
                      className="w-20 text-xs border border-frame-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-exec bg-chrome font-mono"
                    />
                    <input
                      value={item.unit}
                      onChange={e => updateItem(idx, 'unit', e.target.value)}
                      placeholder="Un"
                      className="w-14 text-xs border border-frame-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-exec bg-chrome"
                    />
                    <input
                      type="number"
                      value={item.qty}
                      onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                      placeholder="Qtd"
                      className="w-16 text-xs border border-frame-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-exec bg-chrome"
                    />
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      placeholder="R$ unit"
                      className="w-24 text-xs border border-frame-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-exec bg-chrome"
                    />
                    <span className="text-xs font-mono text-ink-3 self-center">
                      = {formatCurrency(item.qty * item.unit_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3">
              <button
                onClick={addRow}
                className="text-sm text-exec font-semibold hover:underline"
              >
                + Adicionar item
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setTab('list'); setParsedItems([]); setFile(null) }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              loading={saving}
              onClick={handleSave}
              disabled={!parsedItems.some(i => i.description.trim())}
              className="flex-1"
            >
              Salvar proposta
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
