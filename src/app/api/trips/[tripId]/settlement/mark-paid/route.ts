import { NextRequest, NextResponse } from 'next/server'
import { logActivity, notifyUser } from '@/lib/tripEvents'
import { requireTripNotArchived, handleApiError } from '@/lib/tripAuth'
import { calculateTripSettlement } from '@/lib/tripData'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * The PAYER marks a transfer as paid. This does NOT settle the balance yet — it
 * creates a `pending` record awaiting the RECEIVER's confirmation (accept/reject
 * via the /confirm route). Only once confirmed does the balance settle.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user } = await requireTripNotArchived(tripId)
    const body = await request.json()
    const from = String(body.from || '').trim()
    const to = String(body.to || '').trim()
    const toName = String(body.toName || '').trim()
    const amount = Number(body.amount)

    if (!from || !to || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid settlement payment.' }, { status: 400 })
    }

    // Only the payer can declare that they paid.
    if (user.id !== from) {
      return NextResponse.json(
        { error: 'Only the person who owes this payment can mark it as paid.' },
        { status: 403 },
      )
    }

    // Only allow marking a settlement that actually exists in the current
    // computed settlement plan — prevents fabricating arbitrary payment rows.
    const settlement = await calculateTripSettlement(tripId)
    const matches = settlement.settlements.some(
      (item) =>
        item.from === from &&
        item.to === to &&
        Math.abs(item.amount - amount) < 0.01,
    )
    if (!matches) {
      return NextResponse.json(
        { error: 'This settlement is no longer valid. Please refresh and try again.' },
        { status: 409 },
      )
    }

    // Awaiting the receiver's confirmation — balance stays unsettled until then.
    const { error } = await supabaseAdmin.from('settlement_payments').upsert(
      {
        trip_id: tripId,
        payer_id: from,
        receiver_id: to,
        amount,
        status: 'pending',
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'trip_id,payer_id,receiver_id,amount' },
    )

    if (error) {
      console.error('[api] settlement mark-paid', error)
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
    }

    await logActivity(tripId, user.id, 'settlement_marked_paid', { from, to, toName, amount })
    await notifyUser(
      to,
      tripId,
      'settlement_confirm_requested',
      'Confirm a payment',
      `${user.name || 'A member'} says they paid you ${amount}. Open the settlement to accept or reject.`,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Failed to mark settlement paid')
  }
}
