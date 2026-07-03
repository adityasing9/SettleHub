export interface Member {
  id: string;
  name: string;
  email?: string;
}

export type SplitType = 'equal' | 'custom' | 'percentage' | 'shares';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  participants: string[]; // memberIds
  splitType: SplitType;
  splits: Record<string, number>; // memberId -> value (amount, percentage, or share)
  category: string;
  date: string;
  notes?: string;
  receiptUrl?: string;
  receiptData?: {
    merchant?: string;
    tax?: number;
    items?: { description: string; amount: number }[];
  };
}

export interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  notes?: string;
  isCompleted: boolean;
}

export interface SimplifiedTransaction {
  fromId: string;
  toId: string;
  amount: number;
}

/**
 * Calculates the net balance for each member in a group.
 * A positive balance means the member is owed money.
 * A negative balance means the member owes money.
 */
export function calculateBalances(
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[]
): Record<string, number> {
  const balances: Record<string, number> = {};

  // Initialize all balances to 0
  members.forEach((m) => {
    balances[m.id] = 0;
  });

  // Process all expenses
  expenses.forEach((expense) => {
    const totalAmount = expense.amount;
    const paidBy = expense.paidById;

    // 1. Add total amount to the person who paid
    if (balances[paidBy] !== undefined) {
      balances[paidBy] += totalAmount;
    }

    // 2. Subtract share for each participant based on splitType
    const participants = expense.participants;
    if (participants.length === 0) return;

    if (expense.splitType === 'equal') {
      const share = totalAmount / participants.length;
      participants.forEach((pid) => {
        if (balances[pid] !== undefined) {
          balances[pid] -= share;
        }
      });
    } else if (expense.splitType === 'custom') {
      participants.forEach((pid) => {
        const share = expense.splits[pid] || 0;
        if (balances[pid] !== undefined) {
          balances[pid] -= share;
        }
      });
    } else if (expense.splitType === 'percentage') {
      participants.forEach((pid) => {
        const pct = expense.splits[pid] || 0;
        const share = (pct / 100) * totalAmount;
        if (balances[pid] !== undefined) {
          balances[pid] -= share;
        }
      });
    } else if (expense.splitType === 'shares') {
      const totalShares = participants.reduce((sum, pid) => sum + (expense.splits[pid] || 0), 0);
      participants.forEach((pid) => {
        const shares = expense.splits[pid] || 0;
        const share = totalShares > 0 ? (shares / totalShares) * totalAmount : 0;
        if (balances[pid] !== undefined) {
          balances[pid] -= share;
        }
      });
    }
  });

  // Process all settlements (adjust balances accordingly)
  settlements.forEach((settlement) => {
    // Only completed settlements affect current balances
    if (!settlement.isCompleted) return;
    
    const { fromId, toId, amount } = settlement;
    if (balances[fromId] !== undefined) {
      // 'from' paid money, so their debt decreases (net balance goes up)
      balances[fromId] += amount;
    }
    if (balances[toId] !== undefined) {
      // 'to' received money, so they are owed less (net balance goes down)
      balances[toId] -= amount;
    }
  });

  // Clean floating point errors (round to 2 decimal places)
  Object.keys(balances).forEach((key) => {
    balances[key] = Math.round(balances[key] * 100) / 100;
  });

  return balances;
}

/**
 * Greedy debt-simplification algorithm.
 * Minimizes the number of transactions needed to settle all balances.
 */
export function simplifyDebts(balances: Record<string, number>): SimplifiedTransaction[] {
  const transactions: SimplifiedTransaction[] = [];

  // Separate debtors and creditors
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([id, balance]) => {
    if (balance < -0.01) {
      debtors.push({ id, amount: -balance }); // store as positive for easier math
    } else if (balance > 0.01) {
      creditors.push({ id, amount: balance });
    }
  });

  // Sort: largest first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amountToSettle = Math.min(debtor.amount, creditor.amount);

    if (amountToSettle > 0.01) {
      transactions.push({
        fromId: debtor.id,
        toId: creditor.id,
        amount: Math.round(amountToSettle * 100) / 100,
      });
    }

    debtor.amount -= amountToSettle;
    creditor.amount -= amountToSettle;

    if (debtor.amount < 0.01) {
      dIdx++;
    }
    if (creditor.amount < 0.01) {
      cIdx++;
    }
  }

  return transactions;
}
