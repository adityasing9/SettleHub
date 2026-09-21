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
 * Chunks a payload into one or more QR code strings.
 * If payload size is <= 1800 characters, returns 1 QR code: ['SMQR:<base64>'].
 * If larger (e.g. All Data with many transactions), splits into multiple sequential
 * QR codes: ['SMQRP:1:3:tag:chunk1', 'SMQRP:2:3:tag:chunk2', ...].
 */
export function packQRChunks(payload: BackupData, maxChunkSize = 1400): string[] {
  const jsonStr = JSON.stringify(payload);
  const compressed = deflate(jsonStr);

  let binary = '';
  const len = compressed.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  const base64 = btoa(binary);

  // If small enough to fit within maxChunkSize, a single QR code is generated
  if (base64.length <= maxChunkSize) {
    return ['SMQR:' + base64];
  }

  // Multi-part chunking
  const chunks: string[] = [];
  const tag = Math.random().toString(36).substring(2, 7);
  const total = Math.ceil(base64.length / maxChunkSize);

  for (let i = 0; i < total; i++) {
    const chunkData = base64.slice(i * maxChunkSize, (i + 1) * maxChunkSize);
    chunks.push(`SMQRP:${i + 1}:${total}:${tag}:${chunkData}`);
  }

  return chunks;
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

export interface QRScanResult {
  isComplete: boolean;
  currentPart: number;
  totalParts: number;
  partsCount: number;
  tag?: string;
  payload?: BackupData;
  error?: string;
}

/**
 * Processes a scanned QR text, handling both single QR codes and multi-part sequences.
 */
export function processQRScan(
  scannedText: string,
  partsMap: Map<number, string>,
  currentTag?: string
): QRScanResult {
  const trimmed = scannedText.trim();

  // 1. Single QR Code
  if (trimmed.startsWith('SMQR:') || trimmed.startsWith('{')) {
    try {
      const payload = unpackQRData(trimmed);
      return {
        isComplete: true,
        currentPart: 1,
        totalParts: 1,
        partsCount: 1,
        payload
      };
    } catch (err: any) {
      return {
        isComplete: false,
        currentPart: 1,
        totalParts: 1,
        partsCount: 0,
        error: err?.message || 'Failed to decode QR code payload'
      };
    }
  }

  // 2. Multi-Part QR Code: SMQRP:<part>:<total>:<tag>:<chunk>
  if (trimmed.startsWith('SMQRP:')) {
    const parts = trimmed.split(':');
    if (parts.length < 5) {
      return {
        isComplete: false,
        currentPart: 0,
        totalParts: 0,
        partsCount: partsMap.size,
        error: 'Invalid multi-part QR code format'
      };
    }

    const partIndex = parseInt(parts[1], 10);
    const totalParts = parseInt(parts[2], 10);
    const tag = parts[3];
    const chunkData = parts.slice(4).join(':');

    if (isNaN(partIndex) || isNaN(totalParts) || partIndex < 1 || partIndex > totalParts) {
      return {
        isComplete: false,
        currentPart: 0,
        totalParts: 0,
        partsCount: partsMap.size,
        error: 'Corrupted multi-part QR index'
      };
    }

    // If different session/tag, reset map
    if (currentTag && currentTag !== tag) {
      partsMap.clear();
    }

    partsMap.set(partIndex, chunkData);

    if (partsMap.size === totalParts) {
      // Assemble all pieces in order 1..totalParts
      let fullBase64 = '';
      for (let i = 1; i <= totalParts; i++) {
        const piece = partsMap.get(i);
        if (!piece) {
          return {
            isComplete: false,
            currentPart: partIndex,
            totalParts,
            partsCount: partsMap.size,
            tag
          };
        }
        fullBase64 += piece;
      }

      try {
        const payload = unpackQRData('SMQR:' + fullBase64);
        return {
          isComplete: true,
          currentPart: partIndex,
          totalParts,
          partsCount: partsMap.size,
          tag,
          payload
        };
      } catch (err: any) {
        return {
          isComplete: false,
          currentPart: partIndex,
          totalParts,
          partsCount: partsMap.size,
          tag,
          error: 'Failed to reconstruct complete dataset: ' + (err?.message || 'Corrupted data')
        };
      }
    }

    return {
      isComplete: false,
      currentPart: partIndex,
      totalParts,
      partsCount: partsMap.size,
      tag
    };
  }

  return {
    isComplete: false,
    currentPart: 0,
    totalParts: 0,
    partsCount: partsMap.size,
    error: 'Unrecognized QR code format. Please scan a SettleMate export code.'
  };
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
