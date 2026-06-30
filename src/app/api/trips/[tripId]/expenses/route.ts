import { NextRequest, NextResponse } from 'next/server'
import { mapExpense } from '@/lib/mappers'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { ApiError, getTripRole, requireTripContributor, requireTripEditable, requireTripMember, requireTripNotArchived } from '@/lib/tripAuth'

const expenseSelect = '*, expense_participants(user_id, share)'

async function saveExpenseParticipants(
  tripId: string,
  expenseId: string,
  amount: number,
  splitType: string,
  rawParticipants: Array<{ userId?: string; share?: number; percentage?: number }> = [],
) {
  await supabaseAdmin.from('expense_participants').delete().eq('expense_id', expenseId)

  if (splitType === 'equal') return

  if (!rawParticipants.length) {
    throw new ApiError('Select at least one participant for this split.', 400)
  }

  for (const participant of rawParticipants) {
    if (!participant.userId || !(await getTripRole(tripId, participant.userId))) {
      throw new ApiError('All split participants must be accepted trip members.', 400)
    }
  }

  let participants = rawParticipants.map((participant) => ({
    user_id: participant.userId,
    share: Number(participant.share || 0),
  }))

  if (splitType === 'selected') {
    const cents = Math.round(amount * 100)
    const base = Math.floor(cents / rawParticipants.length)
    const remainder = cents % rawParticipants.length
    participants = rawParticipants.map((participant, index) => ({
      user_id: participant.userId,
      share: Number(((base + (index < remainder ? 1 : 0)) / 100).toFixed(2)),
    }))
  }

  if (splitType === 'percentage') {
    const percentageTotal = rawParticipants.reduce((sum, participant) => sum + Number(participant.percentage || 0), 0)
    if (Math.abs(percentageTotal - 100) > 0.01) {
      throw new ApiError('Percentage split must total 100%.', 400)
    }
    const cents = Math.round(amount * 100)
    let allocated = 0
    participants = rawParticipants.map((participant, index) => {
      const share =
        index === rawParticipants.length - 1
          ? cents - allocated
          : Math.round((cents * Number(participant.percentage || 0)) / 100)
      allocated += share
      return { user_id: participant.userId, share: Number((share / 100).toFixed(2)) }
    })
  }

  if (splitType === 'exact') {
    const exactTotal = participants.reduce((sum, participant) => sum + Number(participant.share), 0)
    if (Math.abs(exactTotal - amount) > 0.01) {
      throw new ApiError('Exact split amounts must equal the expense amount.', 400)
    }
  }

  const { error } = await supabaseAdmin.from('expense_participants').insert(
    participants.map((participant) => ({
      expense_id: expenseId,
      user_id: participant.user_id,
      share: participant.share,
    })),
  )

  if (error) {
    throw new ApiError(error.message, 500)
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    await requireTripMember(tripId)

    const { data: expenses, error } = await supabaseAdmin
      .from('expenses')
      .select(expenseSelect)
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .order('expense_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: (expenses || []).map(mapExpense) })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to fetch expenses'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { role, trip } = await requireTripContributor(tripId)

    const body = await request.json()
    const paidBy = String(body.paidBy || '').trim()
    const title = String(body.title || '').trim()
    const category = String(body.category || '').trim()
    const expenseDate = String(body.expenseDate || '').trim()
    const notes = body.notes ? String(body.notes) : null
    const amount = Number(body.amount)
    const splitType = String(body.splitType || 'equal')
    const receiptUrl = body.receiptUrl ? String(body.receiptUrl).trim() : null

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

    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        trip_id: tripId,
        paid_by: paidBy,
        category,
        amount,
        title,
        expense_date: expenseDate,
        notes,
        is_late_entry: false,
        approval_status: trip.approval_required && role === 'member' ? 'pending' : 'approved',
        split_type: splitType,
        receipt_url: receiptUrl,
      })
      .select(expenseSelect)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await saveExpenseParticipants(tripId, expense.id, amount, splitType, body.participants || [])

    const { data: expenseWithParticipants } = await supabaseAdmin
      .from('expenses')
      .select(expenseSelect)
      .eq('id', expense.id)
      .single()

    await logActivity(tripId, paidBy, 'expense_added', {
      expenseId: expense.id,
      title,
      amount,
      tripStatus: trip.status,
    })

    return NextResponse.json({ success: true, data: mapExpense(expenseWithParticipants || expense) }, { status: 201 })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to add expense'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user, role, trip } = await requireTripEditable(tripId)

    const body = await request.json()
    const expenseId = String(body.expenseId || '').trim()
    const paidBy = String(body.paidBy || '').trim()
    const title = String(body.title || '').trim()
    const category = String(body.category || '').trim()
    const expenseDate = String(body.expenseDate || '').trim()
    const notes = body.notes ? String(body.notes) : null
    const amount = Number(body.amount)
    const splitType = String(body.splitType || 'equal')
    const receiptUrl = body.receiptUrl ? String(body.receiptUrl).trim() : null

    if (!expenseId || !paidBy || !title || !category || !expenseDate || !body.amount) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero.' }, { status: 400 })
    }

    const { data: existingExpense, error: lookupError } = await supabaseAdmin
      .from('expenses')
      .select(expenseSelect)
      .eq('id', expenseId)
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 })
    }
    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found.' }, { status: 404 })
    }

    const canEdit = role === 'owner' || role === 'admin'
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const paidByRole = await getTripRole(tripId, paidBy)
    if (!paidByRole) {
      return NextResponse.json({ error: 'Paid by user is not an accepted trip member.' }, { status: 400 })
    }

    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .update({
        paid_by: paidBy,
        category,
        amount,
        title,
        expense_date: expenseDate,
        notes,
        split_type: splitType,
        receipt_url: receiptUrl,
      })
      .eq('id', expenseId)
      .eq('trip_id', tripId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await saveExpenseParticipants(tripId, expense.id, amount, splitType, body.participants || [])

    const { data: expenseWithParticipants } = await supabaseAdmin
      .from('expenses')
      .select(expenseSelect)
      .eq('id', expense.id)
      .single()

    await logActivity(tripId, user.id, 'expense_edited', {
      expenseId: expense.id,
      title,
      amount,
      tripStatus: trip.status,
      oldValues: {
        paidBy: existingExpense.paid_by,
        category: existingExpense.category,
        amount: Number(existingExpense.amount),
        title: existingExpense.title,
        expenseDate: existingExpense.expense_date,
        notes: existingExpense.notes,
        splitType: existingExpense.split_type,
        receiptUrl: existingExpense.receipt_url,
        participants: existingExpense.expense_participants,
      },
      newValues: {
        paidBy,
        category,
        amount,
        title,
        expenseDate,
        notes,
        splitType,
        receiptUrl,
        participants: body.participants || [],
      },
    })
    await notifyTripMembers(
      tripId,
      'settlement_changed',
      'Settlement changed',
      'An expense was edited and the settlement changed.',
    )

    return NextResponse.json({ success: true, data: mapExpense(expenseWithParticipants || expense) })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to edit expense'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user, role } = await requireTripNotArchived(tripId)

    const expenseId = request.nextUrl.searchParams.get('expenseId')
    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID is required.' }, { status: 400 })
    }

    const { data: expense, error: lookupError } = await supabaseAdmin
      .from('expenses')
      .select('id,paid_by')
      .eq('id', expenseId)
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 })
    }
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found.' }, { status: 404 })
    }

    const canDelete = role === 'owner' || role === 'admin'
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('expenses')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', expense.id)
      .eq('trip_id', tripId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logActivity(tripId, user.id, 'expense_deleted', { expenseId: expense.id })
    await notifyTripMembers(
      tripId,
      'settlement_changed',
      'Settlement changed',
      'An expense was deleted and the settlement changed.',
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to delete expense'
    return NextResponse.json({ error: message }, { status })
  }
}
