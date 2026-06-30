import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/tripEvents'
import { ApiError, getCurrentUser, normalizeEmail } from '@/lib/tripAuth'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const user = await getCurrentUser()
    const { invitationId } = await params

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .select('id,trip_id,email,status')
      .eq('id', invitationId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 })
    }
    if (normalizeEmail(invitation.email) !== normalizeEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation is no longer pending.' }, { status: 409 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ status: 'rejected' })
      .eq('id', invitation.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await logActivity(invitation.trip_id, user.id, 'invitation_rejected', {
      invitationId: invitation.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to reject invitation'
    return NextResponse.json({ error: message }, { status })
  }
}
