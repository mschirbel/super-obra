import { cn } from '@/lib/utils'
import Link from 'next/link'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  actions?: React.ReactNode
  variant?: 'exec' | 'cli'
}

export function PageHeader({ title, subtitle, backHref, actions, variant = 'exec' }: PageHeaderProps) {
  return (
    <header className={cn(
      'sticky top-0 z-10 bg-chrome border-b border-chrome-line safe-top',
    )}>
      <div className="flex items-center gap-3 px-4 h-14">
        {backHref && (
          <Link
            href={backHref}
            className="flex items-center justify-center w-9 h-9 -ml-1 rounded-xl text-ink-2 hover:bg-frame transition-colors"
            aria-label="Voltar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h1 className={cn(
            'font-bold text-lg leading-tight truncate',
            variant === 'exec' ? 'font-display text-exec' : 'font-display text-cli'
          )}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-ink-3 truncate">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
