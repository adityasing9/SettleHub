import { db, generateId } from '../db/database';
import { Friend, Transaction, Group, TransactionType } from '../types';

export interface BackupData {
  version: number;
  exportedAt: string;
  friends: Friend[];
  transactions: Transaction[];
  groups: Group[];
}

/**
 * Exports all database tables to a JSON backup file.
 */
export async function exportJSONBackup(): Promise<void> {
  const friends = await db.friends.toArray();
  const transactions = await db.transactions.toArray();
  const groups = await db.groups.toArray();

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    friends,
    transactions,
    groups
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `SettleMate_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Imports JSON backup data with 'merge' or 'replace' mode.
 * Supports legacy schemas, nested payloads, and alternate key structures.
 */
export async function importJSONBackup(
  jsonData: string,
  mode: 'merge' | 'replace'
): Promise<{ success: boolean; message: string }> {
  try {
    const raw = JSON.parse(jsonData);
    if (!raw || typeof raw !== 'object') {
      return { success: false, message: 'Invalid JSON file: file is empty or not a valid object.' };
    }

    // Support nested `{ data: { friends, transactions, groups } }` or flat `{ friends, ... }`
    const root = raw.data && typeof raw.data === 'object' ? raw.data : raw;

    const rawFriends: any[] = root.friends || root.Friends || [];
    const rawTransactions: any[] = root.transactions || root.Transactions || [];
    const rawGroups: any[] = root.groups || root.Groups || [];

    if (!Array.isArray(rawFriends) && !Array.isArray(rawTransactions) && !Array.isArray(rawGroups)) {
      return { success: false, message: 'Invalid backup file: no friends or transactions found.' };
    }

    const now = new Date().toISOString();

    // 1. Normalize friends
    const normalizedFriends: Friend[] = rawFriends.map((f: any) => ({
      id: String(f.id || generateId()),
      name: String(f.name || 'Friend').trim(),
      phone: f.phone ? String(f.phone).trim() : undefined,
      email: f.email ? String(f.email).trim() : undefined,
      note: f.note ? String(f.note) : undefined,
      isArchived: Boolean(f.isArchived),
      createdAt: f.createdAt ? String(f.createdAt) : now,
      updatedAt: f.updatedAt ? String(f.updatedAt) : now
    }));

    // 2. Normalize transactions
    const normalizedTransactions: Transaction[] = rawTransactions.map((t: any) => {
      let type: TransactionType = 'PAID_BY_ME';
      if (t.type === 'PERSONAL_EXPENSE' || t.type === 'PERSONAL') {
        type = 'PERSONAL_EXPENSE';
      } else if (t.type === 'SETTLEMENT') {
        type = 'SETTLEMENT';
      } else if (t.type === 'GROUP' || t.type === 'GROUP_EXPENSE') {
        type = 'GROUP_EXPENSE';
      } else if (t.type === 'PAID_BY_FRIEND' || (t.payerId && t.payerId !== 'YOU' && t.payerId !== 'ME')) {
        type = 'PAID_BY_FRIEND';
      } else {
        type = 'PAID_BY_ME';
      }

      let paidById = t.paidById || t.payerId || 'ME';
      if (paidById === 'YOU') paidById = 'ME';

      const friendId =
        t.friendId ||
        (t.type === 'SETTLEMENT' ? (t.payerId === 'YOU' || t.paidById === 'ME' ? t.receiverId : t.payerId) : undefined);

      const parsedAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;

      return {
        id: String(t.id || generateId()),
        type,
        amount: parsedAmount,
        friendId: friendId ? String(friendId) : undefined,
        groupId: t.groupId ? String(t.groupId) : undefined,
        category: t.category ? String(t.category) : undefined,
        paymentMode: t.paymentMode ? String(t.paymentMode) : undefined,
        description: String(t.description || 'Transaction').trim(),
        date: t.date ? String(t.date) : t.createdAt ? String(t.createdAt) : now,
        paidById: String(paidById),
        participants: Array.isArray(t.participants) ? t.participants : undefined,
        splitType: t.splitType || 'EQUAL',
        createdAt: t.createdAt ? String(t.createdAt) : now,
        updatedAt: t.updatedAt ? String(t.updatedAt) : now
      };
    });

    // 3. Normalize groups
    const normalizedGroups: Group[] = rawGroups.map((g: any) => {
      const members = Array.isArray(g.members)
        ? g.members.map(String)
        : Array.isArray(g.memberIds)
        ? g.memberIds.map(String)
        : ['ME'];

      return {
        id: String(g.id || generateId()),
        name: String(g.name || 'Group').trim(),
        description: g.description ? String(g.description) : undefined,
        members: members.includes('ME') ? members : ['ME', ...members],
        createdAt: g.createdAt ? String(g.createdAt) : now,
        updatedAt: g.updatedAt ? String(g.updatedAt) : now
      };
    });

    // Write to Dexie inside atomic transaction
    await db.transaction('rw', [db.friends, db.transactions, db.groups], async () => {
      if (mode === 'replace') {
        await db.friends.clear();
        await db.transactions.clear();
        await db.groups.clear();
      }

      if (normalizedFriends.length > 0) {
        await db.friends.bulkPut(normalizedFriends);
      }
      if (normalizedTransactions.length > 0) {
        await db.transactions.bulkPut(normalizedTransactions);
      }
      if (normalizedGroups.length > 0) {
        await db.groups.bulkPut(normalizedGroups);
      }
    });

    return {
      success: true,
      message: `Successfully imported ${normalizedFriends.length} friend${
        normalizedFriends.length === 1 ? '' : 's'
      }, ${normalizedTransactions.length} transaction${
        normalizedTransactions.length === 1 ? '' : 's'
      }, and ${normalizedGroups.length} group${normalizedGroups.length === 1 ? '' : 's'}.`
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to process JSON backup file.' };
  }
}

/**
 * Exports transaction history as CSV file.
 */
export async function exportCSV(): Promise<void> {
  const transactions = await db.transactions.toArray();
  const friends = await db.friends.toArray();
  const groups = await db.groups.toArray();

  const friendMap = new Map(friends.map(f => [f.id, f.name]));
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Amount (INR)', 'Payment Mode', 'Paid By', 'Friend/Group'];
  const rows = transactions.map(t => {
    const paidByStr = t.type === 'PERSONAL_EXPENSE' ? 'Me' : t.paidById === 'ME' ? 'Me' : friendMap.get(t.paidById) || 'Unknown';
    let target = '';
    if (t.type === 'PERSONAL_EXPENSE') {
      target = 'Personal';
    } else if (t.groupId) {
      target = `Group: ${groupMap.get(t.groupId) || 'Group'}`;
    } else if (t.friendId) {
      target = friendMap.get(t.friendId) || 'Friend';
    }

    return [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.type}"`,
      `"${(t.category || 'General').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${t.paymentMode || 'UPI'}"`,
      `"${paidByStr}"`,
      `"${target}"`
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', csvContent);
  downloadAnchor.setAttribute('download', `SettleMate_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
