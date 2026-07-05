import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/tripEvents'
import { requireTripOwnerOrAdmin, requireTripNotArchived, handleApiError } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

const getBaseUrl = (request: NextRequest) =>
  process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    await requireTripOwnerOrAdmin(tripId)

    const { data, error } = await supabaseAdmin
      .from('invite_links')
      .select('token,created_at')
      .eq('trip_id', tripId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[api] src/app/api/trips/[tripId]/invite-link/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data
        ? {
            token: data.token,
            url: `${getBaseUrl(request)}/invite/${data.token}`,
            createdAt: data.created_at,
          }
        : null,
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch invite link');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params
    const { user } = await requireTripOwnerOrAdmin(tripId)
    await requireTripNotArchived(tripId)

    const token = randomUUID().replace(/-/g, '')
    const { data, error } = await supabaseAdmin
      .from('invite_links')
      .insert({
        trip_id: tripId,
        token,
        created_by: user.id,
      })
      .select('token,created_at')
      .single()

    if (error) {
      console.error('[api] src/app/api/trips/[tripId]/invite-link/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    await logActivity(tripId, user.id, 'invite_link_created', { token: data.token })

    return NextResponse.json({
      success: true,
      data: {
        token: data.token,
        url: `${getBaseUrl(request)}/invite/${data.token}`,
        createdAt: data.created_at,
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to create invite link');
  }
}
