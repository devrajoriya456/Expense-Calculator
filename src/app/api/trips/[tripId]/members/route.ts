import { NextRequest, NextResponse } from "next/server";
import { createTripInvitation } from "@/lib/invitations";
import { logActivity } from "@/lib/tripEvents";
import { mapMember } from "@/lib/mappers";
import { supabaseAdmin } from "@/lib/supabase";
import {
  ApiError,
  requireTripMember,
  requireTripOwnerOrAdmin,
  requireTripNotArchived,
} from "@/lib/tripAuth";

const memberSelect = `
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
`

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params;
    await requireTripMember(tripId);

    const { data, error } = await supabaseAdmin
      .from('trip_members')
      .select(memberSelect)
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .order('joined_at', { ascending: true })

    // const { data, error } = await supabaseAdmin
    //   .from("trip_members")
    //   .select("*")
    //   .eq("trip_id", tripId)
    //   .eq("is_deleted", false)
    //   .order("joined_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: (data || []).map(mapMember),
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to fetch members";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params;
    const { user } = await requireTripOwnerOrAdmin(tripId);
    await requireTripNotArchived(tripId);
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const invitation = await createTripInvitation(tripId, user.id, email);
    return NextResponse.json(
      {
        success: true,
        data: invitation,
        message: "Invitation sent. Member will appear after accepting.",
      },
      { status: 201 },
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to send invitation";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params;
    const { user } = await requireTripOwnerOrAdmin(tripId);
    await requireTripNotArchived(tripId);

    const memberId = request.nextUrl.searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required." },
        { status: 400 },
      );
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from("trip_members")
      .select("id,role,user_id")
      .eq("trip_id", tripId)
      .eq("user_id", memberId)
      .eq("is_deleted", false)
      .maybeSingle();

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (member.role === "owner") {
      const { count, error: countError } = await supabaseAdmin
        .from("trip_members")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", tripId)
        .eq("role", "owner")
        .eq("is_deleted", false);

      if (countError) {
        return NextResponse.json(
          { error: countError.message },
          { status: 500 },
        );
      }
      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the only owner of this trip." },
          { status: 400 },
        );
      }
    }

    const { count: paidExpenseCount, error: paidExpenseError } =
      await supabaseAdmin
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", tripId)
        .eq("paid_by", memberId)
        .eq("is_deleted", false);

    if (paidExpenseError) {
      return NextResponse.json(
        { error: paidExpenseError.message },
        { status: 500 },
      );
    }
    if ((paidExpenseCount || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "This member has expenses linked to them. Transfer or delete their expenses before removing.",
        },
        { status: 409 },
      );
    }

    const { data: participantRows, error: participantError } =
      await supabaseAdmin
        .from("expense_participants")
        .select("expense_id, expenses!inner(trip_id)")
        .eq("user_id", memberId)
        .eq("expenses.trip_id", tripId)
        .eq("expenses.is_deleted", false)
        .limit(1);

    if (participantError) {
      return NextResponse.json(
        { error: participantError.message },
        { status: 500 },
      );
    }
    if ((participantRows || []).length > 0) {
      return NextResponse.json(
        {
          error:
            "This member has expenses linked to them. Transfer or delete their expenses before removing.",
        },
        { status: 409 },
      );
    }

    const { error } = await supabaseAdmin
      .from("trip_members")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", member.id)
      .eq("trip_id", tripId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity(tripId, user.id, "member_removed", { memberId });

    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to delete member";
    return NextResponse.json({ error: message }, { status });
  }
}
