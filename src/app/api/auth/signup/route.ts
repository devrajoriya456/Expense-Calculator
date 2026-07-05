import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseConfigError, supabaseAdmin } from '@/lib/supabase'
import { handleApiError } from '@/lib/tripAuth'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

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
    // Throttle signups per IP to limit automated account creation.
    // Generous enough for shared IPs (offices / CGNAT), strict enough to
    // blunt bulk bot signups. Tune down + move to a shared store for scale.
    if (!rateLimit(`signup:${getClientIp(request)}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many sign-up attempts. Please try again later.' },
        { status: 429 },
      )
    }

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
      console.error('[api] signup:lookup', lookupError)
      return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 })
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
      console.error('[api] signup:insert', insertError)
      return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 })
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
    return handleApiError(error, 'Failed to create account.')
  }
}
