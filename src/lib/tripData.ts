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
  // Membership validity is tracked by is_deleted. Rejection happens at the
  // invitation level — a rejected invitation never creates a trip_members row —
  // so there is no approval_status column on trip_members to filter on.
  const { data, error } = await supabaseAdmin
    .from("trip_members")
    .select(tripMemberSelect)
    .eq("trip_id", tripId)
    .eq("is_deleted", false)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapMember);
}

export async function calculateTripSettlement(tripId: string) {
  // Only approved, non-deleted expenses count toward settlement. Pending or
  // rejected expenses must not affect anyone's balance.
  const { data: expenses, error: expensesError } = await supabaseAdmin
    .from("expenses")
    .select("*, expense_participants(user_id, share)")
    .eq("trip_id", tripId)
    .eq("is_deleted", false)
    .eq("approval_status", "approved");

  if (expensesError) throw expensesError;

  // Reuse getTripMembers so member filtering (is_deleted + rejected) stays
  // consistent with the rest of the app and can't drift.
  const members = await getTripMembers(tripId);

  const settlement = SettlementCalculator.calculateSettlement(
    (expenses || []).map(mapExpense),
    members,
  );

  // Recorded settlement payments (someone already transferred the money).
  const { data: payments } = await supabaseAdmin
    .from("settlement_payments")
    .select("payer_id,receiver_id,amount,status")
    .eq("trip_id", tripId);

  // Attach payment status to each planned transfer and collect the ones that
  // are actually settled (paid/confirmed).
  const settledTransfers: Array<{ from: string; to: string; amount: number }> = [];

  settlement.settlements = settlement.settlements.map((transfer) => {
    const payment = (payments || []).find(
      (row) =>
        row.payer_id === transfer.from &&
        row.receiver_id === transfer.to &&
        Math.abs(Number(row.amount) - transfer.amount) < 0.01,
    );
    const status = payment?.status ?? "unpaid";

    if (status === "paid" || status === "confirmed") {
      settledTransfers.push({ from: transfer.from, to: transfer.to, amount: transfer.amount });
    }

    return { ...transfer, status: status as "unpaid" | "pending" | "paid" | "confirmed" };
  });

  // Net balances reflect money actually paid: a settled transfer moves both the
  // payer's debt and the receiver's credit toward zero.
  settlement.balances = SettlementCalculator.applySettledPayments(
    settlement.balances,
    settledTransfers,
  );

  return settlement;
}
