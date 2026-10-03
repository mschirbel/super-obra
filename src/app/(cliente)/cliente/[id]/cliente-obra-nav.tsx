'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { segment: 'hoje', label: 'Hoje', icon: '☀️' },
  { segment: 'agenda', label: 'Agenda', icon: '📅' },
  { segment: 'pendencias', label: 'Pendências', icon: '⚠️' },
  { segment: 'compras', label: 'Compras', icon: '🛒' },
  { segment: 'financeiro', label: 'Financeiro', icon: '💰' },
]

export function ClienteObraNav({ obraId }: { obraId: string }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-chrome border-t border-chrome-line z-10 pb-safe">
      <div className="flex items-stretch">
        {navItems.map(item => {
          const href = `/cliente/${obraId}/${item.segment}`
          const isActive = pathname === href
          return (
            <Link
              key={item.segment}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 text-xs font-semibold transition-colors',
                isActive ? 'text-cli' : 'text-ink-3 hover:text-ink-2'
              )}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
