import React from 'react';
import { Transaction, Friend, Group } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Edit2, Trash2, Users } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  friendsMap: Map<string, Friend>;
  groupsMap: Map<string, Group>;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  friendsMap,
  groupsMap,
  onEdit,
  onDelete
}) => {
  const getPaidByName = (id: string) => {
    if (id === 'ME') return 'You';
    return friendsMap.get(id)?.name || 'Friend';
  };

  const getTargetName = (t: Transaction) => {
    if (t.type === 'PERSONAL_EXPENSE') {
      return t.category ? `Personal (${t.category})` : 'Personal Expense';
    }
    if (t.groupId) {
      return `Group: ${groupsMap.get(t.groupId)?.name || 'Group'}`;
    }
    if (t.friendId) {
      return friendsMap.get(t.friendId)?.name || 'Friend';
    }
    return 'Personal';
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
            <th className="py-3.5 px-4">Date & Time</th>
            <th className="py-3.5 px-4">Person / Group</th>
            <th className="py-3.5 px-4">Description</th>
            <th className="py-3.5 px-4">Paid By</th>
            <th className="py-3.5 px-4 text-right">Amount</th>
            <th className="py-3.5 px-4 text-center">Type</th>
            {(onEdit || onDelete) && <th className="py-3.5 px-4 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
          {transactions.map(t => {
            const isPersonal = t.type === 'PERSONAL_EXPENSE';
            const isSettlement = t.type === 'SETTLEMENT';
            const isPaidByMe = t.paidById === 'ME';

            return (
              <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatDateTime(t.date)}
                </td>
                <td className="py-3.5 px-4 text-slate-900 dark:text-white font-semibold">
                  <div className="flex items-center gap-1.5">
                    {t.groupId && <Users className="w-3.5 h-3.5 text-indigo-500" />}
                    <span>{getTargetName(t)}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                  {t.description || <span className="italic text-slate-400">No description</span>}
                </td>
                <td className="py-3.5 px-4 text-slate-900 dark:text-white font-medium">
                  {isPersonal ? 'You' : getPaidByName(t.paidById)}
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                  {formatCurrency(t.amount)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      isPersonal
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : isSettlement
                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : isPaidByMe
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                    }`}
                  >
                    {isPersonal
                      ? 'Personal'
                      : isSettlement
                      ? 'Settlement'
                      : isPaidByMe
                      ? 'You Paid'
                      : 'Friend Paid'}
                  </span>
                </td>
                {(onEdit || onDelete) && (
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(t)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
