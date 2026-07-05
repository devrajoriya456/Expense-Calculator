import { NextRequest, NextResponse } from 'next/server'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { requireTripOwnerOrAdmin, handleApiError } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; expenseId: string }> },
) {
  try {
    const { tripId, expenseId } = await params
    const { user } = await requireTripOwnerOrAdmin(tripId)
    const body = await request.json()
    const status = String(body.status || '')

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid approval status.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('expenses')
      .update({ approval_status: status })
      .eq('id', expenseId)
      .eq('trip_id', tripId)
      .eq('is_deleted', false)

    if (error) {
      console.error('[api] src/app/api/trips/[tripId]/expenses/[expenseId]/approval/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    await logActivity(tripId, user.id, status === 'approved' ? 'expense_approved' : 'expense_rejected', {
      expenseId,
    })
    await notifyTripMembers(
      tripId,
      status === 'approved' ? 'expense_approved' : 'expense_rejected',
      status === 'approved' ? 'Expense approved' : 'Expense rejected',
      `An expense was ${status}.`,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Failed to update approval');
  }
}
