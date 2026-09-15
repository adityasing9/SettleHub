import { Friend, Transaction, FriendBalance, SuggestedSettlement, Group } from '../types';

/**
 * Calculates net balance and statistics for a specific friend.
 * Net Balance = (Money I paid for Friend + Friend's share of expenses I paid)
 *             - (Money Friend paid for me + My share of expenses Friend paid)
 */
export function calculateFriendBalance(
  friendId: string,
  friendName: string,
  transactions: Transaction[]
): FriendBalance {
  let totalPaidByMe = 0;
  let totalPaidByFriend = 0;

  for (const t of transactions) {
    if (t.type === 'PAID_BY_ME' && t.friendId === friendId) {
      totalPaidByMe += t.amount;
    } else if (t.type === 'PAID_BY_FRIEND' && t.friendId === friendId) {
      totalPaidByFriend += t.amount;
    } else if (t.type === 'SETTLEMENT' && t.friendId === friendId) {
      if (t.paidById === friendId) {
        // Friend paid me back -> reduces what friend owes me
        totalPaidByFriend += t.amount;
      } else if (t.paidById === 'ME') {
        // I paid friend back -> reduces what I owe friend
        totalPaidByMe += t.amount;
      }
    } else if (t.type === 'GROUP_EXPENSE' && t.participants) {
      const isPaidByMe = t.paidById === 'ME';
      const isPaidByFriend = t.paidById === friendId;

      const friendParticipant = t.participants.find(p => p.friendId === friendId);
      const meParticipant = t.participants.find(p => p.friendId === 'ME');

      if (isPaidByMe && friendParticipant) {
        // I paid the total group expense. Friend's share is money I paid for friend.
        totalPaidByMe += friendParticipant.shareAmount;
      } else if (isPaidByFriend && meParticipant) {
        // Friend paid total group expense. My share is money friend paid for me.
        totalPaidByFriend += meParticipant.shareAmount;
      }
    }
  }

  const netBalance = Math.round((totalPaidByMe - totalPaidByFriend) * 100) / 100;
  
  let status: FriendBalance['status'] = 'SETTLED';
  if (netBalance > 0.01) {
    status = 'OWES_ME';
  } else if (netBalance < -0.01) {
    status = 'I_OWE';
  }

  return {
    friendId,
    friendName,
    totalPaidByMe: Math.round(totalPaidByMe * 100) / 100,
    totalPaidByFriend: Math.round(totalPaidByFriend * 100) / 100,
    netBalance,
    status
  };
}

/**
 * Computes overall dashboard totals across all active friends.
 */
export function calculateOverallTotals(
  friends: Friend[],
  transactions: Transaction[]
) {
  let totalReceivable = 0;
  let totalPayable = 0;

  const friendBalances = friends
    .filter(f => !f.isArchived)
    .map(f => calculateFriendBalance(f.id, f.name, transactions));

  for (const fb of friendBalances) {
    if (fb.netBalance > 0) {
      totalReceivable += fb.netBalance;
    } else if (fb.netBalance < 0) {
      totalPayable += Math.abs(fb.netBalance);
    }
  }

  totalReceivable = Math.round(totalReceivable * 100) / 100;
  totalPayable = Math.round(totalPayable * 100) / 100;
  const netOverallBalance = Math.round((totalReceivable - totalPayable) * 100) / 100;

  return {
    totalReceivable,
    totalPayable,
    netOverallBalance,
    friendBalances
  };
}

/**
 * Validates group custom split amounts against total amount.
 */
export function validateSplit(
  totalAmount: number,
  shares: { friendId: string; shareAmount: number }[]
): { isValid: boolean; difference: number } {
  const sumShares = shares.reduce((acc, curr) => acc + (Number(curr.shareAmount) || 0), 0);
  const diff = Math.round((totalAmount - sumShares) * 100) / 100;
  return {
    isValid: Math.abs(diff) < 0.01,
    difference: diff
  };
}

/**
 * Calculates equal splits for a list of participant IDs.
 */
export function calculateEqualSplit(
  totalAmount: number,
  participantIds: string[]
): { friendId: string; shareAmount: number }[] {
  if (participantIds.length === 0) return [];
  const baseShare = Math.floor((totalAmount / participantIds.length) * 100) / 100;
  const remainder = Math.round((totalAmount - baseShare * participantIds.length) * 100) / 100;

  return participantIds.map((id, index) => ({
    friendId: id,
    // Add remainder cents to the first participant to maintain exact total
    shareAmount: index === 0 ? Math.round((baseShare + remainder) * 100) / 100 : baseShare
  }));
}

/**
 * Smart Settlement Simplification Algorithm (Minimizing transaction count).
 * Given a set of members and group transactions, computes simplified payments needed to settle up.
 */
export function calculateSuggestedSettlements(
  members: string[],
  friendsMap: Map<string, string>, // friendId -> friendName ('ME' -> 'You')
  groupTransactions: Transaction[]
): SuggestedSettlement[] {
  // Net balance map per member: memberId -> net amount (positive = overall creditor, negative = debtor)
  const netBalances: Record<string, number> = {};
  for (const m of members) {
    netBalances[m] = 0;
  }

  for (const t of groupTransactions) {
    if (t.type === 'GROUP_EXPENSE' && t.participants) {
      const payer = t.paidById;
      if (netBalances[payer] !== undefined) {
        netBalances[payer] += t.amount;
      }

      for (const p of t.participants) {
        if (netBalances[p.friendId] !== undefined) {
          netBalances[p.friendId] -= p.shareAmount;
        }
      }
    } else if (t.type === 'SETTLEMENT' && t.friendId) {
      // Settlement within group context
      const payer = t.paidById;
      const receiver = t.paidById === 'ME' ? t.friendId : 'ME';
      if (netBalances[payer] !== undefined) netBalances[payer] += t.amount;
      if (netBalances[receiver] !== undefined) netBalances[receiver] -= t.amount;
    }
  }

  // Separate into debtors and creditors
  interface PersonBalance { id: string; amount: number }
  const debtors: PersonBalance[] = [];
  const creditors: PersonBalance[] = [];

  for (const [id, net] of Object.entries(netBalances)) {
    const rounded = Math.round(net * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ id, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ id, amount: rounded });
    }
  }

  // Sort descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const suggestions: SuggestedSettlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedSettled = Math.round(settledAmount * 100) / 100;

    if (roundedSettled > 0) {
      suggestions.push({
        fromId: debtor.id,
        fromName: friendsMap.get(debtor.id) || (debtor.id === 'ME' ? 'You' : 'Unknown'),
        toId: creditor.id,
        toName: friendsMap.get(creditor.id) || (creditor.id === 'ME' ? 'You' : 'Unknown'),
        amount: roundedSettled
      });
    }

    debtor.amount -= roundedSettled;
    creditor.amount -= roundedSettled;

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  return suggestions;
}
