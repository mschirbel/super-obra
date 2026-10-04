'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatPhone, isValidPhone } from '@/lib/utils'
import type { TeamMember } from '@/lib/types/database'

interface ActiveAssignment {
  team_member_id: string
  obra_id: string
  obras: { name: string } | null
}

interface Props {
  userId: string
  members: TeamMember[]
  assignments: ActiveAssignment[]
}

export function EquipeGlobalClient({ userId, members: initial, assignments }: Props) {
  const [members, setMembers] = useState(initial)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [phone, setPhone] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState('')

  function getObras(memberId: string) {
    return assignments.filter(a => a.team_member_id === memberId).map(a => a.obras?.name).filter(Boolean)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (phone && !isValidPhone(phone)) {
      setPhoneError('Telefone inválido. Use (XX) XXXXX-XXXX')
      return
    }
    setPhoneError('')
    setAdding(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('team_members')
      .insert({ executor_id: userId, name: name.trim(), role: role.trim() || null, phone: phone.trim() || null })
      .select()
      .single()
    if (data) {
      setMembers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setRole('')
      setPhone('')
      setShowForm(false)
    }
    setAdding(false)
  }

  async function toggleActive(member: TeamMember) {
    setTogglingId(member.id)
    const supabase = createClient()
    await supabase.from('team_members').update({ active: !member.active }).eq('id', member.id)
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, active: !m.active } : m))
    setTogglingId(null)
  }

  const active = members.filter(m => m.active)
  const inactive = members.filter(m => !m.active)

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line">
        {active.length === 0 && (
          <div className="p-6 text-center text-ink-2 text-sm">Nenhum trabalhador ainda</div>
        )}
        {active.map(member => {
          const obras = getObras(member.id)
          return (
            <div key={member.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-exec-soft rounded-xl flex items-center justify-center text-sm font-bold text-exec">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-sm">{member.name}</p>
                {member.role && <p className="text-xs text-ink-3">{member.role}</p>}
                {obras.length > 0 && (
                  <p className={cn('text-xs mt-0.5', obras.length > 1 ? 'text-warning font-medium' : 'text-ink-3')}>
                    {obras.length > 1 ? '⚠ ' : ''}{obras.join(', ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => toggleActive(member)}
                disabled={togglingId === member.id}
                className="text-xs text-ink-3 hover:text-danger transition-colors font-medium disabled:opacity-40"
              >
                {togglingId === member.id ? '...' : 'Desativar'}
              </button>
            </div>
          )
        })}
      </div>

      {showForm ? (
        <form onSubmit={handleAdd} className="bg-chrome rounded-2xl border border-chrome-line p-4 flex flex-col gap-3">
          <p className="font-semibold text-ink text-sm">Novo trabalhador</p>
          <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Carlos Pereira" required />
          <Input label="Função (opcional)" value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Pedreiro" />
          <div>
            <Input
              label="Telefone (opcional)"
              value={phone}
              onChange={e => { setPhone(formatPhone(e.target.value)); setPhoneError('') }}
              placeholder="(11) 99999-9999"
            />
            {phoneError && <p className="text-xs text-danger mt-1">{phoneError}</p>}
          </div>
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

      {inactive.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink-3 mb-2">Inativos</p>
          <div className="bg-chrome rounded-2xl border border-chrome-line divide-y divide-chrome-line opacity-60">
            {inactive.map(member => (
              <div key={member.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 bg-frame rounded-xl flex items-center justify-center text-sm font-bold text-ink-3">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-2 text-sm line-through">{member.name}</p>
                </div>
                <button
                  onClick={() => toggleActive(member)}
                  disabled={togglingId === member.id}
                  className="text-xs text-exec hover:underline font-medium disabled:opacity-40"
                >
                  {togglingId === member.id ? '...' : 'Reativar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
