import React from 'react';
import { Transaction, Friend, Group } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { ArrowUpRight, ArrowDownLeft, CheckCircle, Users, Edit2, Trash2 } from 'lucide-react';

interface TransactionCardProps {
  transaction: Transaction;
  friendsMap: Map<string, Friend>;
  groupsMap: Map<string, Group>;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  friendsMap,
  groupsMap,
  onEdit,
  onDelete
}) => {
  const getPaidByName = (id: string) => {
    if (id === 'ME') return 'You';
    return friendsMap.get(id)?.name || 'Friend';
  };

  const getTargetName = () => {
    if (transaction.groupId) {
      return groupsMap.get(transaction.groupId)?.name || 'Group';
    }
    if (transaction.friendId) {
      return friendsMap.get(transaction.friendId)?.name || 'Friend';
    }
    return '';
  };

  let icon = <ArrowUpRight className="w-4 h-4 text-rose-500" />;
  let typeLabel = 'Paid';
  let badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';

  if (transaction.type === 'SETTLEMENT') {
    icon = <CheckCircle className="w-4 h-4 text-slate-500" />;
    typeLabel = 'Settlement';
    badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  } else if (transaction.paidById === 'ME') {
    icon = <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
    typeLabel = 'You Paid';
    badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
  } else {
    typeLabel = `${getPaidByName(transaction.paidById)} Paid`;
  }

  return (
    <Card className="p-4 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2.5 rounded-xl ${badgeColor} shrink-0 mt-0.5`}>
            {transaction.groupId ? <Users className="w-4 h-4 text-indigo-500" /> : icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {transaction.description || 'Transaction'}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{getPaidByName(transaction.paidById)}</span>
              <span>•</span>
              <span className="truncate">{getTargetName()}</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {formatDateTime(transaction.date)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-base font-bold text-slate-900 dark:text-white">
            {formatCurrency(transaction.amount)}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${badgeColor}`}>
            {typeLabel}
          </span>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex items-center justify-end gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-medium"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      )}
    </Card>
  );
};
