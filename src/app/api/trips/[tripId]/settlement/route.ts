import { NextRequest, NextResponse } from "next/server";
import { mapExpense, mapMember } from "@/lib/mappers";
import SettlementCalculator from "@/lib/settlementCalculator";
import { supabaseAdmin } from "@/lib/supabase";
import { ApiError, requireTripMember } from "@/lib/tripAuth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params;
    await requireTripMember(tripId);

    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from("expenses")
      .select("*, expense_participants(user_id, share)")
      .eq("trip_id", tripId)
      .eq("is_deleted", false)
      .neq("approval_status", "rejected");

    console.log("expensesError:", expensesError);
console.log("expenses count:", expenses?.length);

    const { data: members, error: membersError } = await supabaseAdmin
      .from("trip_members")
      .select(`
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
`)
      
      .eq("trip_id", tripId)
      .eq("is_deleted", false);

   

console.log("membersError:", membersError);
console.log("members:", members);

    if (expensesError || membersError || !expenses || !members) {
      return NextResponse.json(
        { error: "Failed to fetch settlement data." },
        { status: 500 },
      );
    }
console.log("Before SettlementCalculator");
    const settlement = SettlementCalculator.calculateSettlement(
      expenses.map(mapExpense),
      members.map(mapMember),
    );

    console.log("After SettlementCalculator");

    console.log("Before payments query");

    // const { data: payments } = await supabaseAdmin
    //   .from("settlement_payments")
    //   .select("payer_id,receiver_id,amount,status")
    //   .eq("trip_id", tripId);

    const { data: payments, error: paymentsError } = await supabaseAdmin
  .from("settlement_payments")
  .select("payer_id,receiver_id,amount,status")
  .eq("trip_id", tripId);

console.log("paymentsError:", paymentsError);
console.log("payments:", payments);

    settlement.settlements = settlement.settlements.map((item) => {
      const payment = (payments || []).find(
        (row) =>
          row.payer_id === item.from &&
          row.receiver_id === item.to &&
          Math.abs(Number(row.amount) - item.amount) < 0.01,
      );
      return { ...item, status: payment?.status || "pending" };
    });

    return NextResponse.json({ success: true, data: settlement });
    // } catch (error) {
    //   const status = error instanceof ApiError ? error.status : 500
    //   const message = error instanceof Error ? error.message : 'Failed to calculate settlement'
    //   return NextResponse.json({ error: message }, { status })
    // }
  } catch (error) {
    console.error("================================");
    console.error("SETTLEMENT API ERROR");
    console.error(error);
    console.error("================================");

    const status = error instanceof ApiError ? error.status : 500;

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status },
    );
  }
}
