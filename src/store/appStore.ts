import { create } from 'zustand'
import { Trip, Member, Expense, SettlementSummary } from '@/types'

interface AppStore {
  // Trip state
  currentTrip: Trip | null
  setCurrentTrip: (trip: Trip | null) => void

  // Members state
  members: Member[]
  setMembers: (members: Member[]) => void
  addMember: (member: Member) => void
  removeMember: (memberId: string) => void
  updateMember: (member: Member) => void

  // Expenses state
  expenses: Expense[]
  setExpenses: (expenses: Expense[]) => void
  addExpense: (expense: Expense) => void
  removeExpense: (expenseId: string) => void
  updateExpense: (expense: Expense) => void

  // Settlement state
  settlement: SettlementSummary | null
  setSettlement: (settlement: SettlementSummary | null) => void

  // UI state
  loading: boolean
  setLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  darkMode: boolean
  setDarkMode: (darkMode: boolean) => void

  // Actions
  reset: () => void
}

const useAppStore = create<AppStore>((set) => ({
  // Trip state
  currentTrip: null,
  setCurrentTrip: (trip) => set({ currentTrip: trip }),

  // Members state
  members: [],
  setMembers: (members) => set({ members }),
  addMember: (member) =>
    set((state) => ({
      members: [...state.members, member],
    })),
  removeMember: (memberId) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== memberId),
    })),
  updateMember: (member) =>
    set((state) => ({
      members: state.members.map((m) => (m.id === member.id ? member : m)),
    })),

  // Expenses state
  expenses: [],
  setExpenses: (expenses) => set({ expenses }),
  addExpense: (expense) =>
    set((state) => ({
      expenses: [...state.expenses, expense],
    })),
  removeExpense: (expenseId) =>
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== expenseId),
    })),
  updateExpense: (expense) =>
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)),
    })),

  // Settlement state
  settlement: null,
  setSettlement: (settlement) => set({ settlement }),

  // UI state
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
  darkMode: false,
  setDarkMode: (darkMode) => set({ darkMode }),

  // Actions
  reset: () =>
    set({
      currentTrip: null,
      members: [],
      expenses: [],
      settlement: null,
      error: null,
    }),
}))

export default useAppStore
