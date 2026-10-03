import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { ObraStatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

const menuItems = [
  { href: 'proposta', icon: '📄', label: 'Proposta', desc: 'Importar e enviar orçamento' },
  { href: 'diario', icon: '📋', label: 'Fechar o dia', desc: 'Quem veio e o que avançou' },
  { href: 'medicao', icon: '📏', label: 'Medição', desc: 'Gerar e enviar medição' },
  { href: 'contrato', icon: '📑', label: 'Contrato', desc: 'Itens e valores do contrato' },
  { href: 'compras', icon: '🛒', label: 'Compras', desc: 'Lista de materiais' },
  { href: 'equipe', icon: '👷', label: 'Equipe', desc: 'Trabalhadores da obra' },
  { href: 'convite', icon: '📨', label: 'Convidar cliente', desc: 'Enviar acesso ao cliente' },
]

export default async function ObraPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obra } = await supabase
    .from('obras')
    .select('*')
    .eq('id', id)
    .eq('executor_id', user.id)
    .single()

  if (!obra) notFound()

  // Summary counts
  const [{ count: diaryCount }, { data: lastDiary }, { data: members }] = await Promise.all([
    supabase.from('diary_entries').select('*', { count: 'exact', head: true }).eq('obra_id', id).eq('closed', true),
    supabase.from('diary_entries').select('date').eq('obra_id', id).eq('closed', true).order('date', { ascending: false }).limit(1),
    supabase.from('obra_members').select('invited_email, accepted_at').eq('obra_id', id),
  ])

  const lastDiaryDate = lastDiary?.[0]?.date
  const clientsAccepted = members?.filter(m => m.accepted_at).length || 0

  return (
    <div className="min-h-dvh bg-ground pb-6">
      <PageHeader
        title={obra.name}
        backHref="/obras"
        variant="exec"
        actions={<ObraStatusBadge status={obra.status} />}
      />

      <div className="px-4 pt-4">
        {/* Info bar */}
        <div className="bg-exec-soft rounded-2xl p-4 mb-4 flex gap-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold font-mono text-exec">{diaryCount || 0}</p>
            <p className="text-xs text-exec/70 font-medium">dias fechados</p>
          </div>
          <div className="w-px bg-exec/20" />
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-exec">{lastDiaryDate ? formatDate(lastDiaryDate) : '—'}</p>
            <p className="text-xs text-exec/70 font-medium">último dia</p>
          </div>
          <div className="w-px bg-exec/20" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold font-mono text-exec">{clientsAccepted}</p>
            <p className="text-xs text-exec/70 font-medium">cliente(s)</p>
          </div>
        </div>

        {obra.address && (
          <p className="text-sm text-ink-3 mb-4 flex items-center gap-1.5">
            <span>📍</span> {obra.address}
          </p>
        )}

        {/* Menu grid */}
        <div className="flex flex-col gap-2">
          {menuItems.map(item => (
            <Link key={item.href} href={`/obras/${id}/${item.href}`}>
              <div className="bg-chrome border border-chrome-line rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
                <div className="w-11 h-11 bg-exec-soft rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-ink">{item.label}</p>
                  <p className="text-sm text-ink-3">{item.desc}</p>
                </div>
                <svg className="text-ink-3 flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
