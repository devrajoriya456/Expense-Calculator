import { NextResponse } from 'next/server'
import { ApiError, getCurrentUser } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { mapExpense, mapMember } from '@/lib/mappers'
import SettlementCalculator from '@/lib/settlementCalculator'

const memberSelect = `
  id,
  trip_id,
  user_id,
  role,
  joined_at,
  users (
    id,
    name,
    email,
    profile_image,
    upi_id
  )
`

export async function GET() {
  try {
    const user = await getCurrentUser()
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id)
      .eq('is_deleted', false)

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    const tripIds = [...new Set((memberships || []).map((item) => item.trip_id))]
    if (tripIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { totalOwes: 0, totalReceives: 0, netBalance: 0, activeTripPendingBalance: 0, tripsOwing: [], tripsReceiving: [] },
      })
    }

    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select('id,name,status,is_deleted')
      .in('id', tripIds)
      .eq('is_deleted', false)

    if (tripsError) {
      return NextResponse.json({ error: tripsError.message }, { status: 500 })
    }

    let totalOwes = 0
    let totalReceives = 0
    let activeTripPendingBalance = 0
    const tripsOwing: string[] = []
    const tripsReceiving: string[] = []

    for (const trip of trips || []) {
      const [{ data: expenses }, { data: members }] = await Promise.all([
        supabaseAdmin
          .from('expenses')
          .select('*, expense_participants(user_id, share)')
          .eq('trip_id', trip.id)
          .eq('is_deleted', false)
          .neq('approval_status', 'rejected'),
        supabaseAdmin
          .from('trip_members')
          .select(memberSelect)
          .eq('trip_id', trip.id)
          .eq('is_deleted', false),
      ])

      const settlement = SettlementCalculator.calculateSettlement(
        (expenses || []).map(mapExpense),
        (members || []).map(mapMember),
      )
      const userBalance = settlement.balances.find((balance) => balance.memberId === user.id)?.amount || 0
      if (userBalance > 0) {
        totalReceives += userBalance
        tripsReceiving.push(trip.id)
      } else if (userBalance < 0) {
        totalOwes += Math.abs(userBalance)
        tripsOwing.push(trip.id)
      }
      if (trip.status === 'active' || trip.status === 'reopened') {
        activeTripPendingBalance += userBalance
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalOwes: Number(totalOwes.toFixed(2)),
        totalReceives: Number(totalReceives.toFixed(2)),
        netBalance: Number((totalReceives - totalOwes).toFixed(2)),
        activeTripPendingBalance: Number(activeTripPendingBalance.toFixed(2)),
        tripsOwing,
        tripsReceiving,
      },
    })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard summary'
    return NextResponse.json({ error: message }, { status })
  }
}
