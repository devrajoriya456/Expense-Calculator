import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import Providers from './providers'
import OfflineBanner from '@/components/OfflineBanner'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import './globals.css'

export const metadata: Metadata = {
  title: 'Trip Expense Splitter - Fair Trip Expense Management',
  description: 'Track trip expenses, calculate fair shares, and generate optimal settlement plans for groups',
  keywords: 'trip expenses, expense splitter, settlement calculator, group expenses',
  authors: [{ name: 'Trip Split Team' }],
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/icon.svg" />
      </head>
      <body className="bg-slate-50 dark:bg-slate-900">
        <Providers>
          <ServiceWorkerRegister />
          <OfflineBanner />
          {children}
        </Providers>
      </body>
    </html>
  )
}
