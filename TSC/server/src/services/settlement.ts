import { Decimal } from "@prisma/client/runtime/library";

export interface MemberBalance {
  memberId: string;
  name: string;
  balance: number; // Positive means creditor (receives), negative means debtor (owes)
}

export interface SimplifiedSettlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

/**
 * Greedy Debt Simplification Algorithm
 * 
 * Reduces the number of settlements by matching the largest debtor with the largest creditor.
 * At most, it will output N-1 transactions for N members.
 */
export function simplifyDebts(balances: MemberBalance[]): SimplifiedSettlement[] {
  // Filter out members with approximately zero balance
  const activeBalances = balances
    .map(b => ({ ...b, balance: Math.round(b.balance * 100) / 100 })) // round to 2 decimals
    .filter(b => Math.abs(b.balance) > 0.01);

  const debtors = activeBalances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance); // Sorted descending by absolute debt (most negative first)
  const creditors = activeBalances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance); // Sorted descending by credit (most positive first)

  const settlements: SimplifiedSettlement[] = [];

  let dIdx = 0;
  let cIdx = 0;

  // Greedy matching
  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const debtAmount = Math.abs(debtor.balance);
    const creditAmount = creditor.balance;

    const settledAmount = Math.min(debtAmount, creditAmount);

    settlements.push({
      fromId: debtor.memberId,
      fromName: debtor.name,
      toId: creditor.memberId,
      toName: creditor.name,
      amount: Math.round(settledAmount * 100) / 100,
    });

    // Update balances
    debtor.balance += settledAmount;
    creditor.balance -= settledAmount;

    // Move pointers if balance is settled
    if (Math.abs(debtor.balance) < 0.01) {
      dIdx++;
    }
    if (Math.abs(creditor.balance) < 0.01) {
      cIdx++;
    }
  }

  return settlements;
}

/**
 * Calculates net balances for all members in a group given their transaction records.
 */
export function calculateNetBalances(
  members: { id: string; name: string }[],
  transactions: {
    payerId: string;
    amount: number | Decimal | any;
    participants: { memberId: string; calculatedOwe: number | Decimal | any }[];
  }[]
): MemberBalance[] {
  const balanceMap = new Map<string, number>();

  // Initialize all members with 0 balance
  for (const m of members) {
    balanceMap.set(m.id, 0);
  }

  for (const tx of transactions) {
    const payerId = tx.payerId;
    const amount = Number(tx.amount);

    // Credit the payer
    if (balanceMap.has(payerId)) {
      balanceMap.set(payerId, (balanceMap.get(payerId) || 0) + amount);
    }

    // Debit each participant
    for (const p of tx.participants) {
      const pId = p.memberId;
      const oweAmount = Number(p.calculatedOwe);
      if (balanceMap.has(pId)) {
        balanceMap.set(pId, (balanceMap.get(pId) || 0) - oweAmount);
      }
    }
  }

  return members.map(m => ({
    memberId: m.id,
    name: m.name,
    balance: balanceMap.get(m.id) || 0,
  }));
}
