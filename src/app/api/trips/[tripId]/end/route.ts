import { NextRequest, NextResponse } from 'next/server'
import { calculateTripSettlement } from '@/lib/tripData'
import { logActivity, notifyTripMembers } from '@/lib/tripEvents'
import { supabaseAdmin } from '@/lib/supabase'
import { getTrip, requireTripOwnerOrAdmin, handleApiError } from '@/lib/tripAuth'
import { mapTrip } from '@/lib/mappers'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user } = await requireTripOwnerOrAdmin(tripId)
    const trip = await getTrip(tripId)

    if (trip.status === 'ended') {
      return NextResponse.json({ error: 'Trip is already ended.' }, { status: 409 })
    }
    if (trip.status === 'archived') {
      return NextResponse.json({ error: 'Archived trips cannot be ended.' }, { status: 403 })
    }

    const { data: updatedTrip, error } = await supabaseAdmin
      .from('trips')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        ended_by: user.id,
      })
      .eq('id', tripId)
      .select()
      .single()

    if (error) {
      console.error('[api] src/app/api/trips/[tripId]/end/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    const settlement = await calculateTripSettlement(tripId)
    await logActivity(tripId, user.id, 'trip_ended')
    await notifyTripMembers(
      tripId,
      'trip_ended',
      'Trip ended',
      'The trip was ended and final settlement is ready.',
    )

    return NextResponse.json({
      success: true,
      data: {
        trip: mapTrip(updatedTrip),
        settlement,
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to end trip');
  }
}
