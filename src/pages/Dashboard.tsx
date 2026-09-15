import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFriends } from '../hooks/useFriends';
import { useTransactions } from '../hooks/useTransactions';
import { useGroups } from '../hooks/useGroups';
import { calculateOverallTotals } from '../services/financialEngine';
import { formatCurrency } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BalanceBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { TransactionCard } from '../components/transactions/TransactionCard';
import { FriendCard } from '../components/friends/FriendCard';
import { EmptyState } from '../components/ui/EmptyState';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Users,
  Plus,
  ChevronRight,
  Sparkles,
  Receipt
} from 'lucide-react';

interface DashboardProps {
  onOpenAddTransaction: () => void;
  onOpenAddFriend: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenAddTransaction,
  onOpenAddFriend
}) => {
  const navigate = useNavigate();
  const { activeFriends } = useFriends();
  const { transactions } = useTransactions();
  const { groups } = useGroups();

  const friendsMap = new Map(activeFriends.map(f => [f.id, f]));
  const groupsMap = new Map(groups.map(g => [g.id, g]));

  const totals = calculateOverallTotals(activeFriends, transactions);

  // Categorize friends into Who Owes Me vs Who I Owe
  const whoOwesMe = totals.friendBalances.filter(fb => fb.netBalance > 0);
  const whoIOwe = totals.friendBalances.filter(fb => fb.netBalance < 0);

  const recentTransactions = transactions.slice(0, 6);

  const isFirstTime = activeFriends.length === 0 && transactions.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Onboarding Welcome Banner for First Time Users */}
      {isFirstTime && (
        <Card className="p-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-amber-300" />
            </div>
            <div className="space-y-2 flex-1">
              <h2 className="text-xl font-extrabold">Welcome to SettleMate!</h2>
              <p className="text-xs sm:text-sm text-indigo-100 max-w-xl leading-relaxed">
                Track shared expenses with friends, split trip bills, and know exactly who owes whom. Get started by adding your first friend.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={onOpenAddFriend} variant="secondary" size="sm">
                  + Add First Friend
                </Button>
                <Button onClick={onOpenAddTransaction} variant="primary" size="sm" className="bg-white text-indigo-700 hover:bg-slate-100">
                  + Add First Transaction
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Receivable */}
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-slate-900 border-emerald-200/80 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              You should receive
            </span>
            <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-sm">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-100 mt-2">
            {formatCurrency(totals.totalReceivable)}
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">
            From {whoOwesMe.length} {whoOwesMe.length === 1 ? 'friend' : 'friends'}
          </p>
        </Card>

        {/* Total Payable */}
        <Card className="p-5 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/40 dark:to-slate-900 border-rose-200/80 dark:border-rose-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
              You should pay
            </span>
            <div className="p-2 rounded-xl bg-rose-500 text-white shadow-sm">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-900 dark:text-rose-100 mt-2">
            {formatCurrency(totals.totalPayable)}
          </p>
          <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1 font-semibold">
            To {whoIOwe.length} {whoIOwe.length === 1 ? 'friend' : 'friends'}
          </p>
        </Card>

        {/* Net Balance */}
        <Card className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-slate-900 border-indigo-200/80 dark:border-indigo-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
              Net Balance
            </span>
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-black mt-2 ${
            totals.netOverallBalance > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : totals.netOverallBalance < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-900 dark:text-white'
          }`}>
            {formatCurrency(totals.netOverallBalance)}
          </p>
          <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-1 font-semibold">
            {totals.netOverallBalance >= 0 ? 'Overall Positive' : 'Overall Deficit'}
          </p>
        </Card>
      </div>

      {/* Friends Balance Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Who owes you? */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              Who Owes You ({whoOwesMe.length})
            </h3>
            <Button size="sm" variant="ghost" onClick={() => navigate('/friends')}>
              View All
            </Button>
          </div>

          {whoOwesMe.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No friends currently owe you money.</p>
          ) : (
            <div className="space-y-2">
              {whoOwesMe.map(fb => {
                const friend = friendsMap.get(fb.friendId);
                if (!friend) return null;
                return (
                  <div
                    key={fb.friendId}
                    onClick={() => navigate(`/friends/${fb.friendId}`)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={fb.friendName} size="sm" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{fb.friendName}</span>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(fb.netBalance)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Who do you owe? */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
              Who You Owe ({whoIOwe.length})
            </h3>
            <Button size="sm" variant="ghost" onClick={() => navigate('/friends')}>
              View All
            </Button>
          </div>

          {whoIOwe.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">You don't owe any friends right now!</p>
          ) : (
            <div className="space-y-2">
              {whoIOwe.map(fb => {
                const friend = friendsMap.get(fb.friendId);
                if (!friend) return null;
                return (
                  <div
                    key={fb.friendId}
                    onClick={() => navigate(`/friends/${fb.friendId}`)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={fb.friendName} size="sm" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{fb.friendName}</span>
                    </div>
                    <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(Math.abs(fb.netBalance))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Recent Transactions
          </h3>
          <Button size="sm" variant="ghost" onClick={() => navigate('/transactions')}>
            View All ({transactions.length})
          </Button>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-8 h-8" />}
            title="No Transactions Yet"
            description="Start tracking by adding your first transaction."
            actionText="+ Add Transaction"
            onAction={onOpenAddTransaction}
          />
        ) : (
          <div className="grid gap-3">
            {recentTransactions.map(t => (
              <TransactionCard
                key={t.id}
                transaction={t}
                friendsMap={friendsMap}
                groupsMap={groupsMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
