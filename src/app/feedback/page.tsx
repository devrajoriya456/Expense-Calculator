'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import Navbar from '@/components/Navbar'
import { Button, Card, Select } from '@/components/UI'

export default function FeedbackPage() {
  const { data: session } = useSession()
  const [type, setType] = useState('bug')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setStatus('')
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus(data.error || 'Failed to submit feedback.')
        return
      }
      setMessage('')
      setStatus('Feedback submitted.')
    } catch {
      setStatus('Network error. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar userEmail={session?.user?.email ?? undefined} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white">Report Issue</h1>
        <Card className="p-6">
          <form onSubmit={submitFeedback} className="space-y-4">
            <Select
              label="Issue Type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              options={[
                { value: 'bug', label: 'Bug' },
                { value: 'wrong_calculation', label: 'Wrong calculation' },
                { value: 'login_issue', label: 'Login issue' },
                { value: 'payment_settlement', label: 'Payment/settlement issue' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Details
              </label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                placeholder="Describe what happened."
              />
            </div>
            {status && <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p>}
            <Button type="submit" loading={loading}>Submit</Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
