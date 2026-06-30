/**
 * Utility functions for the application
 */

// Format currency
export const formatCurrency = (amount: number, currency = '₹'): string => {
  return `${currency}${amount.toFixed(2)}`
}

// Format date
export const formatDate = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Format date with time
export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Parse date string to Date object
export const parseDate = (dateString: string): Date => {
  return new Date(dateString)
}

// Get date range
export const getDateRange = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays
}

// Truncate string
export const truncateString = (str: string, length: number): string => {
  return str.length > length ? str.substring(0, length) + '...' : str
}

// Get initials from name
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

// Generate random color
export const generateColor = (seed: string): string => {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#f97316', // orange
  ]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Format percentage
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`
}

// Round to 2 decimal places
export const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100
}

// Check if amount is approximately zero (for floating point comparison)
export const isApproximatelyZero = (value: number, tolerance = 0.01): boolean => {
  return Math.abs(value) < tolerance
}

// Validate email
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate phone number (basic)
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9]{10}$/
  return phoneRegex.test(phone.replace(/\D/g, ''))
}

// Download file
export const downloadFile = (
  content: string | Blob,
  filename: string,
  type = 'text/plain'
): void => {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Generate unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9)
}

// Debounce function
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

// Sort by property
export const sortBy = <T>(array: T[], property: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    if (a[property] < b[property]) return order === 'asc' ? -1 : 1
    if (a[property] > b[property]) return order === 'asc' ? 1 : -1
    return 0
  })
}

// Group by property
export const groupBy = <T>(array: T[], property: keyof T): Record<string, T[]> => {
  return array.reduce(
    (groups, item) => {
      const key = String(item[property])
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
      return groups
    },
    {} as Record<string, T[]>
  )
}
