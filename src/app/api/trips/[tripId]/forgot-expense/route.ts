import { NextRequest, NextResponse } from 'next/server'
import { calculateTripSettlement } from '@/lib/tripData'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { mapExpense } from '@/lib/mappers'
import { supabaseAdmin } from '@/lib/supabase'
import { getTrip, getTripRole, requireTripMember, handleApiError } from '@/lib/tripAuth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user, role } = await requireTripMember(tripId)
    if (role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const trip = await getTrip(tripId)

    if (trip.status !== 'ended') {
      return NextResponse.json(
        { error: 'Late expenses can only be added after a trip is ended.' },
        { status: 409 },
      )
    }

    const body = await request.json()
    const paidBy = String(body.paidBy || '').trim()
    const title = String(body.title || '').trim()
    const category = String(body.category || '').trim()
    const expenseDate = String(body.expenseDate || '').trim()
    const notes = body.notes ? String(body.notes) : null
    const amount = Number(body.amount)

    if (!paidBy || !title || !category || !expenseDate || !body.amount) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero.' }, { status: 400 })
    }

    const paidByRole = await getTripRole(tripId, paidBy)
    if (!paidByRole) {
      return NextResponse.json({ error: 'Paid by user is not an accepted trip member.' }, { status: 400 })
    }

    // const now = new Date().toISOString()
    // const { data: expense, error } = await supabaseAdmin
    //   .from('expenses')
    //   .insert({
    //     trip_id: tripId,
    //     paid_by: paidBy,
    //     title,
    //     category,
    //     amount,
    //     expense_date: expenseDate,
    //     notes,
    //     is_late_entry: true,
    //     late_entry_added_by: user.id,
    //     late_entry_added_at: now,
    //   })
    //   .select()
    //   .single()

    const now = new Date().toISOString()

const { data: expense, error } = await supabaseAdmin
  .from("expenses")
  .insert({
    trip_id: tripId,
    paid_by: paidBy,
    title,
    category,
    amount,
    expense_date: expenseDate,
    notes,
    is_late_entry: true,
    late_entry_added_by: user.id,
    late_entry_added_at: now,
  })
  .select()
  .single()

    if (error) {
      console.error('[api] src/app/api/trips/[tripId]/forgot-expense/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    const settlement = await calculateTripSettlement(tripId)
    await logActivity(tripId, user.id, 'late_expense_added', {
      expenseId: expense.id,
      title,
      amount,
    })
    await notifyTripMembers(
      tripId,
      'late_expense_added',
      'Late expense added',
      'A forgotten expense was added and settlement was recalculated.',
    )

    return NextResponse.json({
      success: true,
      data: {
        expense: mapExpense(expense),
        settlement,
      },
      message: 'Late expense added and settlement recalculated.',
    })
  } catch (error) {
    return handleApiError(error, 'Failed to add forgotten expense');
  }
}
