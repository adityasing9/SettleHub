import { deflate, inflate } from 'pako';
import { Friend, Group, Transaction } from '../types';
import { BackupData } from './exportImport';

export type ExportScope = 'ALL' | 'GROUPS' | 'FRIENDS' | 'PERSONAL_ONLY';

export interface SelectiveExportOptions {
  scope: ExportScope;
  selectedGroupIds?: string[];
  selectedFriendIds?: string[];
  includePersonalExpenses?: boolean;
  startDate?: string;
  endDate?: string;
}

/**
 * Compresses and encodes BackupData into a compact QR payload string.
 * Format: "SMQR:<base64-deflated-json>"
 */
export function packQRData(payload: BackupData): string {
  const jsonStr = JSON.stringify(payload);
  const compressed = deflate(jsonStr);

  let binary = '';
  const len = compressed.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(compressed[i]);
  }

  return 'SMQR:' + btoa(binary);
}

/**
 * Decodes and inflates a QR payload back into BackupData.
 * Supports both "SMQR:<base64>" and raw JSON strings.
 */
export function unpackQRData(qrText: string): BackupData {
  const trimmed = qrText.trim();

  if (trimmed.startsWith('SMQR:')) {
    const base64 = trimmed.slice(5);
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decompressed = inflate(bytes);
    const jsonStr = new TextDecoder().decode(decompressed);
    return JSON.parse(jsonStr) as BackupData;
  }

  // Fallback for standard JSON
  return JSON.parse(trimmed) as BackupData;
}

/**
 * Selectively filters the database to build a customized export payload.
 * When groups are selected, automatically includes all group members and group expenses.
 * When friends are selected, automatically includes transactions involving those friends.
 */
export function filterExportPayload(
  allData: BackupData,
  options: SelectiveExportOptions
): BackupData {
  const { friends, groups, transactions } = allData;

  if (options.scope === 'ALL') {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      friends: [...friends],
      groups: [...groups],
      transactions: [...transactions]
    };
  }

  if (options.scope === 'PERSONAL_ONLY') {
    const personalTxs = transactions.filter(t => t.type === 'PERSONAL_EXPENSE');
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      friends: [],
      groups: [],
      transactions: personalTxs
    };
  }

  const selectedGroupIds = new Set(options.selectedGroupIds || []);
  const selectedFriendIds = new Set(options.selectedFriendIds || []);
  const includePersonal = Boolean(options.includePersonalExpenses);

  let filteredGroups: Group[] = [];
  let filteredTransactions: Transaction[] = [];
  const requiredFriendIds = new Set<string>();

  if (options.scope === 'GROUPS') {
    filteredGroups = groups.filter(g => selectedGroupIds.has(g.id));

    // Gather all members of these groups
    for (const g of filteredGroups) {
      for (const m of g.members) {
        if (m !== 'ME') requiredFriendIds.add(m);
      }
    }

    // Filter transactions belonging to these groups
    filteredTransactions = transactions.filter(t => t.groupId && selectedGroupIds.has(t.groupId));
  } else if (options.scope === 'FRIENDS') {
    // Direct friend IDs
    for (const fid of selectedFriendIds) {
      requiredFriendIds.add(fid);
    }

    // Filter transactions where friend is participant, receiver, or payer
    filteredTransactions = transactions.filter(t => {
      if (t.friendId && selectedFriendIds.has(t.friendId)) return true;
      if (t.paidById && selectedFriendIds.has(t.paidById)) return true;
      return false;
    });

    // Check if any group contains strictly these friends
    filteredGroups = [];
  }

  // Add personal expenses if selected
  if (includePersonal) {
    const personalTxs = transactions.filter(t => t.type === 'PERSONAL_EXPENSE');
    filteredTransactions.push(...personalTxs);
  }

  // Date range filter if provided
  if (options.startDate || options.endDate) {
    const start = options.startDate ? new Date(options.startDate).getTime() : 0;
    const end = options.endDate ? new Date(options.endDate + 'T23:59:59').getTime() : Infinity;

    filteredTransactions = filteredTransactions.filter(t => {
      try {
        const time = new Date(t.date).getTime();
        return time >= start && time <= end;
      } catch {
        return true;
      }
    });
  }

  // Deduplicate transactions
  const seenTxIds = new Set<string>();
  const dedupedTransactions = filteredTransactions.filter(t => {
    if (seenTxIds.has(t.id)) return false;
    seenTxIds.add(t.id);
    return true;
  });

  // Pull in friend profiles for all required friend IDs
  const filteredFriends = friends.filter(f => requiredFriendIds.has(f.id));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    friends: filteredFriends,
    groups: filteredGroups,
    transactions: dedupedTransactions
  };
}
