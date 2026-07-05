"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Navbar from "@/components/Navbar";
import { Card, Button, Loading, EmptyState } from "@/components/UI";
import { Trip } from "@/types";
import { formatCurrency, formatDate } from "@/utils/helpers";

export default function TripsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTrips();
    }
  }, [status]);

  async function fetchTrips() {
    try {
      setLoading(true);

      const res = await fetch("/api/trips");
      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        return;
      }

      setTrips(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar userEmail={session?.user?.email ?? undefined} />
        <Loading />
      </>
    );
  }

  return (
    <>
      <Navbar userEmail={session?.user?.email ?? undefined} />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white">
              My Trips
            </h1>

            <p className="mt-3 text-xl text-slate-500 dark:text-slate-400">
              View and manage all your trips.
            </p>
          </div>

          <Button onClick={() => router.push("/dashboard")}>
            + Create Trip
          </Button>
        </div>

        {trips.length === 0 ? (
          <EmptyState
            title="No Trips Found"
            description="Create your first trip from the dashboard."
          />
        ) : (
          <div className="max-w-4xl mx-auto mt-10 space-y-8">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                hover
                className="rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white">
                      {trip.name}
                    </h2>

                    <p className="mt-4 text-2xl text-slate-500 dark:text-slate-400">
                      {trip.destination || "No destination"}
                    </p>
                  </div>

                  <span
                    className={`px-5 py-2 rounded-xl text-base font-semibold capitalize ${
                      trip.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : trip.status === "ended"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                          : trip.status === "archived"
                            ? "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    }`}
                  >
                    {trip.status}
                  </span>
                </div>

                <div className="mt-8 space-y-3">
                  <p className="text-2xl text-slate-600 dark:text-slate-300">
                    {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                  </p>

                  <p className="text-2xl text-slate-600 dark:text-slate-300">
                    Created {formatDate(trip.createdAt)}
                  </p>

                  {trip.totalBudget && (
                    <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                      Budget{" "}
                      {formatCurrency(trip.totalBudget, trip.currency || "₹")}
                    </p>
                  )}
                </div>

                <Button
                  fullWidth
                  size="lg"
                  className="mt-10 rounded-xl py-4 text-2xl"
                  onClick={() => router.push(`/trips/${trip.id}`)}
                >
                  View Trip
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
