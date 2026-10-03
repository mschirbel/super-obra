'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

const plans = [
  { tier: 'tier1', name: 'Starter', obras: 2, price: 49, desc: 'Para quem está começando' },
  { tier: 'tier2', name: 'Pro', obras: 5, price: 99, desc: 'Para equipes em crescimento', highlight: true },
  { tier: 'tier3', name: 'Ilimitado', obras: null, price: 199, desc: 'Para construtoras' },
]

export default function PlanosPage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(tier: string) {
    setLoading(tier)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Stripe ainda não configurado. Adicione as chaves no .env.local')
      }
    } catch {
      alert('Erro ao iniciar checkout')
    }
    setLoading(null)
  }

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader title="Planos" backHref="/obras" variant="exec" />
      <div className="px-4 pt-4 flex flex-col gap-4">
        <p className="text-sm text-ink-2">Escolha o plano ideal para o tamanho da sua operação.</p>

        {plans.map(plan => (
          <div key={plan.tier} className={`bg-chrome rounded-2xl border-2 p-5 ${plan.highlight ? 'border-exec' : 'border-chrome-line'}`}>
            {plan.highlight && (
              <span className="inline-block text-xs font-bold text-exec bg-exec-soft px-2 py-0.5 rounded-lg mb-2">Mais popular</span>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">{plan.name}</h3>
                <p className="text-sm text-ink-3">{plan.desc}</p>
                <p className="text-sm text-ink-2 mt-1">
                  {plan.obras ? `Até ${plan.obras} obras` : 'Obras ilimitadas'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-2xl text-ink">R$ {plan.price}</p>
                <p className="text-xs text-ink-3">por mês</p>
              </div>
            </div>
            <Button
              className="w-full mt-4"
              variant={plan.highlight ? 'primary' : 'secondary'}
              loading={loading === plan.tier}
              onClick={() => handleUpgrade(plan.tier)}
            >
              Assinar {plan.name}
            </Button>
          </div>
        ))}

        <div className="bg-frame rounded-2xl p-4 text-center">
          <p className="text-xs text-ink-3">Teste gratuito com 1 obra. Cancele quando quiser.</p>
        </div>
      </div>
    </div>
  )
}
