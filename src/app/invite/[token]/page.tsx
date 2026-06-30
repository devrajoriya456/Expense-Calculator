'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button, Card, Loading } from '@/components/UI'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default function InvitePage({ params }: InvitePageProps) {
  const { status } = useSession()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [trip, setTrip] = useState<{ id: string; name: string; destination?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then((resolved) => setToken(resolved.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    const loadInvite = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/invite-links/${token}`)
        const data = await response.json()
        if (!response.ok) {
          setError(data.error || 'Invite link not found.')
          return
        }
        setTrip(data.data.trip)
      } catch {
        setError('Network error while loading invite.')
      } finally {
        setLoading(false)
      }
    }
    loadInvite()
  }, [token])

  const joinTrip = async () => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/invite/${token}`)
      return
    }
    try {
      setJoining(true)
      setError('')
      const response = await fetch(`/api/invite-links/${token}/join`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to join trip.')
        return
      }
      router.push(`/trips/${data.data.tripId}`)
    } catch {
      setError('Network error while joining trip. Please retry.')
    } finally {
      setJoining(false)
    }
  }

  if (loading || status === 'loading') {
    return <Loading message="Loading invite..." />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trip Invite</h1>
        {trip && (
          <div className="mt-4">
            <p className="font-medium text-slate-900 dark:text-white">{trip.name}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{trip.destination}</p>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button className="mt-6" onClick={joinTrip} loading={joining} fullWidth>
          {status === 'authenticated' ? 'Join Trip' : 'Sign in to Join'}
        </Button>
      </Card>
    </div>
  )
}
