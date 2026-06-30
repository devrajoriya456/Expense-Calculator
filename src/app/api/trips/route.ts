import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { mapTrip } from "@/lib/mappers";
import { ApiError, getCurrentUser } from "@/lib/tripAuth";
import { logActivity } from "@/lib/tripEvents";

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { data: createdTrips, error: createdError } = await supabaseAdmin
      .from("trips")
      .select("*")
      .eq("created_by", user.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (createdError) {
      return NextResponse.json({ error: createdError.message }, { status: 500 });
    }

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("trip_members")
      .select("trip_id")
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    const memberTripIds = [...new Set((memberships || []).map((item) => item.trip_id))];
    let joinedTrips: any[] = [];

    if (memberTripIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("trips")
        .select("*")
        .in("id", memberTripIds)
        .eq("is_deleted", false);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      joinedTrips = data || [];
    }

    const tripsById = new Map<string, any>();
    [...(createdTrips || []), ...joinedTrips].forEach((trip) => {
      tripsById.set(trip.id, trip);
    });

    return NextResponse.json({
      success: true,
      data: [...tripsById.values()]
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map(mapTrip),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch trips";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();
    const { name, destination, startDate, endDate } = body;
    const totalBudget = body.totalBudget ? Number(body.totalBudget) : null;
    const dailySpendingLimit = body.dailySpendingLimit ? Number(body.dailySpendingLimit) : null;
    const approvalRequired = Boolean(body.approvalRequired);
    const currency = String(body.currency || '₹');
    const categoryBudgets = {
      ...(body.foodBudget ? { Food: Number(body.foodBudget) } : {}),
      ...(body.hotelBudget ? { Hotel: Number(body.hotelBudget) } : {}),
      ...(body.fuelBudget ? { Fuel: Number(body.fuelBudget) } : {}),
      ...(body.shoppingBudget ? { Shopping: Number(body.shoppingBudget) } : {}),
      ...(body.activitiesBudget ? { Activities: Number(body.activitiesBudget) } : {}),
      ...(body.categoryBudgets || {}),
    };

    if (!name || !destination || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data: trip, error } = await supabaseAdmin
      .from("trips")
      .insert({
        name,
        destination,
        description: "",
        start_date: startDate,
        end_date: endDate,
        status: "active",
        total_budget: totalBudget && totalBudget > 0 ? totalBudget : null,
        daily_spending_limit: dailySpendingLimit && dailySpendingLimit > 0 ? dailySpendingLimit : null,
        category_budgets: categoryBudgets,
        approval_required: approvalRequired,
        currency,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { error: memberError } = await supabaseAdmin
      .from("trip_members")
      .insert({
        trip_id: trip.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      await supabaseAdmin
        .from("trips")
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
        .eq("id", trip.id);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    await logActivity(trip.id, user.id, "trip_created", { tripName: name });

    return NextResponse.json(
      { success: true, data: mapTrip(trip) },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create trip";
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
