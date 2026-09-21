import { describe, it, expect } from 'vitest';
import { packQRData, unpackQRData, filterExportPayload } from './qrDataTransfer';
import { BackupData } from './exportImport';

describe('QR Data Transfer Engine', () => {
  const mockData: BackupData = {
    version: 1,
    exportedAt: '2026-09-22T00:00:00Z',
    friends: [
      { id: 'f1', name: 'Rahul', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'f2', name: 'Amit', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'f3', name: 'Neha', createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    ],
    groups: [
      {
        id: 'g1',
        name: 'Goa Trip',
        members: ['ME', 'f1', 'f2'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
      }
    ],
    transactions: [
      {
        id: 't1',
        type: 'GROUP_EXPENSE',
        amount: 1500,
        paidById: 'ME',
        groupId: 'g1',
        description: 'Goa Villa',
        date: '2026-09-15T10:00:00Z',
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z'
      },
      {
        id: 't2',
        type: 'PAID_BY_ME',
        amount: 500,
        friendId: 'f3',
        paidById: 'ME',
        description: 'Coffee with Neha',
        date: '2026-09-16T10:00:00Z',
        createdAt: '2026-09-16T10:00:00Z',
        updatedAt: '2026-09-16T10:00:00Z'
      },
      {
        id: 't3',
        type: 'PERSONAL_EXPENSE',
        amount: 250,
        category: 'Food & Dining',
        paidById: 'ME',
        description: 'Breakfast',
        date: '2026-09-17T10:00:00Z',
        createdAt: '2026-09-17T10:00:00Z',
        updatedAt: '2026-09-17T10:00:00Z'
      }
    ]
  };

  it('should compress and decompress data accurately via packQRData and unpackQRData', () => {
    const packed = packQRData(mockData);
    expect(packed.startsWith('SMQR:')).toBe(true);

    // Verify significant compression
    const rawJsonLength = JSON.stringify(mockData).length;
    expect(packed.length).toBeLessThan(rawJsonLength);

    const unpacked = unpackQRData(packed);
    expect(unpacked.version).toBe(mockData.version);
    expect(unpacked.friends.length).toBe(mockData.friends.length);
    expect(unpacked.groups.length).toBe(mockData.groups.length);
    expect(unpacked.transactions.length).toBe(mockData.transactions.length);
    expect(unpacked.friends[0].name).toBe('Rahul');
  });

  it('should support fallback for raw JSON in unpackQRData', () => {
    const json = JSON.stringify(mockData);
    const unpacked = unpackQRData(json);
    expect(unpacked.friends.length).toBe(3);
  });

  it('should filter export payload when selecting a specific group', () => {
    const filtered = filterExportPayload(mockData, {
      scope: 'GROUPS',
      selectedGroupIds: ['g1']
    });

    expect(filtered.groups.length).toBe(1);
    expect(filtered.groups[0].name).toBe('Goa Trip');
    // Goa trip members are ME, f1, f2 -> Should include f1 and f2, but NOT f3 (Neha)
    expect(filtered.friends.length).toBe(2);
    expect(filtered.friends.map(f => f.id)).toContain('f1');
    expect(filtered.friends.map(f => f.id)).toContain('f2');
    expect(filtered.friends.map(f => f.id)).not.toContain('f3');

    // Only Goa trip transaction should be included
    expect(filtered.transactions.length).toBe(1);
    expect(filtered.transactions[0].id).toBe('t1');
  });

  it('should filter export payload when selecting a specific friend', () => {
    const filtered = filterExportPayload(mockData, {
      scope: 'FRIENDS',
      selectedFriendIds: ['f3']
    });

    expect(filtered.groups.length).toBe(0);
    expect(filtered.friends.length).toBe(1);
    expect(filtered.friends[0].name).toBe('Neha');
    expect(filtered.transactions.length).toBe(1);
    expect(filtered.transactions[0].id).toBe('t2');
  });

  it('should filter export payload for PERSONAL_ONLY', () => {
    const filtered = filterExportPayload(mockData, {
      scope: 'PERSONAL_ONLY'
    });

    expect(filtered.groups.length).toBe(0);
    expect(filtered.friends.length).toBe(0);
    expect(filtered.transactions.length).toBe(1);
    expect(filtered.transactions[0].id).toBe('t3');
    expect(filtered.transactions[0].type).toBe('PERSONAL_EXPENSE');
  });
});
