import { NextRequest, NextResponse } from 'next/server'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { mapTrip } from '@/lib/mappers'
import { supabaseAdmin } from '@/lib/supabase'
import { getTrip, requireTripOwnerOrAdmin, handleApiError } from '@/lib/tripAuth'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user, role } = await requireTripOwnerOrAdmin(tripId)
    const trip = await getTrip(tripId)

    if (role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can archive a trip.' }, { status: 403 })
    }
    if (trip.status !== 'ended') {
      return NextResponse.json({ error: 'Only ended trips can be archived.' }, { status: 409 })
    }

    const { data: updatedTrip, error } = await supabaseAdmin
      .from('trips')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_by: user.id,
      })
      .eq('id', tripId)
      .select()
      .single()

    if (error) {
      console.error('[api] src/app/api/trips/[tripId]/archive/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    await logActivity(tripId, user.id, 'trip_archived')
    await notifyTripMembers(
      tripId,
      'trip_archived',
      'Trip archived',
      'The trip was archived and is now read-only.',
    )

    return NextResponse.json({ success: true, data: mapTrip(updatedTrip) })
  } catch (error) {
    return handleApiError(error, 'Failed to archive trip');
  }
}
