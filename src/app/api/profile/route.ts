import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentUser, handleApiError } from '@/lib/tripAuth'

const currencyOptions = new Set(['₹', '$', '€', '£', 'د.إ'])

export async function GET() {
  try {
    const user = await getCurrentUser()

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.profile_image,
        phone: user.phone,
        upiId: user.upi_id,
        defaultCurrency: user.default_currency || '₹',
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch profile');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const name = String(body.name || '').trim()
    const phone = body.phone ? String(body.phone).trim() : null
    const profileImage = body.profileImage ? String(body.profileImage).trim() : null
    const upiId = body.upiId ? String(body.upiId).trim() : null
    const defaultCurrency = String(body.defaultCurrency || '₹').trim()

    if (name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 })
    }
    if (!currencyOptions.has(defaultCurrency)) {
      return NextResponse.json({ error: 'Unsupported currency.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        name,
        phone,
        profile_image: profileImage,
        upi_id: upiId,
        default_currency: defaultCurrency,
      })
      .eq('id', user.id)
      .select('id,email,name,profile_image,phone,upi_id,default_currency')
      .single()

    if (error) {
      console.error('[api] src/app/api/profile/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        image: data.profile_image,
        phone: data.phone,
        upiId: data.upi_id,
        defaultCurrency: data.default_currency,
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to update profile');
  }
}
