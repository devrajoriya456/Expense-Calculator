import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, handleApiError } from '@/lib/tripAuth'
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
      console.error('[api] src/app/api/notifications/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
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
    return handleApiError(error, 'Failed to fetch notifications');
  }
}

// Mark notifications as read. Body: { ids?: string[] } — omit ids to mark all.
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const body = await request.json().catch(() => ({}))
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined

    let query = supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (ids && ids.length) {
      query = query.in('id', ids)
    }

    const { error } = await query
    if (error) {
      console.error('[api] notifications mark-read', error)
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Failed to update notifications')
  }
}
