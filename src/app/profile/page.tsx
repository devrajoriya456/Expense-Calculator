'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Button, Card, Input, Loading, Select } from '@/components/UI'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    profileImage: '',
    upiId: '',
    defaultCurrency: '₹',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    const loadProfile = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetch('/api/profile')
        const data = await response.json()
        if (!response.ok) {
          setError(data.error || 'Failed to load profile.')
          return
        }
        setForm({
          name: data.data.name || '',
          email: data.data.email || '',
          phone: data.data.phone || '',
          profileImage: data.data.image || '',
          upiId: data.data.upiId || '',
          defaultCurrency: data.data.defaultCurrency || '₹',
        })
      } catch {
        setError('Network error while loading profile.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [status])

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      setMessage('')
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to update profile.')
        return
      }
      setMessage('Profile updated.')
    } catch {
      setError('Network error while updating profile. Please retry.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return <Loading message="Loading profile..." />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar userEmail={session?.user?.email ?? undefined} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white">Profile</h1>
        <Card className="p-6">
          <form onSubmit={saveProfile} className="space-y-4">
            <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input label="Email" value={form.email} disabled />
            <Input label="Phone Number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 98765 43210" />
            <Input label="Profile Image URL" value={form.profileImage} onChange={(event) => setForm({ ...form, profileImage: event.target.value })} placeholder="https://..." />
            <Input label="UPI ID" value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} placeholder="name@bank" />
            <Select
              label="Default Currency"
              value={form.defaultCurrency}
              onChange={(event) => setForm({ ...form, defaultCurrency: event.target.value })}
              options={[
                { value: '₹', label: 'INR (₹)' },
                { value: '$', label: 'USD ($)' },
                { value: '€', label: 'EUR (€)' },
                { value: '£', label: 'GBP (£)' },
                { value: 'د.إ', label: 'AED (د.إ)' },
              ]}
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
            <Button type="submit" loading={saving}>Save Profile</Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
