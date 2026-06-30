import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
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

    const { data: existingMember, error: memberLookupError } = await supabaseAdmin
      .from('trip_members')
      .select('id,is_deleted')
      .eq('trip_id', invitation.trip_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberLookupError) {
      return NextResponse.json({ error: memberLookupError.message }, { status: 500 })
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
        return NextResponse.json({ error: restoreError.message }, { status: 500 })
      }
    } else if (!existingMember) {
      const { error: insertError } = await supabaseAdmin.from('trip_members').insert({
        trip_id: invitation.trip_id,
        user_id: user.id,
        role: 'member',
      })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
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
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to accept invitation'
    return NextResponse.json({ error: message }, { status })
  }
}
