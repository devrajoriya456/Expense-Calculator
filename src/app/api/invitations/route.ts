import { NextResponse } from 'next/server'
import { mapInvitation } from '@/lib/mappers'
import { supabaseAdmin } from '@/lib/supabase'
import { ApiError, getCurrentUser, normalizeEmail } from '@/lib/tripAuth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .select(`
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
      `)
      .eq('email', normalizeEmail(user.email))
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: (data || []).map(mapInvitation) })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to fetch invitations'
    return NextResponse.json({ error: message }, { status })
  }
}
