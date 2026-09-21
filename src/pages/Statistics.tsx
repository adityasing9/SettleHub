import React, { useMemo } from 'react';
import { useFriends } from '../hooks/useFriends';
import { useTransactions } from '../hooks/useTransactions';
import { calculateOverallTotals, calculateSpendingBreakdown } from '../services/financialEngine';
import { formatCurrency } from '../utils/formatters';
import { StatCard } from '../components/statistics/StatCard';
import { SpendingChart } from '../components/statistics/SpendingChart';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  Receipt,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Zap,
  TrendingUp,
  PieChart,
  ShoppingBag,
  Users
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  'Food & Dining': { bg: 'bg-amber-500/10', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  'Groceries': { bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  'Shopping': { bg: 'bg-purple-500/10', bar: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  'Travel & Fuel': { bg: 'bg-blue-500/10', bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  'Bills & Utilities': { bg: 'bg-rose-500/10', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  'Entertainment': { bg: 'bg-pink-500/10', bar: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400' },
  'Health & Fitness': { bg: 'bg-teal-500/10', bar: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400' },
  'Rent & Housing': { bg: 'bg-indigo-500/10', bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
  'Education': { bg: 'bg-cyan-500/10', bar: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
  'General': { bg: 'bg-slate-500/10', bar: 'bg-slate-500', text: 'text-slate-600 dark:text-slate-400' }
};

export const Statistics: React.FC = () => {
  const { activeFriends } = useFriends();
  const { transactions } = useTransactions();

  const totals = calculateOverallTotals(activeFriends, transactions);
  const spendingBreakdown = useMemo(() => calculateSpendingBreakdown(transactions), [transactions]);

  // Total spent (including personal expenses, out of pocket and shared share)
  const totalMoneySpent = spendingBreakdown.totalSpent;

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
            if (t.type === 'PAID_BY_ME' || t.type === 'PERSONAL_EXPENSE') {
              amount += t.amount;
            } else if (t.type === 'GROUP_EXPENSE' && t.participants) {
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
          Overview of personal expenses, shared settlements, categories, and monthly trends
        </p>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transactions"
          value={transactions.length.toString()}
          subtitle="All recorded expenses"
          icon={<Receipt className="w-5 h-5" />}
          color="indigo"
        />

        <StatCard
          title="Total Spent"
          value={formatCurrency(totalMoneySpent)}
          subtitle="Personal + Out-of-pocket"
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

      {/* Personal vs Shared Spending Split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 bg-gradient-to-br from-purple-50/70 to-indigo-50/40 dark:from-purple-950/30 dark:to-slate-900 border-purple-200/70 dark:border-purple-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
              Personal Expenses
            </span>
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-sm">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-2">
            {formatCurrency(spendingBreakdown.personalSpent)}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
            100% your own personal expenses
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-blue-50/70 to-cyan-50/40 dark:from-blue-950/30 dark:to-slate-900 border-blue-200/70 dark:border-blue-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              Shared / Friends Expenses
            </span>
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-2">
            {formatCurrency(spendingBreakdown.sharedSpent)}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
            Group splits & paid for friends
          </p>
        </Card>
      </div>

      {/* Category Spending Breakdown */}
      {spendingBreakdown.categories.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Category Spending Breakdown
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {spendingBreakdown.categories.length} {spendingBreakdown.categories.length === 1 ? 'Category' : 'Categories'}
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {spendingBreakdown.categories.map(cat => {
              const style = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['General'];
              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${style.bar}`} />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {cat.category}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        ({cat.count} {cat.count === 1 ? 'txn' : 'txns'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(cat.amount)}
                      </span>
                      <span className={`font-bold w-10 text-right ${style.text}`}>
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                      style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
