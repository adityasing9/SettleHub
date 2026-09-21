import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Transaction, EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { generateAndSaveExpensePDF } from '../../utils/pdfReportGenerator';
import {
  FileDown,
  Download,
  Calendar,
  FileText,
  PieChart,
  Wallet,
  TrendingDown,
  Receipt,
  X,
  CreditCard
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfYear,
  endOfYear,
  parseISO,
  format
} from 'date-fns';

interface PersonalExpenseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

type DatePreset = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_90_DAYS' | 'THIS_YEAR' | 'ALL_TIME' | 'CUSTOM';

export const PersonalExpenseReportModal: React.FC<PersonalExpenseReportModalProps> = ({
  isOpen,
  onClose,
  transactions
}) => {
  const { showToast } = useToast();
  const [datePreset, setDatePreset] = useState<DatePreset>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState('ALL');

  // Filter personal expenses (and settlements paid by ME)
  const personalTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Is personal expense or repayment paid to friend
      return t.type === 'PERSONAL_EXPENSE' || (t.type === 'SETTLEMENT' && t.paidById === 'ME');
    });
  }, [transactions]);

  // Compute date range boundary
  const { start, end } = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'THIS_MONTH':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'LAST_MONTH': {
        const prev = subMonths(now, 1);
        return { start: startOfMonth(prev), end: endOfMonth(prev) };
      }
      case 'LAST_90_DAYS':
        return { start: subDays(now, 90), end: now };
      case 'THIS_YEAR':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'CUSTOM':
        return {
          start: startDate ? new Date(startDate) : null,
          end: endDate ? new Date(endDate + 'T23:59:59') : null
        };
      case 'ALL_TIME':
      default:
        return { start: null, end: null };
    }
  }, [datePreset, startDate, endDate]);

  // Filtered transactions for report
  const filteredList = useMemo(() => {
    return personalTransactions.filter(t => {
      // 1. Date Range
      if (start || end) {
        try {
          const d = parseISO(t.date);
          if (start && d < start) return false;
          if (end && d > end) return false;
        } catch (e) {
          return false;
        }
      }

      // 2. Category Filter
      const cat = t.category || (t.type === 'SETTLEMENT' ? 'Friend Repayment' : 'General');
      if (categoryFilter !== 'ALL' && cat !== categoryFilter) {
        return false;
      }

      // 3. Payment Mode Filter
      const pMode = t.paymentMode || 'Other';
      if (paymentModeFilter !== 'ALL' && pMode !== paymentModeFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [personalTransactions, start, end, categoryFilter, paymentModeFilter]);

  // Report Metrics
  const totalAmount = useMemo(() => {
    return filteredList.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredList]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    for (const t of filteredList) {
      const cat = t.category || (t.type === 'SETTLEMENT' ? 'Friend Repayment' : 'General');
      if (!map[cat]) map[cat] = { amount: 0, count: 0 };
      map[cat].amount += t.amount;
      map[cat].count += 1;
    }

    return Object.entries(map)
      .map(([cat, val]) => ({
        category: cat,
        amount: Math.round(val.amount * 100) / 100,
        count: val.count,
        percentage: totalAmount > 0 ? Math.round((val.amount / totalAmount) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredList, totalAmount]);

  // Payment Mode Breakdown
  const paymentModeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredList) {
      const mode = t.paymentMode || 'Other';
      map[mode] = (map[mode] || 0) + t.amount;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredList]);

  // Daily Average
  const dailyAverage = useMemo(() => {
    if (filteredList.length === 0) return 0;
    if (start && end) {
      const days = Math.max(Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), 1);
      return Math.round((totalAmount / days) * 100) / 100;
    }
    return Math.round((totalAmount / Math.max(filteredList.length, 1)) * 100) / 100;
  }, [totalAmount, start, end, filteredList.length]);

  // Save PDF Handler
  const handleSavePDF = () => {
    const presetLabels: Record<DatePreset, string> = {
      THIS_MONTH: 'This Month',
      LAST_MONTH: 'Last Month',
      LAST_90_DAYS: 'Last 90 Days',
      THIS_YEAR: 'This Year',
      ALL_TIME: 'All Time',
      CUSTOM: startDate && endDate ? `${startDate} to ${endDate}` : 'Custom Range'
    };

    const topCategoryObj = categoryBreakdown.length > 0
      ? { name: categoryBreakdown[0].category, amount: categoryBreakdown[0].amount }
      : null;

    const categoryBreakdownData = categoryBreakdown.map(c => ({
      category: c.category,
      amount: c.amount,
      percentage: c.percentage,
      count: c.count
    }));

    generateAndSaveExpensePDF({
      dateRangeLabel: presetLabels[datePreset],
      categoryFilterLabel: categoryFilter === 'ALL' ? 'All Categories' : categoryFilter,
      paymentModeFilterLabel: paymentModeFilter === 'ALL' ? 'All Payment Methods' : paymentModeFilter,
      totalAmount,
      transactionCount: filteredList.length,
      dailyAverage,
      topCategory: topCategoryObj,
      categoryBreakdown: categoryBreakdownData,
      transactions: filteredList
    });

    showToast({
      type: 'success',
      title: 'PDF Report Downloaded',
      description: 'Your expense report has been saved to your device as a PDF.'
    });
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Payment Mode', 'Amount (INR)'];
    const rows = filteredList.map(t => {
      const cat = t.category || (t.type === 'SETTLEMENT' ? 'Friend Repayment' : 'General');
      return [
        `"${t.date}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${cat}"`,
        `"${t.paymentMode || 'Other'}"`,
        t.amount
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `SettleMate_Expense_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personal Expense Report" maxWidth="xl">
      <div className="space-y-6">
        {/* Preset Date Range Buttons */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
          {[
            { key: 'THIS_MONTH', label: 'This Month' },
            { key: 'LAST_MONTH', label: 'Last Month' },
            { key: 'LAST_90_DAYS', label: 'Last 90 Days' },
            { key: 'THIS_YEAR', label: 'This Year' },
            { key: 'ALL_TIME', label: 'All Time' },
            { key: 'CUSTOM', label: 'Custom' }
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key as DatePreset)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                datePreset === p.key
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Inputs */}
        {datePreset === 'CUSTOM' && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Filter Category"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Select
            label="Filter Payment Mode"
            value={paymentModeFilter}
            onChange={e => setPaymentModeFilter(e.target.value)}
          >
            <option value="ALL">All Payment Methods</option>
            {PAYMENT_MODES.map(pm => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </Select>
        </div>

        {/* Printable Report Section */}
        <div id="printable-expense-report" className="space-y-6 pt-2">
          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/50 rounded-2xl">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                Total Expenses
              </span>
              <p className="text-xl sm:text-2xl font-black text-purple-950 dark:text-purple-100 mt-1">
                {formatCurrency(totalAmount)}
              </p>
            </div>

            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                Transactions
              </span>
              <p className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1">
                {filteredList.length}
              </p>
            </div>

            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                Daily Average
              </span>
              <p className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">
                {formatCurrency(dailyAverage)}
              </p>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                Top Category
              </span>
              <p className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-100 mt-1 truncate">
                {categoryBreakdown[0]?.category || 'None'}
              </p>
            </div>
          </div>

          {/* Category Breakdown Progress Bars */}
          {categoryBreakdown.length > 0 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <span>Spending by Category</span>
              </h4>
              <div className="space-y-2.5">
                {categoryBreakdown.map(cat => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {cat.category} <span className="text-slate-400 font-normal">({cat.count})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(cat.amount)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium w-8 text-right">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itemized Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <span>Itemized Expenses ({filteredList.length})</span>
            </h4>

            {filteredList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                No personal expenses recorded in this period.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredList.map(t => {
                      const cat = t.category || (t.type === 'SETTLEMENT' ? 'Friend Repayment' : 'General');
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                            {formatDateTime(t.date)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                              {cat}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-900 dark:text-white truncate max-w-[160px]">
                            {t.description}
                          </td>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                            {t.paymentMode || 'Other'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleExportCSV}>
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </Button>
            <Button type="button" variant="primary" onClick={handleSavePDF}>
              <FileDown className="w-4 h-4" />
              <span>Save as PDF</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
