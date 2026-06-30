'use client'

import React from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button, Card } from '@/components/UI'

export default function HomePage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white">
              $
            </div>
            <span className="text-slate-900 dark:text-white hidden sm:inline">Trip Split</span>
          </Link>

          <div className="flex items-center gap-4">
            {session ? (
              <Link href="/dashboard">
                <Button variant="primary">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="secondary">Sign In</Button>
                </Link>
                <Link href="/login">
                  <Button variant="primary">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="text-6xl mb-6">$</div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            Split trip expenses without confusion.
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Add expenses, invite friends, and settle in one click.
          </p>

          {session ? (
            <div className="flex justify-center mt-8">
            <Link href="/dashboard">
              <Button variant="primary" size="lg" className="!px-8">
                Go to Dashboard
              </Button>
            </Link>
            </div>
          ) : (
            <div className="flex justify-center mt-8">
            <Link href="/login">
              <Button variant="primary" size="lg" className="!px-8">
                Start for Free
              </Button>
            </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">
            Powerful Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: 'Settle',
                title: 'Smart Settlement Algorithm',
                description: 'Calculates minimum transactions needed to settle all debts mathematically accurately.',
              },
              {
                icon: 'Group',
                title: 'Unlimited Members',
                description: 'Add as many people as you need to your trip group.',
              },
              {
                icon: 'Spend',
                title: 'Track Every Expense',
                description: 'Categorize expenses: Hotel, Food, Fuel, Shopping, Tickets, Activities, and more.',
              },
              {
                icon: 'Chart',
                title: 'Beautiful Dashboard',
                description: 'See analytics, charts, and detailed expense breakdowns at a glance.',
              },
              {
                icon: 'Mobile',
                title: 'Fully Responsive',
                description: 'Works perfectly on desktop, tablet, and mobile devices.',
              },
              {
                icon: 'Export',
                title: 'Export Reports',
                description: 'Download PDF, CSV, or print your settlement summary.',
              },
            ].map((feature, idx) => (
              <Card key={idx} className="p-6 hover:shadow-lg">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Create Trip', desc: 'Start a new trip with name and dates' },
              { step: '2', title: 'Add Members', desc: 'Invite people to your trip' },
              { step: '3', title: 'Log Expenses', desc: 'Record who paid for what' },
              { step: '4', title: 'Settle Up', desc: 'Get settlement instructions' },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example */}
      <section className="py-20 bg-blue-50/50 dark:bg-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
            Example Settlement
          </h2>

          <Card className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Expenses Paid</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Person A paid</span>
                    <span className="font-medium">₹12,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Person B paid</span>
                    <span className="font-medium">₹8,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Person C paid</span>
                    <span className="font-medium">₹5,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Person D paid</span>
                    <span className="font-medium">₹10,000</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-900 dark:text-white">Total</span>
                      <span>₹35,000</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Settlement Plan</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="text-slate-700 dark:text-slate-300">Person E pays Person A</span>
                    <span className="font-medium text-red-600">₹5,000</span>
                  </div>
                  <div className="flex justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="text-slate-700 dark:text-slate-300">Person F pays Person D</span>
                    <span className="font-medium text-red-600">₹5,000</span>
                  </div>
                  <div className="flex justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="text-slate-700 dark:text-slate-300">Person G pays Person A</span>
                    <span className="font-medium text-red-600">₹2,000</span>
                  </div>
                  <div className="flex justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="text-slate-700 dark:text-slate-300">Person G pays Person B</span>
                    <span className="font-medium text-red-600">₹3,000</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Ready to Split Expenses Fairly?
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Create your first trip and start tracking expenses today.
          </p>

          {session ? (
            <div className="flex justify-center mt-8">
            <Link href="/dashboard">
              <Button variant="primary" size="lg" className="!px-8">
                Go to Dashboard
              </Button>
            </Link>
            </div>
          ) : (
            <div className="flex justify-center mt-8">
            <Link href="/login">
              <Button variant="primary" size="lg" className="!px-8">
                Sign In Free
              </Button>
            </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  $
                </div>
                <span className="font-bold">Trip Split</span>
              </div>
              <p className="text-slate-400 text-sm">Fair expense tracking for group trips</p>
            </div>
            <div className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Trip Split. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
