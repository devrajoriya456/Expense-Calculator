import { NextResponse } from 'next/server'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { getCurrentUser, handleApiError } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const user = await getCurrentUser()
    const { token } = await params

    const { data: inviteLink, error } = await supabaseAdmin
      .from('invite_links')
      .select('id,trip_id,revoked_at,trips!inner(is_deleted,status)')
      .eq('token', token)
      .maybeSingle()

    if (error) {
      console.error('[api] src/app/api/invite-links/[token]/join/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
    const trip = Array.isArray(inviteLink?.trips) ? inviteLink?.trips[0] : inviteLink?.trips
    if (!inviteLink || inviteLink.revoked_at || !trip || trip.is_deleted || trip.status === 'archived') {
      return NextResponse.json({ error: 'Invite link is no longer valid.' }, { status: 404 })
    }

    const { data: existingMember, error: memberLookupError } = await supabaseAdmin
      .from('trip_members')
      .select('id,is_deleted')
      .eq('trip_id', inviteLink.trip_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberLookupError) {
      console.error('[api] src/app/api/invite-links/[token]/join/route.ts', memberLookupError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    if (existingMember?.is_deleted) {
      const { error: reactivateError } = await supabaseAdmin
        .from('trip_members')
        .update({
          role: 'member',
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        })
        .eq('id', existingMember.id)

      if (reactivateError) {
        console.error('[api] src/app/api/invite-links/[token]/join/route.ts', reactivateError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
      }
    } else if (!existingMember) {
      const { error: insertError } = await supabaseAdmin.from('trip_members').insert({
        trip_id: inviteLink.trip_id,
        user_id: user.id,
        role: 'member',
      })

      if (insertError) {
        console.error('[api] src/app/api/invite-links/[token]/join/route.ts', insertError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
      }
    }

    await logActivity(inviteLink.trip_id, user.id, 'member_added', {
      source: 'invite_link',
      token,
    })
    await notifyTripMembers(
      inviteLink.trip_id,
      'member_added',
      'Member joined',
      `${user.name} joined the trip.`,
    )

    return NextResponse.json({ success: true, data: { tripId: inviteLink.trip_id } })
  } catch (error) {
    return handleApiError(error, 'Failed to join trip');
  }
}
