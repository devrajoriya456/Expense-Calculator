import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseConfigError, supabaseAdmin } from '@/lib/supabase'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validatePassword = (password: string) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.'
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 500 })
    }

    const body = await request.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const confirmPassword = String(body.confirmPassword || '')

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (name.length < 2) {
      return NextResponse.json({ error: 'Full name must be at least 2 characters.' }, { status: 400 })
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 })
    }
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const { data: user, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        auth_provider: 'email',
      })
      .select('id,email,name,created_at')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create account.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
