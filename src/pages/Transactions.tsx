import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useFriends } from '../hooks/useFriends';
import { useGroups } from '../hooks/useGroups';
import { useToast } from '../context/ToastContext';
import { Transaction } from '../types';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionCard } from '../components/transactions/TransactionCard';
import { EditTransactionModal } from '../components/transactions/EditTransactionModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Search, Filter, ArrowUpDown, Receipt, Plus, X } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

interface TransactionsProps {
  onOpenAddTransaction: () => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ onOpenAddTransaction }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const { transactions, deleteTransaction, restoreTransaction } = useTransactions();
  const { activeFriends } = useFriends();
  const { groups } = useGroups();
  const { showToast } = useToast();

  const friendsMap = useMemo(() => new Map(activeFriends.map(f => [f.id, f])), [activeFriends]);
  const groupsMap = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [friendFilter, setFriendFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');

  // Modals & Dialogs
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(query);
        const friendMatch = t.friendId ? friendsMap.get(t.friendId)?.name.toLowerCase().includes(query) : false;
        const groupMatch = t.groupId ? groupsMap.get(t.groupId)?.name.toLowerCase().includes(query) : false;
        const paidByMatch = t.paidById === 'ME' ? 'you'.includes(query) : friendsMap.get(t.paidById)?.name.toLowerCase().includes(query);
        if (!descMatch && !friendMatch && !groupMatch && !paidByMatch) return false;
      }

      // 2. Type Filter
      if (typeFilter === 'PAID_BY_ME' && (t.type !== 'PAID_BY_ME' && t.paidById !== 'ME')) return false;
      if (typeFilter === 'PAID_BY_FRIEND' && (t.type !== 'PAID_BY_FRIEND' && t.paidById === 'ME')) return false;
      if (typeFilter === 'SETTLEMENT' && t.type !== 'SETTLEMENT') return false;
      if (typeFilter === 'GROUP_EXPENSE' && t.type !== 'GROUP_EXPENSE') return false;

      // 3. Friend Filter
      if (friendFilter !== 'ALL' && t.friendId !== friendFilter && t.paidById !== friendFilter) return false;

      // 4. Group Filter
      if (groupFilter !== 'ALL' && t.groupId !== groupFilter) return false;

      // 5. Date Filter
      if (dateFilter !== 'ALL' && t.date) {
        try {
          const d = parseISO(t.date);
          if (dateFilter === 'TODAY' && !isToday(d)) return false;
          if (dateFilter === 'THIS_WEEK' && !isThisWeek(d)) return false;
          if (dateFilter === 'THIS_MONTH' && !isThisMonth(d)) return false;
        } catch (e) {
          // ignore
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'DATE_DESC') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'DATE_ASC') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'AMOUNT_DESC') return b.amount - a.amount;
      if (sortBy === 'AMOUNT_ASC') return a.amount - b.amount;
      return 0;
    });
  }, [transactions, searchQuery, typeFilter, friendFilter, groupFilter, dateFilter, sortBy, friendsMap, groupsMap]);

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return;
    const tToDelete = deletingTransaction;
    const deleted = await deleteTransaction(tToDelete.id);

    showToast({
      type: 'info',
      title: 'Transaction Deleted',
      description: `Deleted transaction "${tToDelete.description}" of ₹${tToDelete.amount}`,
      undoAction: async () => {
        if (deleted) {
          await restoreTransaction(deleted);
          showToast({
            type: 'success',
            title: 'Restored',
            description: 'Transaction restored successfully.'
          });
        }
      }
    });
    setDeletingTransaction(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setFriendFilter('ALL');
    setGroupFilter('ALL');
    setDateFilter('ALL');
    setSortBy('DATE_DESC');
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'ALL' || friendFilter !== 'ALL' || groupFilter !== 'ALL' || dateFilter !== 'ALL';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Transaction History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Showing {filteredTransactions.length} of {transactions.length} total transactions
          </p>
        </div>

        <Button onClick={onOpenAddTransaction} variant="primary">
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Input
            placeholder="Search description, name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="ALL">All Types</option>
            <option value="PAID_BY_ME">Money I Paid</option>
            <option value="PAID_BY_FRIEND">Money Friends Paid</option>
            <option value="GROUP_EXPENSE">Group Expenses</option>
            <option value="SETTLEMENT">Settlements</option>
          </Select>

          <Select value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
          </Select>

          <Select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="DATE_DESC">Date (Newest First)</option>
            <option value="DATE_ASC">Date (Oldest First)</option>
            <option value="AMOUNT_DESC">Amount (Highest First)</option>
            <option value="AMOUNT_ASC">Amount (Lowest First)</option>
          </Select>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-slate-500">Filters active</span>
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main List / Table */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title="No Transactions Found"
          description={hasActiveFilters ? "Try adjusting your search query or filters." : "No transactions recorded yet."}
          actionText={hasActiveFilters ? "Clear Filters" : "+ Add Transaction"}
          onAction={hasActiveFilters ? clearFilters : onOpenAddTransaction}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <TransactionTable
              transactions={filteredTransactions}
              friendsMap={friendsMap}
              groupsMap={groupsMap}
              onEdit={setEditingTransaction}
              onDelete={setDeletingTransaction}
            />
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden grid gap-3">
            {filteredTransactions.map(t => (
              <TransactionCard
                key={t.id}
                transaction={t}
                friendsMap={friendsMap}
                groupsMap={groupsMap}
                onEdit={setEditingTransaction}
                onDelete={setDeletingTransaction}
              />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
      />

      <ConfirmDialog
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction?"
        message={`Are you sure you want to delete "${deletingTransaction?.description}" of ₹${deletingTransaction?.amount}?`}
        confirmText="Delete"
      />
    </div>
  );
};
