'use client'
import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'cli'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none',
          {
            'bg-exec text-white hover:bg-exec/90': variant === 'primary',
            'bg-frame border border-frame-line text-ink hover:border-exec/40 hover:text-exec': variant === 'secondary',
            'text-ink-2 hover:text-ink hover:bg-frame': variant === 'ghost',
            'bg-danger-soft text-danger hover:bg-danger hover:text-white': variant === 'danger',
            'bg-cli text-white hover:bg-cli/90': variant === 'cli',
          },
          {
            'text-sm px-3 py-2 h-9': size === 'sm',
            'text-base px-4 py-3 h-12': size === 'md',
            'text-lg px-6 py-4 h-14': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export { Button }
