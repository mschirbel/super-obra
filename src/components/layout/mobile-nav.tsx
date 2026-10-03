'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface MobileNavProps {
  items: NavItem[]
  variant?: 'exec' | 'cli'
}

export function MobileNav({ items, variant = 'exec' }: MobileNavProps) {
  const pathname = usePathname()
  const activeColor = variant === 'exec' ? 'text-exec' : 'text-cli'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-chrome border-t border-chrome-line safe-bottom z-10">
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-semibold transition-colors',
                isActive ? activeColor : 'text-ink-3 hover:text-ink-2'
              )}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
