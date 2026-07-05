import { NextResponse } from 'next/server'
import { getCurrentUser, handleApiError } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateTripSettlement } from '@/lib/tripData'

type CurrencyTotals = { currency: string; owes: number; receives: number; net: number }

export async function GET() {
  try {
    const user = await getCurrentUser()
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id)
      .eq('is_deleted', false)

    if (membershipError) {
      console.error('[api] dashboard summary: memberships', membershipError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    const tripIds = [...new Set((memberships || []).map((item) => item.trip_id))]
    const emptyData = {
      totalOwes: 0,
      totalReceives: 0,
      netBalance: 0,
      activeTripPendingBalance: 0,
      tripsOwing: [] as string[],
      tripsReceiving: [] as string[],
      byCurrency: [] as CurrencyTotals[],
      mixedCurrencies: false,
    }
    if (tripIds.length === 0) {
      return NextResponse.json({ success: true, data: emptyData })
    }

    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select('id,name,status,currency,is_deleted')
      .in('id', tripIds)
      .eq('is_deleted', false)

    if (tripsError) {
      console.error('[api] dashboard summary: trips', tripsError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    // Track balances per currency — summing across currencies is meaningless.
    const perCurrency = new Map<string, CurrencyTotals>()
    let activeTripPendingBalance = 0
    const tripsOwing: string[] = []
    const tripsReceiving: string[] = []

    for (const trip of trips || []) {
      const settlement = await calculateTripSettlement(trip.id)
      const currency = trip.currency || '₹'
      const userBalance =
        settlement.balances.find((balance) => balance.memberId === user.id)?.amount || 0

      const bucket = perCurrency.get(currency) || { currency, owes: 0, receives: 0, net: 0 }
      if (userBalance > 0) {
        bucket.receives += userBalance
        tripsReceiving.push(trip.id)
      } else if (userBalance < 0) {
        bucket.owes += Math.abs(userBalance)
        tripsOwing.push(trip.id)
      }
      bucket.net += userBalance
      perCurrency.set(currency, bucket)

      if (trip.status === 'active' || trip.status === 'reopened') {
        activeTripPendingBalance += userBalance
      }
    }

    const byCurrency: CurrencyTotals[] = Array.from(perCurrency.values()).map((b) => ({
      currency: b.currency,
      owes: Number(b.owes.toFixed(2)),
      receives: Number(b.receives.toFixed(2)),
      net: Number(b.net.toFixed(2)),
    }))

    const mixedCurrencies = byCurrency.length > 1
    // Flat totals remain valid only for the single-currency case; when mixed,
    // clients should render `byCurrency` instead of summing across symbols.
    const primary = byCurrency[0]

    return NextResponse.json({
      success: true,
      data: {
        totalOwes: mixedCurrencies ? 0 : primary?.owes || 0,
        totalReceives: mixedCurrencies ? 0 : primary?.receives || 0,
        netBalance: mixedCurrencies ? 0 : primary?.net || 0,
        activeTripPendingBalance: Number(activeTripPendingBalance.toFixed(2)),
        tripsOwing,
        tripsReceiving,
        byCurrency,
        mixedCurrencies,
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch dashboard summary');
  }
}
