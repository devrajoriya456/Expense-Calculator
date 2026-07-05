// Trip Types
export interface Trip {
  id: string
  userId: string
  name: string
  destination: string
  description?: string
  startDate: string
  endDate: string
  status: 'active' | 'ended' | 'reopened' | 'archived'
  endedAt?: string
  endedBy?: string
  reopenedAt?: string
  reopenedBy?: string
  archivedAt?: string
  archivedBy?: string
  totalBudget?: number
  categoryBudgets?: Record<string, number>
  dailySpendingLimit?: number
  approvalRequired?: boolean
  currency?: string
  createdAt: string
  updatedAt: string
}

// Member Types
export interface Member {
  id: string
  tripId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  userId?: string
  name: string
  email?: string
  image?: string
  upiId?: string
  joinedAt: string
}

// Expense Types
export enum ExpenseCategory {
  HOTEL = 'Hotel',
  FOOD = 'Food',
  FUEL = 'Fuel',
  SHOPPING = 'Shopping',
  TICKETS = 'Tickets',
  ACTIVITIES = 'Activities',
  MISCELLANEOUS = 'Miscellaneous',
}

export interface Expense {
  id: string
  tripId: string
  paidBy: string
  category: ExpenseCategory
  amount: number
  title: string
  expenseDate: string
  notes?: string
  isLateEntry: boolean
  lateEntryAddedBy?: string
  lateEntryAddedAt?: string
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  extractedAmount?: number
  extractedDate?: string
  extractedVendor?: string
  extractionStatus?: 'not_started' | 'pending' | 'completed' | 'failed'
  receiptUrl?: string
  splitType?: 'equal' | 'selected' | 'percentage' | 'exact'
  participants?: ExpenseParticipant[]
  createdAt: string
  updatedAt: string
}

export interface ExpenseParticipant {
  userId: string
  share: number
}

export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  upiId?: string
  createdAt: string
}

export interface Invitation {
  id: string
  tripId: string
  tripName?: string
  invitedBy: string
  invitedByName?: string
  email: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: string
}

export interface ActivityLog {
  id: string
  tripId: string
  userId: string
  userName?: string
  action:
    | 'trip_created'
    | 'invitation_sent'
    | 'invitation_accepted'
    | 'invitation_rejected'
    | 'expense_added'
    | 'late_expense_added'
    | 'expense_edited'
    | 'expense_deleted'
    | 'expense_approved'
    | 'expense_rejected'
    | 'expense_commented'
    | 'settlement_marked_paid'
    | 'member_added'
    | 'member_removed'
    | 'invite_link_created'
    | 'trip_ended'
    | 'trip_resumed'
    | 'trip_archived'
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  tripId?: string
  type: string
  title: string
  message: string
  readAt?: string
  createdAt: string
}

export interface CurrencyTotals {
  currency: string
  owes: number
  receives: number
  net: number
}

export interface DashboardBalanceSummary {
  totalOwes: number
  totalReceives: number
  netBalance: number
  activeTripPendingBalance: number
  tripsOwing: string[]
  tripsReceiving: string[]
  byCurrency: CurrencyTotals[]
  mixedCurrencies: boolean
}

// Settlement Types
export interface Balance {
  memberId: string
  memberName: string
  amount: number // positive means they should receive, negative means they owe
}

export interface Settlement {
  from: string
  fromName: string
  to: string
  toName: string
  amount: number
  // unpaid = nothing recorded; pending = payer marked, awaiting receiver;
  // paid/confirmed = receiver accepted (balance settles).
  status?: 'unpaid' | 'pending' | 'paid' | 'confirmed'
}

export interface SettlementSummary {
  totalExpense: number
  totalMembers: number
  perPersonShare: number
  balanced?: boolean
  balances: Balance[]
  settlements: Settlement[]
  paymentDetails: Record<string, { name: string; upiId?: string }>
  summary: {
    paidByMember: Record<string, number>
    owedByMember: Record<string, number>
    receiveByMember: Record<string, number>
  }
}

// Expense Dashboard Data
export interface ExpenseDashboardData {
  totalExpense: number
  totalMembers: number
  totalExpenses: number
  expensesByCategory: Record<string, number>
  expensesByMember: Record<string, { paid: number; share: number }>
  recentExpenses: Expense[]
}

// User Types
export interface User {
  id: string
  email: string
  name: string
  image?: string
  phone?: string
  upiId?: string
  defaultCurrency?: string
  createdAt: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Report Types
export interface ReportData {
  trip: Trip
  members: Member[]
  expenses: Expense[]
  settlementSummary: SettlementSummary
  generatedAt: string
}
