import { supabaseAdmin } from '@/lib/supabase'
import { logActivity, notifyUser } from '@/lib/tripEvents'
import { ApiError, emailRegex, normalizeEmail } from '@/lib/tripAuth'

export async function createTripInvitation(tripId: string, inviterId: string, rawEmail: string) {
  const email = normalizeEmail(rawEmail)

  if (!emailRegex.test(email)) {
    throw new ApiError('Enter a valid email address.', 400)
  }

  const { data: selfMember, error: selfError } = await supabaseAdmin
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', inviterId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (selfError) {
    throw new ApiError(selfError.message, 500)
  }
  if (!selfMember) {
    throw new ApiError('Forbidden', 403)
  }

  const { data: invitedUser, error: userLookupError } = await supabaseAdmin
    .from('users')
    .select('id,email')
    .eq('email', email)
    .maybeSingle()

  if (userLookupError) {
    throw new ApiError(userLookupError.message, 500)
  }

  if (invitedUser) {
    const { data: existingMember, error: memberError } = await supabaseAdmin
      .from('trip_members')
      .select('id,is_deleted')
      .eq('trip_id', tripId)
      .eq('user_id', invitedUser.id)
      .maybeSingle()

    if (memberError) {
      throw new ApiError(memberError.message, 500)
    }
    if (existingMember && !existingMember.is_deleted) {
      throw new ApiError('This user is already a member of this trip.', 409)
    }
  }

  const { data: existingInvite, error: inviteLookupError } = await supabaseAdmin
    .from('invitations')
    .select('id')
    .eq('trip_id', tripId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (inviteLookupError) {
    throw new ApiError(inviteLookupError.message, 500)
  }
  if (existingInvite) {
    throw new ApiError('A pending invitation already exists for this email.', 409)
  }

  const { data: invitation, error } = await supabaseAdmin
    .from('invitations')
    .insert({
      trip_id: tripId,
      invited_by: inviterId,
      email,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new ApiError(error.message, 500)
  }

  await logActivity(tripId, inviterId, 'invitation_sent', { email })

  if (invitedUser) {
    const { data: trip } = await supabaseAdmin
      .from('trips')
      .select('name')
      .eq('id', tripId)
      .maybeSingle()

    await notifyUser(
      invitedUser.id,
      tripId,
      'invitation_received',
      'Trip invitation',
      `You were invited to join ${trip?.name || 'a trip'}.`,
    )
  }

  return invitation
}
