import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function getObrasLimit(tier: string): number {
  switch (tier) {
    case 'tier1': return 2
    case 'tier2': return 5
    case 'tier3': return 99999
    default: return 1
  }
}

export function tierLabel(tier: string): string {
  switch (tier) {
    case 'tier1': return 'Starter'
    case 'tier2': return 'Pro'
    case 'tier3': return 'Ilimitado'
    default: return 'Grátis'
  }
}
