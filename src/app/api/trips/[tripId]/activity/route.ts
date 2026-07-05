import { NextRequest, NextResponse } from 'next/server'
import { mapActivityLog } from '@/lib/mappers'
import { supabaseAdmin } from '@/lib/supabase'
import { requireTripMember, handleApiError } from '@/lib/tripAuth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    await requireTripMember(tripId)

    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select(`
        id,
        trip_id,
        user_id,
        action,
        metadata,
        created_at,
        users (
          id,
          name,
          email
        )
      `)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[api] src/app/api/trips/[tripId]/activity/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: (data || []).map(mapActivityLog) })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch activity');
  }
}
