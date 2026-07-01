'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Card, Button, Loading, EmptyState, Badge } from '@/components/UI'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { Expense, Trip, SettlementSummary } from '@/types'
import Link from 'next/link'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Papa from 'papaparse'

interface SettlementPageProps {
  params: Promise<{ tripId: string }>
}

export default function SettlementPage({ params }: SettlementPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tripId, setTripId] = useState<string | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [settlement, setSettlement] = useState<SettlementSummary | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const money = useCallback((amount: number) => formatCurrency(amount, trip?.currency), [trip?.currency])

  useEffect(() => {
    // Resolve params promise
    params.then((resolvedParams) => {
      setTripId(resolvedParams.tripId)
    })
  }, [params])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchData = useCallback(async () => {
    if (!tripId) return
    try {
      setLoading(true)

      // Fetch trip
      const tripRes = await fetch('/api/trips')
      const tripData = await tripRes.json()
      const currentTrip = tripData.data.find((t: Trip) => t.id === tripId)
      setTrip(currentTrip)

      // Calculate settlement
      const settlementRes = await fetch(`/api/trips/${tripId}/settlement`)
      const settlementData = await settlementRes.json()
      if (settlementData.success) {
        setSettlement(settlementData.data)
      }

      const expensesRes = await fetch(`/api/trips/${tripId}/expenses`)
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        setExpenses(expensesData.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    if (status === 'authenticated' && tripId) {
      fetchData()
    }
  }, [status, tripId, fetchData])

  const downloadPDF = async () => {
    const element = document.getElementById('settlement-report')
    if (!element) return

    try {
      const canvas = await html2canvas(element, { scale: 2 })
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= 280

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= 280
      }

      pdf.save(`${trip?.name || 'settlement'}-${Date.now()}.pdf`)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    }
  }

  const downloadCSV = () => {
    if (!settlement) return

    const data = [
      ['Trip Settlement Report'],
      [`Trip: ${trip?.name}`, `Destination: ${trip?.destination}`],
      [`Status: ${trip?.status || ''}`, `Ended: ${trip?.endedAt ? formatDate(trip.endedAt) : ''}`],
      [`Reopened: ${trip?.reopenedAt ? formatDate(trip.reopenedAt) : ''}`],
      [`Start Date: ${formatDate(trip?.startDate || '')}`, `End Date: ${formatDate(trip?.endDate || '')}`],
      [],
      ['Summary'],
      [`Total Expense: ${money(settlement.totalExpense)}`],
      [`Total Members: ${settlement.totalMembers}`],
      [`Per Person Share: ${money(settlement.perPersonShare)}`],
      [],
      ['Balances'],
      ['Member', 'Amount'],
      ...settlement.balances.map((b) => [
        b.memberName,
        b.amount > 0 ? `To Receive: ${money(b.amount)}` : `To Pay: ${money(Math.abs(b.amount))}`,
      ]),
      [],
      ['Settlement Instructions'],
      ['From', 'To', 'Amount'],
      ...settlement.settlements.map((s) => [s.fromName, s.toName, money(s.amount)]),
      [],
      ['Late Entry Expenses'],
      ['Title', 'Amount', 'Date', 'Notes'],
      ...expenses
        .filter((expense) => expense.isLateEntry)
        .map((expense) => [
          expense.title,
          money(expense.amount),
          formatDate(expense.expenseDate),
          expense.notes || '',
        ]),
    ]

    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${trip?.name || 'settlement'}-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getSettlementText = () => {
    if (!settlement || !trip) return ''
    const lines = [
      `${trip.name} settlement`,
      `Total: ${money(settlement.totalExpense)}`,
      `Per person: ${money(settlement.perPersonShare)}`,
      '',
      'Transfers:',
      ...(settlement.settlements.length > 0
        ? settlement.settlements.map((item) => {
            const receiverPayment = settlement.paymentDetails[item.to]
            const upi = receiverPayment?.upiId ? ` (UPI: ${receiverPayment.upiId})` : ''
            return `${item.fromName} pays ${item.toName} ${money(item.amount)}${upi}`
          })
        : ['No transfers needed.']),
    ]
    return lines.join('\n')
  }

  const copySettlementText = async () => {
    await navigator.clipboard.writeText(getSettlementText())
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(getSettlementText())
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const markSettlementPaid = async (transfer: { from: string; fromName: string; to: string; toName: string; amount: number }) => {
    try {
      await fetch(`/api/trips/${tripId}/settlement/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transfer),
      })
    } catch (error) {
      console.error('Failed to mark settlement paid:', error)
    }
  }

  const sendReminder = (transfer: { fromName: string; toName: string; amount: number }) => {
    const text = encodeURIComponent(
      `Hi ${transfer.fromName}, please settle ${money(transfer.amount)} for ${trip?.name}. Pay ${transfer.toName}.`,
    )
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const downloadExpensesCSV = () => {
    const data = [
      ['Title', 'Category', 'Amount', 'Paid By', 'Date', 'Late Entry', 'Notes'],
      ...expenses.map((expense) => {
        const payer = settlement?.paymentDetails[expense.paidBy]
        return [
          expense.title,
          expense.category,
          money(expense.amount),
          payer?.name || expense.paidBy,
          formatDate(expense.expenseDate),
          expense.isLateEntry ? 'Yes' : 'No',
          expense.notes || '',
        ]
      }),
    ]
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${trip?.name || 'trip'}-expenses-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (status === 'loading' || loading) {
    return <Loading message="Calculating settlement..." />
  }

  if (!trip || !settlement) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar userEmail={session?.user?.email ?? undefined} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <EmptyState
            title="Settlement not available"
            description="Unable to calculate settlement for this trip."
            action={{
              label: 'Back to Trip',
              onClick: () => router.back(),
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar userEmail={session?.user?.email ?? undefined} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/trips/${trip.id}`} className="text-blue-500 hover:text-blue-600 mb-4 inline-block">
            Back to Trip
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            {trip.status === 'ended' || trip.status === 'archived' ? 'Final Settlement' : 'Current Settlement'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {trip.name} - {trip.destination} - {trip.status}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-4 mb-8">
          <Button onClick={downloadPDF} variant="secondary">
            Download PDF
          </Button>
          <Button onClick={downloadCSV} variant="secondary">
            Download Settlement CSV
          </Button>
          <Button onClick={downloadExpensesCSV} variant="secondary">
            Download Expenses CSV
          </Button>
          <Button onClick={copySettlementText} variant="secondary">
            Copy Settlement Text
          </Button>
          <Button onClick={shareWhatsApp} variant="secondary">
            Share WhatsApp
          </Button>
          <Button onClick={() => window.print()} variant="secondary">
            Print
          </Button>
        </div>

        {/* Settlement Report */}
        <div id="settlement-report" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Total Trip Expense</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {money(settlement.totalExpense)}
              </p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Number of Members</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {settlement.totalMembers}
              </p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Per Person Share</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {money(settlement.perPersonShare)}
              </p>
            </Card>
          </div>

          {/* Member Balances */}
          <Card>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Member Balances</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                How much each person paid vs. their fair share
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-800 dark:text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Member</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Paid</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Fair Share</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Balance</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 dark:text-white">
                  {settlement.balances.map((balance) => {
                    const paid = settlement.summary.paidByMember[balance.memberId] || 0
                    return (
                      <tr key={balance.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {balance.memberName}
                        </td>
                        <td className="px-6 py-4">{money(paid)}</td>
                        <td className="px-6 py-4">{money(settlement.perPersonShare)}</td>
                        <td className="px-6 py-4 font-medium">
                          {balance.amount > 0 ? (
                            <span className="text-green-600 dark:text-green-400">
                              Receive {money(balance.amount)}
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">
                              Pay {money(Math.abs(balance.amount))}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {balance.amount > 0 ? (
                            <Badge variant="success">Should Receive</Badge>
                          ) : balance.amount < 0 ? (
                            <Badge variant="danger">Owes Money</Badge>
                          ) : (
                            <Badge variant="info">Settled</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Settlement Instructions */}
          <Card>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settlement Instructions</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Minimum transactions required to settle all balances
              </p>
            </div>
            {settlement.settlements.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-slate-600 dark:text-slate-400">
                  Everyone has paid their fair share. No settlement needed!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-800 dark:text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">From</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">To</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {settlement.settlements.map((transfer, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {transfer.fromName}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {transfer.toName}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                          {money(transfer.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              transfer.status === 'confirmed'
                                ? 'success'
                                : transfer.status === 'paid'
                                  ? 'info'
                                  : 'primary'
                            }
                          >
                            {transfer.status || 'pending'}
                          </Badge>
                          {settlement.paymentDetails[transfer.to]?.upiId && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              UPI: {settlement.paymentDetails[transfer.to].upiId}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3">
                            <button
                              onClick={() => markSettlementPaid(transfer)}
                              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => sendReminder(transfer)}
                              className="text-sm text-green-600 hover:text-green-700"
                            >
                              WhatsApp Reminder
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Payment Details */}
          <Card>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Summary</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Amount Paid by Each Member
                </h3>
                <div className="space-y-2">
                  {Object.entries(settlement.summary.paidByMember).map(([memberId, amount]) => {
                    const member = settlement.balances.find((b) => b.memberId === memberId)
                    return (
                      <div key={memberId} className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-slate-700 dark:text-slate-300">{member?.memberName}</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {money(amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Final Status After Settlement
                </h3>
                <div className="space-y-2">
                  {settlement.balances.map((balance) => (
                    <div
                      key={balance.memberId}
                      className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <span className="text-slate-700 dark:text-slate-300">{balance.memberName}</span>
                      <span
                        className={`font-medium ${
                          Math.abs(balance.amount) < 0.01
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {Math.abs(balance.amount) < 0.01 ? 'Settled' : money(Math.abs(balance.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {expenses.some((expense) => expense.isLateEntry) && (
            <Card>
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Late Entry Expenses</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-800 dark:text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Title</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 dark:text-white">
                    {expenses
                      .filter((expense) => expense.isLateEntry)
                      .map((expense) => (
                        <tr key={expense.id}>
                          <td className="px-6 py-4">
                            {expense.title} <Badge variant="warning">Late Entry</Badge>
                          </td>
                          <td className="px-6 py-4">{money(expense.amount)}</td>
                          <td className="px-6 py-4">{formatDate(expense.expenseDate)}</td>
                          <td className="px-6 py-4">{expense.notes || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Verification */}
          <Card className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">Mathematically Verified</h3>
            <p className="text-green-800 dark:text-green-300 text-sm">
              This settlement plan ensures:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-green-800 dark:text-green-300">
              <li>No one pays more than their fair share</li>
              <li>No one pays less than their fair share</li>
              <li>No one receives extra money</li>
              <li>No one receives less money</li>
              <li>All balances become exactly zero</li>
              <li>Minimum number of transactions ({settlement.settlements.length})</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
