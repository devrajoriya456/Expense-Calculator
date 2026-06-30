import { ActivityLog, Expense, Invitation, Member, Trip } from '@/types'

type TripRow = {
  id: string
  created_by: string
  name: string
  destination?: string | null
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  status: string
  ended_at?: string | null
  ended_by?: string | null
  reopened_at?: string | null
  reopened_by?: string | null
  archived_at?: string | null
  archived_by?: string | null
  total_budget?: number | string | null
  category_budgets?: Record<string, number> | null
  daily_spending_limit?: number | string | null
  approval_required?: boolean | null
  currency?: string | null
  created_at: string
  updated_at: string
}

type MemberRow = {
  id: string
  trip_id: string
  user_id: string
  role?: string | null
  joined_at: string
  users:
    | {
        id: string
        name: string
        email: string
        profile_image?: string | null
        upi_id?: string | null
      }
    | Array<{
        id: string
        name: string
        email: string
        profile_image?: string | null
        upi_id?: string | null
      }>
    | null
}

type ExpenseRow = {
  id: string
  trip_id: string
  paid_by: string
  category: Expense['category']
  amount: number | string
  title: string
  expense_date: string
  notes?: string | null
  is_late_entry?: boolean | null
  late_entry_added_by?: string | null
  late_entry_added_at?: string | null
  approval_status?: Expense['approvalStatus'] | null
  extracted_amount?: number | string | null
  extracted_date?: string | null
  extracted_vendor?: string | null
  extraction_status?: Expense['extractionStatus'] | null
  receipt_url?: string | null
  split_type?: Expense['splitType'] | null
  expense_participants?: Array<{ user_id: string; share: number | string }> | null
  created_at: string
  updated_at: string
}

type InvitationRow = {
  id: string
  trip_id: string
  invited_by: string
  email: string
  status: Invitation['status']
  created_at: string
  trips?:
    | { id: string; name: string }
    | Array<{ id: string; name: string }>
    | null
  users?:
    | { id: string; name: string; email: string }
    | Array<{ id: string; name: string; email: string }>
    | null
}

type ActivityLogRow = {
  id: string
  trip_id: string
  user_id: string
  action: ActivityLog['action']
  metadata?: Record<string, unknown> | null
  created_at: string
  users?:
    | { id: string; name: string; email: string }
    | Array<{ id: string; name: string; email: string }>
    | null
}

export const mapTrip = (row: TripRow): Trip => ({
  id: row.id,
  userId: row.created_by,
  name: row.name,
  destination: row.destination ?? '',
  description: row.description ?? '',
  startDate: row.start_date ?? '',
  endDate: row.end_date ?? '',
  status: (row.status ?? 'active') as Trip['status'],
  endedAt: row.ended_at ?? undefined,
  endedBy: row.ended_by ?? undefined,
  reopenedAt: row.reopened_at ?? undefined,
  reopenedBy: row.reopened_by ?? undefined,
  archivedAt: row.archived_at ?? undefined,
  archivedBy: row.archived_by ?? undefined,
  totalBudget: row.total_budget != null ? Number(row.total_budget) : undefined,
  categoryBudgets: row.category_budgets ?? undefined,
  dailySpendingLimit: row.daily_spending_limit != null ? Number(row.daily_spending_limit) : undefined,
  approvalRequired: Boolean(row.approval_required),
  currency: row.currency ?? '₹',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const mapMember = (row: MemberRow): Member => {
  const user = Array.isArray(row.users) ? row.users[0] : row.users

  return {
    id: row.user_id,
    tripId: row.trip_id,
    role: (row.role ?? 'member') as Member['role'],
    userId: row.user_id,
    name: user?.name ?? 'Unknown member',
    email: user?.email ?? undefined,
    image: user?.profile_image ?? undefined,
    upiId: user?.upi_id ?? undefined,
    joinedAt: row.joined_at,
  }
}

export const mapExpense = (row: ExpenseRow): Expense => ({
  id: row.id,
  tripId: row.trip_id,
  paidBy: row.paid_by,
  category: row.category,
  amount: Number(row.amount),
  title: row.title,
  expenseDate: row.expense_date,
  notes: row.notes ?? undefined,
  isLateEntry: Boolean(row.is_late_entry),
  lateEntryAddedBy: row.late_entry_added_by ?? undefined,
  lateEntryAddedAt: row.late_entry_added_at ?? undefined,
  approvalStatus: row.approval_status ?? undefined,
  extractedAmount: row.extracted_amount != null ? Number(row.extracted_amount) : undefined,
  extractedDate: row.extracted_date ?? undefined,
  extractedVendor: row.extracted_vendor ?? undefined,
  extractionStatus: row.extraction_status ?? undefined,
  receiptUrl: row.receipt_url ?? undefined,
  splitType: row.split_type ?? 'equal',
  participants: (row.expense_participants || []).map((participant) => ({
    userId: participant.user_id,
    share: Number(participant.share),
  })),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const mapInvitation = (row: InvitationRow): Invitation => {
  const trip = Array.isArray(row.trips) ? row.trips[0] : row.trips
  const inviter = Array.isArray(row.users) ? row.users[0] : row.users

  return {
    id: row.id,
    tripId: row.trip_id,
    tripName: trip?.name,
    invitedBy: row.invited_by,
    invitedByName: inviter?.name ?? inviter?.email,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
  }
}

export const mapActivityLog = (row: ActivityLogRow): ActivityLog => {
  const user = Array.isArray(row.users) ? row.users[0] : row.users

  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    userName: user?.name ?? user?.email,
    action: row.action,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  }
}
