'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { segment: '', label: 'Hoje' },
  { segment: 'programacao', label: 'Próximos' },
  { segment: 'travas', label: 'Travas' },
  { segment: 'contrato', label: 'Contrato' },
  { segment: 'medicao', label: 'Medição' },
  { segment: 'diario', label: 'Diário' },
]

export function ObraTabBar({ obraId }: { obraId: string }) {
  const pathname = usePathname()
  const base = `/obras/${obraId}`

  return (
    <div className="bg-chrome border-b border-chrome-line overflow-x-auto scrollbar-none">
      <div className="flex min-w-max px-2">
        {tabs.map(tab => {
          const href = tab.segment ? `${base}/${tab.segment}` : base
          const isActive = tab.segment === ''
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                'px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-exec text-exec'
                  : 'border-transparent text-ink-3 hover:text-ink-2'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
