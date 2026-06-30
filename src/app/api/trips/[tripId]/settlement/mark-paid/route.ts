import { NextRequest, NextResponse } from 'next/server'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { ApiError, requireTripMember } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user, role } = await requireTripMember(tripId)
    const body = await request.json()
    const from = String(body.from || '').trim()
    const fromName = String(body.fromName || '').trim()
    const to = String(body.to || '').trim()
    const toName = String(body.toName || '').trim()
    const amount = Number(body.amount)

    if (!from || !to || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid settlement payment.' }, { status: 400 })
    }
    if (role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (role === 'member' && user.id !== from && user.id !== to) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const nextStatus = role === 'owner' || role === 'admin' || user.id === to ? 'confirmed' : 'paid'
    const { error } = await supabaseAdmin.from('settlement_payments').upsert(
      {
        trip_id: tripId,
        payer_id: from,
        receiver_id: to,
        amount,
        status: nextStatus,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'trip_id,payer_id,receiver_id,amount' },
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logActivity(tripId, user.id, 'settlement_marked_paid', {
      from,
      fromName,
      to,
      toName,
      amount,
      status: nextStatus,
    })
    await notifyTripMembers(
      tripId,
      'settlement_marked_paid',
      'Settlement marked paid',
      `${fromName || 'A member'} marked a settlement payment as paid.`,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to mark settlement paid'
    return NextResponse.json({ error: message }, { status })
  }
}
