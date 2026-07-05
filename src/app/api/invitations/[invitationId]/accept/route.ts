import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
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
      console.error('[api] src/app/api/invitations/[invitationId]/accept/route.ts', error);
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

    const { data: existingMember, error: memberLookupError } = await supabaseAdmin
      .from('trip_members')
      .select('id,is_deleted')
      .eq('trip_id', invitation.trip_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberLookupError) {
      console.error('[api] src/app/api/invitations/[invitationId]/accept/route.ts', memberLookupError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    if (existingMember?.is_deleted) {
      const { error: restoreError } = await supabaseAdmin
        .from('trip_members')
        .update({
          role: 'member',
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        })
        .eq('id', existingMember.id)

      if (restoreError) {
        console.error('[api] src/app/api/invitations/[invitationId]/accept/route.ts', restoreError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
      }
    } else if (!existingMember) {
      const { error: insertError } = await supabaseAdmin.from('trip_members').insert({
        trip_id: invitation.trip_id,
        user_id: user.id,
        role: 'member',
      })

      if (insertError) {
        console.error('[api] src/app/api/invitations/[invitationId]/accept/route.ts', insertError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('[api] src/app/api/invitations/[invitationId]/accept/route.ts', updateError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    await logActivity(invitation.trip_id, user.id, 'invitation_accepted', {
      invitationId: invitation.id,
    })
    await logActivity(invitation.trip_id, user.id, 'member_added', {
      source: 'email_invitation',
      invitationId: invitation.id,
    })
    await notifyTripMembers(
      invitation.trip_id,
      'invitation_accepted',
      'Invitation accepted',
      `${user.name} joined the trip.`,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Failed to accept invitation');
  }
}
