'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UserRole } from '@/lib/types/database'

function CadastroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = (searchParams.get('role') as UserRole) || 'executor'
  const inviteToken = searchParams.get('convite')

  const [name, setName] = useState('')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(defaultRole)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (inviteToken) {
      router.push(`/convite/${inviteToken}`)
    } else {
      router.push('/')
    }
    router.refresh()
  }

  return (
    <div className="min-h-dvh bg-ground flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-4xl text-ink tracking-tight">
            Prumo<span className="text-cli">.</span>
          </h1>
          <p className="text-ink-2 mt-2">Criar sua conta</p>
        </div>

        <div className="bg-chrome rounded-2xl border border-chrome-line shadow-sm p-6">
          {/* Role selector */}
          <div className="flex rounded-xl border border-frame-line overflow-hidden mb-5">
            <button
              type="button"
              onClick={() => setRole('executor')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${role === 'executor' ? 'bg-exec text-white' : 'text-ink-2 hover:bg-frame'}`}
            >
              Empreiteiro
            </button>
            <button
              type="button"
              onClick={() => setRole('cliente')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${role === 'cliente' ? 'bg-cli text-white' : 'text-ink-2 hover:bg-frame'}`}
            >
              Cliente
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Seu nome"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="João Silva"
              required
              autoComplete="name"
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              required
              autoComplete="email"
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
            />
            {error && (
              <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
            )}
            <Button type="submit" size="lg" loading={loading} className="w-full mt-2"
              variant={role === 'cliente' ? 'cli' : 'primary'}>
              Criar conta
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-2 mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-exec font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroForm />
    </Suspense>
  )
}
