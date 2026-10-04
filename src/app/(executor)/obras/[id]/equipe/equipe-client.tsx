'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { TeamMember, ObraAssignment } from '@/lib/types/database'

interface Props {
  obraId: string
  allMembers: TeamMember[]
  obraAssignments: ObraAssignment[]
  allActiveAssignments: { team_member_id: string; obra_id: string }[]
}

export function EquipeClient({ obraId, allMembers: initial, obraAssignments: initialAssignments, allActiveAssignments }: Props) {
  const [members, setMembers] = useState(initial)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [phone, setPhone] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const assignedIds = new Set(assignments.filter(a => !a.unassigned_at).map(a => a.team_member_id))

  // conflict = member has active assignment in another obra
  function hasConflict(memberId: string) {
    return allActiveAssignments.filter(a => a.team_member_id === memberId && a.obra_id !== obraId).length > 0
  }

  const assigned = members.filter(m => assignedIds.has(m.id))
  const available = members.filter(m => !assignedIds.has(m.id))

  async function handleAssign(member: TeamMember) {
    setLoadingId(member.id)
    const supabase = createClient()
    const existing = assignments.find(a => a.team_member_id === member.id)
    if (existing) {
      // re-activate
      await supabase.from('obra_assignments').update({ unassigned_at: null }).eq('id', existing.id)
      setAssignments(prev => prev.map(a => a.id === existing.id ? { ...a, unassigned_at: null } : a))
    } else {
      const { data } = await supabase
        .from('obra_assignments')
        .insert({ obra_id: obraId, team_member_id: member.id })
        .select()
        .single()
      if (data) setAssignments(prev => [...prev, data])
    }
    setLoadingId(null)
  }

  async function handleUnassign(member: TeamMember) {
    setLoadingId(member.id)
    const supabase = createClient()
    const assignment = assignments.find(a => a.team_member_id === member.id && !a.unassigned_at)
    if (assignment) {
      await supabase.from('obra_assignments').update({ unassigned_at: new Date().toISOString() }).eq('id', assignment.id)
      setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, unassigned_at: new Date().toISOString() } : a))
    }
    setLoadingId(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    const supabase = createClient()
    const { data: member } = await supabase
      .from('team_members')
      .insert({ name: name.trim(), role: role.trim() || null, phone: phone.trim() || null })
      .select()
      .single()
    if (member) {
      setMembers(prev => [...prev, member])
      // auto-assign to this obra
      const { data: assignment } = await supabase
        .from('obra_assignments')
        .insert({ obra_id: obraId, team_member_id: member.id })
        .select()
        .single()
      if (assignment) setAssignments(prev => [...prev, assignment])
      setName('')
      setRole('')
      setPhone('')
      setShowForm(false)
    }
    setAdding(false)
  }

  function MemberRow({ member, isAssigned }: { member: TeamMember; isAssigned: boolean }) {
    const conflict = hasConflict(member.id)
    const loading = loadingId === member.id
    return (
      <div className="flex items-center gap-3 p-4">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold',
          isAssigned ? 'bg-exec-soft text-exec' : 'bg-frame text-ink-3'
        )}>
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-ink text-sm">{member.name}</p>
            {conflict && (
              <span className="text-xs bg-warning-soft text-warning px-1.5 py-0.5 rounded-md font-medium">
                conflito
              </span>
            )}
          </div>
          {member.role && <p className="text-xs text-ink-3">{member.role}</p>}
        </div>
        {isAssigned ? (
          <button
            onClick={() => handleUnassign(member)}
            disabled={loading}
            className="text-xs text-ink-3 hover:text-danger transition-colors font-medium disabled:opacity-50"
          >
            {loading ? '...' : 'Remover'}
          </button>
        ) : (
          <button
            onClick={() => handleAssign(member)}
            disabled={loading}
            className="text-xs text-exec hover:underline font-medium disabled:opacity-50"
          >
            {loading ? '...' : 'Alocar'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      {/* Assigned */}
      <div>
        <p className="text-sm font-semibold text-ink-2 mb-2">Nesta obra</p>
        <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
          {assigned.length === 0 && (
            <div className="p-6 text-center text-ink-2 text-sm">Nenhum trabalhador alocado</div>
          )}
          {assigned.map(m => <MemberRow key={m.id} member={m} isAssigned={true} />)}
        </div>
      </div>

      {/* Available from pool */}
      {available.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink-2 mb-2">Disponíveis na equipe</p>
          <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
            {available.map(m => <MemberRow key={m.id} member={m} isAssigned={false} />)}
          </div>
        </div>
      )}

      {/* Add new */}
      {showForm ? (
        <form onSubmit={handleAdd} className="bg-chrome rounded-2xl border border-chrome-line p-4 flex flex-col gap-3">
          <p className="font-semibold text-ink text-sm">Novo trabalhador</p>
          <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Carlos Pereira" required />
          <Input label="Função (opcional)" value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Pedreiro" />
          <Input label="Telefone (opcional)" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex: (11) 99999-9999" />
          <p className="text-xs text-ink-3">Será adicionado à sua equipe e alocado nesta obra.</p>
          <div className="flex gap-2">
            <Button type="submit" loading={adding} className="flex-1">Adicionar</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)} className="w-full">
          + Novo trabalhador
        </Button>
      )}
    </div>
  )
}
