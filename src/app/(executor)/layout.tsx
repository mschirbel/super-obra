import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MobileNav } from '@/components/layout/mobile-nav'

export default async function ExecutorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'cliente') redirect('/cliente')

  return (
    <div className="pb-20">
      {children}
      <MobileNav
        variant="exec"
        items={[
          { href: '/obras', label: 'Obras', icon: '🏗️' },
          { href: '/equipe', label: 'Equipe', icon: '👷' },
        ]}
      />
    </div>
  )
}
