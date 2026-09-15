import { db } from '../db/database';
import { Friend, Transaction, Group } from '../types';

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
 */
export async function importJSONBackup(
  jsonData: string,
  mode: 'merge' | 'replace'
): Promise<{ success: boolean; message: string }> {
  try {
    const parsed: BackupData = JSON.parse(jsonData);
    if (!parsed || !Array.isArray(parsed.friends) || !Array.isArray(parsed.transactions)) {
      return { success: false, message: 'Invalid backup file structure.' };
    }

    if (mode === 'replace') {
      await db.friends.clear();
      await db.transactions.clear();
      await db.groups.clear();

      await db.friends.bulkAdd(parsed.friends);
      await db.transactions.bulkAdd(parsed.transactions);
      if (parsed.groups && parsed.groups.length > 0) {
        await db.groups.bulkAdd(parsed.groups);
      }
    } else {
      // Merge mode
      for (const friend of parsed.friends) {
        await db.friends.put(friend);
      }
      for (const t of parsed.transactions) {
        await db.transactions.put(t);
      }
      if (parsed.groups) {
        for (const g of parsed.groups) {
          await db.groups.put(g);
        }
      }
    }

    return {
      success: true,
      message: `Successfully imported ${parsed.friends.length} friends and ${parsed.transactions.length} transactions.`
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to parse JSON file.' };
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

  const headers = ['ID', 'Date', 'Type', 'Description', 'Amount (INR)', 'Paid By', 'Friend/Group'];
  const rows = transactions.map(t => {
    const paidByStr = t.paidById === 'ME' ? 'Me' : friendMap.get(t.paidById) || 'Unknown';
    let target = '';
    if (t.groupId) {
      target = `Group: ${groupMap.get(t.groupId) || 'Group'}`;
    } else if (t.friendId) {
      target = friendMap.get(t.friendId) || 'Friend';
    }

    return [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.type}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount,
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
