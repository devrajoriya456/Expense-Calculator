import { supabaseAdmin } from '@/lib/supabase'

export async function logActivity(
  tripId: string,
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  await supabaseAdmin.from('activity_logs').insert({
    trip_id: tripId,
    user_id: userId,
    action,
    metadata,
  })
}

export async function notifyUser(
  userId: string,
  tripId: string | null,
  type: string,
  title: string,
  message: string,
) {
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    trip_id: tripId,
    type,
    title,
    message,
  })
}

export async function notifyTripMembers(
  tripId: string,
  type: string,
  title: string,
  message: string,
) {
  const { data: members } = await supabaseAdmin
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('is_deleted', false)

  if (!members?.length) return

  await supabaseAdmin.from('notifications').insert(
    members.map((member) => ({
      user_id: member.user_id,
      trip_id: tripId,
      type,
      title,
      message,
    })),
  )
}
