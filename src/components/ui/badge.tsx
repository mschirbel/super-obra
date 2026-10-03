import { cn } from '@/lib/utils'

type BadgeVariant = 'exec' | 'cli' | 'default' | 'success' | 'danger' | 'warning' | 'neutral'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide uppercase font-mono',
        {
          'bg-exec-soft text-exec': variant === 'exec',
          'bg-cli-soft text-cli': variant === 'cli',
          'bg-frame text-ink-2 border border-frame-line': variant === 'default',
          'bg-success-soft text-success': variant === 'success',
          'bg-danger-soft text-danger': variant === 'danger',
          'bg-warning-soft text-warning': variant === 'warning',
          'bg-frame text-ink-3': variant === 'neutral',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
