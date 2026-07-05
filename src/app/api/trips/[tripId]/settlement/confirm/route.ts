import { NextRequest, NextResponse } from 'next/server'
import { logActivity, notifyUser } from '@/lib/tripEvents'
import { requireTripNotArchived, handleApiError } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * The RECEIVER confirms a payment the payer marked as paid.
 * - action "accept": status -> "paid" (the balance now settles).
 * - action "reject": the pending record is removed (balance stays unsettled).
 * Only the receiver of the payment may confirm it.
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
    const amount = Number(body.amount)
    const action = String(body.action || '').trim()

    if (!from || !to || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid settlement payment.' }, { status: 400 })
    }
    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
    }
    // Only the receiver can confirm receipt of the money.
    if (user.id !== to) {
      return NextResponse.json(
        { error: 'Only the person receiving this payment can confirm it.' },
        { status: 403 },
      )
    }

    // There must be a pending claim to act on.
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('settlement_payments')
      .select('id,status')
      .eq('trip_id', tripId)
      .eq('payer_id', from)
      .eq('receiver_id', to)
      .eq('amount', amount)
      .maybeSingle()

    if (lookupError) {
      console.error('[api] settlement confirm lookup', lookupError)
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
    }
    if (!existing || existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'There is no pending payment to confirm.' },
        { status: 409 },
      )
    }

    if (action === 'accept') {
      const { error } = await supabaseAdmin
        .from('settlement_payments')
        .update({ status: 'paid', updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (error) {
        console.error('[api] settlement confirm accept', error)
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
      }

      await logActivity(tripId, user.id, 'settlement_confirmed', { from, to, amount })
      await notifyUser(
        from,
        tripId,
        'settlement_confirmed',
        'Payment confirmed',
        `${user.name || 'The receiver'} confirmed your payment of ${amount}.`,
      )
      return NextResponse.json({ success: true, status: 'paid' })
    }

    // reject -> remove the pending claim so the balance reverts.
    const { error } = await supabaseAdmin
      .from('settlement_payments')
      .delete()
      .eq('id', existing.id)

    if (error) {
      console.error('[api] settlement confirm reject', error)
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
    }

    await logActivity(tripId, user.id, 'settlement_rejected', { from, to, amount })
    await notifyUser(
      from,
      tripId,
      'settlement_rejected',
      'Payment not confirmed',
      `${user.name || 'The receiver'} did not confirm your payment of ${amount}.`,
    )
    return NextResponse.json({ success: true, status: 'rejected' })
  } catch (error) {
    return handleApiError(error, 'Failed to confirm settlement')
  }
}
