'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Card, Button, EmptyState, Loading } from '@/components/UI'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { DashboardBalanceSummary, Invitation, Trip } from '@/types'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [summary, setSummary] = useState<DashboardBalanceSummary | null>(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmResumeTripId, setConfirmResumeTripId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    totalBudget: '',
    dailySpendingLimit: '',
    foodBudget: '',
    hotelBudget: '',
    fuelBudget: '',
    shoppingBudget: '',
    activitiesBudget: '',
    currency: '₹',
    approvalRequired: false,
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTrips()
      fetchInvitations()
      fetchSummary()
    }
  }, [status])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/trips')
      const data = await response.json()
      if (data.success) {
        setTrips(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations')
      const data = await response.json()
      if (data.success) {
        setInvitations(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/dashboard/summary')
      const data = await response.json()
      if (data.success) {
        setSummary(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error)
    }
  }

  const handleInvitation = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}/${action}`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || `Failed to ${action} invitation.`)
        return
      }
      setInvitations((current) => current.filter((item) => item.id !== invitationId))
      if (action === 'accept') {
        fetchTrips()
      }
    } catch (error) {
      console.error(`Failed to ${action} invitation:`, error)
    }
  }

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.destination || !formData.startDate || !formData.endDate) {
      setMessage('Please fill all required fields.')
      return
    }
    if (formData.endDate < formData.startDate) {
      setMessage('Trip end date cannot be before start date.')
      return
    }

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (data.success) {
        setTrips([data.data, ...trips])
        setShowCreateModal(false)
        setFormData({
          name: '',
          destination: '',
          startDate: '',
          endDate: '',
          totalBudget: '',
          dailySpendingLimit: '',
          foodBudget: '',
          hotelBudget: '',
          fuelBudget: '',
          shoppingBudget: '',
          activitiesBudget: '',
          currency: '₹',
          approvalRequired: false,
        })
        fetchSummary()
      }
    } catch (error) {
      console.error('Failed to create trip:', error)
    }
  }

  if (status === 'loading' || loading) {
    return <Loading message="Loading your trips..." />
  }

  const groupedTrips = {
    active: trips.filter((trip) => trip.status === 'active'),
    reopened: trips.filter((trip) => trip.status === 'reopened'),
    ended: trips.filter((trip) => trip.status === 'ended'),
    archived: trips.filter((trip) => trip.status === 'archived'),
    owing: trips.filter((trip) => summary?.tripsOwing.includes(trip.id)),
    receiving: trips.filter((trip) => summary?.tripsReceiving.includes(trip.id)),
  }

  const filterOptions = [
    { key: 'all', label: 'All Trips', trips },
    { key: 'active', label: 'Active', trips: [...groupedTrips.active, ...groupedTrips.reopened] },
    { key: 'ended', label: 'Ended', trips: groupedTrips.ended },
    { key: 'archived', label: 'Archived', trips: groupedTrips.archived },
    { key: 'owing', label: 'You Owe', trips: groupedTrips.owing },
    { key: 'receiving', label: 'You Receive', trips: groupedTrips.receiving },
  ]
  const selectedTrips = filterOptions.find((item) => item.key === activeFilter)?.trips || trips

  const handleResumeTrip = async (tripId: string) => {
    const response = await fetch(`/api/trips/${tripId}/resume`, { method: 'POST' })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error || 'Failed to resume trip.')
      return
    }
    setMessage('Trip resumed.')
    fetchTrips()
  }

  const renderTripCard = (trip: Trip) => (
    <Card className="p-6 hover:shadow-lg cursor-pointer h-full" hover>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {trip.name}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {trip.destination}
          </p>
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs capitalize text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {trip.status}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <p className="text-slate-600 dark:text-slate-400">
          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          Created {formatDate(trip.createdAt)}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/trips/${trip.id}`} className="flex-1">
          <Button className="w-full" variant="secondary" size="sm">
            View Trip
          </Button>
        </Link>
        {trip.status === 'ended' && (
          <>
            <Link href={`/trips/${trip.id}/settlement`} className="flex-1">
            <Button className="w-full" variant="secondary" size="sm">
              Settlement
            </Button>
          </Link>
            <Link href={`/trips/${trip.id}`} className="flex-1">
              <Button className="w-full" variant="secondary" size="sm">
                Add Late Expense
              </Button>
            </Link>
            <Button size="sm" variant="primary" onClick={() => setConfirmResumeTripId(trip.id)}>
              Resume
            </Button>
          </>
        )}
      </div>
    </Card>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar userEmail={session?.user?.email ?? undefined} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <Card className="mb-4 flex items-center justify-between p-4">
            <p className="text-sm text-slate-700 dark:text-slate-200">{message}</p>
            <button className="text-sm text-blue-600" onClick={() => setMessage('')}>
              Dismiss
            </button>
          </Card>
        )}
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Your Trips</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your group trip expenses and settlements
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} variant="primary" size="lg">
            + Create Trip
          </Button>
        </div>

        {/* Stats */}
        {trips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Trips</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{trips.length}</p>
            </Card>
            <Card className="p-6">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Active Trips</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {groupedTrips.active.length}
              </p>
            </Card>
            <Card className="p-6">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Ended Trips</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {groupedTrips.ended.length}
              </p>
            </Card>
            <Card className="p-6">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Net Balance</p>
              <p className={`text-3xl font-bold mt-2 ${(summary?.netBalance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(summary?.netBalance || 0)}
              </p>
            </Card>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-5">
              <p className="text-sm text-slate-600 dark:text-slate-400">You owe</p>
              <p className="mt-1 text-2xl font-semibold text-red-600">{formatCurrency(summary.totalOwes)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-slate-600 dark:text-slate-400">You will receive</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">{formatCurrency(summary.totalReceives)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-slate-600 dark:text-slate-400">Net balance</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(summary.netBalance)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-slate-600 dark:text-slate-400">Active pending</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(summary.activeTripPendingBalance)}</p>
            </Card>
          </div>
        )}

        {invitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Pending Invitations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {invitation.tripName || 'Trip invitation'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Invited by {invitation.invitedByName || 'Trip admin'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(invitation.createdAt)}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleInvitation(invitation.id, 'accept')}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleInvitation(invitation.id, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Trips List */}
        {trips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Create your first trip to start tracking group expenses!"
            action={{
              label: 'Create Trip',
              onClick: () => setShowCreateModal(true),
            }}
          />
        ) : (
          <div className="space-y-10">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setActiveFilter(option.key)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    activeFilter === option.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {option.label} ({option.trips.length})
                </button>
              ))}
            </div>
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
                {filterOptions.find((item) => item.key === activeFilter)?.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedTrips.map((trip) => (
                  <div key={trip.id}>{renderTripCard(trip)}</div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Create New Trip</h2>
              
              <form onSubmit={handleCreateTrip} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Summer Vacation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Dubai, UAE"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Trip Budget
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.totalBudget}
                      onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="20000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Daily Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.dailySpendingLimit}
                      onChange={(e) => setFormData({ ...formData, dailySpendingLimit: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2000"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.approvalRequired}
                    onChange={(e) => setFormData({ ...formData, approvalRequired: e.target.checked })}
                  />
                  Require owner/admin approval for member expenses
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="₹">INR (₹)</option>
                    <option value="$">USD ($)</option>
                    <option value="د.إ">AED (د.إ)</option>
                    <option value="€">EUR (€)</option>
                    <option value="£">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Category Budgets
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['foodBudget', 'Food'],
                      ['hotelBudget', 'Hotel'],
                      ['fuelBudget', 'Fuel'],
                      ['shoppingBudget', 'Shopping'],
                      ['activitiesBudget', 'Activities'],
                    ].map(([key, label]) => (
                      <input
                        key={key}
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData[key as keyof typeof formData] as string}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowCreateModal(false)}
                    variant="secondary"
                    fullWidth
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" fullWidth>
                    Create Trip
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {confirmResumeTripId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resume Trip</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Members will be able to add expenses again.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmResumeTripId(null)}>
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  const tripToResume = confirmResumeTripId
                  setConfirmResumeTripId(null)
                  handleResumeTrip(tripToResume)
                }}
              >
                Resume
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
