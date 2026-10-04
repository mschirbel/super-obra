import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatCurrency, formatDate, formatDateLong, todayISO, getObrasLimit, tierLabel, formatPhone, isValidPhone } from '../utils'

describe('formatCurrency', () => {
  it('formats positive value', () => {
    expect(formatCurrency(1500)).toBe('R$\u00a01.500,00')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('R$\u00a00,00')
  })
  it('returns R$ 0,00 for null', () => {
    expect(formatCurrency(null)).toBe('R$ 0,00')
  })
  it('returns R$ 0,00 for undefined', () => {
    expect(formatCurrency(undefined)).toBe('R$ 0,00')
  })
  it('formats decimal value', () => {
    expect(formatCurrency(99.9)).toBe('R$\u00a099,90')
  })
})

describe('formatDate', () => {
  it('formats ISO date string', () => {
    expect(formatDate('2026-10-03')).toBe('03/10/2026')
  })
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })
  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })
})

describe('formatDateLong', () => {
  it('returns empty string for null', () => {
    expect(formatDateLong(null)).toBe('')
  })
  it('includes day and month', () => {
    const result = formatDateLong('2026-10-03')
    expect(result).toContain('3')
    expect(result.toLowerCase()).toContain('outubro')
  })
})

describe('todayISO', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-03T15:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns current date in YYYY-MM-DD format', () => {
    expect(todayISO()).toBe('2026-10-03')
  })
})

describe('getObrasLimit', () => {
  it('free tier returns 1', () => {
    expect(getObrasLimit('free')).toBe(1)
  })
  it('tier1 returns 2', () => {
    expect(getObrasLimit('tier1')).toBe(2)
  })
  it('tier2 returns 5', () => {
    expect(getObrasLimit('tier2')).toBe(5)
  })
  it('tier3 returns 99999', () => {
    expect(getObrasLimit('tier3')).toBe(99999)
  })
  it('unknown tier defaults to 1', () => {
    expect(getObrasLimit('unknown')).toBe(1)
  })
})

describe('formatPhone', () => {
  it('formats 11-digit celular', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
  })
  it('formats 10-digit fixo', () => {
    expect(formatPhone('1132165432')).toBe('(11) 3216-5432')
  })
  it('formats partial input', () => {
    expect(formatPhone('119')).toBe('(11) 9')
  })
  it('strips non-digits', () => {
    expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
  })
  it('returns empty for empty input', () => {
    expect(formatPhone('')).toBe('')
  })
  it('caps at 11 digits', () => {
    expect(formatPhone('119876543210000')).toBe('(11) 98765-4321')
  })
})

describe('isValidPhone', () => {
  it('valid celular 11 digits', () => {
    expect(isValidPhone('(11) 98765-4321')).toBe(true)
  })
  it('valid fixo 10 digits', () => {
    expect(isValidPhone('(11) 3216-5432')).toBe(true)
  })
  it('invalid — too short', () => {
    expect(isValidPhone('(11) 9876')).toBe(false)
  })
  it('invalid — too long', () => {
    expect(isValidPhone('(11) 98765-43210')).toBe(false)
  })
  it('empty string is invalid', () => {
    expect(isValidPhone('')).toBe(false)
  })
})

describe('tierLabel', () => {
  it('free returns Grátis', () => {
    expect(tierLabel('free')).toBe('Grátis')
  })
  it('tier1 returns Starter', () => {
    expect(tierLabel('tier1')).toBe('Starter')
  })
  it('tier2 returns Pro', () => {
    expect(tierLabel('tier2')).toBe('Pro')
  })
  it('tier3 returns Ilimitado', () => {
    expect(tierLabel('tier3')).toBe('Ilimitado')
  })
  it('unknown returns Grátis', () => {
    expect(tierLabel('anything')).toBe('Grátis')
  })
})
