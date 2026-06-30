import { NextRequest, NextResponse } from 'next/server'
import { mapActivityLog } from '@/lib/mappers'
import { supabaseAdmin } from '@/lib/supabase'
import { ApiError, requireTripMember } from '@/lib/tripAuth'

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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: (data || []).map(mapActivityLog) })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to fetch activity'
    return NextResponse.json({ error: message }, { status })
  }
}
