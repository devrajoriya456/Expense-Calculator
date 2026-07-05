import { NextResponse } from 'next/server'
import { getSupabaseConfigError, supabaseAdmin } from '@/lib/supabase'

// Lightweight health check for deploy platforms / uptime monitors.
// Verifies required env config and that the database is actually reachable.
// Returns 200 when healthy, 503 otherwise. Never leaks secrets or internals.
export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = {
    config: 'ok',
    database: 'ok',
  }

  // 1) Required environment/config present?
  const configError = getSupabaseConfigError()
  if (configError) {
    checks.config = 'fail'
    return NextResponse.json(
      { status: 'unhealthy', checks, error: configError },
      { status: 503 },
    )
  }

  // 2) Database reachable? (cheap count query, no data returned)
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('[health] database check failed', error)
      checks.database = 'fail'
      return NextResponse.json({ status: 'unhealthy', checks }, { status: 503 })
    }
  } catch (error) {
    console.error('[health] database check threw', error)
    checks.database = 'fail'
    return NextResponse.json({ status: 'unhealthy', checks }, { status: 503 })
  }

  return NextResponse.json({ status: 'healthy', checks })
}
