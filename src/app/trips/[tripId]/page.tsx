"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  Card,
  Button,
  Loading,
  EmptyState,
  Input,
  Select,
  Badge,
} from "@/components/UI";
import { formatCurrency, formatDate } from "@/utils/helpers";
import {
  ActivityLog,
  Contact,
  Invitation,
  Trip,
  Member,
  Expense,
  ExpenseCategory,
  SettlementSummary,
} from "@/types";
import Link from "next/link";

interface TripDetailPageProps {
  params: Promise<{ tripId: string }>;
}

export default function TripDetailPage({ params }: TripDetailPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tripId, setTripId] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlement, setSettlement] = useState<SettlementSummary | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "members" | "expenses"
  >("overview");
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showForgotExpenseModal, setShowForgotExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLinkMessage, setInviteLinkMessage] = useState("");
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [totalExpense, setTotalExpense] = useState(0);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("");
  const [expensePaidByFilter, setExpensePaidByFilter] = useState("");
  const [expenseSort, setExpenseSort] = useState("newest");
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );

  const [memberForm, setMemberForm] = useState({
    email: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    paidBy: "",
    category: "",
    amount: "",
    title: "",
    expenseDate: "",
    notes: "",
    receiptUrl: "",
    splitType: "equal",
    participants: {} as Record<
      string,
      { selected: boolean; share: string; percentage: string }
    >,
  });

  useEffect(() => {
    // Resolve params promise
    params.then((resolvedParams) => {
      setTripId(resolvedParams.tripId);
    });
  }, [params]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchTripData = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      // Fetch trip details
      const tripRes = await fetch("/api/trips");
      const tripData = await tripRes.json();

      if (!tripRes.ok) {
        console.error("Failed to fetch trips:", tripData);
        return;
      }

      const trips = tripData.data || [];

      const currentTrip = trips.find((t: Trip) => t.id === tripId);

      if (!currentTrip) {
        console.error("Trip not found");
        return;
      }
      setTrip(currentTrip);

      // Fetch members
      const membersRes = await fetch(`/api/trips/${tripId}/members`);
      const membersData = await membersRes.json();
      setMembers(membersData.data || []);

      const contactsRes = await fetch("/api/contacts");
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData.data || []);
      }

      // Fetch expenses
      const expensesRes = await fetch(`/api/trips/${tripId}/expenses`);
      const expensesData = await expensesRes.json();
      setExpenses(expensesData.data || []);

      const invitationsRes = await fetch(`/api/trips/${tripId}/invitations`);
      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        setInvitations(invitationsData.data || []);
      } else {
        setInvitations([]);
      }

      const total = (expensesData.data || []).reduce(
        (sum: number, e: Expense) => sum + e.amount,
        0,
      );
      setTotalExpense(total);

      const settlementRes = await fetch(`/api/trips/${tripId}/settlement`);
      if (settlementRes.ok) {
        const settlementData = await settlementRes.json();
        setSettlement(settlementData.data || null);
      } else {
        setSettlement(null);
      }

      const activityRes = await fetch(`/api/trips/${tripId}/activity`);
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData.data || []);
      } else {
        setActivity([]);
      }

      const inviteLinkRes = await fetch(`/api/trips/${tripId}/invite-link`);
      if (inviteLinkRes.ok) {
        const inviteLinkData = await inviteLinkRes.json();
        setInviteLink(inviteLinkData.data?.url || "");
      }
    } catch (error) {
      console.error("Failed to fetch trip data:", error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (status === "authenticated" && tripId) {
      fetchTripData();
    }
  }, [status, tripId, fetchTripData]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.email) {
      setToast("Please enter member email.");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberForm),
      });
      const data = await response.json();
      if (data.success) {
        const contactName = memberForm.email.split("@")[0] || memberForm.email;
        await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: contactName, email: memberForm.email }),
        });
        setMemberForm({ email: "" });
        setShowMemberModal(false);
        setToast(
          data.message ||
            "Invitation sent. Member will appear after accepting.",
        );
        const invitationsRes = await fetch(`/api/trips/${tripId}/invitations`);
        if (invitationsRes.ok) {
          const invitationsData = await invitationsRes.json();
          setInvitations(invitationsData.data || []);
        }
      } else {
        setToast(data.error || "Failed to send invitation.");
      }
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !expenseForm.paidBy ||
      !expenseForm.category ||
      !expenseForm.amount ||
      !expenseForm.title ||
      !expenseForm.expenseDate
    ) {
      setToast("Please fill all required fields.");
      return;
    }

    try {
      const splitParticipants = Object.entries(expenseForm.participants)
        .filter(([, value]) => value.selected)
        .map(([userId, value]) => ({
          userId,
          share: Number(value.share || 0),
          percentage: Number(value.percentage || 0),
        }));

      const response = await fetch(`/api/trips/${tripId}/expenses`, {
        method: editingExpense ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseForm,
          expenseId: editingExpense?.id,
          participants: splitParticipants,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setExpenseForm({
          paidBy: "",
          category: "",
          amount: "",
          title: "",
          expenseDate: "",
          notes: "",
          receiptUrl: "",
          splitType: "equal",
          participants: {},
        });
        setEditingExpense(null);
        setShowExpenseModal(false);
        fetchTripData();
      } else {
        setToast(
          data.error || `Failed to ${editingExpense ? "edit" : "add"} expense.`,
        );
      }
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  const handleForgotExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !expenseForm.paidBy ||
      !expenseForm.category ||
      !expenseForm.amount ||
      !expenseForm.title ||
      !expenseForm.expenseDate
    ) {
      setToast("Please fill all required fields.");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/forgot-expense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm),
      });
      const data = await response.json();
      if (!response.ok) {
        setToast(data.error || "Failed to add late expense.");
        return;
      }
      setExpenseForm({
        paidBy: "",
        category: "",
        amount: "",
        title: "",
        expenseDate: "",
        notes: "",
        receiptUrl: "",
        splitType: "equal",
        participants: {},
      });
      setShowForgotExpenseModal(false);
      setToast(
        data.message || "Late expense added and settlement recalculated.",
      );
      fetchTripData();
    } catch (error) {
      console.error("Failed to add forgotten expense:", error);
    }
  };

  const runTripAction = async (action: "end" | "resume" | "archive") => {
    if (!tripId) return;
    try {
      const response = await fetch(`/api/trips/${tripId}/${action}`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setToast(data.error || `Failed to ${action} trip.`);
        return;
      }
      setToast(
        `Trip ${action === "end" ? "ended" : action === "resume" ? "resumed" : "archived"}.`,
      );
      fetchTripData();
    } catch (error) {
      console.error(`Failed to ${action} trip:`, error);
    }
  };

  const handleTripAction = async (
    action: "end" | "resume" | "archive",
    confirmation: string,
  ) => {
    setConfirmAction({
      message: confirmation,
      onConfirm: () => runTripAction(action),
    });
  };

  const handleDeleteMember = async (memberId: string) => {
    setConfirmAction({
      message:
        "Remove this member from the trip? Members with linked expenses cannot be removed.",
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/trips/${tripId}/members?memberId=${memberId}`,
            {
              method: "DELETE",
            },
          );
          const data = await response.json();
          if (response.ok) {
            setMembers(members.filter((m) => m.id !== memberId));
            setToast("Member removed.");
          } else {
            setToast(data.error || "Failed to remove member.");
          }
        } catch (error) {
          console.error("Failed to delete member:", error);
        }
      },
    });
  };

  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setExpenseForm({
      paidBy: "",
      category: "",
      amount: "",
      title: "",
      expenseDate: "",
      notes: "",
      receiptUrl: "",
      splitType: "equal",
      participants: {},
    });
    setShowExpenseModal(true);
  };

  const openEditExpenseModal = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      paidBy: expense.paidBy,
      category: expense.category,
      amount: String(expense.amount),
      title: expense.title,
      expenseDate: expense.expenseDate,
      notes: expense.notes || "",
      receiptUrl: expense.receiptUrl || "",
      splitType: expense.splitType || "equal",
      participants: Object.fromEntries(
        (expense.participants || []).map((participant) => [
          participant.userId,
          {
            selected: true,
            share: String(participant.share),
            percentage:
              expense.amount > 0
                ? String((participant.share / expense.amount) * 100)
                : "",
          },
        ]),
      ),
    });
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (expenseId: string, amount: number) => {
    setConfirmAction({
      message: "Delete this expense? This will update the settlement.",
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/trips/${tripId}/expenses?expenseId=${expenseId}`,
            {
              method: "DELETE",
            },
          );
          if (response.ok) {
            setExpenses(expenses.filter((e) => e.id !== expenseId));
            setTotalExpense(totalExpense - amount);
            setToast("Expense deleted.");
          }
        } catch (error) {
          console.error("Failed to delete expense:", error);
        }
      },
    });
  };

  const handleExpenseApproval = async (
    expenseId: string,
    approvalStatus: "approved" | "rejected",
  ) => {
    try {
      const response = await fetch(
        `/api/trips/${tripId}/expenses/${expenseId}/approval`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: approvalStatus }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setToast(data.error || "Failed to update approval.");
        return;
      }
      setToast(`Expense ${approvalStatus}.`);
      fetchTripData();
    } catch {
      setToast("Network error while updating approval.");
    }
  };

  const addExpenseComment = async (expenseId: string) => {
    const comment = (commentInputs[expenseId] || "").trim();
    if (!comment) {
      setToast("Enter a comment first.");
      return;
    }
    try {
      const response = await fetch(
        `/api/trips/${tripId}/expenses/${expenseId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setToast(data.error || "Failed to add comment.");
        return;
      }
      setCommentInputs({ ...commentInputs, [expenseId]: "" });
      setToast("Comment added.");
      fetchTripData();
    } catch {
      setToast("Network error while adding comment.");
    }
  };

  const generateInviteLink = async () => {
    try {
      setInviteLinkLoading(true);
      setInviteLinkMessage("");
      const response = await fetch(`/api/trips/${tripId}/invite-link`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setInviteLinkMessage(data.error || "Failed to create invite link.");
        return;
      }
      setInviteLink(data.data.url);
      setInviteLinkMessage("Invite link created.");
    } catch {
      setInviteLinkMessage("Network error while creating invite link.");
    } finally {
      setInviteLinkLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteLinkMessage("Invite link copied.");
  };

  if (status === "loading" || loading) {
    return <Loading message="Loading trip data..." />;
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar userEmail={session?.user?.email ?? undefined} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <EmptyState
            title="Trip not found"
            description="The trip you're looking for doesn't exist or has been deleted."
            action={{
              label: "Back to Dashboard",
              onClick: () => router.push("/dashboard"),
            }}
          />
        </div>
      </div>
    );
  }

  const currentMember = members.find(
    (member) => member.email === session?.user?.email,
  );
  const canManageMembers =
    currentMember?.role === "owner" || currentMember?.role === "admin";
  const canManageTrip = canManageMembers;
  const canArchiveTrip = currentMember?.role === "owner";
  const isEditableTrip = trip.status === "active" || trip.status === "reopened";
  const isEndedTrip = trip.status === "ended";
  const isArchivedTrip = trip.status === "archived";
  const canAddExpenses = isEditableTrip && currentMember?.role !== "viewer";
  const canManageExpenses = isEditableTrip && canManageMembers;
  const today = new Date().toISOString().slice(0, 10);
  const todaySpent = expenses
    .filter((expense) => expense.expenseDate === today)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = expenses.reduce<Record<string, number>>(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    },
    {},
  );
  const remainingBudget =
    trip.totalBudget != null ? trip.totalBudget - totalExpense : null;
  const filteredExpenses = expenses
    .filter((expense) =>
      expense.title.toLowerCase().includes(expenseSearch.toLowerCase()),
    )
    .filter(
      (expense) =>
        !expenseCategoryFilter || expense.category === expenseCategoryFilter,
    )
    .filter(
      (expense) =>
        !expensePaidByFilter || expense.paidBy === expensePaidByFilter,
    )
    .sort((a, b) => {
      if (expenseSort === "oldest")
        return a.expenseDate.localeCompare(b.expenseDate);
      if (expenseSort === "highest") return b.amount - a.amount;
      if (expenseSort === "lowest") return a.amount - b.amount;
      return b.expenseDate.localeCompare(a.expenseDate);
    });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar userEmail={session?.user?.email ?? undefined} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-500 hover:text-blue-600 mb-4 inline-block"
          >
            Back to Dashboard
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {trip.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                {trip.destination} • {formatDate(trip.startDate)} to{" "}
                {formatDate(trip.endDate)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    trip.status === "ended"
                      ? "warning"
                      : trip.status === "archived"
                        ? "danger"
                        : trip.status === "reopened"
                          ? "info"
                          : "success"
                  }
                >
                  {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                </Badge>
                {trip.endedAt && (
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Ended {formatDate(trip.endedAt)}
                  </span>
                )}
                {trip.reopenedAt && (
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Reopened {formatDate(trip.reopenedAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link href={`/trips/${trip.id}/settlement`}>
                <Button variant="secondary" size="md">
                  View Settlement
                </Button>
              </Link>
              {canManageTrip && isEditableTrip && (
                <Button
                  variant="danger"
                  onClick={() =>
                    handleTripAction(
                      "end",
                      "Ending this trip will lock normal expense entry and calculate final settlement.",
                    )
                  }
                >
                  End Trip
                </Button>
              )}
              {canManageTrip && isEndedTrip && (
                <Button
                  variant="primary"
                  onClick={() =>
                    handleTripAction(
                      "resume",
                      "Are you sure you want to resume this trip? Members will be able to add expenses again.",
                    )
                  }
                >
                  Resume Trip
                </Button>
              )}
              {isEndedTrip && (
                <Button
                  variant="secondary"
                  onClick={() => setShowForgotExpenseModal(true)}
                >
                  Add Late Expense
                </Button>
              )}
              {canArchiveTrip && isEndedTrip && (
                <Button
                  variant="danger"
                  onClick={() =>
                    handleTripAction(
                      "archive",
                      "Archive this trip? It will become read-only.",
                    )
                  }
                >
                  Archive
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Total Expense
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {formatCurrency(totalExpense, trip.currency)}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Members
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {members.length}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Expenses
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {expenses.length}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Per Person
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {formatCurrency(
                members.length > 0 ? totalExpense / members.length : 0,
                trip.currency,
              )}
            </p>
          </Card>
        </div>

        {(isEndedTrip || isArchivedTrip) && settlement && (
          <Card className="p-6 mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Final Settlement
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total {formatCurrency(settlement.totalExpense, trip.currency)}{" "}
                  across {settlement.totalMembers} members.
                </p>
              </div>
              <Link href={`/trips/${trip.id}/settlement`}>
                <Button variant="primary">View Full Report</Button>
              </Link>
            </div>
            {settlement.settlements.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {settlement.settlements.map((item, index) => (
                  <div
                    key={index}
                    className="rounded border border-amber-200 bg-white p-3 text-sm dark:border-amber-800 dark:bg-slate-800"
                  >
                    <span className="font-medium">{item.fromName}</span> pays{" "}
                    <span className="font-medium">{item.toName}</span>{" "}
                    <span className="font-semibold">
                      {formatCurrency(item.amount, trip.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Everyone is settled. No transfers are needed.
              </p>
            )}
          </Card>
        )}

        {isEndedTrip && (
          <Card className="p-4 mb-8 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
            This trip has ended. Normal expenses are locked. You can only add
            forgotten expenses.
          </Card>
        )}

        {(trip.totalBudget ||
          trip.dailySpendingLimit ||
          Object.keys(trip.categoryBudgets || {}).length > 0) && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Budget
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trip.totalBudget && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Trip budget
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(trip.totalBudget, trip.currency)}
                  </p>
                  <p
                    className={
                      remainingBudget != null && remainingBudget < 0
                        ? "text-sm text-red-600"
                        : "text-sm text-green-600"
                    }
                  >
                    {remainingBudget != null && remainingBudget < 0
                      ? `Crossed by ${formatCurrency(Math.abs(remainingBudget), trip.currency)}`
                      : `Remaining ${formatCurrency(remainingBudget || 0, trip.currency)}`}
                  </p>
                </div>
              )}
              {trip.dailySpendingLimit && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Today spending
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(todaySpent, trip.currency)}
                  </p>
                  <p
                    className={
                      todaySpent > trip.dailySpendingLimit
                        ? "text-sm text-red-600"
                        : "text-sm text-green-600"
                    }
                  >
                    Daily limit{" "}
                    {formatCurrency(trip.dailySpendingLimit, trip.currency)}
                  </p>
                </div>
              )}
              {Object.entries(trip.categoryBudgets || {}).map(
                ([category, budget]) => {
                  const spent = categoryTotals[category] || 0;
                  return (
                    <div key={category}>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {category} budget
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(spent, trip.currency)} /{" "}
                        {formatCurrency(budget, trip.currency)}
                      </p>
                      {spent > budget && (
                        <p className="text-sm text-red-600">
                          Crossed by{" "}
                          {formatCurrency(spent - budget, trip.currency)}
                        </p>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </Card>
        )}

        {activity.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Activity
            </h2>
            <div className="space-y-3">
              {activity.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm last:border-0 dark:border-slate-700"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {item.userName || "Someone"} -{" "}
                    {item.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-500">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "overview"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "members"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "expenses"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Expenses ({expenses.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {expenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                description="Add members and expenses to your trip to get started."
              />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                          Paid By
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {expenses.map((expense) => {
                        const member = members.find(
                          (m) => m.id === expense.paidBy,
                        );
                        return (
                          <tr
                            key={expense.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <td className="px-6 py-4 text-slate-900 dark:text-white">
                              {expense.title}
                              {expense.isLateEntry && (
                                <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                                  Late Entry
                                </span>
                              )}
                              {expense.receiptUrl && (
                                <a
                                  href={expense.receiptUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-2 text-xs text-blue-600 hover:text-blue-700"
                                >
                                  View Receipt
                                </a>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                              {expense.category}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                              {member?.name}
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                              {formatDate(expense.expenseDate)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-4">
            {canManageMembers && !isArchivedTrip && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowMemberModal(true)}
                  variant="primary"
                >
                  Invite Member by Email
                </Button>
                <Button
                  onClick={generateInviteLink}
                  loading={inviteLinkLoading}
                  variant="secondary"
                >
                  Generate Invite Link
                </Button>
                {inviteLink && (
                  <Button onClick={copyInviteLink} variant="secondary">
                    Copy Invite Link
                  </Button>
                )}
              </div>
            )}

            {canManageMembers && inviteLink && (
              <Card className="p-4">
                <p className="break-all text-sm text-slate-700 dark:text-slate-300">
                  {inviteLink}
                </p>
                {inviteLinkMessage && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {inviteLinkMessage}
                  </p>
                )}
              </Card>
            )}
            
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowMemberModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Send Invitation
                </button>
              </div>

              {members.length === 0 ? (
                <EmptyState
                  title="No members yet"
                  description="Invite members to your trip by email."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <Card key={member.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {member.name}
                        </h3>

                        {canManageMembers && !isArchivedTrip && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {member.email && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          {member.email}
                        </p>
                      )}

                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Role: {member.role}
                      </p>

                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Joined {formatDate(member.joinedAt)}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            

            {invitations.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Invitations
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold dark:text-white">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold dark:text-white">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold dark:text-white">  
                          Sent
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 dark:text-white">
                      {invitations.map((invitation) => (
                        <tr key={invitation.id}>
                          <td className="px-6 py-4">{invitation.email}</td>
                          <td className="px-6 py-4 capitalize">
                            {invitation.status}
                          </td>
                          <td className="px-6 py-4">
                            {formatDate(invitation.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === "expenses" && (
          <div className="space-y-4">
            {canAddExpenses && (
              <Button onClick={openAddExpenseModal} variant="primary">
                + Add Expense
              </Button>
            )}

            <Card className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
              <Input
                label="Search"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Expense title"
              />
              <Select
                label="Category"
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                options={Object.values(ExpenseCategory).map((category) => ({
                  value: category,
                  label: category,
                }))}
              />
              <Select
                label="Paid By"
                value={expensePaidByFilter}
                onChange={(e) => setExpensePaidByFilter(e.target.value)}
                options={members.map((member) => ({
                  value: member.id,
                  label: member.name,
                }))}
              />
              <Select
                label="Sort"
                value={expenseSort}
                onChange={(e) => setExpenseSort(e.target.value)}
                options={[
                  { value: "newest", label: "Newest" },
                  { value: "oldest", label: "Oldest" },
                  { value: "highest", label: "Highest amount" },
                  { value: "lowest", label: "Lowest amount" },
                ]}
              />
            </Card>

            {filteredExpenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                description="Add your first expense to track group spending."
                action={
                  canAddExpenses
                    ? {
                        label: "Add Expense",
                        onClick: openAddExpenseModal,
                      }
                    : undefined
                }
              />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-800 dark:text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Paid By
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 dark:text-white">
                      {filteredExpenses.map((expense) => {
                        const member = members.find(
                          (m) => m.id === expense.paidBy,
                        );
                        return (
                          <React.Fragment key={expense.id}>
                            <tr>
                              <td className="px-6 py-4 text-slate-900 dark:text-white">
                                {expense.title}
                                {expense.isLateEntry && (
                                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                                    Late Entry
                                  </span>
                                )}
                                {expense.approvalStatus === "pending" && (
                                  <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                                    Pending Approval
                                  </span>
                                )}
                                {expense.approvalStatus === "rejected" && (
                                  <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                                    Rejected
                                  </span>
                                )}
                                {expense.receiptUrl && (
                                  <a
                                    href={expense.receiptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-2 text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    View Receipt
                                  </a>
                                )}
                              </td>
                              <td className="px-6 py-4">{expense.category}</td>
                              <td className="px-6 py-4 font-medium">
                                {formatCurrency(expense.amount, trip.currency)}
                              </td>
                              <td className="px-6 py-4">{member?.name}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                {formatDate(expense.expenseDate)}
                              </td>
                              <td className="px-6 py-4">
                                {canManageExpenses && (
                                  <div className="flex flex-wrap gap-3">
                                    {expense.approvalStatus === "pending" && (
                                      <>
                                        <button
                                          onClick={() =>
                                            handleExpenseApproval(
                                              expense.id,
                                              "approved",
                                            )
                                          }
                                          className="text-green-600 hover:text-green-700"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleExpenseApproval(
                                              expense.id,
                                              "rejected",
                                            )
                                          }
                                          className="text-amber-600 hover:text-amber-700"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() =>
                                        openEditExpenseModal(expense)
                                      }
                                      className="text-blue-500 hover:text-blue-600"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteExpense(
                                          expense.id,
                                          expense.amount,
                                        )
                                      }
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={6} className="px-6 pb-4">
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <input
                                    value={commentInputs[expense.id] || ""}
                                    onChange={(e) =>
                                      setCommentInputs({
                                        ...commentInputs,
                                        [expense.id]: e.target.value,
                                      })
                                    }
                                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                    placeholder="Ask a question or raise a dispute"
                                  />
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      addExpenseComment(expense.id)
                                    }
                                  >
                                    Comment
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Invite Member by Email
              </h2>
              <form onSubmit={handleAddMember} className="space-y-4">
                {contacts.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Saved Contacts
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {contacts.slice(0, 8).map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() =>
                            setMemberForm({ email: contact.email })
                          }
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                        >
                          {contact.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Input
                  label="Email"
                  type="email"
                  value={memberForm.email}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, email: e.target.value })
                  }
                  placeholder="john@example.com"
                />
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowMemberModal(false)}
                    variant="secondary"
                    fullWidth
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" fullWidth>
                    Send Invitation
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-md my-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </h2>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <Select
                  label="Paid By"
                  value={expenseForm.paidBy}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, paidBy: e.target.value })
                  }
                  options={members.map((m) => ({ value: m.id, label: m.name }))}
                />
                <Select
                  label="Category"
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                  options={Object.values(ExpenseCategory).map((cat) => ({
                    value: cat,
                    label: cat,
                  }))}
                />
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
                <Input
                  label="Title"
                  value={expenseForm.title}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="Hotel booking"
                />
                <Input
                  label="Date"
                  type="date"
                  value={expenseForm.expenseDate}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      expenseDate: e.target.value,
                    })
                  }
                />
                <Input
                  label="Notes (Optional)"
                  value={expenseForm.notes}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, notes: e.target.value })
                  }
                  placeholder="Additional notes"
                />
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setShowExpenseModal(false);
                      setEditingExpense(null);
                    }}
                    variant="secondary"
                    fullWidth
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" fullWidth>
                    {editingExpense ? "Save Changes" : "Add Expense"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {showForgotExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-md my-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Add Late Expense
              </h2>
              <form onSubmit={handleForgotExpense} className="space-y-4">
                <Select
                  label="Paid By"
                  value={expenseForm.paidBy}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, paidBy: e.target.value })
                  }
                  options={members.map((m) => ({ value: m.id, label: m.name }))}
                />
                <Select
                  label="Category"
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                  options={Object.values(ExpenseCategory).map((cat) => ({
                    value: cat,
                    label: cat,
                  }))}
                />
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
                <Input
                  label="Title"
                  value={expenseForm.title}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, title: e.target.value })
                  }
                  placeholder="Hotel booking"
                />
                <Input
                  label="Date"
                  type="date"
                  value={expenseForm.expenseDate}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      expenseDate: e.target.value,
                    })
                  }
                />
                <Input
                  label="Notes (Optional)"
                  value={expenseForm.notes}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, notes: e.target.value })
                  }
                  placeholder="Additional notes"
                />
                <Input
                  label="Receipt URL (Optional)"
                  value={expenseForm.receiptUrl}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      receiptUrl: e.target.value,
                    })
                  }
                  placeholder="https://..."
                />
                <Select
                  label="Split Type"
                  value={expenseForm.splitType}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      splitType: e.target.value,
                    })
                  }
                  options={[
                    { value: "equal", label: "Equal split" },
                    { value: "selected", label: "Selected members only" },
                    { value: "percentage", label: "Percentage split" },
                    { value: "exact", label: "Exact amount split" },
                  ]}
                />
                {expenseForm.splitType !== "equal" && (
                  <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Participants
                    </p>
                    {members.map((member) => {
                      const participant = expenseForm.participants[
                        member.id
                      ] || {
                        selected: false,
                        share: "",
                        percentage: "",
                      };
                      return (
                        <div
                          key={member.id}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px] sm:items-center"
                        >
                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={participant.selected}
                              onChange={(e) =>
                                setExpenseForm({
                                  ...expenseForm,
                                  participants: {
                                    ...expenseForm.participants,
                                    [member.id]: {
                                      ...participant,
                                      selected: e.target.checked,
                                    },
                                  },
                                })
                              }
                            />
                            {member.name}
                          </label>
                          {(expenseForm.splitType === "percentage" ||
                            expenseForm.splitType === "exact") && (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                expenseForm.splitType === "percentage"
                                  ? participant.percentage
                                  : participant.share
                              }
                              onChange={(e) =>
                                setExpenseForm({
                                  ...expenseForm,
                                  participants: {
                                    ...expenseForm.participants,
                                    [member.id]: {
                                      ...participant,
                                      selected: true,
                                      [expenseForm.splitType === "percentage"
                                        ? "percentage"
                                        : "share"]: e.target.value,
                                    },
                                  },
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                              placeholder={
                                expenseForm.splitType === "percentage"
                                  ? "%"
                                  : "Amount"
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowForgotExpenseModal(false)}
                    variant="secondary"
                    fullWidth
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" fullWidth>
                    Add Late Expense
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Confirm Action
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {confirmAction.message}
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={async () => {
                  const action = confirmAction.onConfirm;
                  setConfirmAction(null);
                  await action();
                }}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span>{toast}</span>
            <button
              className="text-slate-300 hover:text-white"
              onClick={() => setToast("")}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
