import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ClienteObraNav } from './cliente-obra-nav'

interface Props {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function ClienteObraLayout({ children, params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obra } = await supabase
    .from('obras')
    .select('id, name, status')
    .eq('id', id)
    .single()

  if (!obra) notFound()

  // Verify client is a member
  const { data: member } = await supabase
    .from('obra_members')
    .select('id')
    .eq('obra_id', id)
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/cliente')

  return (
    <div className="min-h-dvh bg-ground pb-20">
      {children}
      <ClienteObraNav obraId={id} />
    </div>
  )
}
