import React, { useMemo } from 'react';
import { useFriends } from '../hooks/useFriends';
import { useTransactions } from '../hooks/useTransactions';
import { calculateOverallTotals } from '../services/financialEngine';
import { formatCurrency } from '../utils/formatters';
import { StatCard } from '../components/statistics/StatCard';
import { SpendingChart } from '../components/statistics/SpendingChart';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Receipt, Wallet, ArrowDownLeft, ArrowUpRight, Award, Zap, TrendingUp } from 'lucide-react';

export const Statistics: React.FC = () => {
  const { activeFriends } = useFriends();
  const { transactions } = useTransactions();

  const totals = calculateOverallTotals(activeFriends, transactions);

  // Total spent (where I paid or my share in group expenses)
  const totalMoneySpent = useMemo(() => {
    let sum = 0;
    for (const t of transactions) {
      if (t.type === 'PAID_BY_ME') sum += t.amount;
      else if (t.type === 'GROUP_EXPENSE' && t.participants) {
        const me = t.participants.find(p => p.friendId === 'ME');
        if (me) sum += me.shareAmount;
      }
    }
    return Math.round(sum * 100) / 100;
  }, [transactions]);

  // Highest transaction
  const highestTransaction = useMemo(() => {
    if (transactions.length === 0) return null;
    return [...transactions].sort((a, b) => b.amount - a.amount)[0];
  }, [transactions]);

  // Most frequent friend interaction
  const mostFrequentFriend = useMemo(() => {
    if (activeFriends.length === 0) return null;
    const countMap: Record<string, number> = {};
    for (const t of transactions) {
      if (t.friendId) {
        countMap[t.friendId] = (countMap[t.friendId] || 0) + 1;
      }
      if (t.participants) {
        for (const p of t.participants) {
          if (p.friendId !== 'ME') {
            countMap[p.friendId] = (countMap[p.friendId] || 0) + 1;
          }
        }
      }
    }

    let topFriendId = '';
    let maxCount = -1;
    for (const [fId, count] of Object.entries(countMap)) {
      if (count > maxCount) {
        maxCount = count;
        topFriendId = fId;
      }
    }

    return activeFriends.find(f => f.id === topFriendId) || null;
  }, [activeFriends, transactions]);

  // Monthly spending breakdown (last 6 months)
  const monthlyData = useMemo(() => {
    const data: { month: string; amount: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const label = format(monthDate, 'MMM');
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      let amount = 0;
      for (const t of transactions) {
        try {
          const tDate = parseISO(t.date);
          if (tDate >= start && tDate <= end) {
            if (t.type === 'PAID_BY_ME') amount += t.amount;
            else if (t.type === 'GROUP_EXPENSE' && t.participants) {
              const me = t.participants.find(p => p.friendId === 'ME');
              if (me) amount += me.shareAmount;
            }
          }
        } catch (e) {}
      }

      data.push({ month: label, amount: Math.round(amount) });
    }

    return data;
  }, [transactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Statistics & Insights</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Overview of total transaction activity, balances, and monthly spending trends
        </p>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transactions"
          value={transactions.length.toString()}
          subtitle="Recorded transactions"
          icon={<Receipt className="w-5 h-5" />}
          color="indigo"
        />

        <StatCard
          title="Total Spent"
          value={formatCurrency(totalMoneySpent)}
          subtitle="Out of pocket & shared"
          icon={<TrendingUp className="w-5 h-5" />}
          color="amber"
        />

        <StatCard
          title="Total Receivable"
          value={formatCurrency(totals.totalReceivable)}
          subtitle="Friends owe you"
          icon={<ArrowDownLeft className="w-5 h-5" />}
          color="emerald"
        />

        <StatCard
          title="Total Payable"
          value={formatCurrency(totals.totalPayable)}
          subtitle="You owe friends"
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="rose"
        />
      </div>

      {/* Monthly Chart */}
      <SpendingChart data={monthlyData} />

      {/* Top Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Frequent Friend */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Most Frequent Friend
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {mostFrequentFriend ? mostFrequentFriend.name : 'No transactions yet'}
            </span>
            {mostFrequentFriend && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Top participant in your shared expenses
              </p>
            )}
          </div>
        </Card>

        {/* Highest Transaction */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Highest Single Transaction
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {highestTransaction ? formatCurrency(highestTransaction.amount) : '₹0'}
            </span>
            {highestTransaction && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                "{highestTransaction.description}"
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
