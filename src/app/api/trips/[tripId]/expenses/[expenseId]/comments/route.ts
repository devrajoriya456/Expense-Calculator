import { NextRequest, NextResponse } from 'next/server'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { ApiError, requireTripMember } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; expenseId: string }> },
) {
  try {
    const { tripId, expenseId } = await params
    await requireTripMember(tripId)

    const { data, error } = await supabaseAdmin
      .from('expense_comments')
      .select('id,comment,created_at,users(id,name,email)')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: (data || []).map((item) => {
        const user = Array.isArray(item.users) ? item.users[0] : item.users
        return {
          id: item.id,
          comment: item.comment,
          userName: user?.name || user?.email || 'Member',
          createdAt: item.created_at,
        }
      }),
    })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to fetch comments'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; expenseId: string }> },
) {
  try {
    const { tripId, expenseId } = await params
    const { user, role } = await requireTripMember(tripId)
    if (role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const comment = String(body.comment || '').trim()
    if (comment.length < 2) {
      return NextResponse.json({ error: 'Comment is required.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('expense_comments').insert({
      expense_id: expenseId,
      user_id: user.id,
      comment,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logActivity(tripId, user.id, 'expense_commented', { expenseId })
    await notifyTripMembers(tripId, 'expense_commented', 'Expense comment', `${user.name} commented on an expense.`)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to add comment'
    return NextResponse.json({ error: message }, { status })
  }
}
