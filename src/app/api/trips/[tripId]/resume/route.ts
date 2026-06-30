import { NextRequest, NextResponse } from 'next/server'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { supabaseAdmin } from '@/lib/supabase'
import { ApiError, getTrip, requireTripOwnerOrAdmin } from '@/lib/tripAuth'
import { mapTrip } from '@/lib/mappers'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user } = await requireTripOwnerOrAdmin(tripId)
    const trip = await getTrip(tripId)

    if (trip.status !== 'ended') {
      return NextResponse.json({ error: 'Only ended trips can be resumed.' }, { status: 409 })
    }

    const { data: updatedTrip, error } = await supabaseAdmin
      .from('trips')
      .update({
        status: 'reopened',
        reopened_at: new Date().toISOString(),
        reopened_by: user.id,
      })
      .eq('id', tripId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logActivity(tripId, user.id, 'trip_resumed')
    await notifyTripMembers(
      tripId,
      'trip_resumed',
      'Trip resumed',
      'The trip was resumed. Members can add expenses again.',
    )

    return NextResponse.json({ success: true, data: mapTrip(updatedTrip) })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to resume trip'
    return NextResponse.json({ error: message }, { status })
  }
}
