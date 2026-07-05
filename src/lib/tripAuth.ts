import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSupabaseConfigError, supabaseAdmin } from '@/lib/supabase'

export type TripRole = 'owner' | 'admin' | 'member' | 'viewer'
export type TripStatus = 'active' | 'ended' | 'reopened' | 'archived'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * Convert any thrown value into a safe JSON error response.
 * - ApiError messages are developer-authored and safe to expose.
 * - Everything else (Supabase/Postgres/internal errors) is logged server-side
 *   and returned to the client as a generic message to avoid leaking schema,
 *   constraint, or stack details.
 */
export function handleApiError(error: unknown, fallbackMessage = 'Something went wrong.') {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error(`[api] ${fallbackMessage}`, error)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export async function getCurrentUser() {
  const configError = getSupabaseConfigError()
  if (configError) {
    throw new ApiError(configError, 500)
  }

  const session = await getSession()
  const email = session?.user?.email ? normalizeEmail(session.user.email) : ''
  if (!email) {
    throw new ApiError('Unauthorized', 401)
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id,email,name,profile_image,phone,upi_id,default_currency')
    .eq('email', email)
    .single()

  if (error || !user) {
    throw new ApiError('User not found', 404)
  }

  return user
}

export async function getTripRole(tripId: string, userId: string): Promise<TripRole | null> {
  const { data, error } = await supabaseAdmin
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    throw new ApiError(error.message, 500)
  }

  return (data?.role as TripRole | undefined) ?? null
}

export async function requireTripMember(tripId: string) {
  const user = await getCurrentUser()
  const role = await getTripRole(tripId, user.id)

  if (!role) {
    throw new ApiError('Trip not found or access denied', 404)
  }

  return { user, role }
}

export async function requireTripOwnerOrAdmin(tripId: string) {
  const context = await requireTripMember(tripId)

  if (context.role !== 'owner' && context.role !== 'admin') {
    throw new ApiError('Forbidden', 403)
  }

  return context
}

export async function getTrip(tripId: string) {
  const { data, error } = await supabaseAdmin
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    throw new ApiError(error.message, 500)
  }
  if (!data) {
    throw new ApiError('Trip not found', 404)
  }

  return data as {
    id: string
    status: TripStatus
    created_by: string
    name: string
    approval_required?: boolean
  }
}

export async function ensureTripExists(tripId: string) {
  await getTrip(tripId)
}

// Verify an expense actually belongs to the given trip (prevents cross-trip
// IDOR when an expenseId from another trip is passed to a trip-scoped route).
export async function requireExpenseInTrip(tripId: string, expenseId: string) {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('id')
    .eq('id', expenseId)
    .eq('trip_id', tripId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    throw new ApiError(error.message, 500)
  }
  if (!data) {
    throw new ApiError('Expense not found', 404)
  }

  return data.id as string
}

export async function requireTripNotArchived(tripId: string) {
  const context = await requireTripMember(tripId)
  const trip = await getTrip(tripId)

  if (trip.status === 'archived') {
    throw new ApiError('This trip is archived and cannot be changed.', 403)
  }

  return { ...context, trip }
}

export async function requireTripEditable(tripId: string) {
  const context = await requireTripNotArchived(tripId)

  if (context.trip.status !== 'active' && context.trip.status !== 'reopened') {
    throw new ApiError('This trip is ended. Use Add Late Expense for late expenses.', 403)
  }

  return context
}

export async function requireTripContributor(tripId: string) {
  const context = await requireTripEditable(tripId)

  if (context.role === 'viewer') {
    throw new ApiError('Forbidden', 403)
  }

  return context
}
