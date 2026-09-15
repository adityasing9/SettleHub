import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFriends } from '../hooks/useFriends';
import { useTransactions } from '../hooks/useTransactions';
import { useGroups } from '../hooks/useGroups';
import { useToast } from '../context/ToastContext';
import { calculateFriendBalance } from '../services/financialEngine';
import { formatCurrency } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { BalanceBadge } from '../components/ui/Badge';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionCard } from '../components/transactions/TransactionCard';
import { SettleUpModal } from '../components/transactions/SettleUpModal';
import { EditFriendModal } from '../components/friends/EditFriendModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  FileText,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { Transaction } from '../types';

interface FriendDetailProps {
  onOpenAddTransaction: (friendId?: string) => void;
}

export const FriendDetail: React.FC<FriendDetailProps> = ({ onOpenAddTransaction }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { friends, updateFriend, archiveFriend, deleteFriend } = useFriends();
  const { transactions, deleteTransaction, restoreTransaction } = useTransactions();
  const { groups } = useGroups();
  const { showToast } = useToast();

  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const friend = friends.find(f => f.id === id);
  const friendsMap = new Map(friends.map(f => [f.id, f]));
  const groupsMap = new Map(groups.map(g => [g.id, g]));

  if (!friend) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-500">Friend not found.</p>
        <Button onClick={() => navigate('/friends')}>Back to Friends</Button>
      </div>
    );
  }

  // Calculate Friend's 1-on-1 Balance
  const balance = calculateFriendBalance(friend.id, friend.name, transactions);

  // Filter transactions related to this friend
  const friendTransactions = transactions.filter(t => {
    if (t.friendId === friend.id) return true;
    if (t.type === 'GROUP_EXPENSE' && t.participants) {
      const isFriendParticipant = t.participants.some(p => p.friendId === friend.id);
      const isMeParticipant = t.participants.some(p => p.friendId === 'ME');
      if (t.paidById === 'ME' && isFriendParticipant) return true;
      if (t.paidById === friend.id && isMeParticipant) return true;
    }
    return false;
  });

  const handleDeleteFriendConfirm = async () => {
    await archiveFriend(friend.id);
    showToast({
      type: 'info',
      title: 'Friend Archived',
      description: `${friend.name} has been archived.`
    });
    navigate('/friends');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Navigation */}
      <button
        onClick={() => navigate('/friends')}
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Friends
      </button>

      {/* Header Profile Card */}
      <Card className="p-6 bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-800 dark:to-slate-900 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={friend.name} size="lg" />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{friend.name}</h2>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                {friend.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {friend.phone}
                  </span>
                )}
                {friend.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {friend.email}
                  </span>
                )}
                {friend.note && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {friend.note}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {balance.netBalance !== 0 && (
              <Button onClick={() => setIsSettleOpen(true)} variant="success">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settle Up</span>
              </Button>
            )}
            <Button onClick={() => onOpenAddTransaction(friend.id)} variant="primary">
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </Button>
            <Button onClick={() => setIsDeleteOpen(true)} variant="ghost" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 3 Summary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span>Total You Paid for {friend.name}</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900 dark:text-emerald-100 mt-2">
            {formatCurrency(balance.totalPaidByMe)}
          </p>
        </Card>

        <Card className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-900/40">
          <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300">
            <span>Total {friend.name} Paid for You</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-900 dark:text-rose-100 mt-2">
            {formatCurrency(balance.totalPaidByFriend)}
          </p>
        </Card>

        <Card className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-900/40">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-300">
            <span>Net Balance Status</span>
            <BalanceBadge status={balance.status} />
          </div>
          <p className={`text-xl font-black mt-2 ${
            balance.netBalance > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : balance.netBalance < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-900 dark:text-white'
          }`}>
            {balance.status === 'OWES_ME' && `${friend.name} owes you `}
            {balance.status === 'I_OWE' && `You owe ${friend.name} `}
            {formatCurrency(Math.abs(balance.netBalance))}
          </p>
        </Card>
      </div>

      {/* Transaction History for Friend */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Transaction History with {friend.name} ({friendTransactions.length})
        </h3>

        {friendTransactions.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-8 h-8" />}
            title="No Transactions with Friend"
            description={`You haven't recorded any shared expenses or settlements with ${friend.name} yet.`}
            actionText="+ Add Transaction"
            onAction={() => onOpenAddTransaction(friend.id)}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <TransactionTable
                transactions={friendTransactions}
                friendsMap={friendsMap}
                groupsMap={groupsMap}
                onDelete={setDeletingTransaction}
              />
            </div>
            <div className="md:hidden grid gap-3">
              {friendTransactions.map(t => (
                <TransactionCard
                  key={t.id}
                  transaction={t}
                  friendsMap={friendsMap}
                  groupsMap={groupsMap}
                  onDelete={setDeletingTransaction}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <SettleUpModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        friend={friend}
        balance={balance}
      />

      <EditFriendModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        friend={friend}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteFriendConfirm}
        title={`Archive ${friend.name}?`}
        message={`${friend.name} has transaction history. Archiving will hide them from active friend pickers while preserving all financial history.`}
        confirmText="Archive Friend"
      />

      <ConfirmDialog
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={async () => {
          if (deletingTransaction) {
            const deleted = await deleteTransaction(deletingTransaction.id);
            showToast({
              type: 'info',
              title: 'Transaction Deleted',
              undoAction: async () => {
                if (deleted) await restoreTransaction(deleted);
              }
            });
            setDeletingTransaction(null);
          }
        }}
        title="Delete Transaction?"
        message={`Are you sure you want to delete "${deletingTransaction?.description}"?`}
        confirmText="Delete"
      />
    </div>
  );
};
