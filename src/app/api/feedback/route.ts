import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, handleApiError } from '@/lib/tripAuth'
import { supabaseAdmin } from '@/lib/supabase'

const feedbackTypes = new Set(['bug', 'wrong_calculation', 'login_issue', 'payment_settlement', 'other'])

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const type = String(body.type || 'other')
    const message = String(body.message || '').trim()

    if (!feedbackTypes.has(type)) {
      return NextResponse.json({ error: 'Invalid feedback type.' }, { status: 400 })
    }
    if (message.length < 10) {
      return NextResponse.json({ error: 'Please describe the issue in at least 10 characters.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('feedback').insert({
      user_id: user.id,
      type,
      message,
    })

    if (error) {
      console.error('[api] src/app/api/feedback/route.ts', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to submit feedback');
  }
}
