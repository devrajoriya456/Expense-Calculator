import { NextRequest, NextResponse } from 'next/server'
import { sendInvitationEmail } from '@/lib/email'
import { createTripInvitation } from '@/lib/invitations'
import { mapInvitation } from '@/lib/mappers'
import { supabaseAdmin } from '@/lib/supabase'
import { requireTripNotArchived, requireTripOwnerOrAdmin, handleApiError } from '@/lib/tripAuth'

const invitationSelect = `
  id,
  trip_id,
  invited_by,
  email,
  status,
  created_at,
  trips (
    id,
    name
  ),
  users (
    id,
    name,
    email
  )
`

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    await requireTripOwnerOrAdmin(tripId)

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .select(invitationSelect)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[api] src/app/api/trips/[tripId]/invitations/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: (data || []).map(mapInvitation) })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch invitations');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user } = await requireTripOwnerOrAdmin(tripId)
    await requireTripNotArchived(tripId)
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const invitation = await createTripInvitation(tripId, user.id, email)
    const { data: trip } = await supabaseAdmin
      .from('trips')
      .select('name')
      .eq('id', tripId)
      .maybeSingle()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    await sendInvitationEmail({
      to: invitation.email,
      tripName: trip?.name || 'Trip',
      acceptUrl: `${appUrl}/dashboard?invitation=${invitation.id}`,
    })

    return NextResponse.json(
      {
        success: true,
        data: invitation,
        message: 'Invitation sent. Member will appear after accepting.',
      },
      { status: 201 },
    )
  } catch (error) {
    return handleApiError(error, 'Failed to send invitation');
  }
}
