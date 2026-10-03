import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-09-30.endive' })

const PRICE_MAP: Record<string, string> = {
  tier1: process.env.STRIPE_PRICE_TIER1!,
  tier2: process.env.STRIPE_PRICE_TIER2!,
  tier3: process.env.STRIPE_PRICE_TIER3!,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier } = await req.json()
  const priceId = PRICE_MAP[tier]
  if (!priceId || priceId.startsWith('price_placeholder')) {
    return NextResponse.json({ error: 'Stripe not configured yet' }, { status: 503 })
  }

  const { data: profile } = await supabase.from('profiles').select('stripe_customer_id, name').eq('id', user.id).single()

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email!, name: profile?.name })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/obras?upgraded=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/planos`,
    metadata: { user_id: user.id, tier },
  })

  return NextResponse.json({ url: session.url })
}
