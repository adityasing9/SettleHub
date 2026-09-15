import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroups } from '../hooks/useGroups';
import { useFriends } from '../hooks/useFriends';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../context/ToastContext';
import { calculateSuggestedSettlements } from '../services/financialEngine';
import { formatCurrency } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { SuggestedSettlements } from '../components/groups/SuggestedSettlements';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionCard } from '../components/transactions/TransactionCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import {
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Receipt,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Transaction, SuggestedSettlement } from '../types';

interface GroupDetailProps {
  onOpenAddGroupExpense: (groupId: string) => void;
  onOpenSettleUpModal: (friendId: string) => void;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({
  onOpenAddGroupExpense,
  onOpenSettleUpModal
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { groups, deleteGroup } = useGroups();
  const { activeFriends } = useFriends();
  const { transactions, deleteTransaction } = useTransactions();
  const { showToast } = useToast();

  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const group = groups.find(g => g.id === id);
  const friendsMap = new Map<string, string>();
  friendsMap.set('ME', 'You');
  activeFriends.forEach(f => friendsMap.set(f.id, f.name));

  const friendObjectsMap = new Map(activeFriends.map(f => [f.id, f]));
  const groupsMap = new Map(groups.map(g => [g.id, g]));

  if (!group) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-500">Group not found.</p>
        <Button onClick={() => navigate('/groups')}>Back to Groups</Button>
      </div>
    );
  }

  // Group transactions
  const groupTransactions = transactions.filter(t => t.groupId === group.id);

  // Total group spending
  const totalSpending = groupTransactions
    .filter(t => t.type === 'GROUP_EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate Suggested Settlements for Group
  const suggestedSettlements = calculateSuggestedSettlements(
    group.members,
    friendsMap,
    groupTransactions
  );

  const handleSettleSuggested = (s: SuggestedSettlement) => {
    const friendIdToSettle = s.fromId === 'ME' ? s.toId : s.fromId;
    if (friendIdToSettle && friendIdToSettle !== 'ME') {
      onOpenSettleUpModal(friendIdToSettle);
    }
  };

  const handleDeleteGroup = async () => {
    await deleteGroup(group.id);
    showToast({
      type: 'info',
      title: 'Group Deleted',
      description: `Group "${group.name}" was deleted.`
    });
    navigate('/groups');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate('/groups')}
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Groups
      </button>

      {/* Group Title Card */}
      <Card className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200">
              <Users className="w-3.5 h-3.5" />
              <span>{group.members.length} Members</span>
            </div>
            <h2 className="text-2xl font-black">{group.name}</h2>
            {group.description && (
              <p className="text-xs text-indigo-200 max-w-lg">"{group.description}"</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => onOpenAddGroupExpense(group.id)}
              className="bg-white text-indigo-900 hover:bg-slate-100 font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Group Expense</span>
            </Button>
            <Button
              onClick={() => setIsDeleteGroupOpen(true)}
              variant="ghost"
              className="text-indigo-200 hover:bg-white/10 hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Member Avatars & Total Spending */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 mt-6 border-t border-indigo-700/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-300 font-semibold uppercase">Members:</span>
            <div className="flex -space-x-2">
              {group.members.map(memberId => {
                const name = memberId === 'ME' ? 'You' : friendObjectsMap.get(memberId)?.name || 'Friend';
                return <Avatar key={memberId} name={name} size="sm" className="ring-2 ring-indigo-900" />;
              })}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-indigo-300 font-semibold uppercase block">Total Group Spending</span>
            <span className="text-2xl font-black text-amber-300">{formatCurrency(totalSpending)}</span>
          </div>
        </div>
      </Card>

      {/* Suggested Settlements Section */}
      <SuggestedSettlements
        settlements={suggestedSettlements}
        onSettle={handleSettleSuggested}
      />

      {/* Group Expenses History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Group Expenses ({groupTransactions.length})
          </h3>
          <Button
            size="sm"
            onClick={() => onOpenAddGroupExpense(group.id)}
            variant="primary"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </Button>
        </div>

        {groupTransactions.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-8 h-8" />}
            title="No Group Expenses Yet"
            description="Add your first shared expense for this group."
            actionText="+ Add Group Expense"
            onAction={() => onOpenAddGroupExpense(group.id)}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <TransactionTable
                transactions={groupTransactions}
                friendsMap={friendObjectsMap}
                groupsMap={groupsMap}
                onDelete={setDeletingTransaction}
              />
            </div>
            <div className="md:hidden grid gap-3">
              {groupTransactions.map(t => (
                <TransactionCard
                  key={t.id}
                  transaction={t}
                  friendsMap={friendObjectsMap}
                  groupsMap={groupsMap}
                  onDelete={setDeletingTransaction}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Group Modal */}
      <ConfirmDialog
        isOpen={isDeleteGroupOpen}
        onClose={() => setIsDeleteGroupOpen(false)}
        onConfirm={handleDeleteGroup}
        title={`Delete Group "${group.name}"?`}
        message="Are you sure you want to delete this group? Expense history will be kept in your transaction log."
        confirmText="Delete Group"
      />

      <ConfirmDialog
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={async () => {
          if (deletingTransaction) {
            await deleteTransaction(deletingTransaction.id);
            setDeletingTransaction(null);
          }
        }}
        title="Delete Expense?"
        message={`Are you sure you want to delete "${deletingTransaction?.description}"?`}
        confirmText="Delete"
      />
    </div>
  );
};
