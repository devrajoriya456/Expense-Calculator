import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/tripEvents'
import { getCurrentUser, normalizeEmail, handleApiError } from '@/lib/tripAuth'

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
      console.error('[api] src/app/api/invitations/[invitationId]/reject/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
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
      console.error('[api] src/app/api/invitations/[invitationId]/reject/route.ts', updateError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    await logActivity(invitation.trip_id, user.id, 'invitation_rejected', {
      invitationId: invitation.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Failed to reject invitation');
  }
}
