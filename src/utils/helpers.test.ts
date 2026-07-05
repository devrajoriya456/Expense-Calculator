import { describe, it, expect } from 'vitest'
import { safeExternalUrl, sanitizeCsvCell, formatCurrency } from '@/utils/helpers'

describe('safeExternalUrl', () => {
  it('allows http and https URLs', () => {
    expect(safeExternalUrl('https://example.com/receipt.png')).toBe('https://example.com/receipt.png')
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com/')
  })

  it('blocks javascript: and data: and other schemes', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('JavaScript:alert(1)')).toBeNull()
    expect(safeExternalUrl('data:text/html,<script>')).toBeNull()
    expect(safeExternalUrl('vbscript:msgbox')).toBeNull()
  })

  it('returns null for empty/invalid values', () => {
    expect(safeExternalUrl('')).toBeNull()
    expect(safeExternalUrl(null)).toBeNull()
    expect(safeExternalUrl(undefined)).toBeNull()
    expect(safeExternalUrl('not a url')).toBeNull()
  })
})

describe('sanitizeCsvCell', () => {
  it('prefixes formula-trigger cells with a quote', () => {
    expect(sanitizeCsvCell('=HYPERLINK("http://evil")')).toBe("'=HYPERLINK(\"http://evil\")")
    expect(sanitizeCsvCell('+1+1')).toBe("'+1+1")
    expect(sanitizeCsvCell('-2')).toBe("'-2")
    expect(sanitizeCsvCell('@cmd')).toBe("'@cmd")
  })

  it('leaves normal values untouched', () => {
    expect(sanitizeCsvCell('Dinner')).toBe('Dinner')
    expect(sanitizeCsvCell('100.00')).toBe('100.00')
    expect(sanitizeCsvCell(42)).toBe('42')
    expect(sanitizeCsvCell(null)).toBe('')
  })
})

describe('formatCurrency', () => {
  it('adds grouping separators (en-IN) and two decimals', () => {
    // en-IN uses the Indian numbering system (lakh/crore grouping).
    expect(formatCurrency(1234567.5, '₹')).toBe('₹12,34,567.50')
    expect(formatCurrency(1000, '₹')).toBe('₹1,000.00')
    expect(formatCurrency(0, '$')).toBe('$0.00')
  })

  it('falls back to zero for non-finite input', () => {
    expect(formatCurrency(NaN, '$')).toBe('$0.00')
  })
})
