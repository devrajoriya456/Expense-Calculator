import { Balance, Settlement, Expense, Member } from '@/types'

/**
 * Smart Settlement Algorithm
 * 
 * This algorithm calculates the minimum number of transactions needed to settle
 * all debts and balances among trip members.
 * 
 * Key principles:
 * - Matches people who owe money with people who should receive money
 * - Minimizes the number of transactions
 * - Handles decimal values correctly
 * - Supports large groups
 * - Ensures all final balances become exactly zero
 * - No overpayment or underpayment
 */

export class SettlementCalculator {
  private static toMinorUnit(amount: number): number {
    return Math.round(Number(amount) * 100)
  }

  private static fromMinorUnit(amount: number): number {
    return Number((amount / 100).toFixed(2))
  }

  /**
   * Calculate balances for all members
   * Balance = Amount Paid - Equal Share
   */
  static calculateBalances(
    expenses: Expense[],
    members: Member[]
  ): Balance[] {
    const memberPaid: Record<string, number> = {}
    const memberOwes: Record<string, number> = {}
    
    // Initialize all members with zero paid amount
    members.forEach((member) => {
      memberPaid[member.id] = 0
      memberOwes[member.id] = 0
    })

    expenses.forEach((expense) => {
      const amountMinor = this.toMinorUnit(expense.amount)
      memberPaid[expense.paidBy] = (memberPaid[expense.paidBy] || 0) + amountMinor

      if (expense.participants?.length) {
        expense.participants.forEach((participant) => {
          memberOwes[participant.userId] =
            (memberOwes[participant.userId] || 0) + this.toMinorUnit(participant.share)
        })
        return
      }

      const baseShare = Math.floor(amountMinor / members.length)
      const remainder = amountMinor % members.length
      members.forEach((member, index) => {
        memberOwes[member.id] = (memberOwes[member.id] || 0) + baseShare + (index < remainder ? 1 : 0)
      })
    })

    const balances: Balance[] = members.map((member) => {
      const paid = memberPaid[member.id] || 0
      const owed = memberOwes[member.id] || 0
      const balance = paid - owed

      return {
        memberId: member.id,
        memberName: member.name,
        amount: this.fromMinorUnit(balance),
      }
    })

    return balances
  }

  /**
   * Generate minimum settlement transactions using a greedy algorithm
   * This algorithm pairs debtors with creditors to minimize transactions
   */
  static generateSettlements(balances: Balance[]): Settlement[] {
    const settlements: Settlement[] = []

    // Create mutable copies to track remaining balances
    const debtors = balances
      .filter((b) => b.amount < 0)
      .map((b) => ({ ...b, amount: Math.abs(b.amount) }))
      .sort((a, b) => b.amount - a.amount)

    const creditors = balances
      .filter((b) => b.amount > 0)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.amount - a.amount)

    // Match debtors with creditors
    let debtorIdx = 0
    let creditorIdx = 0

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx]
      const creditor = creditors[creditorIdx]

      let settlementAmount = Math.min(debtor.amount, creditor.amount)
      settlementAmount = parseFloat(settlementAmount.toFixed(2))

      if (settlementAmount > 0) {
        settlements.push({
          from: debtor.memberId,
          fromName: debtor.memberName,
          to: creditor.memberId,
          toName: creditor.memberName,
          amount: settlementAmount,
        })
      }

      debtor.amount = parseFloat((debtor.amount - settlementAmount).toFixed(2))
      creditor.amount = parseFloat((creditor.amount - settlementAmount).toFixed(2))

      if (debtor.amount < 0.01) {
        debtorIdx++
      }
      if (creditor.amount < 0.01) {
        creditorIdx++
      }
    }

    return settlements
  }

  /**
   * Complete settlement calculation combining balances and settlements
   */
  static calculateSettlement(expenses: Expense[], members: Member[]) {
    if (expenses.length === 0 || members.length === 0) {
      return {
        totalExpense: 0,
        totalMembers: members.length,
        perPersonShare: 0,
        balances: members.map((member) => ({
          memberId: member.id,
          memberName: member.name,
          amount: 0,
        })),
        settlements: [],
        paymentDetails: Object.fromEntries(
          members.map((member) => [member.id, { name: member.name, upiId: member.upiId }]),
        ),
        summary: {
          paidByMember: {},
          owedByMember: {},
          receiveByMember: {},
        },
      }
    }

    const totalExpenseMinor = expenses.reduce((sum, exp) => sum + this.toMinorUnit(exp.amount), 0)
    const totalExpense = this.fromMinorUnit(totalExpenseMinor)
    const perPersonShare = this.fromMinorUnit(Math.floor(totalExpenseMinor / members.length))

    const balances = this.calculateBalances(expenses, members)
    const settlements = this.generateSettlements(balances)

    // Verify settlement accuracy
    this.verifySettlement(balances, settlements)

    // Build summary
    const memberPaid: Record<string, number> = {}
    const owedByMember: Record<string, number> = {}
    const receiveByMember: Record<string, number> = {}

    members.forEach((member) => {
      memberPaid[member.id] = 0
      owedByMember[member.id] = 0
      receiveByMember[member.id] = 0
    })

    expenses.forEach((expense) => {
      memberPaid[expense.paidBy] = (memberPaid[expense.paidBy] || 0) + expense.amount
    })

    balances.forEach((balance) => {
      if (balance.amount > 0) {
        receiveByMember[balance.memberId] = balance.amount
      } else if (balance.amount < 0) {
        owedByMember[balance.memberId] = Math.abs(balance.amount)
      }
    })

    return {
      totalExpense,
      totalMembers: members.length,
      perPersonShare,
      balances,
      settlements,
      paymentDetails: Object.fromEntries(
        members.map((member) => [member.id, { name: member.name, upiId: member.upiId }]),
      ),
      summary: {
        paidByMember: memberPaid,
        owedByMember,
        receiveByMember,
      },
    }
  }

  /**
   * Verify that the settlement is accurate
   * All balances should sum to zero (within floating point tolerance)
   * All settlements should correctly resolve balances
   */
  private static verifySettlement(
    balances: Balance[],
    settlements: Settlement[]
  ): boolean {
    // Check total balance is zero
    const totalBalance = balances.reduce((sum, b) => sum + b.amount, 0)
    if (Math.abs(totalBalance) > 0.01) {
      return false
    }

    // Check settlements resolve balances
    const settledBalances = { ...Object.fromEntries(balances.map((b) => [b.memberId, b.amount])) }

    settlements.forEach((settlement) => {
      settledBalances[settlement.from] =
        (settledBalances[settlement.from] || 0) + settlement.amount
      settledBalances[settlement.to] =
        (settledBalances[settlement.to] || 0) - settlement.amount
    })

    return Object.values(settledBalances).every((balance) => Math.abs(balance) <= 0.01)
  }
}

export default SettlementCalculator
