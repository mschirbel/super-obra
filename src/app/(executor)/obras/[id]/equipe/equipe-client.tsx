'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ObraTeamMember } from '@/lib/types/database'

interface Props {
  obraId: string
  team: ObraTeamMember[]
}

export function EquipeClient({ obraId, team: initialTeam }: Props) {
  const [team, setTeam] = useState(initialTeam)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('obra_team')
      .insert({ obra_id: obraId, name: name.trim(), role: role.trim() || null })
      .select()
      .single()
    if (data) {
      setTeam(prev => [...prev, data])
      setName('')
      setRole('')
      setShowForm(false)
    }
    setAdding(false)
  }

  async function toggleActive(member: ObraTeamMember) {
    const supabase = createClient()
    await supabase.from('obra_team').update({ active: !member.active }).eq('id', member.id)
    setTeam(prev => prev.map(m => m.id === member.id ? { ...m, active: !m.active } : m))
  }

  const active = team.filter(m => m.active)
  const inactive = team.filter(m => !m.active)

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
        {!active.length && (
          <div className="p-6 text-center text-ink-2 text-sm">
            Nenhum trabalhador ativo ainda
          </div>
        )}
        {active.map(member => (
          <div key={member.id} className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 bg-exec-soft rounded-xl flex items-center justify-center text-sm font-bold text-exec">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink text-sm">{member.name}</p>
              {member.role && <p className="text-xs text-ink-3">{member.role}</p>}
            </div>
            <button
              onClick={() => toggleActive(member)}
              className="text-xs text-ink-3 hover:text-danger transition-colors font-medium"
            >
              Desativar
            </button>
          </div>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={handleAdd} className="bg-chrome rounded-2xl border border-chrome-line p-4 flex flex-col gap-3">
          <Input
            label="Nome do trabalhador"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Carlos Pereira"
            required
          />
          <Input
            label="Função (opcional)"
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="Ex: Pedreiro, Servente"
          />
          <div className="flex gap-2">
            <Button type="submit" loading={adding} className="flex-1">Adicionar</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)} className="w-full">
          + Adicionar trabalhador
        </Button>
      )}

      {inactive.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink-3 mb-2">Inativos</p>
          <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
            {inactive.map(member => (
              <div key={member.id} className="flex items-center gap-3 p-4 opacity-50">
                <div className="w-9 h-9 bg-frame rounded-xl flex items-center justify-center text-sm font-bold text-ink-3">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-ink text-sm">{member.name}</p>
                </div>
                <button
                  onClick={() => toggleActive(member)}
                  className="text-xs text-exec hover:underline font-medium"
                >
                  Reativar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
