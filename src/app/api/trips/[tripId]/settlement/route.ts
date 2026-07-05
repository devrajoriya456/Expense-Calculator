import { NextRequest, NextResponse } from "next/server";
import { calculateTripSettlement } from "@/lib/tripData";
import { handleApiError, requireTripMember } from "@/lib/tripAuth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params;
    await requireTripMember(tripId);

    // Single source of truth: approved expenses + active members, with payment
    // status attached and balances adjusted for settled transfers.
    const settlement = await calculateTripSettlement(tripId);

    return NextResponse.json({ success: true, data: settlement });
  } catch (error) {
    return handleApiError(error, "Failed to calculate settlement");
  }
}
