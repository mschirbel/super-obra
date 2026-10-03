'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NovaObraPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Check tier limit
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('tier').eq('id', user.id).single(),
      supabase.from('obras').select('*', { count: 'exact', head: true }).eq('executor_id', user.id),
    ])

    const limits: Record<string, number> = { free: 1, tier1: 2, tier2: 5, tier3: 99999 }
    const limit = limits[profile?.tier || 'free']
    if ((count || 0) >= limit) {
      setError('Limite de obras atingido. Faça upgrade para criar mais obras.')
      setLoading(false)
      return
    }

    const { data: obra, error: insertError } = await supabase
      .from('obras')
      .insert({ executor_id: user.id, name: name.trim(), address: address.trim() || null, description: description.trim() || null })
      .select()
      .single()

    if (insertError) {
      setError('Erro ao criar obra')
      setLoading(false)
      return
    }

    router.push(`/obras/${obra.id}`)
  }

  return (
    <div className="min-h-dvh bg-ground">
      <PageHeader title="Nova obra" backHref="/obras" variant="exec" />
      <div className="px-4 pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="bg-chrome rounded-2xl border border-chrome-line p-4 flex flex-col gap-4">
            <Input
              label="Nome da obra"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Residência João Silva"
              required
            />
            <Input
              label="Endereço"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-2">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detalhes sobre a obra..."
                rows={3}
                className="w-full px-4 py-3 bg-chrome border border-frame-line rounded-xl text-ink text-base placeholder:text-ink-3 focus:outline-none focus:border-exec focus:ring-2 focus:ring-exec/20 resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full">
            Criar obra
          </Button>
        </form>
      </div>
    </div>
  )
}
