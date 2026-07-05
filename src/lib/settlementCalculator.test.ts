import { describe, it, expect, vi } from 'vitest'
import SettlementCalculator from '@/lib/settlementCalculator'
import { ExpenseCategory, type Expense, type Member } from '@/types'

// ---- factories -------------------------------------------------------------

const member = (id: string, name = id, extra: Partial<Member> = {}): Member => ({
  id,
  tripId: 'trip-1',
  role: 'member',
  name,
  joinedAt: '2024-01-01T00:00:00Z',
  ...extra,
})

let expenseSeq = 0
const expense = (paidBy: string, amount: number, extra: Partial<Expense> = {}): Expense => ({
  id: `exp-${++expenseSeq}`,
  tripId: 'trip-1',
  paidBy,
  category: ExpenseCategory.FOOD,
  amount,
  title: 'Test',
  expenseDate: '2024-01-02',
  isLateEntry: false,
  splitType: 'equal',
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  ...extra,
})

const sumBalances = (balances: { amount: number }[]) =>
  balances.reduce((s, b) => s + b.amount, 0)

// ---- tests -----------------------------------------------------------------

describe('calculateBalances (equal split)', () => {
  it('splits one expense evenly between two members', () => {
    const members = [member('a'), member('b')]
    const balances = SettlementCalculator.calculateBalances([expense('a', 100)], members)
    const a = balances.find((b) => b.memberId === 'a')!
    const b = balances.find((b) => b.memberId === 'b')!
    expect(a.amount).toBe(50)
    expect(b.amount).toBe(-50)
    expect(sumBalances(balances)).toBeCloseTo(0, 5)
  })

  it('distributes uneven cents so balances still sum to zero', () => {
    const members = [member('a'), member('b'), member('c')]
    // 10.00 / 3 = 3.34 + 3.33 + 3.33
    const balances = SettlementCalculator.calculateBalances([expense('a', 10)], members)
    expect(sumBalances(balances)).toBeCloseTo(0, 5)
    const a = balances.find((b) => b.memberId === 'a')!
    // a paid 10, owes ~3.34 -> ~6.66
    expect(a.amount).toBeCloseTo(6.66, 2)
  })

  it('reconciles across multiple payers', () => {
    const members = [member('a'), member('b'), member('c')]
    const expenses = [expense('a', 90), expense('b', 30), expense('c', 60)]
    const balances = SettlementCalculator.calculateBalances(expenses, members)
    expect(sumBalances(balances)).toBeCloseTo(0, 5)
  })
})

describe('calculateBalances (participant splits)', () => {
  it('uses participant shares when provided (exact split)', () => {
    const members = [member('a'), member('b'), member('c')]
    const e = expense('a', 100, {
      splitType: 'exact',
      participants: [
        { userId: 'a', share: 20 },
        { userId: 'b', share: 30 },
        { userId: 'c', share: 50 },
      ],
    })
    const balances = SettlementCalculator.calculateBalances([e], members)
    expect(balances.find((b) => b.memberId === 'a')!.amount).toBe(80) // paid 100, owes 20
    expect(balances.find((b) => b.memberId === 'b')!.amount).toBe(-30)
    expect(balances.find((b) => b.memberId === 'c')!.amount).toBe(-50)
    expect(sumBalances(balances)).toBeCloseTo(0, 5)
  })

  it('includes a payer who is no longer an active member so balances reconcile', () => {
    // 'ghost' paid but is not in the members list (removed after paying)
    const members = [member('a'), member('b')]
    const e = expense('ghost', 100, {
      splitType: 'exact',
      participants: [
        { userId: 'a', share: 50 },
        { userId: 'b', share: 50 },
      ],
    })
    const balances = SettlementCalculator.calculateBalances([e], members)
    expect(sumBalances(balances)).toBeCloseTo(0, 5)
    const ghost = balances.find((b) => b.memberId === 'ghost')!
    expect(ghost.amount).toBe(100) // paid 100, owed nothing
  })
})

describe('generateSettlements', () => {
  it('produces no transactions when everyone is settled', () => {
    const settlements = SettlementCalculator.generateSettlements([
      { memberId: 'a', memberName: 'a', amount: 0 },
      { memberId: 'b', memberName: 'b', amount: 0 },
    ])
    expect(settlements).toHaveLength(0)
  })

  it('matches one debtor to one creditor', () => {
    const settlements = SettlementCalculator.generateSettlements([
      { memberId: 'a', memberName: 'a', amount: 50 },
      { memberId: 'b', memberName: 'b', amount: -50 },
    ])
    expect(settlements).toEqual([
      expect.objectContaining({ from: 'b', to: 'a', amount: 50 }),
    ])
  })

  it('fully resolves a multi-party settlement', () => {
    const members = [member('a'), member('b'), member('c'), member('d')]
    const expenses = [expense('a', 200), expense('b', 40)]
    const balances = SettlementCalculator.calculateBalances(expenses, members)
    const settlements = SettlementCalculator.generateSettlements(balances)

    // Apply settlements back onto balances; everyone should end at ~0
    const net: Record<string, number> = Object.fromEntries(
      balances.map((b) => [b.memberId, b.amount]),
    )
    for (const s of settlements) {
      net[s.from] += s.amount
      net[s.to] -= s.amount
    }
    for (const v of Object.values(net)) {
      expect(Math.abs(v)).toBeLessThanOrEqual(0.01)
    }
  })
})

describe('applySettledPayments (net balance reflects payments)', () => {
  it('drives both parties to zero once the transfer is paid', () => {
    // a is owed 50, b owes 50; b pays a 50 -> both settle to 0
    const balances = [
      { memberId: 'a', memberName: 'a', amount: 50 },
      { memberId: 'b', memberName: 'b', amount: -50 },
    ]
    const adjusted = SettlementCalculator.applySettledPayments(balances, [
      { from: 'b', to: 'a', amount: 50 },
    ])
    expect(adjusted.find((x) => x.memberId === 'a')!.amount).toBe(0)
    expect(adjusted.find((x) => x.memberId === 'b')!.amount).toBe(0)
  })

  it('leaves balances unchanged when nothing is paid', () => {
    const balances = [
      { memberId: 'a', memberName: 'a', amount: 50 },
      { memberId: 'b', memberName: 'b', amount: -50 },
    ]
    const adjusted = SettlementCalculator.applySettledPayments(balances, [])
    expect(adjusted).toEqual(balances)
  })

  it('applies a partial payment, leaving the remainder outstanding', () => {
    // b owes a 50, pays 30 -> a still to receive 20, b still owes 20
    const balances = [
      { memberId: 'a', memberName: 'a', amount: 50 },
      { memberId: 'b', memberName: 'b', amount: -50 },
    ]
    const adjusted = SettlementCalculator.applySettledPayments(balances, [
      { from: 'b', to: 'a', amount: 30 },
    ])
    expect(adjusted.find((x) => x.memberId === 'a')!.amount).toBe(20)
    expect(adjusted.find((x) => x.memberId === 'b')!.amount).toBe(-20)
  })

  it('settles a 3-person plan to all-zero when every transfer is paid', () => {
    const members = [member('a'), member('b'), member('c')]
    const balances = SettlementCalculator.calculateBalances([expense('a', 90)], members)
    const transfers = SettlementCalculator.generateSettlements(balances)
    const adjusted = SettlementCalculator.applySettledPayments(
      balances,
      transfers.map((t) => ({ from: t.from, to: t.to, amount: t.amount })),
    )
    for (const b of adjusted) expect(Math.abs(b.amount)).toBeLessThanOrEqual(0.01)
  })
})

describe('calculateSettlement (top level)', () => {
  it('returns zeros for empty input', () => {
    const result = SettlementCalculator.calculateSettlement([], [member('a')])
    expect(result.totalExpense).toBe(0)
    expect(result.settlements).toHaveLength(0)
  })

  it('computes totals and reconciles for a normal trip', () => {
    const members = [member('a'), member('b'), member('c')]
    const expenses = [expense('a', 120), expense('b', 30)]
    const result = SettlementCalculator.calculateSettlement(expenses, members)
    expect(result.totalExpense).toBe(150)
    expect(result.totalMembers).toBe(3)
    expect(sumBalances(result.balances)).toBeCloseTo(0, 5)
  })

  it('handles a single-member trip with no transfers', () => {
    const result = SettlementCalculator.calculateSettlement([expense('a', 50)], [member('a')])
    expect(result.settlements).toHaveLength(0)
    expect(result.balances[0].amount).toBeCloseTo(0, 5)
  })

  it('flags balanced:false (and logs) when participant shares do not reconcile', () => {
    const members = [member('a'), member('b')]
    // shares sum to 40 but amount is 100 -> unbalanced -> must be flagged, not thrown
    const bad = expense('a', 100, {
      splitType: 'exact',
      participants: [
        { userId: 'a', share: 20 },
        { userId: 'b', share: 20 },
      ],
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = SettlementCalculator.calculateSettlement([bad], members)
    expect(result.balanced).toBe(false)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('reports balanced:true for a normal reconciled trip', () => {
    const members = [member('a'), member('b')]
    const result = SettlementCalculator.calculateSettlement([expense('a', 100)], members)
    expect(result.balanced).toBe(true)
  })
})
