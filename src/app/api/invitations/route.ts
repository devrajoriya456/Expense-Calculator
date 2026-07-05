import { NextResponse } from 'next/server'
import { mapInvitation } from '@/lib/mappers'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentUser, normalizeEmail, handleApiError } from '@/lib/tripAuth'

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
      console.error('[api] src/app/api/invitations/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: (data || []).map(mapInvitation) })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch invitations');
  }
}
