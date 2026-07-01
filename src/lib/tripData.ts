import { mapExpense, mapMember } from "@/lib/mappers";
import SettlementCalculator from "@/lib/settlementCalculator";
import { supabaseAdmin } from "@/lib/supabase";

export const tripMemberSelect = `
  id,
  trip_id,
  user_id,
  role,
  joined_at,
  users!trip_members_user_id_fkey (
    id,
    name,
    email,
    profile_image,
    upi_id
  )
`;

export async function getTripMembers(tripId: string) {
  const { data, error } = await supabaseAdmin
    .from("trip_members")
    .select(tripMemberSelect)
    .eq("trip_id", tripId)
    .eq("is_deleted", false)
    .neq("approval_status", "rejected")
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapMember);
}

export async function calculateTripSettlement(tripId: string) {
  const { data: expenses, error: expensesError } = await supabaseAdmin
    .from("expenses")
    .select("*, expense_participants(user_id, share)")
    .eq("trip_id", tripId)
    .eq("is_deleted", false);

  const { data: members, error: membersError } = await supabaseAdmin
    .from("trip_members")
    .select(tripMemberSelect)
    .eq("trip_id", tripId)
    .eq("is_deleted", false);

  if (expensesError) throw expensesError;
  if (membersError) throw membersError;

  return SettlementCalculator.calculateSettlement(
    (expenses || []).map(mapExpense),
    (members || []).map(mapMember),
  );
}
