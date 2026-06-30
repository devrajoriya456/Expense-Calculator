import React from 'react'
import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export function Card({ children, className, onClick, hover = false }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700',
        hover && 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'font-medium rounded-lg transition-all duration-200 flex items-center justify-center'

  const variantStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300',
    secondary: 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600',
    danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300',
    success: 'bg-green-500 text-white hover:bg-green-600 disabled:bg-green-300',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        (loading || disabled) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info'
  className?: string
}

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
  const variantStyles = {
    primary: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100',
    success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100',
    danger: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100',
    warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100',
    info: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-100',
  }

  return (
    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', variantStyles[variant], className)}>
      {children}
    </span>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full px-3 py-2 rounded-lg border transition-colors',
          error
            ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500',
          'bg-white dark:bg-slate-700 text-slate-900 dark:text-white',
          className
        )}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string | number; label: string }>
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full px-3 py-2 rounded-lg border transition-colors',
          error
            ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500',
          'bg-white dark:bg-slate-700 text-slate-900 dark:text-white',
          className
        )}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}

interface LoadingProps {
  message?: string
}

export function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-slate-600 dark:text-slate-300">{message}</p>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  icon?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, icon = '-', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300 text-center max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  )
}
