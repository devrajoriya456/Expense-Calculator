'use client'

import React, { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const updateStatus = () => setOffline(!navigator.onLine)
    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
      You are offline. Some actions may not work.
    </div>
  )
}
