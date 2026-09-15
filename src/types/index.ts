export type TransactionType = 'PAID_BY_ME' | 'PAID_BY_FRIEND' | 'SETTLEMENT' | 'GROUP_EXPENSE';

export type SplitType = 'EQUAL' | 'CUSTOM';

export interface GroupParticipantShare {
  friendId: string; // friendId or 'ME'
  shareAmount: number;
}

export interface Friend {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  note?: string;
  isArchived?: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  friendId?: string; // For 1-on-1 transactions or settlements
  groupId?: string; // For group expenses
  description: string;
  date: string; // ISO string for date/time
  paidById: string; // friendId or 'ME'
  participants?: GroupParticipantShare[]; // For group expenses
  splitType?: SplitType;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[]; // List of friendIds including 'ME'
  createdAt: string;
  updatedAt: string;
}

export interface FriendBalance {
  friendId: string;
  friendName: string;
  totalPaidByMe: number;     // Amount I paid for them
  totalPaidByFriend: number; // Amount they paid for me
  netBalance: number;        // Positive = friend owes me, Negative = I owe friend, 0 = settled
  status: 'OWES_ME' | 'I_OWE' | 'SETTLED';
}

export interface SuggestedSettlement {
  fromId: string;   // friendId or 'ME'
  fromName: string;
  toId: string;     // friendId or 'ME'
  toName: string;
  amount: number;
}

export interface SystemStats {
  totalTransactions: number;
  totalMoneySpent: number;
  totalReceivable: number;
  totalPayable: number;
  netOverallBalance: number;
  mostFrequentFriend?: Friend;
  highestTransaction?: Transaction;
  monthlySpending: { month: string; amount: number }[];
}
