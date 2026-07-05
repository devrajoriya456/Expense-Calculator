import { NextRequest, NextResponse } from 'next/server'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { requireExpenseInTrip, requireTripMember, requireTripNotArchived, handleApiError } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; expenseId: string }> },
) {
  try {
    const { tripId, expenseId } = await params
    await requireTripMember(tripId)
    await requireExpenseInTrip(tripId, expenseId)

    const { data, error } = await supabaseAdmin
      .from('expense_comments')
      .select('id,comment,created_at,users(id,name,email)')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[api] src/app/api/trips/[tripId]/expenses/[expenseId]/comments/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
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
    return handleApiError(error, 'Failed to fetch comments');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; expenseId: string }> },
) {
  try {
    const { tripId, expenseId } = await params
    const { user, role } = await requireTripNotArchived(tripId)
    if (role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await requireExpenseInTrip(tripId, expenseId)

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
      console.error('[api] src/app/api/trips/[tripId]/expenses/[expenseId]/comments/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    await logActivity(tripId, user.id, 'expense_commented', { expenseId })
    await notifyTripMembers(tripId, 'expense_commented', 'Expense comment', `${user.name} commented on an expense.`)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to add comment');
  }
}
