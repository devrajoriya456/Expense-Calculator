import { NextResponse } from 'next/server'
import { ApiError, getCurrentUser } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id,type,title,message,read_at,created_at,trip_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: (data || []).map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        readAt: item.read_at || undefined,
        createdAt: item.created_at,
        tripId: item.trip_id || undefined,
      })),
    })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications'
    return NextResponse.json({ error: message }, { status })
  }
}
