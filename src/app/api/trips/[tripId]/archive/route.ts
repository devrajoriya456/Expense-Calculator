import { NextRequest, NextResponse } from 'next/server'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { mapTrip } from '@/lib/mappers'
import { supabaseAdmin } from '@/lib/supabase'
import { ApiError, getTrip, requireTripOwnerOrAdmin } from '@/lib/tripAuth'

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
      return NextResponse.json({ error: error.message }, { status: 500 })
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
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to archive trip'
    return NextResponse.json({ error: message }, { status })
  }
}
