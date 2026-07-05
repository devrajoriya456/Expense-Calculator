import { NextRequest, NextResponse } from 'next/server'
import { emailRegex, getCurrentUser, handleApiError, normalizeEmail } from '@/lib/tripAuth'
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
      console.error('[api] contacts:list', error)
      return NextResponse.json({ error: 'Failed to load contacts.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: (data || []).map(mapContact) })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch contacts')
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
      console.error('[api] contacts:lookup', lookupError)
      return NextResponse.json({ error: 'Failed to save contact.' }, { status: 500 })
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
      console.error('[api] contacts:save', error)
      return NextResponse.json({ error: 'Failed to save contact.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: mapContact(data) }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to save contact')
  }
}
