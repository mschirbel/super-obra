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
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogle() {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

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

          <Button
            type="button"
            variant="secondary"
            size="lg"
            loading={googleLoading}
            onClick={handleGoogle}
            className="w-full mb-4"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Cadastrar com Google
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-chrome-line" />
            <span className="text-xs text-ink-3">ou</span>
            <div className="flex-1 h-px bg-chrome-line" />
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
