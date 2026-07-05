'use client'

import React, { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Card } from '@/components/UI'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Only allow relative, same-origin callback paths to avoid open redirects.
  const rawCallback = searchParams.get('callbackUrl') || ''
  const callbackUrl = rawCallback.startsWith('/') && !rawCallback.startsWith('//')
    ? rawCallback
    : '/dashboard'

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      await signIn('google', { callbackUrl })
    } catch {
      setError('Failed to sign in with Google')
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }

    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError('The email or password you entered is incorrect.')
      }
    } catch (err) {
      setError('Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4">
            $
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Trip Split</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Fair expense tracking for your group trips
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 mb-4">
          {/* Google Sign In */}
          <Button
            onClick={handleGoogleSignIn}
            loading={loading}
            fullWidth
            className="mb-4 flex items-center justify-center gap-2"
            variant="secondary"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </Button>

          {/* Email Sign In Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
            />

            <Button type="submit" loading={loading} fullWidth variant="primary">
              Sign In
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {searchParams.get('error') && !error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              Google sign-in failed. Please try again.
            </div>
          )}
        </Card>

        <Card className="p-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            New to Trip Split?{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Create Account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800" />}>
      <LoginContent />
    </Suspense>
  )
}
