import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '../db/database';
import { Transaction } from '../types';

export function useTransactions() {
  const transactions = useLiveQuery(
    () => db.transactions.orderBy('date').reverse().toArray(),
    []
  ) || [];

  const addTransaction = async (
    tData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (tData.amount <= 0) {
      throw new Error('Transaction amount must be greater than zero.');
    }

    const now = new Date().toISOString();
    const newTransaction: Transaction = {
      ...tData,
      id: generateId(),
      date: tData.date || now,
      createdAt: now,
      updatedAt: now
    };
    await db.transactions.add(newTransaction);
    return newTransaction;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const now = new Date().toISOString();
    await db.transactions.update(id, {
      ...updates,
      updatedAt: now
    });
  };

  const deleteTransaction = async (id: string): Promise<Transaction | undefined> => {
    const existing = await db.transactions.get(id);
    if (existing) {
      await db.transactions.delete(id);
    }
    return existing;
  };

  const restoreTransaction = async (transaction: Transaction) => {
    await db.transactions.put(transaction);
  };

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction
  };
}
