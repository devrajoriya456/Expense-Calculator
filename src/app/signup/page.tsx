'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Card, Input } from '@/components/UI'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
    setError('')
    setSuccess('')
  }

  const validate = () => {
    const name = formData.name.trim()
    const email = formData.email.trim().toLowerCase()

    if (!name || !email || !formData.password || !formData.confirmPassword) {
      return 'All fields are required.'
    }
    if (name.length < 2) {
      return 'Full name must be at least 2 characters.'
    }
    if (!emailRegex.test(email)) {
      return 'Enter a valid email address.'
    }
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters.'
    }
    if (!/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      return 'Password must include at least one letter and one number.'
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match.'
    }
    return null
  }

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Unable to create account.')
        return
      }

      setSuccess('Account created. Redirecting to login...')
      setTimeout(() => {
        router.push(`/login?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`)
      }, 800)
    } catch {
      setError('Network error while creating your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4">
            $
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Account</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Start tracking trip expenses with your group
          </p>
        </div>

        <Card className="p-6 mb-4">
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Full Name"
              autoComplete="name"
              placeholder="Rahul Sharma"
              value={formData.name}
              onChange={(event) => updateField('name', event.target.value)}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={(event) => updateField('password', event.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
            />

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                {success}
              </div>
            )}

            <Button type="submit" loading={loading} fullWidth variant="primary">
              Create Account
            </Button>
          </form>
        </Card>

        <Card className="p-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Sign In
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
