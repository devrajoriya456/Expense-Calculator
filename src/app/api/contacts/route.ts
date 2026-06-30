import { NextRequest, NextResponse } from 'next/server'
import { ApiError, emailRegex, getCurrentUser, normalizeEmail } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

const mapContact = (row: any) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || undefined,
  upiId: row.upi_id || undefined,
  createdAt: row.created_at,
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: (data || []).map(mapContact) })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to fetch contacts'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const email = normalizeEmail(String(body.email || ''))
    const name = String(body.name || '').trim()
    const phone = body.phone ? String(body.phone).trim() : null
    const upiId = body.upiId ? String(body.upiId).trim() : null

    if (!name || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Name and valid email are required.' }, { status: 400 })
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', email)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 })
    }

    const query = existing
      ? supabaseAdmin
          .from('contacts')
          .update({ name, phone, upi_id: upiId })
          .eq('id', existing.id)
          .select()
          .single()
      : supabaseAdmin
          .from('contacts')
          .insert({ user_id: user.id, name, email, phone, upi_id: upiId })
          .select()
          .single()

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: mapContact(data) }, { status: 201 })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Failed to save contact'
    return NextResponse.json({ error: message }, { status })
  }
}
