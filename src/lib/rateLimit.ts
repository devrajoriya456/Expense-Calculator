import { NextRequest } from 'next/server'

/**
 * Minimal fixed-window in-memory rate limiter.
 *
 * NOTE: this is per-process. On a single long-running server it works well.
 * On serverless/multi-instance hosting (e.g. Vercel) each instance keeps its
 * own counters, so for hard guarantees move this to a shared store such as
 * Upstash Redis. It still meaningfully blunts brute-force from a single client.
 */
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Returns true if the request is allowed, false if the limit is exceeded.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (existing.count >= limit) {
    return false
  }

  existing.count += 1
  return true
}
