'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import Navbar from '@/components/Navbar'
import { Card, Button, Loading, EmptyState, Badge } from '@/components/UI'
import { Trip } from '@/types'
import { formatDate } from '@/utils/helpers'

export default function SettlementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [trips, setTrips] = useState<Trip[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTrips()
    }
  }, [status])

  async function fetchTrips() {
    try {
      setLoading(true)

      const res = await fetch('/api/trips')

      if (!res.ok) {
        throw new Error('Failed to load trips')
      }

      const data = await res.json()

      if (data.success) {
        setTrips(data.data || [])
      } else {
        setTrips([])
      }
    } catch (err) {
      console.error(err)
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar userEmail={session?.user?.email ?? undefined} />
        <div className="container mx-auto px-4 py-8">
          <Loading />
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar userEmail={session?.user?.email ?? undefined} />

      <div className="container mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">Settlements</h1>
            <p className="mt-3 text-xl text-gray-600 dark:text-gray-400">
              Select a trip to view its settlement.
            </p>
          </div>
        </div>

        {trips.length === 0 ? (
          <EmptyState
            title="No Trips Found"
            description="Create a trip first to generate settlements."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <Card
  key={trip.id}
  className="rounded-xl border border-gray-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800"
>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white">{trip.name}</h2>

                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                      {trip.destination}
                    </p>
                  </div>

                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
  {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
</Badge>
                </div>

                <div className="mt-8 space-y-3 text-lg text-gray-700 dark:text-gray-300">
                  <p>
                    <span className="font-semibold">Start:</span> {formatDate(trip.startDate)}
                  </p>

                  <p>
                    <strong>End:</strong> {formatDate(trip.endDate)}
                  </p>
                </div>

                <div className="mt-6">
                  <Link href={`/trips/${trip.id}/settlement`}>
                    <Button className="mt-8 w-full rounded-lg py-3">
                      View Settlement
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}