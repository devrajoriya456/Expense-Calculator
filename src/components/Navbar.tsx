'use client'

import React from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

interface NavbarProps {
  userEmail?: string
  onSignOut?: () => void
}

export default function Navbar({ userEmail, onSignOut }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const [isDark, setIsDark] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)
  const handleSignOut = onSignOut ?? (() => signOut({ callbackUrl: '/login' }))

  React.useEffect(() => {
    const storedTheme = localStorage.getItem('theme')
    const shouldUseDark =
      storedTheme === 'dark' ||
      (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(shouldUseDark)
    document.documentElement.classList.toggle('dark', shouldUseDark)
  }, [])

  // Poll unread notifications so the badge reflects pending confirmations etc.
  React.useEffect(() => {
    if (!userEmail) return
    let active = true
    const load = async () => {
      try {
        const res = await fetch('/api/notifications')
        if (!res.ok) return
        const data = await res.json()
        if (active && data?.success) {
          setUnreadCount((data.data || []).filter((n: { readAt?: string }) => !n.readAt).length)
        }
      } catch {
        // ignore transient network errors
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [userEmail])

  const toggleDarkMode = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2 font-bold text-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white">
              $
            </div>
            <span className="text-slate-900 dark:text-white hidden sm:inline">Trip Split</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/dashboard"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            >
              Dashboard
            </Link>
            <Link
              href="/trips"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            >
              Trips
            </Link>
            <Link
              href="/settlements"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            >
              Settlements
            </Link>
            <Link
              href="/feedback"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            >
              Feedback
            </Link>
            <Link
              href="/notifications"
              className="relative text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            >
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-4 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-semibold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {isDark ? 'Light' : 'Dark'}
            </button>
            {userEmail ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {userEmail.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{userEmail}</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-2">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
