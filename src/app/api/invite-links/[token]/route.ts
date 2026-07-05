import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const { data, error } = await supabaseAdmin
    .from('invite_links')
    .select('token,revoked_at,trips!inner(id,name,destination,is_deleted,status)')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('[api] src/app/api/invite-links/[token]/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
  const trip = Array.isArray(data?.trips) ? data?.trips[0] : data?.trips
  if (!data || data.revoked_at || !trip || trip.is_deleted) {
    return NextResponse.json({ error: 'Invite link not found.' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      token: data.token,
      trip: {
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        status: trip.status,
      },
    },
  })
}
