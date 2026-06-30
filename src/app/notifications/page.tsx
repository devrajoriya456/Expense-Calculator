'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Navbar from '@/components/Navbar'
import { Card, Loading } from '@/components/UI'
import { Notification } from '@/types'
import { formatDate } from '@/utils/helpers'

export default function NotificationsPage() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/notifications')
        const data = await response.json()
        if (data.success) {
          setNotifications(data.data || [])
        }
      } finally {
        setLoading(false)
      }
    }
    loadNotifications()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar userEmail={session?.user?.email ?? undefined} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white">Notifications</h1>
        {loading ? (
          <Loading message="Loading notifications..." />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card key={notification.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white">{notification.title}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span>
                </div>
              </Card>
            ))}
            {notifications.length === 0 && (
              <Card className="p-6 text-center text-slate-600 dark:text-slate-300">
                No notifications yet.
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
