import { describe, it, expect } from 'vitest';
import {
  calculateFriendBalance,
  calculateOverallTotals,
  calculateEqualSplit,
  validateSplit,
  calculateSuggestedSettlements,
  calculateSpendingBreakdown,
  calculatePersonalNetBalance
} from './financialEngine';
import { Transaction, Friend } from '../types';

describe('Financial Engine Tests', () => {
  it('should correctly calculate individual transaction balances', () => {
    const friendId = 'friend_rahul';
    const friendName = 'Rahul';

    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'PAID_BY_ME',
        amount: 500,
        friendId: 'friend_rahul',
        paidById: 'ME',
        description: 'Movie tickets',
        date: '2026-09-15T10:00:00Z',
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z'
      },
      {
        id: 't2',
        type: 'PAID_BY_FRIEND',
        amount: 200,
        friendId: 'friend_rahul',
        paidById: 'friend_rahul',
        description: 'Snacks',
        date: '2026-09-15T12:00:00Z',
        createdAt: '2026-09-15T12:00:00Z',
        updatedAt: '2026-09-15T12:00:00Z'
      }
    ];

    const balance = calculateFriendBalance(friendId, friendName, transactions);
    expect(balance.totalPaidByMe).toBe(500);
    expect(balance.totalPaidByFriend).toBe(200);
    expect(balance.netBalance).toBe(300);
    expect(balance.status).toBe('OWES_ME');
  });

  it('should correctly process prompt test scenario #43', () => {
    const rahulId = 'rahul_id';
    const amitId = 'amit_id';
    const nehaId = 'neha_id';

    const friends: Friend[] = [
      { id: rahulId, name: 'Rahul', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: amitId, name: 'Amit', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: nehaId, name: 'Neha', createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    ];

    const transactions: Transaction[] = [
      // 1. I pay Rahul ₹500
      {
        id: 't1',
        type: 'PAID_BY_ME',
        amount: 500,
        friendId: rahulId,
        paidById: 'ME',
        description: 'Cab',
        date: '2026-09-10T10:00:00Z',
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-10T10:00:00Z'
      },
      // 2. Rahul pays me ₹100
      {
        id: 't2',
        type: 'PAID_BY_FRIEND',
        amount: 100,
        friendId: rahulId,
        paidById: rahulId,
        description: 'Coffee',
        date: '2026-09-11T10:00:00Z',
        createdAt: '2026-09-11T10:00:00Z',
        updatedAt: '2026-09-11T10:00:00Z'
      },
      // 3. I pay Amit ₹300
      {
        id: 't3',
        type: 'PAID_BY_ME',
        amount: 300,
        friendId: amitId,
        paidById: 'ME',
        description: 'Groceries',
        date: '2026-09-12T10:00:00Z',
        createdAt: '2026-09-12T10:00:00Z',
        updatedAt: '2026-09-12T10:00:00Z'
      },
      // 4. I pay ₹1,200 group dinner for Me + Rahul + Amit + Neha
      {
        id: 't4',
        type: 'GROUP_EXPENSE',
        amount: 1200,
        paidById: 'ME',
        description: 'Group Dinner',
        date: '2026-09-13T10:00:00Z',
        splitType: 'EQUAL',
        participants: [
          { friendId: 'ME', shareAmount: 300 },
          { friendId: rahulId, shareAmount: 300 },
          { friendId: amitId, shareAmount: 300 },
          { friendId: nehaId, shareAmount: 300 }
        ],
        createdAt: '2026-09-13T10:00:00Z',
        updatedAt: '2026-09-13T10:00:00Z'
      }
    ];

    const rahulBal = calculateFriendBalance(rahulId, 'Rahul', transactions);
    expect(rahulBal.netBalance).toBe(700); // 500 - 100 + 300 = 700
    expect(rahulBal.status).toBe('OWES_ME');

    const amitBal = calculateFriendBalance(amitId, 'Amit', transactions);
    expect(amitBal.netBalance).toBe(600); // 300 + 300 = 600
    expect(amitBal.status).toBe('OWES_ME');

    const nehaBal = calculateFriendBalance(nehaId, 'Neha', transactions);
    expect(nehaBal.netBalance).toBe(300); // 300
    expect(nehaBal.status).toBe('OWES_ME');

    const totals = calculateOverallTotals(friends, transactions);
    expect(totals.totalReceivable).toBe(1600); // 700 + 600 + 300
    expect(totals.totalPayable).toBe(0);
    expect(totals.netOverallBalance).toBe(1600);
  });

  it('should handle equal split rounding accurately', () => {
    const participants = ['ME', 'f1', 'f2'];
    const shares = calculateEqualSplit(100, participants);
    expect(shares.length).toBe(3);
    const sum = shares.reduce((a, b) => a + b.shareAmount, 0);
    expect(sum).toBe(100);
  });

  it('should validate custom split match', () => {
    const shares = [
      { friendId: 'f1', shareAmount: 300 },
      { friendId: 'f2', shareAmount: 200 },
      { friendId: 'f3', shareAmount: 500 }
    ];
    expect(validateSplit(1000, shares).isValid).toBe(true);
    expect(validateSplit(900, shares).isValid).toBe(false);
  });

  it('should handle settlement recording correctly', () => {
    const friendId = 'friend_rohit';
    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'PAID_BY_ME',
        amount: 850,
        friendId,
        paidById: 'ME',
        description: 'Lunch',
        date: '2026-09-14T10:00:00Z',
        createdAt: '2026-09-14T10:00:00Z',
        updatedAt: '2026-09-14T10:00:00Z'
      },
      // Partial settlement: Rohit pays me ₹500
      {
        id: 't2',
        type: 'SETTLEMENT',
        amount: 500,
        friendId,
        paidById: friendId,
        description: 'Partial Settlement',
        date: '2026-09-15T10:00:00Z',
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z'
      }
    ];

    const balance = calculateFriendBalance(friendId, 'Rohit', transactions);
    expect(balance.netBalance).toBe(350);
    expect(balance.status).toBe('OWES_ME');
  });

  it('should compute simplified debt settlements for groups', () => {
    const friendsMap = new Map([
      ['ME', 'You'],
      ['f1', 'Rahul'],
      ['f2', 'Amit'],
      ['f3', 'Neha']
    ]);

    const groupTransactions: Transaction[] = [
      // Me paid ₹1,200 for 4 members
      {
        id: 'gt1',
        type: 'GROUP_EXPENSE',
        amount: 1200,
        paidById: 'ME',
        description: 'Group dinner',
        date: '2026-09-15T10:00:00Z',
        participants: [
          { friendId: 'ME', shareAmount: 300 },
          { friendId: 'f1', shareAmount: 300 },
          { friendId: 'f2', shareAmount: 300 },
          { friendId: 'f3', shareAmount: 300 }
        ],
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z'
      }
    ];

    const settlements = calculateSuggestedSettlements(
      ['ME', 'f1', 'f2', 'f3'],
      friendsMap,
      groupTransactions
    );

    expect(settlements.length).toBeGreaterThan(0);
    // Everyone owes ME ₹300 each
    const totalToMe = settlements
      .filter(s => s.toId === 'ME')
      .reduce((sum, s) => sum + s.amount, 0);
    expect(totalToMe).toBe(900);
  });

  it('should isolate PERSONAL_EXPENSE from friend balances and overall debts', () => {
    const friendId = 'friend_rahul';
    const friends: Friend[] = [
      { id: friendId, name: 'Rahul', createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    ];

    const transactions: Transaction[] = [
      {
        id: 'p1',
        type: 'PERSONAL_EXPENSE',
        amount: 2500,
        category: 'Groceries',
        paidById: 'ME',
        description: 'Supermarket weekly groceries',
        date: '2026-09-15T10:00:00Z',
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z'
      },
      {
        id: 't1',
        type: 'PAID_BY_ME',
        amount: 500,
        friendId,
        paidById: 'ME',
        description: 'Movie ticket',
        date: '2026-09-15T14:00:00Z',
        createdAt: '2026-09-15T14:00:00Z',
        updatedAt: '2026-09-15T14:00:00Z'
      }
    ];

    // Friend balance should ONLY reflect the ₹500 paid for Rahul
    const balance = calculateFriendBalance(friendId, 'Rahul', transactions);
    expect(balance.totalPaidByMe).toBe(500);
    expect(balance.totalPaidByFriend).toBe(0);
    expect(balance.netBalance).toBe(500);

    const totals = calculateOverallTotals(friends, transactions);
    expect(totals.totalReceivable).toBe(500);
    expect(totals.totalPayable).toBe(0);
  });

  it('should accurately calculate spending breakdown by category and type', () => {
    const transactions: Transaction[] = [
      {
        id: 'p1',
        type: 'PERSONAL_EXPENSE',
        amount: 1500,
        category: 'Groceries',
        paidById: 'ME',
        description: 'Groceries',
        date: '2026-09-15T10:00:00Z',
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z'
      },
      {
        id: 'p2',
        type: 'PERSONAL_EXPENSE',
        amount: 500,
        category: 'Food & Dining',
        paidById: 'ME',
        description: 'Dinner',
        date: '2026-09-15T12:00:00Z',
        createdAt: '2026-09-15T12:00:00Z',
        updatedAt: '2026-09-15T12:00:00Z'
      },
      {
        id: 't1',
        type: 'PAID_BY_ME',
        amount: 1000,
        category: 'Shopping',
        friendId: 'f1',
        paidById: 'ME',
        description: 'Mall shopping',
        date: '2026-09-15T14:00:00Z',
        createdAt: '2026-09-15T14:00:00Z',
        updatedAt: '2026-09-15T14:00:00Z'
      }
    ];

    const breakdown = calculateSpendingBreakdown(transactions);
    expect(breakdown.personalSpent).toBe(2000); // 1500 + 500
    expect(breakdown.sharedSpent).toBe(1000);
    expect(breakdown.totalSpent).toBe(3000);
    expect(breakdown.categories.length).toBe(3);

    const groceries = breakdown.categories.find(c => c.category === 'Groceries');
    expect(groceries?.amount).toBe(1500);
    expect(groceries?.percentage).toBe(50); // 1500 / 3000 = 50%
  });

  it('should include settlements paid by me in personal spending under Friend Repayment', () => {
    const transactions: Transaction[] = [
      {
        id: 'p1',
        type: 'PERSONAL_EXPENSE',
        amount: 800,
        category: 'Food & Dining',
        paidById: 'ME',
        description: 'Dinner',
        date: '2026-09-15T10:00:00Z',
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z'
      },
      // I pay friend ₹400 to settle debt
      {
        id: 's1',
        type: 'SETTLEMENT',
        amount: 400,
        friendId: 'f1',
        paidById: 'ME',
        description: 'Settling lunch debt',
        date: '2026-09-15T12:00:00Z',
        createdAt: '2026-09-15T12:00:00Z',
        updatedAt: '2026-09-15T12:00:00Z'
      }
    ];

    const breakdown = calculateSpendingBreakdown(transactions);
    expect(breakdown.personalSpent).toBe(1200); // 800 + 400
    const repaymentCat = breakdown.categories.find(c => c.category === 'Friend Repayment');
    expect(repaymentCat?.amount).toBe(400);

    const netBal = calculatePersonalNetBalance(transactions);
    expect(netBal.purePersonalSpent).toBe(800);
    expect(netBal.debtRepaymentsPaid).toBe(400);
    expect(netBal.totalPersonalOutflow).toBe(1200);
  });
});
