import Dexie, { Table } from 'dexie';
import { Friend, Transaction, Group } from '../types';

export class SettleMateDatabase extends Dexie {
  friends!: Table<Friend, string>;
  transactions!: Table<Transaction, string>;
  groups!: Table<Group, string>;

  constructor() {
    super('SettleMateDB');
    this.version(1).stores({
      friends: 'id, name, isArchived, createdAt',
      transactions: 'id, type, friendId, groupId, paidById, date, createdAt',
      groups: 'id, name, createdAt'
    });
  }
}

export const db = new SettleMateDatabase();

// Utility helper to generate unique IDs
export function generateId(): string {
  return 'id_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
}
